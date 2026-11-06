"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ArrowUpRight, Columns3, Download, List, Plus, Search, Trash2 } from "lucide-react"
import { formatCurrency, formatDate, todayIso } from "@/lib/format"
import type { ChecklistItem } from "@/lib/db/schema"
import type { ClientRecord, PortalActions, PortalData, ProjectRecord } from "@/lib/portal-types"
import { Field, Modal, SectionHeading, StatusBadge } from "./ui"

const statusOptions: { value: ProjectRecord["status"]; label: string }[] = [
  { value: "pendente", label: "Em andamento" },
  { value: "prioridade", label: "Prioridade" },
  { value: "pagamento", label: "Aguardando pagamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
]

const emptyProject = () => ({
  clientId: "",
  name: "",
  value: "",
  status: "pendente" as ProjectRecord["status"],
  description: "",
  referenceUrl: "",
  startDate: todayIso(),
  deadline: "",
  completedAt: "",
  checklist: [] as ChecklistItem[],
})

function clientFor(project: ProjectRecord, clients: ClientRecord[]) {
  return clients.find((client) => client.id === project.clientId)?.name ?? "Sem cliente vinculado"
}

export function ProjectsView({ data, actions, onNavigate }: { data: PortalData; actions: PortalActions; onNavigate: (view: string) => void }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectRecord | null>(null)
  const [form, setForm] = useState(emptyProject())
  const [checklistDraft, setChecklistDraft] = useState("")
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [layout, setLayout] = useState<"board" | "list">("board")

  const filtered = useMemo(() => data.projects.filter((project) => {
    const matchesQuery = `${project.name} ${clientFor(project, data.clients)}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))
    return matchesQuery && (statusFilter === "all" || project.status === statusFilter)
  }), [data.clients, data.projects, query, statusFilter])

  function openNew() {
    setEditing(null)
    setForm(emptyProject())
    setChecklistDraft("")
    setDialogOpen(true)
  }

  function openEdit(project: ProjectRecord) {
    setEditing(project)
    setForm({
      clientId: project.clientId ?? "",
      name: project.name,
      value: String(project.value),
      status: project.status,
      description: project.description,
      referenceUrl: project.referenceUrl,
      startDate: project.startDate ?? "",
      deadline: project.deadline ?? "",
      completedAt: project.completedAt ?? "",
      checklist: project.checklist ?? [],
    })
    setChecklistDraft("")
    setDialogOpen(true)
  }

  function addChecklistItem() {
    const label = checklistDraft.trim()
    if (!label) return
    setForm((current) => ({ ...current, checklist: [...current.checklist, { id: crypto.randomUUID(), label, done: false }] }))
    setChecklistDraft("")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = {
      ...form,
      clientId: form.clientId || null,
      value: Number(form.value || 0),
      startDate: form.startDate || null,
      deadline: form.deadline || null,
      completedAt: form.completedAt || null,
    }
    try {
      if (editing) await actions.update("projects", editing.id, payload)
      else await actions.add("projects", payload)
      setDialogOpen(false)
    } catch {
      return
    }
  }

  async function remove(project: ProjectRecord) {
    if (!window.confirm(`Remover o projeto “${project.name}” e a entrada financeira vinculada?`)) return
    try {
      await actions.remove("projects", project.id)
    } catch {
      return
    }
  }

  return (
    <div className="view-stack">
      <section className="projects-banner">
        <div><p className="eyebrow">Gestão de produção</p><h2>Ideias em movimento.<br /><span>Entregas no prazo.</span></h2><p>Organize o fluxo criativo da Addex do briefing à aprovação.</p></div>
        <div className="project-banner-stat"><strong>{data.projects.filter((project) => !["concluido", "cancelado"].includes(project.status)).length.toString().padStart(2, "0")}</strong><span>projetos ativos</span><ArrowUpRight aria-hidden="true" /></div>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="Portfólio interno" title="Projetos" description="Acompanhe status, prazos, valor e checklist de cada entrega." actions={<div className="section-action-group"><a className="button button-quiet" href="/api/export?type=projetos"><Download aria-hidden="true" /> Exportar CSV</a><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Novo projeto</button></div>} />
        <div className="table-toolbar">
          <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Buscar projetos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projeto ou cliente" /></label>
          <label className="toolbar-select"><span className="sr-only">Filtrar por status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option>{statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <div className="project-toolbar-actions"><div className="view-toggle" role="group" aria-label="Modo de visualização"><button type="button" className={layout === "board" ? "active" : ""} aria-pressed={layout === "board"} onClick={() => setLayout("board")}><Columns3 aria-hidden="true" /> Quadro</button><button type="button" className={layout === "list" ? "active" : ""} aria-pressed={layout === "list"} onClick={() => setLayout("list")}><List aria-hidden="true" /> Lista</button></div><button className="button button-quiet" type="button" onClick={() => onNavigate("clients")}>Ver clientes</button></div>
        </div>
        {filtered.length ? (
          layout === "board" ? <div className="project-board">
            {statusOptions.map((status) => {
              const items = filtered.filter((project) => project.status === status.value)
              return (
                <section className="project-column" key={status.value} aria-label={`${status.label}: ${items.length}`}>
                  <div className="column-heading"><StatusBadge status={status.value} /><span>{items.length}</span></div>
                  {items.map((project) => {
                    const doneCount = project.checklist.filter((item) => item.done).length
                    return (
                      <article className="project-card" key={project.id}>
                        <div className="project-card-top"><span className="project-card-client">{clientFor(project, data.clients)}</span><button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover projeto ${project.name}`} onClick={() => void remove(project)}><Trash2 aria-hidden="true" /></button></div>
                        <h3>{project.name}</h3>
                        <p className="project-card-description">{project.description || "Sem descrição adicionada."}</p>
                        <div className="project-card-meta"><strong>{formatCurrency(project.value)}</strong><span>Prazo: {formatDate(project.deadline, { year: "numeric" })}</span></div>
                        {project.checklist.length ? <div className="project-check-progress"><div><span>Checklist</span><span>{doneCount}/{project.checklist.length}</span></div><div className="progress-track"><span style={{ width: `${(doneCount / project.checklist.length) * 100}%` }} /></div></div> : null}
                        <button type="button" className="project-edit-button" onClick={() => openEdit(project)}>Abrir projeto <ArrowUpRight aria-hidden="true" /></button>
                      </article>
                    )
                  })}
                  {!items.length ? <div className="column-empty">Nenhum projeto</div> : null}
                </section>
              )
            })}
          </div> : <div className="data-table-wrap project-list-wrap"><table className="data-table"><thead><tr><th scope="col">Projeto</th><th scope="col">Cliente</th><th scope="col">Status</th><th scope="col">Prazo</th><th scope="col" className="align-right">Valor</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>{filtered.map((project) => <tr key={project.id}><td><div className="table-primary-text">{project.name}</div><span className="table-subtext">{project.description || "Sem descrição"}</span></td><td>{clientFor(project, data.clients)}</td><td><StatusBadge status={project.status} /></td><td>{formatDate(project.deadline, { year: "numeric" })}</td><td className="align-right table-amount">{formatCurrency(project.value)}</td><td><div className="row-actions"><button className="icon-button small-icon" type="button" aria-label={`Abrir projeto ${project.name}`} onClick={() => openEdit(project)}><ArrowUpRight aria-hidden="true" /></button><button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover projeto ${project.name}`} onClick={() => void remove(project)}><Trash2 aria-hidden="true" /></button></div></td></tr>)}</tbody></table></div>
        ) : (
          <div className="project-empty"><span className="empty-mark" aria-hidden="true">A</span><h3>{data.projects.length ? "Nenhum projeto para este filtro" : "Seu próximo projeto começa aqui"}</h3><p>Adicione cliente, prazo, valor e um checklist para acompanhar a produção com clareza.</p><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Cadastrar projeto</button></div>
        )}
      </section>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Editar projeto" : "Novo projeto"} description="O valor do projeto também é sincronizado com o financeiro." wide>
        <form className="form-stack" onSubmit={submit}>
          <div className="form-grid-two">
            <Field label="Nome do projeto" htmlFor="project-name"><input id="project-name" required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Identidade visual Nectar" /></Field>
            <Field label="Cliente" htmlFor="project-client"><select id="project-client" value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })}><option value="">Sem cliente vinculado</option>{data.clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          </div>
          <div className="form-grid-three">
            <Field label="Valor (R$)" htmlFor="project-value"><input id="project-value" type="number" min="0" max="9999999999.99" step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} placeholder="0,00" /></Field>
            <Field label="Status" htmlFor="project-status"><select id="project-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectRecord["status"] })}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Data de início" htmlFor="project-start"><input id="project-start" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field>
          </div>
          <div className="form-grid-two">
            <Field label="Prazo de entrega" htmlFor="project-deadline"><input id="project-deadline" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></Field>
            <Field label="Link de referência" htmlFor="project-reference"><input id="project-reference" type="url" maxLength={500} value={form.referenceUrl} onChange={(event) => setForm({ ...form, referenceUrl: event.target.value })} placeholder="https://…" /></Field>
          </div>
          <Field label="Briefing e observações" htmlFor="project-description"><textarea id="project-description" rows={3} maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Contexto, entregáveis ou próximos passos" /></Field>
          <fieldset className="checklist-editor">
            <legend>Checklist de produção</legend>
            {form.checklist.length ? <div className="checklist-items">{form.checklist.map((item) => <div className="checklist-edit-row" key={item.id}><label className="check-row"><input type="checkbox" checked={item.done} onChange={(event) => setForm({ ...form, checklist: form.checklist.map((current) => current.id === item.id ? { ...current, done: event.target.checked } : current) })} /><span className={item.done ? "check-done" : ""}>{item.label}</span></label><button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover ${item.label} do checklist`} onClick={() => setForm({ ...form, checklist: form.checklist.filter((current) => current.id !== item.id) })}><Trash2 aria-hidden="true" /></button></div>)}</div> : <p className="field-hint">Inclua etapas para deixar o andamento visível.</p>}
            <div className="checklist-add-row"><input aria-label="Nova etapa do checklist" value={checklistDraft} maxLength={120} onChange={(event) => setChecklistDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); addChecklistItem() } }} placeholder="Ex.: Aprovar direção visual" /><button type="button" className="button button-quiet" onClick={addChecklistItem}><Plus aria-hidden="true" /> Adicionar etapa</button></div>
          </fieldset>
          <div className="modal-footer"><button className="button button-quiet" type="button" onClick={() => setDialogOpen(false)}>Cancelar</button><button className="button button-primary" type="submit">{editing ? "Salvar alterações" : "Criar projeto"}</button></div>
        </form>
      </Modal>
    </div>
  )
}
