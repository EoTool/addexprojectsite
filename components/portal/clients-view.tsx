"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ArrowUpRight, Download, Plus, Search, UsersRound } from "lucide-react"
import { formatCurrency, formatDate, initials, todayIso } from "@/lib/format"
import type { ClientRecord, PortalActions, PortalData, ProjectRecord } from "@/lib/portal-types"
import { Field, Modal, SectionHeading, StatusBadge } from "./ui"

const emptyClient = () => ({ name: "", discordId: "", registeredOn: todayIso(), responsible: "", source: "" })

export function ClientsView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  const [profile, setProfile] = useState<ClientRecord | null>(null)
  const [form, setForm] = useState(emptyClient())
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => data.clients.filter((client) => `${client.name} ${client.discordId} ${client.responsible} ${client.source}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [data.clients, query])
  const profileProjects = profile ? data.projects.filter((project) => project.clientId === profile.id) : []

  function openNew() {
    setEditing(null)
    setForm(emptyClient())
    setDialogOpen(true)
  }

  function openEdit(client: ClientRecord) {
    setProfile(null)
    setEditing(client)
    setForm({ name: client.name, discordId: client.discordId, registeredOn: client.registeredOn ?? "", responsible: client.responsible, source: client.source })
    setDialogOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { ...form, registeredOn: form.registeredOn || null }
    try {
      if (editing) await actions.update("clients", editing.id, payload)
      else await actions.add("clients", payload)
      setDialogOpen(false)
      setProfile(null)
    } catch {
      return
    }
  }

  async function remove(client: ClientRecord) {
    if (!window.confirm(`Remover ${client.name} da base Addex?`)) return
    try {
      await actions.remove("clients", client.id)
      setProfile(null)
    } catch {
      return
    }
  }

  return (
    <div className="view-stack">
      <section className="clients-banner">
        <span className="clients-banner-icon"><UsersRound aria-hidden="true" /></span>
        <div><p className="eyebrow">Relacionamento</p><h2>Boas parcerias começam com organização.</h2><p>Uma base clara para cuidar de cada marca e de cada conversa.</p></div>
        <strong>{String(data.clients.length).padStart(2, "0")} <span>clientes</span></strong>
      </section>
      <section className="panel table-panel">
        <SectionHeading eyebrow="CRM da equipe" title="Clientes" description="Acompanhe responsáveis, origem e projetos de cada relacionamento." actions={<div className="section-action-group"><a className="button button-quiet" href="/api/export?type=clientes"><Download aria-hidden="true" /> Exportar CSV</a><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Novo cliente</button></div>} />
        <div className="table-toolbar"><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Buscar clientes</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, responsável ou origem" /></label><span className="table-count">{filtered.length} registros</span></div>
        <div className="data-table-wrap"><table className="data-table clients-table"><thead><tr><th scope="col">Cliente</th><th scope="col">Responsável</th><th scope="col">Origem</th><th scope="col">Projetos</th><th scope="col">Cadastro</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {filtered.map((client) => {
            const projects = data.projects.filter((project) => project.clientId === client.id)
            return <tr key={client.id}><td><div className="client-cell"><span className="client-avatar">{initials(client.name)}</span><div><strong>{client.name}</strong>{client.discordId ? <small>{client.discordId}</small> : null}</div></div></td><td>{client.responsible || "—"}</td><td>{client.source || "—"}</td><td><span className="table-count">{projects.length} {projects.length === 1 ? "projeto" : "projetos"}</span></td><td>{formatDate(client.registeredOn, { year: "numeric" })}</td><td><button className="text-button" type="button" onClick={() => setProfile(client)}>Ver perfil <ArrowUpRight aria-hidden="true" /></button></td></tr>
          })}
          {!filtered.length ? <tr><td colSpan={6}><div className="table-empty"><span className="empty-mark" aria-hidden="true">A</span><strong>{data.clients.length ? "Nenhum cliente encontrado" : "Sua rede começa aqui"}</strong><p>Cadastre clientes e vincule projetos para acompanhar cada relacionamento.</p><button className="button button-primary" type="button" onClick={openNew}><Plus aria-hidden="true" /> Adicionar cliente</button></div></td></tr> : null}
        </tbody></table></div>
      </section>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Editar cliente" : "Novo cliente"} description="Registre as informações importantes para a equipe.">
        <form className="form-stack" onSubmit={submit}>
          <Field label="Nome do cliente ou marca" htmlFor="client-name"><input id="client-name" required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Nectar" /></Field>
          <div className="form-grid-two"><Field label="Discord" htmlFor="client-discord"><input id="client-discord" maxLength={100} value={form.discordId} onChange={(event) => setForm({ ...form, discordId: event.target.value })} placeholder="Usuário ou servidor" /></Field><Field label="Responsável Addex" htmlFor="client-responsible"><input id="client-responsible" maxLength={120} value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} placeholder="Pessoa de contato" /></Field></div>
          <div className="form-grid-two"><Field label="Origem do contato" htmlFor="client-source"><input id="client-source" maxLength={120} value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} placeholder="Indicação, Instagram…" /></Field><Field label="Data de cadastro" htmlFor="client-date"><input id="client-date" type="date" value={form.registeredOn} onChange={(event) => setForm({ ...form, registeredOn: event.target.value })} /></Field></div>
          <div className="modal-footer"><button className="button button-quiet" type="button" onClick={() => setDialogOpen(false)}>Cancelar</button><button className="button button-primary" type="submit">{editing ? "Salvar alterações" : "Adicionar cliente"}</button></div>
        </form>
      </Modal>

      <Modal open={Boolean(profile)} onClose={() => setProfile(null)} title={profile?.name ?? "Perfil do cliente"} description="Resumo do relacionamento e dos projetos cadastrados." wide>
        {profile ? <div className="client-profile"><div className="profile-summary"><span className="client-avatar client-avatar-large">{initials(profile.name)}</span><div><h3>{profile.name}</h3><p>{profile.discordId || "Discord não informado"}</p></div><div className="profile-actions"><button className="button button-quiet" type="button" onClick={() => openEdit(profile)}>Editar perfil</button><button className="button button-quiet danger-button" type="button" onClick={() => void remove(profile)}>Remover</button></div></div><div className="profile-metrics"><div><span>Projetos</span><strong>{profileProjects.length}</strong></div><div><span>Valor contratado</span><strong>{formatCurrency(profileProjects.reduce((sum, project) => sum + Number(project.value), 0))}</strong></div><div><span>Responsável</span><strong>{profile.responsible || "Não definido"}</strong></div><div><span>Origem</span><strong>{profile.source || "Não informada"}</strong></div></div><div className="profile-projects"><h3>Projetos deste cliente</h3>{profileProjects.length ? profileProjects.map((project: ProjectRecord) => <div className="profile-project-row" key={project.id}><div><strong>{project.name}</strong><small>Prazo {formatDate(project.deadline, { year: "numeric" })}</small></div><StatusBadge status={project.status} /><strong>{formatCurrency(project.value)}</strong></div>) : <p className="field-hint">Ainda não há projetos vinculados a este cliente.</p>}</div></div> : null}
      </Modal>
    </div>
  )
}
