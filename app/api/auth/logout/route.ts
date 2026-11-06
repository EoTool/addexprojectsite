import { NextRequest, NextResponse } from "next/server"
import { clearSessionCookieOptions, sessionCookieName } from "@/lib/auth"
import { hasTrustedOrigin } from "@/lib/security"

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ error: "Não foi possível validar esta solicitação." }, { status: 403 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set(sessionCookieName, "", clearSessionCookieOptions())
  return response
}
