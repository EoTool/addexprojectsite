import { and, asc, desc, eq } from "drizzle-orm"
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

export async function getPortalData() {
  const [transactionRows, projectRows, clientRows, eventRows, timeRows, noteRows, goalRows] =
    await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, TEAM_ID))
        .orderBy(desc(transactions.date), desc(transactions.createdAt))
        .limit(5000),
      db
        .select()
        .from(projects)
        .where(eq(projects.userId, TEAM_ID))
        .orderBy(asc(projects.deadline), desc(projects.createdAt))
        .limit(2000),
      db
        .select()
        .from(clients)
        .where(eq(clients.userId, TEAM_ID))
        .orderBy(asc(clients.name))
        .limit(2000),
      db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.userId, TEAM_ID))
        .orderBy(asc(calendarEvents.eventDate), asc(calendarEvents.eventTime))
        .limit(2000),
      db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.userId, TEAM_ID))
        .orderBy(desc(timeEntries.recordedDay), desc(timeEntries.createdAt))
        .limit(3000),
      db
        .select()
        .from(orderNotes)
        .where(eq(orderNotes.userId, TEAM_ID))
        .orderBy(desc(orderNotes.createdAt))
        .limit(1000),
      db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.userId, TEAM_ID), eq(settings.key, "monthly_goal")))
        .limit(1),
    ])

  return {
    transactions: transactionRows,
    projects: projectRows,
    clients: clientRows,
    events: eventRows,
    timeEntries: timeRows,
    notes: noteRows,
    monthlyGoal: Number(goalRows[0]?.value ?? 0),
  }
}
