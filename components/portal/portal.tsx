"use client"

import { useCallback, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Activity,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  MoreHorizontal,
  Sun,
  UsersRound,
  BriefcaseBusiness,
  Wrench,
  X,
  CheckCircle2,
  CircleAlert,
} from "lucide-react"
import type { PortalActions, PortalData, ToastKind } from "@/lib/portal-types"
import { Overview } from "./overview"
import { FinanceView } from "./finance-view"
import { ProjectsView } from "./projects-view"
import { ClientsView } from "./clients-view"
import { CalendarView } from "./calendar-view"
import { TimeView } from "./time-view"
import { NotesView } from "./notes-view"
import { ToolsView } from "./tools-view"

const navigation = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard, group: "Painel" },
  { id: "finance", label: "Financeiro", icon: CircleDollarSign, group: "Gestão" },
  { id: "projects", label: "Projetos", icon: BriefcaseBusiness, group: "Gestão" },
  { id: "clients", label: "Clientes", icon: UsersRound, group: "Gestão" },
  { id: "calendar", label: "Agenda", icon: CalendarDays, group: "Operação" },
  { id: "time", label: "Ponto", icon: Activity, group: "Operação" },
  { id: "notes", label: "Notinhas", icon: FileText, group: "Operação" },
  { id: "tools", label: "Ferramentas", icon: Wrench, group: "Administração" },
]

const titles: Record<string, { title: string; description: string }> = {
  overview: { title: "Visão geral", description: "A operação Addex em um só lugar." },
  finance: { title: "Financeiro", description: "Entradas, saídas e acompanhamento do caixa." },
  projects: { title: "Projetos", description: "Produção, prazos e entregáveis da equipe." },
  clients: { title: "Clientes", description: "Relacionamentos e histórico comercial." },
  calendar: { title: "Agenda", description: "Compromissos e marcos dos projetos." },
  time: { title: "Ponto", description: "Registro de horas e ritmo de trabalho." },
  notes: { title: "Notinhas", description: "Documentos comerciais prontos para compartilhar." },
  tools: { title: "Ferramentas", description: "Recursos rápidos e gestão de dados." },
}

type Toast = { id: number; message: string; kind: ToastKind } | null

async function fetchPortalData(url: string): Promise<PortalData> {
  const response = await fetch(url, { cache: "no-store" })
  if (response.status === 401) {
    window.location.assign("/login")
    throw new Error("Sua sessão expirou.")
  }
  if (!response.ok) throw new Error("Não foi possível carregar os dados da Addex.")
  return response.json() as Promise<PortalData>
}

