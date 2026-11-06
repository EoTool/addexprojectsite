import type { NextRequest } from "next/server"

export function hasTrustedOrigin(request: NextRequest) {
  const origin = request.headers.get("origin")
  const expectedHost =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? request.headers.get("host")
  const fetchSite = request.headers.get("sec-fetch-site")

  if (!origin || !expectedHost || fetchSite === "cross-site") return false

  try {
    return new URL(origin).host === expectedHost
  } catch {
    return false
  }
}
