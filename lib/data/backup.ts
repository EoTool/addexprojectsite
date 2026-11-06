import { z } from "zod"
import { calendarEventInput, checklistItemInput, clientInput, orderNoteInput, projectInput, transactionInput } from "@/lib/validation"

const backupMoney = z.union([z.number(), z.string()]).transform(Number).refine((value) => Number.isFinite(value) && value >= 0 && value <= 9_999_999_999.99)
const id = z.string().uuid()
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timestamp = z.string().datetime().nullable().optional()
const createdAt = z.string().datetime().optional()

export const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime().optional(),
  monthlyGoal: backupMoney,
  transactions: z.array(transactionInput.extend({ id, amount: backupMoney, createdAt })).max(5000),
  projects: z.array(projectInput.extend({
    id,
    value: backupMoney,
    createdAt,
    updatedAt: createdAt,
  })).max(2000),
  clients: z.array(clientInput.extend({
    id,
    createdAt,
    updatedAt: createdAt,
  })).max(2000),
  events: z.array(calendarEventInput.extend({ id, createdAt })).max(2000),
  timeEntries: z.array(z.object({
    id,
    worker: z.string().trim().min(1).max(80),
    task: z.string().trim().max(240),
    recordedDay: dateString,
    startedAt: timestamp,
    endedAt: timestamp,
    elapsedSeconds: z.number().int().min(0).max(31_536_000),
    status: z.enum(["running", "paused", "finished"]),
    createdAt,
  })).max(3000),
  notes: z.array(z.object({
    id,
    client: z.string().trim().max(120),
    project: z.string().trim().max(160),
    total: backupMoney,
    payload: orderNoteInput,
    createdAt,
  })).max(1000),
})

export type ValidBackup = z.infer<typeof backupSchema>
