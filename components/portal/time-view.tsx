"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, CalendarClock, CirclePause, CirclePlay, Download, Play, Square, Timer, Trash2 } from "lucide-react"
import { formatDate, formatDuration, todayIso } from "@/lib/format"
import type { PortalActions, PortalData, TimeEntryRecord } from "@/lib/portal-types"
import { SectionHeading, StatusBadge } from "./ui"

function totalSeconds(entry: TimeEntryRecord, now: number) {
  const live = entry.status === "running" && entry.startedAt ? Math.max(0, Math.floor((now - new Date(entry.startedAt).getTime()) / 1000)) : 0
  return entry.elapsedSeconds + live
}

function weekStartIso() {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(date)
}

export function TimeView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [worker, setWorker] = useState("")
  const [task, setTask] = useState("")
  const [period, setPeriod] = useState<"week" | "month">("week")
  const [now, setNow] = useState(Date.now())
  const selectedWorker = worker.trim().toLocaleLowerCase("pt-BR")
  const ownOpenEntries = data.timeEntries.filter((entry) => entry.worker.toLocaleLowerCase("pt-BR") === selectedWorker && entry.status !== "finished")
  const activeEntry = ownOpenEntries[0]
  const activeTeamEntries = data.timeEntries.filter((entry) => entry.status !== "finished")
  const startOfWeek = weekStartIso()
  const monthKey = todayIso().slice(0, 7)
  const filteredEntries = data.timeEntries.filter((entry) => period === "week" ? entry.recordedDay >= startOfWeek : entry.recordedDay.startsWith(monthKey))
  const totalPeriod = useMemo(() => filteredEntries.reduce((sum, entry) => sum + totalSeconds(entry, now), 0), [filteredEntries, now])
  const ownEntries = data.timeEntries.filter((entry) => !selectedWorker || entry.worker.toLocaleLowerCase("pt-BR") === selectedWorker)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  async function startTimer() {
    if (!worker.trim()) {
      actions.notify("Informe quem está registrando o ponto.", "error")
      return
    }
    try {
      await actions.add("timeEntries", { worker: worker.trim(), task: task.trim() })
      setTask("")
    } catch {
      return
    }
  }

  async function changeTimer(entry: TimeEntryRecord, action: "pause" | "resume" | "finish") {
    try {
      await actions.update("timeEntries", entry.id, { action })
    } catch {
      return
    }
  }

  async function removeEntry(entry: TimeEntryRecord) {
    if (!window.confirm(`Remover o registro de ${entry.worker} em ${formatDate(entry.recordedDay)}?`)) return
    try {
      await actions.remove("timeEntries", entry.id)
    } catch {
      return
    }
  }

  const reportHours = Math.floor(totalPeriod / 3600)
  const reportMinutes = Math.floor((totalPeriod % 3600) / 60)

  return (
    <div className="view-stack">
      <section className="time-hero">
        <div className="time-hero-copy"><p className="eyebrow">Ritmo sustentável</p><h2>Tempo bem cuidado.<br /><span>Trabalho bem entregue.</span></h2><p>Registre as horas da equipe e tenha uma leitura simples da semana.</p></div>
        <div className="time-hero-icon" aria-hidden="true"><Timer /></div>
      </section>

      <div className="time-layout">
        <section className="panel time-clock-panel">
          <SectionHeading eyebrow="Registro de jornada" title="Ponto Addex" description="Cada cronômetro é identificado pelo nome do responsável." />
          <div className="clock-fields"><label className="field"><span>Responsável</span><input maxLength={80} value={worker} onChange={(event) => setWorker(event.target.value)} placeholder="Nome da pessoa" autoComplete="name" /></label><label className="field"><span>Atividade</span><input maxLength={240} value={task} onChange={(event) => setTask(event.target.value)} placeholder="Ex.: Ajustes de identidade" /></label></div>
          <div className={`clock-display${activeEntry?.status === "running" ? " clock-running" : ""}`}><span className="clock-display-label">{activeEntry ? activeEntry.status === "running" ? "CRONÔMETRO EM ANDAMENTO" : "CRONÔMETRO PAUSADO" : "PRONTO PARA COMEÇAR"}</span><strong>{activeEntry ? formatDuration(totalSeconds(activeEntry, now)) : "00:00:00"}</strong><span className="clock-task">{activeEntry?.task || "Sem atividade selecionada"}</span></div>
          <div className="clock-actions">{!activeEntry ? <button className="button button-primary" type="button" onClick={startTimer}><Play aria-hidden="true" /> Iniciar ponto</button> : <>{activeEntry.status === "running" ? <button className="button button-quiet" type="button" onClick={() => void changeTimer(activeEntry, "pause")}><CirclePause aria-hidden="true" /> Pausar</button> : <button className="button button-primary" type="button" onClick={() => void changeTimer(activeEntry, "resume")}><CirclePlay aria-hidden="true" /> Retomar</button>}<button className="button button-danger" type="button" onClick={() => void changeTimer(activeEntry, "finish")}><Square aria-hidden="true" /> Encerrar</button></>}</div>
          <div className="clock-note"><Activity aria-hidden="true" /><span>O cronômetro continua salvo mesmo se você fechar esta página.</span></div>
        </section>

        <section className="panel period-panel">
          <SectionHeading eyebrow="Resumo de horas" title="Período" description="Total calculado com os registros salvos da equipe." />
          <div className="period-switch" role="group" aria-label="Período do resumo"><button className={period === "week" ? "selected" : ""} type="button" onClick={() => setPeriod("week")}>Esta semana</button><button className={period === "month" ? "selected" : ""} type="button" onClick={() => setPeriod("month")}>Este mês</button></div>
          <div className="period-total"><span>{period === "week" ? "Horas registradas na semana" : "Horas registradas no mês"}</span><strong>{reportHours}<small>h</small> {String(reportMinutes).padStart(2, "0")}<small>min</small></strong><div className="period-total-caption"><CalendarClock aria-hidden="true" /> {filteredEntries.length} registros no período</div></div>
          <div className="period-worker-list">{[...new Set(filteredEntries.map((entry) => entry.worker))].slice(0, 4).map((name) => { const seconds = filteredEntries.filter((entry) => entry.worker === name).reduce((sum, entry) => sum + totalSeconds(entry, now), 0); return <div key={name}><span className="client-avatar">{name.slice(0, 1).toUpperCase()}</span><span>{name}</span><strong>{formatDuration(seconds)}</strong></div> })}{!filteredEntries.length ? <p className="field-hint">Seus totais aparecerão aqui após os primeiros registros.</p> : null}</div>
        </section>
      </div>

      <section className="panel table-panel">
        <SectionHeading eyebrow="Histórico" title="Registros de ponto" description={`${ownEntries.length} registro${ownEntries.length === 1 ? "" : "s"} encontrado${ownEntries.length === 1 ? "" : "s"}.`} actions={<a className="button button-quiet" href="/api/export?type=ponto"><Download aria-hidden="true" /> Exportar CSV</a>} />
        <div className="table-toolbar"><label className="field worker-filter"><span>Filtrar por responsável</span><input value={worker} maxLength={80} onChange={(event) => setWorker(event.target.value)} placeholder="Todos os responsáveis" /></label><span className="table-count"><span className="live-dot" /> {activeTeamEntries.length} cronômetros ativos ou pausados</span></div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th scope="col">Responsável</th><th scope="col">Atividade</th><th scope="col">Data</th><th scope="col">Tempo</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead><tbody>
          {ownEntries.map((entry) => <tr key={entry.id}><td><div className="client-cell"><span className="client-avatar">{entry.worker.slice(0, 1).toUpperCase()}</span><strong>{entry.worker}</strong></div></td><td>{entry.task || "—"}</td><td>{formatDate(entry.recordedDay, { year: "numeric" })}</td><td className="table-amount">{formatDuration(totalSeconds(entry, now))}</td><td><StatusBadge status={entry.status} /></td><td><div className="row-actions">{entry.status === "running" ? <button className="icon-button small-icon" type="button" aria-label={`Pausar ponto de ${entry.worker}`} onClick={() => void changeTimer(entry, "pause")}><CirclePause aria-hidden="true" /></button> : null}{entry.status === "paused" ? <button className="icon-button small-icon" type="button" aria-label={`Retomar ponto de ${entry.worker}`} onClick={() => void changeTimer(entry, "resume")}><CirclePlay aria-hidden="true" /></button> : null}{entry.status !== "finished" ? <button className="icon-button small-icon" type="button" aria-label={`Encerrar ponto de ${entry.worker}`} onClick={() => void changeTimer(entry, "finish")}><Square aria-hidden="true" /></button> : null}<button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover registro de ${entry.worker}`} onClick={() => void removeEntry(entry)}><Trash2 aria-hidden="true" /></button></div></td></tr>)}
          {!ownEntries.length ? <tr><td colSpan={6}><div className="table-empty"><span className="empty-mark" aria-hidden="true">A</span><strong>Nenhum registro de ponto</strong><p>Inicie um cronômetro para acompanhar as horas da equipe.</p></div></td></tr> : null}
        </tbody></table></div>
      </section>
    </div>
  )
}
