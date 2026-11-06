"use client"

import { useMemo, useState, type FormEvent } from "react"
import { ArrowLeft, ArrowRight, CalendarPlus, Clock3, Pencil, Plus, Trash2 } from "lucide-react"
import { formatDate, todayIso } from "@/lib/format"
import type { CalendarEventRecord, PortalActions, PortalData, ProjectRecord } from "@/lib/portal-types"
import { Field, Modal, SectionHeading, StatusBadge } from "./ui"

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const blankEvent = (date: string) => ({ title: "", eventDate: date, eventTime: "", description: "" })

export function CalendarView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(todayIso())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CalendarEventRecord | null>(null)
  const [form, setForm] = useState(blankEvent(todayIso()))
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(month)

  const days = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    return Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1))
  }, [month])

  const selectedEvents = data.events.filter((event) => event.eventDate === selectedDate).sort((a, b) => (a.eventTime ?? "").localeCompare(b.eventTime ?? ""))
  const selectedProjects = data.projects.filter((project) => project.deadline === selectedDate || project.startDate === selectedDate)
  const today = todayIso()
  const activeDeadlineProjects = data.projects.filter((project) => project.deadline && !["concluido", "cancelado"].includes(project.status))
  const overdueProjects = activeDeadlineProjects.filter((project) => project.deadline! < today).sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
  const upcomingProjects = activeDeadlineProjects.filter((project) => project.deadline! >= today).sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? "")).slice(0, 8)
  const allMonthCounts = new Map<string, number>()
  data.events.forEach((event) => allMonthCounts.set(event.eventDate, (allMonthCounts.get(event.eventDate) ?? 0) + 1))

  function openNew() {
    setEditing(null)
    setForm(blankEvent(selectedDate))
    setDialogOpen(true)
  }

  function openEdit(event: CalendarEventRecord) {
    setEditing(event)
    setForm({ title: event.title, eventDate: event.eventDate, eventTime: event.eventTime ?? "", description: event.description })
    setDialogOpen(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = { ...form, eventTime: form.eventTime || null }
    try {
      if (editing) await actions.update("events", editing.id, payload)
      else await actions.add("events", payload)
      setSelectedDate(form.eventDate)
      setDialogOpen(false)
    } catch {
      return
    }
  }

  async function remove(event: CalendarEventRecord) {
    if (!window.confirm(`Remover o evento “${event.title}”?`)) return
    try {
      await actions.remove("events", event.id)
    } catch {
      return
    }
  }

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  function dateKey(date: Date) {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date)
  }

  function selectProject(project: ProjectRecord) {
    const date = project.deadline ?? project.startDate
    if (!date) return
    setSelectedDate(date)
    const parsed = new Date(`${date}T12:00:00`)
    setMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
  }

  return (
    <div className="view-stack">
      <section className="panel calendar-panel">
        <SectionHeading eyebrow="Planejamento" title="Agenda da equipe" description="Eventos, prazos de entrega e inícios de projeto em uma visão mensal." actions={<button className="button button-primary" type="button" onClick={openNew}><CalendarPlus aria-hidden="true" /> Novo evento</button>} />
        <div className="calendar-layout">
          <div className="calendar-main">
            <div className="calendar-month-bar"><div><p className="eyebrow">Calendário Addex</p><h3>{monthLabel}</h3></div><div className="calendar-nav"><button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => moveMonth(-1)}><ArrowLeft aria-hidden="true" /></button><button type="button" className="button button-quiet" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(todayIso()) }}>Hoje</button><button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => moveMonth(1)}><ArrowRight aria-hidden="true" /></button></div></div>
            <div className="calendar-grid" role="grid" aria-label={`Calendário de ${monthLabel}`}>
              {weekdays.map((day) => <div className="calendar-weekday" role="columnheader" key={day}>{day}</div>)}
              {days.map((date) => {
                const key = dateKey(date)
                const isCurrentMonth = date.getMonth() === month.getMonth()
                const isSelected = key === selectedDate
                const isToday = key === todayIso()
                const eventCount = allMonthCounts.get(key) ?? 0
                const projectCount = data.projects.filter((project) => project.deadline === key || project.startDate === key).length
                return <button className={`calendar-day${isCurrentMonth ? "" : " outside-month"}${isSelected ? " selected-day" : ""}${isToday ? " today-day" : ""}`} role="gridcell" aria-selected={isSelected} aria-label={`${new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(date)}${eventCount ? `, ${eventCount} eventos` : ""}${projectCount ? `, ${projectCount} prazos de projeto` : ""}`} type="button" key={key} onClick={() => setSelectedDate(key)}><span className="calendar-day-number">{date.getDate()}</span>{eventCount || projectCount ? <span className="calendar-dots" aria-hidden="true">{eventCount ? <i /> : null}{projectCount ? <i className="project-dot" /> : null}</span> : null}</button>
              })}
            </div>
            <div className="calendar-legend"><span><i className="legend-dot legend-blue" /> Eventos</span><span><i className="legend-dot legend-cyan" /> Prazos de projeto</span></div>
          </div>
          <aside className="calendar-agenda" aria-label="Agenda do dia selecionado">
            <div className="agenda-header"><div><p className="eyebrow">Agenda do dia</p><h3>{formatDate(selectedDate, { weekday: "long", year: "numeric" })}</h3></div><button type="button" className="icon-button" onClick={openNew} aria-label="Adicionar evento"><Plus aria-hidden="true" /></button></div>
            {selectedEvents.length || selectedProjects.length ? <div className="agenda-items">
              {selectedEvents.map((event) => <article className="agenda-item" key={event.id}><span className="agenda-item-mark" /><div className="agenda-item-copy"><div className="agenda-item-title"><strong>{event.title}</strong>{event.eventTime ? <span><Clock3 aria-hidden="true" /> {event.eventTime}</span> : null}</div>{event.description ? <p>{event.description}</p> : null}<div className="agenda-item-actions"><button type="button" className="text-button" onClick={() => openEdit(event)}><Pencil aria-hidden="true" /> Editar</button><button type="button" className="text-button danger-text" onClick={() => void remove(event)}><Trash2 aria-hidden="true" /> Remover</button></div></div></article>)}
              {selectedProjects.map((project) => <button className="agenda-project" key={project.id} type="button" onClick={() => selectProject(project)}><span className="agenda-project-mark" /><span><strong>{project.name}</strong><small>{project.deadline === selectedDate ? "Prazo de entrega" : "Início do projeto"}</small></span><StatusBadge status={project.status} /></button>)}
            </div> : <div className="agenda-empty"><CalendarPlus aria-hidden="true" /><p>Nada agendado para este dia.</p><button className="text-button" type="button" onClick={openNew}><Plus aria-hidden="true" /> Criar evento</button></div>}
          </aside>
        </div>
      </section>

      <div className="calendar-reminders"><section className="panel reminder-panel"><SectionHeading eyebrow="Atenção" title="Prazos vencidos" description="Projetos em andamento que precisam de acompanhamento." />{overdueProjects.length ? <div className="reminder-list">{overdueProjects.map((project) => <button className="reminder-row reminder-overdue" type="button" key={project.id} onClick={() => selectProject(project)}><span className="reminder-mark" /><span><strong>{project.name}</strong><small>{formatDate(project.deadline, { year: "numeric" })} · {data.clients.find((client) => client.id === project.clientId)?.name ?? "Sem cliente"}</small></span><StatusBadge status={project.status} /></button>)}</div> : <div className="compact-empty"><CalendarPlus aria-hidden="true" /><p>Nenhum prazo vencido.</p></div>}</section><section className="panel reminder-panel"><SectionHeading eyebrow="Próximos passos" title="Entregas futuras" description="Os oito prazos mais próximos da equipe." />{upcomingProjects.length ? <div className="reminder-list">{upcomingProjects.map((project) => <button className="reminder-row" type="button" key={project.id} onClick={() => selectProject(project)}><span className="reminder-mark" /><span><strong>{project.name}</strong><small>{formatDate(project.deadline, { year: "numeric" })} · {data.clients.find((client) => client.id === project.clientId)?.name ?? "Sem cliente"}</small></span><StatusBadge status={project.status} /></button>)}</div> : <div className="compact-empty"><CalendarPlus aria-hidden="true" /><p>Cadastre prazos para organizar a fila de entregas.</p></div>}</section></div>

      <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? "Editar evento" : "Novo evento"} description="Organize reuniões, revisões e outros compromissos da equipe.">
        <form className="form-stack" onSubmit={submit}>
          <Field label="Título do evento" htmlFor="event-title"><input id="event-title" required maxLength={160} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex.: Revisão de identidade visual" /></Field>
          <div className="form-grid-two"><Field label="Data" htmlFor="event-date"><input id="event-date" type="date" required value={form.eventDate} onChange={(event) => setForm({ ...form, eventDate: event.target.value })} /></Field><Field label="Horário" htmlFor="event-time"><input id="event-time" type="time" value={form.eventTime} onChange={(event) => setForm({ ...form, eventTime: event.target.value })} /></Field></div>
          <Field label="Observações" htmlFor="event-description"><textarea id="event-description" rows={3} maxLength={1000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Pauta ou informações úteis" /></Field>
          <div className="modal-footer"><button className="button button-quiet" type="button" onClick={() => setDialogOpen(false)}>Cancelar</button><button className="button button-primary" type="submit">{editing ? "Salvar alterações" : "Adicionar à agenda"}</button></div>
        </form>
      </Modal>
    </div>
  )
}
