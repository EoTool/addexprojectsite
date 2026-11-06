"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ArrowDownLeft, ArrowUpRight, Download, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency, formatDate, todayIso } from "@/lib/format"
import type { PortalActions, PortalData, TransactionRecord } from "@/lib/portal-types"
import { Field, Modal, SectionHeading, StatusBadge } from "./ui"

const categories = ["Projeto", "Assinatura", "Software", "Marketing", "Operacional", "Impostos", "Cartão de crédito", "Fatura do cartão", "Outro"]

type TransactionForm = {
  type: "entrada" | "saida"
  amount: string
  date: string
  category: string
  description: string
  isCredit: boolean
}

const emptyForm = (): TransactionForm => ({
  type: "saida",
  amount: "",
  date: todayIso(),
  category: "Operacional",
  description: "",
  isCredit: false,
})

export function FinanceView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionRecord | null>(null)
  const [form, setForm] = useState<TransactionForm>(emptyForm())
  const [query, setQuery] = useState("")
  const [period, setPeriod] = useState("month")
  const [typeFilter, setTypeFilter] = useState("all")
  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const monthRows = data.transactions.filter((item) => item.date.startsWith(monthKey))
  const monthIncome = monthRows.filter((item) => item.type === "entrada").reduce((sum, item) => sum + Number(item.amount), 0)
  const monthExpenses = monthRows.filter((item) => item.type === "saida").reduce((sum, item) => sum + Number(item.amount), 0)
  const creditSpend = monthRows.filter((item) => item.type === "saida" && item.isCredit).reduce((sum, item) => sum + Number(item.amount), 0)
  const creditPurchases = data.transactions.filter((item) => item.type === "saida" && item.isCredit).reduce((sum, item) => sum + Number(item.amount), 0)
  const creditPaid = data.transactions.filter((item) => item.type === "saida" && item.category.toLocaleLowerCase("pt-BR") === "fatura do cartão").reduce((sum, item) => sum + Number(item.amount), 0)
  const creditOpen = Math.max(0, creditPurchases - creditPaid)
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const value = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
    return { value, label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month) }
  }), [monthKey])
  const trendSeries = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (11 - index), 1)
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
    const entries = data.transactions.filter((item) => item.date.startsWith(key))
    return { month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(month), entradas: entries.filter((item) => item.type === "entrada").reduce((sum, item) => sum + Number(item.amount), 0), saidas: entries.filter((item) => item.type === "saida").reduce((sum, item) => sum + Number(item.amount), 0) }
  }), [data.transactions, monthKey])

  const filteredTransactions = useMemo(() => data.transactions.filter((item) => {
    const matchesQuery = `${item.description} ${item.category}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))
    const matchesType = typeFilter === "all" || item.type === typeFilter
    const matchesPeriod = period === "all" || item.date.startsWith(period === "month" ? monthKey : period)
    return matchesQuery && matchesType && matchesPeriod
  }), [data.transactions, monthKey, period, query, typeFilter])

  function openNew() {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  function openEdit(item: TransactionRecord) {
    setEditing(item)
    setForm({
      type: item.type,
      amount: String(item.amount),
      date: item.date,
      category: item.category,
      description: item.description,
      isCredit: item.isCredit,
    })
    setDialogOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { ...form, amount: Number(form.amount) }
    try {
      if (editing) await actions.update("transactions", editing.id, payload)
      else await actions.add("transactions", payload)
      setDialogOpen(false)
    } catch {
      return
    }
  }

  async function remove(item: TransactionRecord) {
    if (!window.confirm(`Remover o lançamento “${item.description}”?`)) return
    try {
      await actions.remove("transactions", item.id)
    } catch {
      return
    }
  }

  return (
    <div className="view-stack">
      <section className="finance-banner">
        <div><p className="eyebrow">Financeiro Addex</p><h2>O caixa em perspectiva.</h2><p>Registre movimentações e acompanhe o fluxo da equipe em um só lugar.</p></div>
        <div className="finance-banner-mark" aria-hidden="true"><span /></div>
      </section>

      <section className="kpi-grid finance-kpis" aria-label="Resumo financeiro">
        <article className="kpi-card"><div className="kpi-top"><span>Entradas · mês</span><span className="kpi-icon kpi-icon-blue"><ArrowDownLeft aria-hidden="true" /></span></div><strong>{formatCurrency(monthIncome)}</strong><span className="kpi-foot">Receita registrada</span></article>
        <article className="kpi-card"><div className="kpi-top"><span>Saídas · mês</span><span className="kpi-icon kpi-icon-rose"><ArrowUpRight aria-hidden="true" /></span></div><strong>{formatCurrency(monthExpenses)}</strong><span className="kpi-foot">Despesas registradas</span></article>
        <article className="kpi-card"><div className="kpi-top"><span>Saldo do mês</span><span className="kpi-icon kpi-icon-violet"><span className="saldo-symbol">±</span></span></div><strong className={monthIncome - monthExpenses < 0 ? "amount-negative" : ""}>{formatCurrency(monthIncome - monthExpenses)}</strong><span className="kpi-foot">Entradas menos saídas</span></article>
        <article className="kpi-card"><div className="kpi-top"><span>Compras no crédito</span><span className="kpi-icon kpi-icon-cyan"><span className="credit-symbol">▤</span></span></div><strong>{formatCurrency(creditSpend)}</strong><span className="kpi-foot">Despesas no cartão</span></article>
      </section>

      <section className="credit-summary" aria-label="Resumo do cartão de crédito"><article><span>Compras registradas</span><strong>{formatCurrency(creditPurchases)}</strong></article><article><span>Faturas pagas</span><strong>{formatCurrency(creditPaid)}</strong></article><article><span>Estimativa em aberto</span><strong>{formatCurrency(creditOpen)}</strong><small>Compras no crédito menos faturas pagas</small></article></section>

      <section className="panel finance-trend-panel"><SectionHeading eyebrow="Visão anual" title="Entradas e saídas" description="Comparativo mensal dos últimos 12 meses." /><div className="chart-legend"><span><i className="legend-dot legend-blue" /> Entradas</span><span><i className="legend-dot legend-cyan" /> Saídas</span></div><div className="chart-frame" role="img" aria-label="Gráfico anual de entradas e saídas"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trendSeries} margin={{ top: 8, right: 6, left: -16, bottom: 0 }} accessibilityLayer><CartesianGrid stroke="var(--line)" vertical={false} strokeDasharray="4 6" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} width={56} tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} /><Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: 14, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }} /><Area type="monotone" dataKey="entradas" name="Entradas" stroke="#2867f6" strokeWidth={2.5} fill="#2867f6" fillOpacity={0.1} /><Area type="monotone" dataKey="saidas" name="Saídas" stroke="#6cc9e8" strokeWidth={2.5} fill="#6cc9e8" fillOpacity={0.1} /></AreaChart></ResponsiveContainer></div></section>

      <section className="panel table-panel">
        <SectionHeading
          eyebrow="Lançamentos"
          title="Movimentações"
          description={`${filteredTransactions.length} registro${filteredTransactions.length === 1 ? "" : "s"} encontrado${filteredTransactions.length === 1 ? "" : "s"}.`}
          actions={<div className="section-action-group"><a className="button button-quiet" href="/api/export?type=financeiro"><Download aria-hidden="true" /> Exportar CSV</a><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Novo lançamento</button></div>}
        />
        <div className="table-toolbar">
          <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Buscar lançamentos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por descrição ou categoria" /></label>
          <label className="toolbar-select"><span className="sr-only">Período</span><select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="month">Este mês</option>{monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}<option value="all">Todo o período</option></select></label>
          <label className="toolbar-select"><span className="sr-only">Tipo de movimentação</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">Todos os tipos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option></select></label>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th scope="col">Movimentação</th><th scope="col">Categoria</th><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col" className="align-right">Valor</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td><div className="table-primary-text">{item.description}</div>{item.isCredit ? <span className="table-subtext">Cartão de crédito</span> : null}{item.projectId ? <span className="table-subtext">Vinculado ao projeto</span> : null}</td>
                  <td><span className="category-tag">{item.category}</span></td>
                  <td>{formatDate(item.date, { year: "numeric" })}</td>
                  <td><StatusBadge status={item.type} /></td>
                  <td className={`align-right table-amount ${item.type === "entrada" ? "amount-positive" : "amount-negative"}`}>{item.type === "entrada" ? "+" : "−"}{formatCurrency(item.amount)}</td>
                  <td><div className="row-actions">{!item.projectId ? <button className="icon-button small-icon" type="button" aria-label={`Editar ${item.description}`} onClick={() => openEdit(item)}><Pencil aria-hidden="true" /></button> : null}{!item.projectId ? <button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover ${item.description}`} onClick={() => void remove(item)}><Trash2 aria-hidden="true" /></button> : null}</div></td>
                </tr>
              ))}
              {!filteredTransactions.length ? <tr><td colSpan={6}><div className="table-empty"><span className="empty-mark" aria-hidden="true">A</span><strong>Nenhum lançamento encontrado</strong><p>Altere os filtros ou registre uma nova movimentação.</p><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Registrar lançamento</button></div></td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Editar lançamento" : "Novo lançamento"} description="Os dados são salvos de forma segura no portal Addex.">
        <form className="form-stack" onSubmit={submit}>
          <div className="form-grid-two">
            <Field label="Tipo" htmlFor="transaction-type"><select id="transaction-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as TransactionForm["type"] })}><option value="entrada">Entrada</option><option value="saida">Saída</option></select></Field>
            <Field label="Valor (R$)" htmlFor="transaction-amount"><input id="transaction-amount" type="number" min="0.01" max="9999999999.99" step="0.01" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0,00" /></Field>
          </div>
          <div className="form-grid-two">
            <Field label="Data" htmlFor="transaction-date"><input id="transaction-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></Field>
            <Field label="Categoria" htmlFor="transaction-category"><select id="transaction-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field>
          </div>
          <Field label="Descrição" htmlFor="transaction-description"><input id="transaction-description" maxLength={240} required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex.: Licença de software" /></Field>
          {form.type === "saida" ? <label className="check-row"><input type="checkbox" checked={form.isCredit} onChange={(event) => setForm({ ...form, isCredit: event.target.checked })} /><span>Compra no cartão de crédito</span></label> : null}
          <div className="modal-footer"><button className="button button-quiet" type="button" onClick={() => setDialogOpen(false)}>Cancelar</button><button className="button button-primary" type="submit">{editing ? "Salvar alterações" : "Registrar lançamento"}</button></div>
        </form>
      </Modal>
    </div>
  )
}
