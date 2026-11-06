import { redirect } from "next/navigation"
import { LoginForm } from "@/components/portal/login-form"
import { hasAppSession } from "@/lib/auth"

export const metadata = {
  title: "Acesso privado | Addex Central",
  description: "Portal interno seguro da equipe Addex Company.",
}

export default async function LoginPage() {
  if (await hasAppSession()) redirect("/")
  return <LoginForm />
}
