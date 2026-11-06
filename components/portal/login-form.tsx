"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react"

export function LoginForm() {
  const router = useRouter()
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setPending(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Não foi possível validar a chave.")
      router.replace("/")
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar a chave.")
      setKey("")
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-orbit login-orbit-one" aria-hidden="true" />
      <div className="login-orbit login-orbit-two" aria-hidden="true" />
      <header className="login-brand-row">
        <a className="brand-lockup login-brand" href="https://addexcompany.com" aria-label="Addex Company, site público">
          <span className="brand-loop" aria-hidden="true" />
          <span className="brand-name">Addex<span>Company</span></span>
        </a>
        <span className="login-private"><ShieldCheck aria-hidden="true" /> Portal privado</span>
      </header>

      <section className="login-card" aria-labelledby="login-title">
        <div className="login-icon"><LockKeyhole aria-hidden="true" /></div>
        <p className="eyebrow">Acesso da equipe</p>
        <h1 id="login-title">Bem-vindo à central.</h1>
        <p className="login-description">Use a chave privada compartilhada com a equipe Addex para continuar.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="access-key">Chave de acesso</label>
          <div className={`login-input-wrap${error ? " has-error" : ""}`}>
            <LockKeyhole aria-hidden="true" />
            <input
              id="access-key"
              type="password"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
                  event.preventDefault()
                }
              }}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={256}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : "login-help"}
              placeholder="Digite sua chave privada"
            />
          </div>
          {error ? <p className="login-error" id="login-error" role="alert">{error}</p> : null}
          <p className="login-help" id="login-help">A chave não é armazenada no navegador nem no banco de dados.</p>
          <button className="button button-primary login-submit" type="submit" disabled={pending || !key}>
            {pending ? "Validando acesso…" : "Acessar a central"}
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
        <p className="login-footnote"><ShieldCheck aria-hidden="true" /> Sessão protegida com cookie seguro e expiração automática.</p>
      </section>
      <footer className="login-footer">Addex Company <span>·</span> Uso interno e confidencial</footer>
    </main>
  )
}
