import { createHmac, timingSafeEqual } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { loginAttempts } from "@/lib/db/schema"
import { createSessionToken, sessionCookieName, sessionCookieOptions } from "@/lib/auth"
import { hasTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const loginSchema = z.object({ key: z.string().min(1).max(256) })

function getIpDigest(request: NextRequest, secret: string) {
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"

  return createHmac("sha256", secret).update(ip).digest("hex")
}

function matchesAccessKey(submitted: string, expected: string, secret: string) {
  const submittedDigest = createHmac("sha256", secret).update(submitted).digest()
  const expectedDigest = createHmac("sha256", secret).update(expected).digest()
  return timingSafeEqual(submittedDigest, expectedDigest)
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Não foi possível validar esta solicitação." }, { status: 403 })
  }

  const accessKey = process.env.ADDEX_ACCESS_KEY
  const sessionSecret = process.env.ADDEX_SESSION_SECRET
  if (!accessKey || accessKey.length < 32 || !sessionSecret || sessionSecret.length < 32) {
    return NextResponse.json(
      { error: "A configuração segura do portal está indisponível." },
      { status: 503 },
    )
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe a chave de acesso." }, { status: 400 })
  }

  const ipDigest = getIpDigest(request, sessionSecret)

  try {
    const currentAttempt = await db
      .select({ lockedUntil: loginAttempts.lockedUntil })
      .from(loginAttempts)
      .where(eq(loginAttempts.ipDigest, ipDigest))
      .limit(1)

    if (currentAttempt[0]?.lockedUntil && currentAttempt[0].lockedUntil.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 },
      )
    }

    if (!matchesAccessKey(parsed.data.key, accessKey, sessionSecret)) {
      await db
        .insert(loginAttempts)
        .values({ ipDigest, attemptCount: 1 })
        .onConflictDoUpdate({
          target: loginAttempts.ipDigest,
          set: {
            attemptCount: sql`case when ${loginAttempts.windowStartedAt} < now() - interval '15 minutes' then 1 else ${loginAttempts.attemptCount} + 1 end`,
            windowStartedAt: sql`case when ${loginAttempts.windowStartedAt} < now() - interval '15 minutes' then now() else ${loginAttempts.windowStartedAt} end`,
            lockedUntil: sql`case when ${loginAttempts.windowStartedAt} < now() - interval '15 minutes' then null when ${loginAttempts.attemptCount} + 1 >= 5 then now() + interval '15 minutes' else ${loginAttempts.lockedUntil} end`,
            updatedAt: sql`now()`,
          },
        })
      return NextResponse.json({ error: "Chave de acesso inválida." }, { status: 401 })
    }

    await db.delete(loginAttempts).where(eq(loginAttempts.ipDigest, ipDigest))
    const response = NextResponse.json({ success: true })
    response.cookies.set(sessionCookieName, createSessionToken(), sessionCookieOptions())
    return response
  } catch {
    return NextResponse.json(
      { error: "O acesso não pôde ser validado agora. Tente novamente." },
      { status: 503 },
    )
  }
}
