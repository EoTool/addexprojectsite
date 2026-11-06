import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "__Host-addex_session"
const SESSION_TTL_SECONDS = 60 * 60 * 12

type SessionPayload = {
  expiresAt: number
}

function getSessionSecret() {
  const secret = process.env.ADDEX_SESSION_SECRET
  if (!secret) {
    throw new Error("A sessão segura não está configurada.")
  }
  return secret
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url")
}

export function createSessionToken() {
  const payload: SessionPayload = {
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false

  try {
    const [encodedPayload, signature, extra] = token.split(".")
    if (!encodedPayload || !signature || extra) return false

    const expected = Buffer.from(sign(encodedPayload), "base64url")
    const actual = Buffer.from(signature, "base64url")
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false

    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload
    return Number.isInteger(payload.expiresAt) && payload.expiresAt > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export async function hasAppSession() {
  const cookieStore = await cookies()
  return isValidSessionToken(cookieStore.get(COOKIE_NAME)?.value)
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: process.env.VERCEL_ENV === "production" ? ("strict" as const) : ("none" as const),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  }
}

export function clearSessionCookieOptions() {
  return { ...sessionCookieOptions(), maxAge: 0 }
}

export const sessionCookieName = COOKIE_NAME
export const sessionTtlSeconds = SESSION_TTL_SECONDS
