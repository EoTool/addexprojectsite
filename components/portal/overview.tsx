"use client"

import { useMemo, useState } from "react"
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Plus,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { formatCurrency, formatDate } from "@/lib/format"
import type { PortalActions, PortalData, ProjectRecord } from "@/lib/portal-types"
import { SectionHeading, StatusBadge } from "./ui"

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const projectStatusConfig = [
  { value: "pendente", label: "Em andamento", color: "#2867f6" },
  { value: "prioridade", label: "Prioridade", color: "#6c73e8" },
  { value: "pagamento", label: "Aguardando pagamento", color: "#eab750" },
  { value: "concluido", label: "Concluídos", color: "#32a886" },
  { value: "cancelado", label: "Cancelados", color: "#94a3b8" },
]

function getMonthlySeries(data: PortalData) {
  const now = new Date()
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const monthTransactions = data.transactions.filter((transaction) => transaction.date.startsWith(key))
    return {
      month: monthNames[date.getMonth()],
      entradas: monthTransactions
        .filter((transaction) => transaction.type === "entrada")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      saidas: monthTransactions
        .filter((transaction) => transaction.type === "saida")
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    }
  })
}

function projectClientName(project: ProjectRecord, data: PortalData) {
  return data.clients.find((client) => client.id === project.clientId)?.name ?? "Cliente não vinculado"
}

