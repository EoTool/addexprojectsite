import type { ChecklistItem, OrderNotePayload } from "@/lib/db/schema"

export type TransactionRecord = {
  id: string
  type: "entrada" | "saida"
  amount: string | number
  date: string
  category: string
  description: string
  projectId: string | null
  isCredit: boolean
  createdAt: string
}

export type ProjectRecord = {
  id: string
  clientId: string | null
  name: string
  value: string | number
  status: "pendente" | "prioridade" | "concluido" | "pagamento" | "cancelado"
  description: string
  referenceUrl: string
  startDate: string | null
  deadline: string | null
  completedAt: string | null
  checklist: ChecklistItem[]
  createdAt: string
  updatedAt: string
}

export type ClientRecord = {
  id: string
  name: string
  discordId: string
  registeredOn: string | null
  responsible: string
  source: string
  createdAt: string
  updatedAt: string
}

export type CalendarEventRecord = {
  id: string
  title: string
  eventDate: string
  eventTime: string | null
  description: string
  createdAt: string
}

export type TimeEntryRecord = {
  id: string
  worker: string
  task: string
  recordedDay: string
  startedAt: string | null
  endedAt: string | null
  elapsedSeconds: number
  status: "running" | "paused" | "finished"
  createdAt: string
}

export type NoteRecord = {
  id: string
  client: string
  project: string
  total: string | number
  payload: OrderNotePayload
  createdAt: string
}

export type PortalData = {
  transactions: TransactionRecord[]
  projects: ProjectRecord[]
  clients: ClientRecord[]
  events: CalendarEventRecord[]
  timeEntries: TimeEntryRecord[]
  notes: NoteRecord[]
  monthlyGoal: number
}

export type ToastKind = "success" | "error" | "info"

export type PortalActions = {
  add: (collection: string, data: unknown) => Promise<unknown>
  update: (collection: string, id: string, data: unknown) => Promise<unknown>
  remove: (collection: string, id: string) => Promise<void>
  notify: (message: string, kind?: ToastKind) => void
  refresh: () => Promise<void>
}
