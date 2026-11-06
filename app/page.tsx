import { redirect } from "next/navigation"
import { Portal } from "@/components/portal/portal"
import { hasAppSession } from "@/lib/auth"

export const metadata = {
  title: "Visão geral",
}

export default async function HomePage() {
  if (!(await hasAppSession())) redirect("/login")
  return <Portal />
}
