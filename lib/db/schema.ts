import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface NoteLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

export interface OrderNotePayload {
  number: string
  client: string
  discordId: string
  project: string
  issuedOn: string
  deadline: string | null
  team: string
  briefing: string
  items: NoteLineItem[]
  tools: string[]
  formats: string[]
  delivery: string[]
  couponCode: string
  discount: number
  paymentMethod: string
  paymentStatus: string
  observations: string
  brand: string
}

export const TEAM_ID = "addex-team"

export const transactions = pgTable("addex_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  projectId: uuid("project_id"),
  isCredit: boolean("is_credit").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable("addex_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  clientId: uuid("client_id"),
  name: text("name").notNull(),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pendente"),
  description: text("description").notNull().default(""),
  referenceUrl: text("reference_url").notNull().default(""),
  startDate: date("start_date", { mode: "string" }),
  deadline: date("deadline", { mode: "string" }),
  completedAt: date("completed_at", { mode: "string" }),
  checklist: jsonb("checklist").$type<ChecklistItem[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const clients = pgTable("addex_clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  name: text("name").notNull(),
  discordId: text("discord_id").notNull().default(""),
  registeredOn: date("registered_on", { mode: "string" }),
  responsible: text("responsible").notNull().default(""),
  source: text("source").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const calendarEvents = pgTable("addex_calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  title: text("title").notNull(),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  eventTime: text("event_time"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const timeEntries = pgTable("addex_time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  worker: text("worker").notNull(),
  task: text("task").notNull().default(""),
  recordedDay: date("recorded_day", { mode: "string" }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  elapsedSeconds: integer("elapsed_seconds").notNull().default(0),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orderNotes = pgTable("addex_order_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  client: text("client").notNull().default(""),
  project: text("project").notNull().default(""),
  total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  payload: jsonb("payload").$type<OrderNotePayload>().notNull().default({
    number: "",
    client: "",
    discordId: "",
    project: "",
    issuedOn: "",
    deadline: null,
    team: "",
    briefing: "",
    items: [],
    tools: [],
    formats: [],
    delivery: [],
    couponCode: "",
    discount: 0,
    paymentMethod: "",
    paymentStatus: "",
    observations: "",
    brand: "Addex Company",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const settings = pgTable("addex_settings", {
  key: text("key").primaryKey(),
  userId: text("user_id").notNull().default(TEAM_ID),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const loginAttempts = pgTable("addex_login_attempts", {
  ipDigest: text("ip_digest").primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})
