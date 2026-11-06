import { z } from "zod"

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const money = z.number().finite().min(0).max(9_999_999_999.99)
const shortText = (max = 240) => z.string().trim().max(max)

export const transactionInput = z.object({
  type: z.enum(["entrada", "saida"]),
  amount: money.positive(),
  date: dateString,
  category: shortText(80).min(1),
  description: shortText(240).min(1),
  projectId: z.string().uuid().nullable().optional(),
  isCredit: z.boolean().default(false),
})

export const clientInput = z.object({
  name: shortText(120).min(1),
  discordId: shortText(100).default(""),
  registeredOn: dateString.nullable().optional(),
  responsible: shortText(120).default(""),
  source: shortText(120).default(""),
})

export const checklistItemInput = z.object({
  id: z.string().uuid(),
  label: shortText(120).min(1),
  done: z.boolean(),
})

export const projectInput = z.object({
  clientId: z.string().uuid().nullable().optional(),
  name: shortText(160).min(1),
  value: money.default(0),
  status: z.enum(["pendente", "prioridade", "concluido", "pagamento", "cancelado"]),
  description: shortText(4000).default(""),
  referenceUrl: z.string().trim().url().or(z.literal("")).default(""),
  startDate: dateString.nullable().optional(),
  deadline: dateString.nullable().optional(),
  completedAt: dateString.nullable().optional(),
  checklist: z.array(checklistItemInput).max(80).default([]),
})

export const calendarEventInput = z.object({
  title: shortText(160).min(1),
  eventDate: dateString,
  eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  description: shortText(1000).default(""),
})

export const timeEntryInput = z.object({
  worker: shortText(80).min(1),
  task: shortText(240).default(""),
})

export const noteLineInput = z.object({
  id: z.string().uuid(),
  description: shortText(180).min(1),
  quantity: z.number().finite().positive().max(100_000),
  unitPrice: money,
})

export const orderNoteInput = z.object({
  number: shortText(40).min(1),
  client: shortText(120).min(1),
  discordId: shortText(120).default(""),
  project: shortText(160).default(""),
  issuedOn: dateString,
  deadline: dateString.nullable().default(null),
  team: shortText(180).default(""),
  briefing: shortText(3000).default(""),
  items: z.array(noteLineInput).min(1).max(100),
  tools: z.array(shortText(80)).max(20).default([]),
  formats: z.array(shortText(80)).max(20).default([]),
  delivery: z.array(shortText(80)).max(20).default([]),
  couponCode: shortText(50).transform((value) => value.toUpperCase()).default(""),
  discount: z.number().finite().min(0).max(100),
  paymentMethod: shortText(100).default(""),
  paymentStatus: z.enum(["Pendente", "Pago", "Parcial"]),
  observations: shortText(2000).default(""),
  brand: shortText(100).default("Addex Company"),
})

export const settingInput = z.object({
  monthlyGoal: money,
})

export function safeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number : 0
}
