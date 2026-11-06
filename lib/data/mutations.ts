import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  calendarEvents,
  clients,
  orderNotes,
  projects,
  settings,
  TEAM_ID,
  timeEntries,
  transactions,
} from "@/lib/db/schema"
import {
  calendarEventInput,
  clientInput,
  orderNoteInput,
  projectInput,
  settingInput,
  timeEntryInput,
  transactionInput,
} from "@/lib/validation"

export class DataError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message)
  }
}

function parseInput<T>(schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, value: unknown) {
  const result = schema.safeParse(value)
  if (!result.success) throw new DataError("Confira os campos e tente novamente.")
  return result.data
}

function dateInSaoPaulo() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

async function assertClient(clientId: string | null | undefined) {
  if (!clientId) return
  const found = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, TEAM_ID)))
    .limit(1)
  if (!found.length) throw new DataError("Selecione um cliente cadastrado.")
}

export async function createRecord(collection: string, input: unknown) {
  if (collection === "transactions") {
    const data = parseInput(transactionInput, input)
    return db
      .insert(transactions)
      .values({
        userId: TEAM_ID,
        type: data.type,
        amount: data.amount.toFixed(2),
        date: data.date,
        category: data.category,
        description: data.description,
        projectId: data.projectId ?? null,
        isCredit: data.isCredit,
      })
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "clients") {
    const data = parseInput(clientInput, input)
    return db
      .insert(clients)
      .values({ userId: TEAM_ID, ...data, registeredOn: data.registeredOn ?? null })
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "projects") {
    const data = parseInput(projectInput, input)
    await assertClient(data.clientId)
    return db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({
          userId: TEAM_ID,
          ...data,
          value: data.value.toFixed(2),
          clientId: data.clientId ?? null,
          startDate: data.startDate ?? null,
          deadline: data.deadline ?? null,
          completedAt:
            data.status === "concluido" ? data.completedAt ?? dateInSaoPaulo() : data.completedAt ?? null,
        })
        .returning()

      if (Number(project.value) > 0 && project.status !== "cancelado") {
        await tx
          .insert(transactions)
          .values({
            userId: TEAM_ID,
            type: "entrada",
            amount: project.value,
            date: project.startDate ?? dateInSaoPaulo(),
            category: "Projeto",
            description: project.name,
            projectId: project.id,
            isCredit: false,
          })
          .onConflictDoUpdate({
            target: transactions.projectId,
            set: {
              amount: project.value,
              date: project.startDate ?? dateInSaoPaulo(),
              description: project.name,
            },
          })
      }
      return project
    })
  }

  if (collection === "events") {
    const data = parseInput(calendarEventInput, input)
    return db
      .insert(calendarEvents)
      .values({ userId: TEAM_ID, ...data, eventTime: data.eventTime ?? null })
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "timeEntries") {
    const data = parseInput(timeEntryInput, input)
    const activeEntry = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, TEAM_ID),
          eq(timeEntries.worker, data.worker),
          or(eq(timeEntries.status, "running"), eq(timeEntries.status, "paused")),
        ),
      )
      .limit(1)
    if (activeEntry.length) {
      throw new DataError("Este responsável já tem um registro em andamento.", 409)
    }
    return db
      .insert(timeEntries)
      .values({
        userId: TEAM_ID,
        ...data,
        recordedDay: dateInSaoPaulo(),
        startedAt: new Date(),
        status: "running",
      })
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "notes") {
    const data = parseInput(orderNoteInput, input)
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const total = subtotal * (1 - data.discount / 100)
    return db
      .insert(orderNotes)
      .values({
        userId: TEAM_ID,
        client: data.client,
        project: data.project,
        total: total.toFixed(2),
        payload: data,
      })
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "settings") {
    const data = parseInput(settingInput, input)
    const [result] = await db
      .insert(settings)
      .values({ userId: TEAM_ID, key: "monthly_goal", value: data.monthlyGoal })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: data.monthlyGoal, userId: TEAM_ID, updatedAt: new Date() },
      })
      .returning()
    return result
  }

  throw new DataError("Esta seção não aceita novos registros.", 404)
}