export function Overview({ data, actions, onNavigate }: { data: PortalData; actions: PortalActions; onNavigate: (view: string) => void }) {
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const currentMonthTransactions = data.transactions.filter((item) => item.date.startsWith(monthKey))
  const income = currentMonthTransactions
    .filter((item) => item.type === "entrada")
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const expenses = currentMonthTransactions
    .filter((item) => item.type === "saida")
    .reduce((sum, item) => sum + Number(item.amount), 0)
  const openProjects = data.projects.filter((project) => !["concluido", "cancelado"].includes(project.status))
  const upcomingProjects = [...openProjects]
    .filter((project) => project.deadline && project.deadline >= new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(now))
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 4)
  const series = useMemo(() => getMonthlySeries(data), [data])
  const projectStatusData = projectStatusConfig.map((status) => ({ ...status, count: data.projects.filter((project) => project.status === status.value).length })).filter((status) => status.count > 0)
  const [goalDraft, setGoalDraft] = useState(String(data.monthlyGoal || ""))
  const goalProgress = data.monthlyGoal > 0 ? Math.min(100, (income / data.monthlyGoal) * 100) : 0
  const chartHasData = series.some((month) => month.entradas > 0 || month.saidas > 0)
  const greetingDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(now)

  async function saveGoal() {
    const monthlyGoal = Number(goalDraft)
    if (!Number.isFinite(monthlyGoal) || monthlyGoal < 0) {
      actions.notify("Informe uma meta mensal válida.", "error")
      return
    }
    try {
      await actions.add("settings", { monthlyGoal })
    } catch {
      return
    }
  }

  return (
    <div className="view-stack">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <p className="welcome-date">{greetingDate}</p>
          <h2>Controle claro.<br /><span>Equipe no ritmo.</span></h2>
          <p>Uma visão segura da operação Addex, do primeiro contato à entrega final.</p>
          <button className="button button-light" type="button" onClick={() => onNavigate("projects")}>
            Acompanhar projetos <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className="welcome-aside" aria-label="Resumo da operação">
          <div className="welcome-symbol" aria-hidden="true"><span /></div>
          <div className="welcome-aside-label"><span className="live-dot" /> Central da equipe</div>
          <p>Visão geral<br />{data.projects.length} projetos · {data.clients.length} clientes</p>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Indicadores do mês">
        <article className="kpi-card">
          <div className="kpi-top"><span>Entradas do mês</span><span className="kpi-icon kpi-icon-blue"><ArrowDownLeft aria-hidden="true" /></span></div>
          <strong>{formatCurrency(income)}</strong>
          <span className="kpi-foot">Financeiro · {monthNames[now.getMonth()]} {now.getFullYear()}</span>
        </article>
        <article className="kpi-card">
          <div className="kpi-top"><span>Saídas do mês</span><span className="kpi-icon kpi-icon-rose"><ArrowUpRight aria-hidden="true" /></span></div>
          <strong>{formatCurrency(expenses)}</strong>
          <span className="kpi-foot">Despesas registradas</span>
        </article>
        <article className="kpi-card">
          <div className="kpi-top"><span>Projetos ativos</span><span className="kpi-icon kpi-icon-violet"><BriefcaseBusiness aria-hidden="true" /></span></div>
          <strong>{openProjects.length}</strong>
          <span className="kpi-foot">Em produção ou aguardando</span>
        </article>
        <article className="kpi-card">
          <div className="kpi-top"><span>Clientes na base</span><span className="kpi-icon kpi-icon-cyan"><UsersRound aria-hidden="true" /></span></div>
          <strong>{data.clients.length}</strong>
          <span className="kpi-foot">Relacionamentos Addex</span>
        </article>
      </section>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <SectionHeading
            eyebrow="Desempenho"
            title="Fluxo financeiro"
            description="Entradas e saídas nos últimos 12 meses."
            actions={<button className="text-button" type="button" onClick={() => onNavigate("finance")}>
              Ver financeiro <ArrowRight aria-hidden="true" />
            </button>}
          />
          <div className="chart-legend"><span><i className="legend-dot legend-blue" /> Entradas</span><span><i className="legend-dot legend-cyan" /> Saídas</span></div>
          {chartHasData ? (
            <div className="chart-frame" role="img" aria-label="Gráfico de entradas e saídas mensais">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 5, left: -16, bottom: 0 }} accessibilityLayer>
                  <defs>
                    <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2867f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2867f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6cc9e8" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#6cc9e8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--line)" vertical={false} strokeDasharray="4 6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} width={56} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 14, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }} />
                  <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#2867f6" strokeWidth={2.5} fill="url(#incomeFill)" activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#6cc9e8" strokeWidth={2.5} fill="url(#expenseFill)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty"><CircleDollarSign aria-hidden="true" /><p>Seu fluxo aparecerá aqui quando os primeiros lançamentos forem registrados.</p><button className="text-button" type="button" onClick={() => onNavigate("finance")}>Adicionar lançamento</button></div>
          )}
        </section>

        <section className="panel goal-panel">
          <SectionHeading eyebrow="Planejamento" title="Meta mensal" description="Acompanhe as entradas em relação à meta da equipe." />
          <div className="goal-total"><strong>{formatCurrency(income)}</strong><span>de {formatCurrency(data.monthlyGoal)}</span></div>
          <div className="progress-track" role="progressbar" aria-label="Progresso da meta mensal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(goalProgress)}>
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          <div className="goal-progress-caption"><span>{Math.round(goalProgress)}% alcançado</span><span>{formatCurrency(Math.max(0, data.monthlyGoal - income))} restantes</span></div>
          <div className="goal-edit-row">
            <label htmlFor="monthly-goal">Definir meta</label>
            <div><span>R$</span><input id="monthly-goal" inputMode="decimal" type="number" min="0" step="100" value={goalDraft} onChange={(event) => setGoalDraft(event.target.value)} /><button type="button" onClick={saveGoal}>Salvar</button></div>
          </div>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="panel">
          <SectionHeading eyebrow="Produção" title="Próximas entregas" description="Projetos com prazo mais próximo." actions={<button className="text-button" type="button" onClick={() => onNavigate("projects")}>Ver todos <ArrowRight aria-hidden="true" /></button>} />
          {upcomingProjects.length ? (
            <div className="upcoming-list">
              {upcomingProjects.map((project) => (
                <button type="button" className="upcoming-row" key={project.id} onClick={() => onNavigate("projects")}>
                  <span className="upcoming-icon"><CalendarDays aria-hidden="true" /></span>
                  <span className="upcoming-main"><strong>{project.name}</strong><small>{projectClientName(project, data)}</small></span>
                  <span className="upcoming-date">{formatDate(project.deadline, { year: "numeric" })}</span>
                  <StatusBadge status={project.status} />
                </button>
              ))}
            </div>
          ) : (
            <div className="compact-empty"><Target aria-hidden="true" /><p>Nenhuma entrega futura cadastrada.</p><button className="text-button" type="button" onClick={() => onNavigate("projects")}><Plus aria-hidden="true" /> Criar projeto</button></div>
          )}
        </section>

        <section className="panel recent-panel">
          <SectionHeading eyebrow="Movimentações" title="Atividade recente" description="Últimos registros do financeiro." actions={<button className="text-button" type="button" onClick={() => onNavigate("finance")}>Abrir financeiro <ArrowRight aria-hidden="true" /></button>} />
          {data.transactions.length ? (
            <div className="recent-list">
              {data.transactions.slice(0, 5).map((item) => (
                <div className="recent-row" key={item.id}>
                  <span className={`recent-icon ${item.type === "entrada" ? "recent-income" : "recent-expense"}`}>{item.type === "entrada" ? <ArrowDownLeft aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}</span>
                  <span className="recent-main"><strong>{item.description}</strong><small>{item.category} · {formatDate(item.date)}</small></span>
                  <strong className={item.type === "entrada" ? "amount-positive" : "amount-negative"}>{item.type === "entrada" ? "+" : "−"}{formatCurrency(item.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="compact-empty"><Clock3 aria-hidden="true" /><p>As movimentações aparecerão assim que forem registradas.</p></div>
          )}
        </section>
      </div>

      <div className="dashboard-grid projects-chart-grid"><section className="panel project-status-panel"><SectionHeading eyebrow="Produção" title="Projetos por status" description="Distribuição atual da carteira de trabalho." actions={<button className="text-button" type="button" onClick={() => onNavigate("projects")}>Abrir projetos <ArrowRight aria-hidden="true" /></button>} />{projectStatusData.length ? <div className="project-status-chart"><div className="project-donut" role="img" aria-label={`Distribuição de ${data.projects.length} projetos por status`}><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer><Pie data={projectStatusData} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="var(--surface)">{projectStatusData.map((status) => <Cell key={status.value} fill={status.color} />)}</Pie><Tooltip formatter={(value) => [value, "Projetos"]} contentStyle={{ borderRadius: 14, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }} /></PieChart></ResponsiveContainer><div className="donut-total"><strong>{data.projects.length}</strong><span>projetos</span></div></div><ul className="project-status-legend">{projectStatusData.map((status) => <li key={status.value}><span><i style={{ background: status.color }} />{status.label}</span><strong>{status.count}</strong></li>)}</ul></div> : <div className="compact-empty"><BriefcaseBusiness aria-hidden="true" /><p>Adicione projetos para acompanhar a distribuição por status.</p><button className="text-button" type="button" onClick={() => onNavigate("projects")}><Plus aria-hidden="true" /> Criar projeto</button></div>}</section></div>

      <section className="quick-actions">
        <div><span className="quick-action-icon"><Sparkles aria-hidden="true" /></span><div><strong>Pronto para organizar a próxima etapa?</strong><p>Cadastre um projeto, registre um cliente ou acompanhe o caixa.</p></div></div>
        <div className="quick-action-buttons"><button type="button" className="button button-primary" onClick={() => onNavigate("projects")}><Plus aria-hidden="true" /> Novo projeto</button><button type="button" className="button button-quiet" onClick={() => onNavigate("clients")}>Adicionar cliente</button></div>
      </section>
    </div>
  )
}