export function Portal() {
  const [activeView, setActiveView] = useState("overview")
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [toast, setToast] = useState<Toast>(null)
  const { data, error, isLoading, mutate } = useSWR<PortalData>("/api/data", fetchPortalData, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  })

  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    setToast({ id: Date.now(), message, kind })
  }, [])

  const request = useCallback(async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) => {
    const url = method === "DELETE"
      ? `/api/data?collection=${encodeURIComponent(String(body.collection))}&id=${encodeURIComponent(String(body.id))}`
      : "/api/data"
    const response = await fetch(url, {
      method,
      ...(method === "DELETE" ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    })
    const result = (await response.json().catch(() => ({}))) as { error?: string }
    if (response.status === 401) {
      window.location.assign("/login")
      throw new Error("Sua sessão expirou. Entre novamente.")
    }
    if (!response.ok) throw new Error(result.error ?? "Não foi possível concluir a operação.")
    await mutate()
    return result
  }, [mutate])

  const actions: PortalActions = useMemo(() => ({
    add: async (collection, data) => {
      try {
        const result = await request("POST", { collection, data })
        notify("Registro salvo com segurança.", "success")
        return result
      } catch (error) {
        notify(error instanceof Error ? error.message : "Não foi possível salvar o registro.", "error")
        throw error
      }
    },
    update: async (collection, id, data) => {
      try {
        const result = await request("PATCH", { collection, id, data })
        notify("Alterações salvas.", "success")
        return result
      } catch (error) {
        notify(error instanceof Error ? error.message : "Não foi possível atualizar o registro.", "error")
        throw error
      }
    },
    remove: async (collection, id) => {
      try {
        await request("DELETE", { collection, id })
        notify("Registro removido.", "success")
      } catch (error) {
        notify(error instanceof Error ? error.message : "Não foi possível remover o registro.", "error")
        throw error
      }
    },
    notify,
    refresh: async () => { await mutate() },
  }), [mutate, notify, request])

  const page = titles[activeView]
  const currentDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date())

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
    } finally {
      window.location.assign("/login")
    }
  }

  if (isLoading && !data) {
    return <main className="portal-loading"><span className="brand-loop brand-loop-blue" aria-hidden="true" /><p>Preparando a central Addex…</p></main>
  }

  if (error || !data) {
    return <main className="portal-loading"><span className="brand-loop brand-loop-blue" aria-hidden="true" /><h1>Não foi possível abrir a central</h1><p>{error instanceof Error ? error.message : "Confira a conexão e tente novamente."}</p><button className="button button-primary" type="button" onClick={() => void mutate()}>Tentar novamente</button><button className="text-button" type="button" onClick={() => window.location.assign("/login")}>Voltar ao acesso</button></main>
  }

  return (
    <div className="portal-frame" data-theme={theme}>
      <div className="portal-shell">
        <aside className="sidebar">
          <a className="brand-lockup sidebar-brand" href="#inicio" onClick={(event) => { event.preventDefault(); setActiveView("overview") }} aria-label="Addex Central, início">
            <span className="brand-loop" aria-hidden="true" />
            <span className="brand-name">Addex<span>Company</span></span>
          </a>
          <div className="sidebar-workspace"><span className="workspace-avatar"><Command aria-hidden="true" /></span><span><strong>Central Addex</strong><small>Espaço da equipe</small></span><ChevronDown aria-hidden="true" /></div>
          <nav className="sidebar-nav" aria-label="Navegação principal">
            {Array.from(new Set(navigation.map((item) => item.group))).map((group) => <div className="nav-group" key={group}><span className="nav-group-label">{group}</span>{navigation.filter((item) => item.group === group).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`nav-item${activeView === item.id ? " active" : ""}`} aria-current={activeView === item.id ? "page" : undefined} onClick={() => setActiveView(item.id)}><Icon aria-hidden="true" /><span>{item.label}</span>{item.id === "projects" && data.projects.length ? <small>{data.projects.filter((project) => !["concluido", "cancelado"].includes(project.status)).length}</small> : null}</button> })}</div>)}
          </nav>
          <div className="sidebar-bottom"><div className="sidebar-security"><span><span className="security-dot" /> Acesso seguro</span><small>Dados sincronizados com Neon</small></div><div className="sidebar-user"><span className="user-avatar">A</span><span><strong>Equipe Addex</strong><small>Acesso compartilhado</small></span><button className="icon-button sidebar-more" type="button" aria-label="Encerrar sessão" onClick={() => void logout()}><MoreHorizontal aria-hidden="true" /></button></div></div>
        </aside>

        <main className="main-area" id="inicio">
          <header className="topbar"><div className="mobile-brand"><span className="brand-loop brand-loop-blue" aria-hidden="true" /><span>Addex Central</span></div><div className="topbar-heading"><div className="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>{page.title}</strong></div><p>{page.description}</p></div><div className="topbar-actions"><span className="topbar-date">{currentDate}</span><button className="icon-button theme-button" type="button" aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</button><button className="button button-quiet logout-button" type="button" onClick={() => void logout()}><LogOut aria-hidden="true" /> Sair</button></div></header>
          <div className="mobile-nav-wrap"><nav className="mobile-nav" aria-label="Navegação da equipe">{navigation.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={activeView === item.id ? "active" : ""} aria-current={activeView === item.id ? "page" : undefined} onClick={() => setActiveView(item.id)}><Icon aria-hidden="true" /><span>{item.label}</span></button> })}</nav></div>
          {toast ? <div className={`toast toast-${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}><span>{toast.kind === "error" ? <CircleAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span><p>{toast.message}</p><button className="icon-button small-icon" type="button" aria-label="Fechar aviso" onClick={() => setToast(null)}><X aria-hidden="true" /></button></div> : null}
          <div className="page-content">
            {activeView === "overview" ? <Overview data={data} actions={actions} onNavigate={setActiveView} /> : null}
            {activeView === "finance" ? <FinanceView data={data} actions={actions} /> : null}
            {activeView === "projects" ? <ProjectsView data={data} actions={actions} onNavigate={setActiveView} /> : null}
            {activeView === "clients" ? <ClientsView data={data} actions={actions} /> : null}
            {activeView === "calendar" ? <CalendarView data={data} actions={actions} /> : null}
            {activeView === "time" ? <TimeView data={data} actions={actions} /> : null}
            {activeView === "notes" ? <NotesView data={data} actions={actions} /> : null}
            {activeView === "tools" ? <ToolsView data={data} actions={actions} /> : null}
          </div>
          <footer className="portal-footer"><span>© {new Date().getFullYear()} Addex Company</span><span><span className="security-dot" /> Ambiente interno seguro</span></footer>
        </main>
      </div>
    </div>
  )
}
