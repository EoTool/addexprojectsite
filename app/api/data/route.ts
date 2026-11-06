import { NextRequest, NextResponse } from "next/server"
import { hasAppSession } from "@/lib/auth"
import { deleteRecord, DataError, createRecord, updateRecord } from "@/lib/data/mutations"
import { getPortalData } from "@/lib/data/read"
import { hasTrustedOrigin } from "@/lib/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "private, no-store" } })
}

async function readBody(request: NextRequest) {
  return request.json().catch(() => null)
}

export async function GET() {
  if (!(await hasAppSession())) return jsonError("Sessão encerrada. Entre novamente.", 401)

  try {
    return NextResponse.json(await getPortalData(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    })
  } catch {
    return jsonError("Não foi possível carregar os dados agora.", 503)
  }
}

export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Origem não autorizada.", 403)
  if (!(await hasAppSession())) return jsonError("Sessão encerrada. Entre novamente.", 401)

  const body = (await readBody(request)) as { collection?: string; data?: unknown } | null
  if (!body?.collection || body.data === undefined) return jsonError("Dados incompletos.", 400)

  try {
    const result = await createRecord(body.collection, body.data)
    return NextResponse.json(result, { status: 201, headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof DataError) return jsonError(error.message, error.status)
    return jsonError("Não foi possível salvar. Confira os dados e tente novamente.", 400)
  }
}

export async function PATCH(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Origem não autorizada.", 403)
  if (!(await hasAppSession())) return jsonError("Sessão encerrada. Entre novamente.", 401)

  const body = (await readBody(request)) as { collection?: string; id?: string; data?: unknown } | null
  if (!body?.collection || !body.id || body.data === undefined) return jsonError("Dados incompletos.", 400)

  try {
    const result = await updateRecord(body.collection, body.id, body.data)
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } })
  } catch (error) {
    if (error instanceof DataError) return jsonError(error.message, error.status)
    return jsonError("Não foi possível atualizar. Confira os dados e tente novamente.", 400)
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return jsonError("Origem não autorizada.", 403)
  if (!(await hasAppSession())) return jsonError("Sessão encerrada. Entre novamente.", 401)

  const { searchParams } = new URL(request.url)
  const collection = searchParams.get("collection") ?? ""
  const id = searchParams.get("id") ?? ""
  if (!collection || !id) return jsonError("Registro não encontrado.", 400)

  try {
    return NextResponse.json(await deleteRecord(collection, id), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    if (error instanceof DataError) return jsonError(error.message, error.status)
    return jsonError("Não foi possível remover este registro.", 400)
  }
}
