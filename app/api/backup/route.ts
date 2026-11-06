import { and, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { hasAppSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { calendarEvents, clients, orderNotes, projects, settings, TEAM_ID, timeEntries, transactions } from "@/lib/db/schema"
import { getPortalData } from "@/lib/data/read"
import { backupSchema } from "@/lib/data/backup"
import { hasTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  if (!(await hasAppSession())) return NextResponse.json({ error: "Sessão encerrada." }, { status: 401 })

  try {
    const data = await getPortalData()
    const backup = { version: 1, exportedAt: new Date().toISOString(), ...data }
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="addex-backup.json"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o backup." }, { status: 503 })
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403 })
  if (!(await hasAppSession())) return NextResponse.json({ error: "Sessão encerrada." }, { status: 401 })

  const parsed = backupSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "O arquivo não corresponde a um backup Addex válido." }, { status: 400 })

  const data = parsed.data
  const clientIds = new Set(data.clients.map((client) => client.id))
  const projectIds = new Set(data.projects.map((project) => project.id))
  if (data.projects.some((project) => project.clientId && !clientIds.has(project.clientId))) {
    return NextResponse.json({ error: "O backup contém um projeto sem cliente correspondente." }, { status: 400 })
  }
  if (data.transactions.some((item) => item.projectId && !projectIds.has(item.projectId))) {
    return NextResponse.json({ error: "O backup contém um lançamento sem projeto correspondente." }, { status: 400 })
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(transactions).where(eq(transactions.userId, TEAM_ID))
      await tx.delete(orderNotes).where(eq(orderNotes.userId, TEAM_ID))
      await tx.delete(timeEntries).where(eq(timeEntries.userId, TEAM_ID))
      await tx.delete(calendarEvents).where(eq(calendarEvents.userId, TEAM_ID))
      await tx.delete(projects).where(eq(projects.userId, TEAM_ID))
      await tx.delete(clients).where(eq(clients.userId, TEAM_ID))

      if (data.clients.length) {
        await tx.insert(clients).values(data.clients.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          name: item.name,
          discordId: item.discordId,
          registeredOn: item.registeredOn ?? null,
          responsible: item.responsible,
          source: item.source,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        })))
      }

      if (data.projects.length) {
        await tx.insert(projects).values(data.projects.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          clientId: item.clientId ?? null,
          name: item.name,
          value: item.value.toFixed(2),
          status: item.status,
          description: item.description,
          referenceUrl: item.referenceUrl,
          startDate: item.startDate ?? null,
          deadline: item.deadline ?? null,
          completedAt: item.completedAt ?? null,
          checklist: item.checklist,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        })))
      }

      if (data.transactions.length) {
        await tx.insert(transactions).values(data.transactions.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          type: item.type,
          amount: item.amount.toFixed(2),
          date: item.date,
          category: item.category,
          description: item.description,
          projectId: item.projectId ?? null,
          isCredit: item.isCredit,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        })))
      }

      if (data.events.length) {
        await tx.insert(calendarEvents).values(data.events.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          title: item.title,
          eventDate: item.eventDate,
          eventTime: item.eventTime ?? null,
          description: item.description,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        })))
      }

      if (data.timeEntries.length) {
        await tx.insert(timeEntries).values(data.timeEntries.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          worker: item.worker,
          task: item.task,
          recordedDay: item.recordedDay,
          startedAt: item.startedAt ? new Date(item.startedAt) : null,
          endedAt: item.endedAt ? new Date(item.endedAt) : null,
          elapsedSeconds: item.elapsedSeconds,
          status: item.status,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        })))
      }

      if (data.notes.length) {
        await tx.insert(orderNotes).values(data.notes.map((item) => ({
          id: item.id,
          userId: TEAM_ID,
          client: item.client,
          project: item.project,
          total: item.total.toFixed(2),
          payload: item.payload,
          createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
        })))
      }

      await tx
        .insert(settings)
        .values({ userId: TEAM_ID, key: "monthly_goal", value: data.monthlyGoal })
        .onConflictDoUpdate({
          target: settings.key,
          set: { userId: TEAM_ID, value: data.monthlyGoal, updatedAt: new Date() },
        })
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível restaurar este backup." }, { status: 400 })
  }
}
