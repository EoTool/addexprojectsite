"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { Calculator, Check, ClipboardCopy, Download, FileUp, ShieldCheck } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import type { PortalActions, PortalData, TimeEntryRecord } from "@/lib/portal-types"
import { SectionHeading } from "./ui"

function startOfWeekIso() {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date)
}

function elapsed(entry: TimeEntryRecord, now: number) {
  const live = entry.status === "running" && entry.startedAt ? Math.max(0, Math.floor((now - new Date(entry.startedAt).getTime()) / 1000)) : 0
  return entry.elapsedSeconds + live
}

export function ToolsView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [amount, setAmount] = useState("")
  const [discount, setDiscount] = useState("")
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<"discount" | "report" | "backup">("discount")
  const weekStart = startOfWeekIso()
  const now = Date.now()
  const weekTransactions = data.transactions.filter((item) => item.date >= weekStart)
  const weeklyIncome = weekTransactions.filter((item) => item.type === "entrada").reduce((sum, item) => sum + Number(item.amount), 0)
  const weeklyExpenses = weekTransactions.filter((item) => item.type === "saida").reduce((sum, item) => sum + Number(item.amount), 0)
  const weekTimes = data.timeEntries.filter((entry) => entry.recordedDay >= weekStart)
  const weeklySeconds = weekTimes.reduce((sum, entry) => sum + elapsed(entry, now), 0)
  const weekProjects = data.projects.filter((project) => (project.deadline && project.deadline >= weekStart) || (project.startDate && project.startDate >= weekStart))
  const discountedPrice = useMemo(() => Math.max(0, (Number(amount) || 0) * (1 - Math.min(100, Math.max(0, Number(discount) || 0)) / 100)), [amount, discount])
  const weekEnd = new Date()
  weekEnd.setHours(12, 0, 0, 0)
  const weeklySummary = [
    "RESUMO SEMANAL · ADDEX COMPANY",
    `Período: ${formatDate(weekStart)} a ${formatDate(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(weekEnd))}`,
    `Entradas: ${formatCurrency(weeklyIncome)}`,
    `Saídas: ${formatCurrency(weeklyExpenses)}`,
    `Saldo: ${formatCurrency(weeklyIncome - weeklyExpenses)}`,
    `Horas registradas: ${Math.floor(weeklySeconds / 3600)}h ${Math.floor((weeklySeconds % 3600) / 60)}min`,
    `Projetos com atividade ou prazo: ${weekProjects.length}`,
    `Clientes na base: ${data.clients.length}`,
  ].join("\n")

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(weeklySummary)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
      actions.notify("Resumo semanal copiado.", "success")
    } catch {
      actions.notify("Não foi possível copiar. Selecione o resumo e copie manualmente.", "error")
    }
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ""
    if (file.size > 5_000_000) {
      actions.notify("O arquivo deve ter até 5 MB.", "error")
      return
    }
    if (!window.confirm("Restaurar este backup substituirá os registros atuais do portal. Deseja continuar?")) return

    setBusy(true)
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(raw),
      })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(result.error ?? "Não foi possível restaurar o backup.")
      await actions.refresh()
      actions.notify("Backup restaurado com sucesso.", "success")
    } catch (error) {
      actions.notify(error instanceof Error ? error.message : "Arquivo de backup inválido.", "error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="view-stack">
      <section className="tools-banner"><span className="tools-banner-icon"><Calculator aria-hidden="true" /></span><div><p className="eyebrow">Apoio à operação</p><h2>Ferramentas para decidir melhor.</h2><p>Calculadora de desconto, resumo semanal e gestão segura dos dados.</p></div></section>
      <div className="tools-tabs" role="tablist" aria-label="Ferramentas Addex">{([{ id: "discount", label: "Desconto" }, { id: "report", label: "Resumo semanal" }, { id: "backup", label: "Backup e dados" }] as const).map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</div>

      {activeTab === "discount" ? <section className="tool-card-grid"><div className="panel calculator-panel"><SectionHeading eyebrow="Calculadora comercial" title="Aplicar desconto" description="Veja o preço final antes de enviar a proposta." /><div className="form-stack"><div className="form-grid-two"><label className="field"><span>Valor original (R$)</span><input type="number" min="0" max="9999999999.99" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0,00" /></label><label className="field"><span>Desconto (%)</span><input type="number" min="0" max="100" step="0.5" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder="0" /></label></div><div className="discount-results"><div><span>Valor do desconto</span><strong>{formatCurrency((Number(amount) || 0) - discountedPrice)}</strong></div><div className="discount-final"><span>Preço final</span><strong>{formatCurrency(discountedPrice)}</strong></div></div></div></div><aside className="panel calculator-aside"><span className="calculator-aside-icon"><Calculator aria-hidden="true" /></span><p className="eyebrow">Simples e rápido</p><h3>Transparência para fechar bons projetos.</h3><p>O cálculo é feito na hora e não altera o financeiro. Registre a entrada somente quando o valor estiver combinado.</p></aside></section> : null}

      {activeTab === "report" ? <section className="report-layout"><div className="panel report-card print-report"><SectionHeading eyebrow="Relatório da operação" title="Resumo semanal" description={`Semana iniciada em ${formatDate(weekStart, { year: "numeric" })}.`} /><div className="report-metrics"><div><span>Entradas</span><strong className="amount-positive">{formatCurrency(weeklyIncome)}</strong></div><div><span>Saídas</span><strong className="amount-negative">{formatCurrency(weeklyExpenses)}</strong></div><div><span>Saldo</span><strong>{formatCurrency(weeklyIncome - weeklyExpenses)}</strong></div><div><span>Horas registradas</span><strong>{Math.floor(weeklySeconds / 3600)}h {String(Math.floor((weeklySeconds % 3600) / 60)).padStart(2, "0")}min</strong></div><div><span>Projetos com atividade ou prazo</span><strong>{weekProjects.length}</strong></div><div><span>Clientes na base</span><strong>{data.clients.length}</strong></div></div><div className="report-activity"><h3>Movimentações da semana</h3>{weekTransactions.length ? weekTransactions.slice(0, 8).map((item) => <div className="report-row" key={item.id}><span>{item.description}<small>{formatDate(item.date)} · {item.category}</small></span><strong className={item.type === "entrada" ? "amount-positive" : "amount-negative"}>{item.type === "entrada" ? "+" : "−"}{formatCurrency(item.amount)}</strong></div>) : <p className="field-hint">Nenhuma movimentação financeira nesta semana.</p>}</div></div><aside className="panel report-actions"><span className="report-icon"><ClipboardCopy aria-hidden="true" /></span><h3>Compartilhe com a equipe.</h3><p>Copie uma versão em texto do resumo ou imprima para anexar ao acompanhamento semanal.</p><button type="button" className="button button-primary" onClick={copySummary}>{copied ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}{copied ? "Copiado" : "Copiar resumo"}</button><button type="button" className="button button-quiet" onClick={() => window.print()}>Imprimir resumo</button></aside></section> : null}

      {activeTab === "backup" ? <section className="backup-grid"><div className="panel backup-card"><span className="backup-icon"><Download aria-hidden="true" /></span><p className="eyebrow">Cópia de segurança</p><h3>Seus dados, sempre portáteis.</h3><p>Baixe um arquivo JSON com financeiro, projetos, clientes, agenda, ponto, notinhas e meta mensal.</p><a className="button button-primary" href="/api/backup"><Download aria-hidden="true" /> Baixar backup</a><p className="field-hint">Guarde o arquivo em um local privado e seguro.</p></div><div className="panel backup-card backup-restore-card"><span className="backup-icon"><FileUp aria-hidden="true" /></span><p className="eyebrow">Restauração</p><h3>Restaurar a partir de um arquivo.</h3><p>A restauração substitui os registros atuais. Faça um backup recente antes de continuar.</p><label className={`button button-quiet${busy ? " button-disabled" : ""}`} htmlFor="backup-file"><FileUp aria-hidden="true" />{busy ? "Restaurando…" : "Selecionar arquivo JSON"}</label><input className="sr-only" id="backup-file" type="file" accept="application/json,.json" disabled={busy} onChange={restoreBackup} /><p className="field-hint">Somente arquivos Addex JSON de até 5 MB.</p></div><div className="panel backup-security"><ShieldCheck aria-hidden="true" /><div><strong>Importação protegida</strong><p>O arquivo é validado no servidor e aplicado em uma única transação. Se houver erro, os dados atuais permanecem intactos.</p></div></div></section> : null}
    </div>
  )
}