export async function updateRecord(collection: string, id: string, input: unknown) {
  if (collection === "transactions") {
    const data = parseInput(transactionInput, input)
    const existing = await db
      .select({ projectId: transactions.projectId })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, TEAM_ID)))
      .limit(1)
    if (!existing.length) throw new DataError("Lançamento não encontrado.", 404)
    if (existing[0].projectId) throw new DataError("O valor deste lançamento é sincronizado pelo projeto.", 409)
    return db
      .update(transactions)
      .set({
        ...data,
        amount: data.amount.toFixed(2),
        projectId: data.projectId ?? null,
      })
      .where(and(eq(transactions.id, id), eq(transactions.userId, TEAM_ID)))
      .returning()
      .then((rows) => rows[0])
  }

  if (collection === "clients") {
    const data = parseInput(clientInput, input)
    return db
      .update(clients)
      .set({ ...data, registeredOn: data.registeredOn ?? null, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.userId, TEAM_ID)))
      .returning()
      .then((rows) => {
        if (!rows.length) throw new DataError("Cliente não encontrado.", 404)
        return rows[0]
      })
  }

  if (collection === "projects") {
    const data = parseInput(projectInput, input)
    await assertClient(data.clientId)
    return db.transaction(async (tx) => {
      const [project] = await tx
        .update(projects)
        .set({
          ...data,
          value: data.value.toFixed(2),
          clientId: data.clientId ?? null,
          startDate: data.startDate ?? null,
          deadline: data.deadline ?? null,
          completedAt:
            data.status === "concluido" ? data.completedAt ?? dateInSaoPaulo() : data.completedAt ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, id), eq(projects.userId, TEAM_ID)))
        .returning()
      if (!project) throw new DataError("Projeto não encontrado.", 404)

      if (Number(project.value) > 0 && project.status !== "cancelado") {
        await tx
          .insert(transactions)
          .values({
            userId: TEAM_ID,
            type: "entrada",
            amount: project.value,
            date: project.startDate ?? dateInSaoPaulo(),
            category: "Projeto",
            description: project.name,
            projectId: project.id,
            isCredit: false,
          })
          .onConflictDoUpdate({
            target: transactions.projectId,
            set: {
              amount: project.value,
              date: project.startDate ?? dateInSaoPaulo(),
              description: project.name,
            },
          })
      } else {
        await tx
          .delete(transactions)
          .where(and(eq(transactions.projectId, project.id), eq(transactions.userId, TEAM_ID)))
      }
      return project
    })
  }

  if (collection === "events") {
    const data = parseInput(calendarEventInput, input)
    return db
      .update(calendarEvents)
      .set({ ...data, eventTime: data.eventTime ?? null })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, TEAM_ID)))
      .returning()
      .then((rows) => {
        if (!rows.length) throw new DataError("Evento não encontrado.", 404)
        return rows[0]
      })
  }

  if (collection === "timeEntries") {
    const action = input as { action?: unknown }
    if (!["pause", "resume", "finish"].includes(String(action?.action))) {
      throw new DataError("Ação de ponto inválida.")
    }
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, TEAM_ID)))
      .limit(1)
    if (!entry) throw new DataError("Registro de ponto não encontrado.", 404)

    if (action.action === "pause" && entry.status === "running" && entry.startedAt) {
      const elapsedSeconds = entry.elapsedSeconds + Math.max(0, Math.floor((Date.now() - entry.startedAt.getTime()) / 1000))
      return db
        .update(timeEntries)
        .set({ status: "paused", startedAt: null, elapsedSeconds })
        .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, TEAM_ID)))
        .returning()
        .then((rows) => rows[0])
    }

    if (action.action === "resume" && entry.status === "paused") {
      const otherRunning = await db
        .select({ id: timeEntries.id })
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, TEAM_ID),
            eq(timeEntries.worker, entry.worker),
            eq(timeEntries.status, "running"),
          ),
        )
        .limit(1)
      if (otherRunning.length) throw new DataError("Este responsável já tem um cronômetro ativo.", 409)
      return db
        .update(timeEntries)
        .set({ status: "running", startedAt: new Date() })
        .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, TEAM_ID)))
        .returning()
        .then((rows) => rows[0])
    }

    if (action.action === "finish" && ["running", "paused"].includes(entry.status)) {
      const liveSeconds =
        entry.status === "running" && entry.startedAt
          ? Math.max(0, Math.floor((Date.now() - entry.startedAt.getTime()) / 1000))
          : 0
      return db
        .update(timeEntries)
        .set({
          status: "finished",
          startedAt: null,
          endedAt: new Date(),
          elapsedSeconds: entry.elapsedSeconds + liveSeconds,
        })
        .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, TEAM_ID)))
        .returning()
        .then((rows) => rows[0])
    }

    throw new DataError("Este registro de ponto não pode receber essa ação.", 409)
  }

  throw new DataError("Esta seção não permite edição.", 404)
}

export async function deleteRecord(collection: string, id: string) {
  if (collection === "transactions") {
    const [entry] = await db
      .select({ projectId: transactions.projectId })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, TEAM_ID)))
      .limit(1)
    if (!entry) throw new DataError("Lançamento não encontrado.", 404)
    if (entry.projectId) throw new DataError("Remova ou ajuste o valor pelo cadastro do projeto.", 409)
    await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, TEAM_ID)))
    return { id }
  }

  if (collection === "projects") {
    return db.transaction(async (tx) => {
      await tx
        .delete(transactions)
        .where(and(eq(transactions.projectId, id), eq(transactions.userId, TEAM_ID)))
      const deleted = await tx
        .delete(projects)
        .where(and(eq(projects.id, id), eq(projects.userId, TEAM_ID)))
        .returning({ id: projects.id })
      if (!deleted.length) throw new DataError("Projeto não encontrado.", 404)
      return deleted[0]
    })
  }

  if (collection === "clients") {
    const associated = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.clientId, id), eq(projects.userId, TEAM_ID)))
      .limit(1)
    if (associated.length) throw new DataError("Este cliente possui projetos vinculados.", 409)
    const deleted = await db
      .delete(clients)
      .where(and(eq(clients.id, id), eq(clients.userId, TEAM_ID)))
      .returning({ id: clients.id })
    if (!deleted.length) throw new DataError("Cliente não encontrado.", 404)
    return deleted[0]
  }

  if (collection === "events") {
    const deleted = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, TEAM_ID)))
      .returning({ id: calendarEvents.id })
    if (!deleted.length) throw new DataError("Evento não encontrado.", 404)
    return deleted[0]
  }

  if (collection === "timeEntries") {
    const deleted = await db
      .delete(timeEntries)
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, TEAM_ID)))
      .returning({ id: timeEntries.id })
    if (!deleted.length) throw new DataError("Registro de ponto não encontrado.", 404)
    return deleted[0]
  }

  if (collection === "notes") {
    const deleted = await db
      .delete(orderNotes)
      .where(and(eq(orderNotes.id, id), eq(orderNotes.userId, TEAM_ID)))
      .returning({ id: orderNotes.id })
    if (!deleted.length) throw new DataError("Notinha não encontrada.", 404)
    return deleted[0]
  }

  throw new DataError("Esta seção não permite exclusão.", 404)
}
