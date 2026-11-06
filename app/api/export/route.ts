import { asc, desc, eq } from "drizzle-orm"
import { NextRequest, NextResponse } from "next/server"
import { hasAppSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { clients, projects, TEAM_ID, timeEntries, transactions } from "@/lib/db/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function csvCell(value: unknown) {
  let text = String(value ?? "")
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function csvResponse(name: string, rows: unknown[][]) {
  const content = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
  return new NextResponse(`\uFEFF${content}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

export async function GET(request: NextRequest) {
  if (!(await hasAppSession())) return NextResponse.json({ error: "Sessão encerrada." }, { status: 401 })

  const type = new URL(request.url).searchParams.get("type")
  if (type === "financeiro") {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, TEAM_ID))
      .orderBy(desc(transactions.date))
      .limit(5000)
    return csvResponse("addex-financeiro.csv", [
      ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Cartão de crédito"],
      ...rows.map((row) => [row.date, row.type, row.category, row.description, row.amount, row.isCredit ? "Sim" : "Não"]),
    ])
  }

  if (type === "projetos") {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, TEAM_ID))
      .orderBy(asc(projects.name))
      .limit(2000)
    return csvResponse("addex-projetos.csv", [
      ["Projeto", "Status", "Valor", "Início", "Prazo", "Descrição"],
      ...rows.map((row) => [row.name, row.status, row.value, row.startDate, row.deadline, row.description]),
    ])
  }

  if (type === "clientes") {
    const rows = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, TEAM_ID))
      .orderBy(asc(clients.name))
      .limit(2000)
    return csvResponse("addex-clientes.csv", [
      ["Cliente", "Discord", "Responsável", "Origem", "Cadastro"],
      ...rows.map((row) => [row.name, row.discordId, row.responsible, row.source, row.registeredOn]),
    ])
  }

  if (type === "ponto") {
    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.userId, TEAM_ID))
      .orderBy(desc(timeEntries.recordedDay))
      .limit(3000)
    return csvResponse("addex-ponto.csv", [
      ["Data", "Responsável", "Atividade", "Tempo (segundos)", "Status"],
      ...rows.map((row) => [row.recordedDay, row.worker, row.task, row.elapsedSeconds, row.status]),
    ])
  }

  return NextResponse.json({ error: "Tipo de exportação inválido." }, { status: 400 })
}
