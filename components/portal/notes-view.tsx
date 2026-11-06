"use client"

import { useMemo, useState, type FormEvent } from "react"
import { FileText, Minus, Plus, Printer, ReceiptText, Trash2 } from "lucide-react"
import { formatCurrency, formatDate, todayIso } from "@/lib/format"
import type { OrderNotePayload } from "@/lib/db/schema"
import type { NoteRecord, PortalActions, PortalData } from "@/lib/portal-types"
import { Field, Modal, SectionHeading, StatusBadge } from "./ui"

type LineForm = { id: string; description: string; quantity: string; unitPrice: string }
type NoteForm = Omit<OrderNotePayload, "items" | "discount" | "deadline"> & { items: LineForm[]; discount: string; deadline: string }
type TagField = "tools" | "formats" | "delivery"

const toolOptions = ["Photoshop", "Illustrator", "Figma", "After Effects", "Premiere Pro", "CorelDRAW", "Canva", "Procreate"]
const formatOptions = ["PNG", "JPEG", "PDF", "SVG", "PSD", "AI", "MP4", "GIF"]
const deliveryOptions = ["Discord", "Google Drive", "ZIP", "WeTransfer", "E-mail"]

function ChipPicker({ label, options, selected, onToggle, onCustom, placeholder }: { label: string; options: string[]; selected: string[]; onToggle: (value: string, checked: boolean) => void; onCustom: (value: string) => void; placeholder: string }) {
  return <fieldset className="chip-picker"><legend>{label}</legend><div className="chip-select">{options.map((option) => <label className={`chip-option${selected.includes(option) ? " chip-selected" : ""}`} key={option}><input type="checkbox" checked={selected.includes(option)} onChange={(event) => onToggle(option, event.target.checked)} />{option}</label>)}</div><input className="chip-other-input" maxLength={240} value={selected.filter((value) => !options.includes(value)).join(", ")} onChange={(event) => onCustom(event.target.value)} placeholder={placeholder} /></fieldset>
}

function noteFingerprint(payload: Partial<OrderNotePayload>) {
  return JSON.stringify({
    number: payload.number ?? "",
    client: payload.client ?? "",
    discordId: payload.discordId ?? "",
    project: payload.project ?? "",
    issuedOn: payload.issuedOn ?? "",
    deadline: payload.deadline ?? null,
    team: payload.team ?? "",
    briefing: payload.briefing ?? "",
    items: (payload.items ?? []).map(({ id, description, quantity, unitPrice }) => ({ id, description, quantity, unitPrice })),
    tools: payload.tools ?? [],
    formats: payload.formats ?? [],
    delivery: payload.delivery ?? [],
    couponCode: payload.couponCode ?? "",
    discount: Number(payload.discount ?? 0),
    paymentMethod: payload.paymentMethod ?? "",
    paymentStatus: payload.paymentStatus ?? "Pendente",
    observations: payload.observations ?? "",
    brand: payload.brand ?? "Addex Company",
  })
}

function emptyNote(index: number): NoteForm {
  return {
    number: `ADX-${new Date().getFullYear()}-${String(index).padStart(3, "0")}`, 
    client: "",
    discordId: "",
    project: "",
    issuedOn: todayIso(),
    deadline: "",
    team: "",
    briefing: "",
    items: [{ id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }],
    tools: [],
    formats: [],
    delivery: [],
    couponCode: "",
    discount: "0",
    paymentMethod: "PIX",
    paymentStatus: "Pendente",
    observations: "",
    brand: "Addex Company",
  }
}

export function NotesView({ data, actions }: { data: PortalData; actions: PortalActions }) {
  const [form, setForm] = useState<NoteForm>(() => emptyNote(data.notes.length + 1))
  const [selected, setSelected] = useState<NoteRecord | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0), [form.items])
  const discountValue = subtotal * (Number(form.discount) || 0) / 100
  const total = Math.max(0, subtotal - discountValue)
  const preview: OrderNotePayload = {
    ...form,
    discount: Number(form.discount) || 0,
    deadline: form.deadline || null,
    items: form.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
    })),
  }
  const previewSubtotal = preview.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const previewTotal = previewSubtotal * (1 - preview.discount / 100)

  function updateLine(id: string, field: keyof LineForm, value: string) {
    setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [field]: value } : item) }))
  }

  function addLine() {
    setForm((current) => ({ ...current, items: [...current.items, { id: crypto.randomUUID(), description: "", quantity: "1", unitPrice: "" }] }))
  }

  function loadNote(note: NoteRecord) {
    setSelected(note)
    setForm({ ...emptyNote(data.notes.length + 1), ...note.payload, deadline: note.payload.deadline ?? "", items: note.payload.items.map((item) => ({ ...item, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })), discount: String(note.payload.discount) })
    setHistoryOpen(false)
  }

  function toggleTag(field: TagField, value: string, checked: boolean) {
    setForm((current) => ({ ...current, [field]: checked ? [...new Set([...current[field], value])] : current[field].filter((item) => item !== value) }))
  }

  function updateCustomTags(field: TagField, options: string[], value: string) {
    const custom = [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]
    setForm((current) => ({ ...current, [field]: [...current[field].filter((item) => options.includes(item)), ...custom] }))
  }

  function startNew() {
    setSelected(null)
    setForm(emptyNote(data.notes.length + 1))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.items.some((item) => !item.description.trim() || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0)) {
      actions.notify("Revise a descrição, quantidade e valor de cada item.", "error")
      return
    }
    const payload: OrderNotePayload = {
      ...form,
      discount: Number(form.discount),
      deadline: form.deadline || null,
      couponCode: form.couponCode.trim().toUpperCase(),
      items: form.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
    }
    if (selected && noteFingerprint(payload) === noteFingerprint(selected.payload)) {
      window.print()
      return
    }
    if (selected) {
      const baseNumber = selected.payload.number.replace(/-R\d+$/, "")
      const revision = data.notes.filter((note) => note.payload.number === baseNumber || note.payload.number.startsWith(`${baseNumber}-R`)).length
      payload.number = `${baseNumber}-R${revision}`
      setForm((current) => ({ ...current, number: payload.number }))
    }

    setSaving(true)
    try {
      const saved = await actions.add("notes", payload) as NoteRecord
      setSelected(saved)
      setForm({
        ...payload,
        discount: String(payload.discount),
        deadline: payload.deadline ?? "",
        items: payload.items.map((item) => ({ ...item, quantity: String(item.quantity), unitPrice: String(item.unitPrice) })),
      })
      window.setTimeout(() => window.print(), 250)
    } catch {
      return
    } finally {
      setSaving(false)
    }
  }

  async function removeNote(note: NoteRecord) {
    if (!window.confirm(`Remover a notinha ${note.payload.number}?`)) return
    try {
      await actions.remove("notes", note.id)
      if (selected?.id === note.id) setSelected(null)
    } catch {
      return
    }
  }

  return (
    <div className="view-stack note-view">
      <section className="note-banner"><span className="note-banner-icon"><ReceiptText aria-hidden="true" /></span><div><p className="eyebrow">Documentos comerciais</p><h2>Uma entrega com a cara da Addex.</h2><p>Monte, salve e imprima notinhas organizadas para seus clientes.</p></div><button className="button button-light" type="button" onClick={() => setHistoryOpen(true)}><FileText aria-hidden="true" /> Ver salvas <span className="note-count">{data.notes.length}</span></button></section>

      <div className="note-editor-layout">
        <section className="panel note-editor-panel">
          <SectionHeading eyebrow="Novo documento" title="Dados da notinha" description="Preencha as informações e confira a prévia ao lado." actions={selected ? <button className="button button-quiet" type="button" onClick={startNew}><Plus aria-hidden="true" /> Nova</button> : null} />
          <form className="form-stack" onSubmit={submit}>
            <div className="form-grid-two"><Field label="Número" htmlFor="note-number"><input id="note-number" required maxLength={40} value={form.number} onChange={(event) => setForm({ ...form, number: event.target.value })} /></Field><Field label="Cliente" htmlFor="note-client"><input id="note-client" required maxLength={120} list="note-client-options" value={form.client} onChange={(event) => setForm({ ...form, client: event.target.value })} placeholder="Nome ou marca" /><datalist id="note-client-options">{data.clients.map((client) => <option key={client.id} value={client.name} />)}</datalist></Field></div>
            <div className="form-grid-two"><Field label="Discord do cliente" htmlFor="note-discord"><input id="note-discord" maxLength={120} value={form.discordId} onChange={(event) => setForm({ ...form, discordId: event.target.value })} placeholder="Usuário ou ID" /></Field><Field label="Projeto / pedido" htmlFor="note-project"><input id="note-project" maxLength={160} list="note-project-options" value={form.project} onChange={(event) => setForm({ ...form, project: event.target.value })} placeholder="Ex.: Identidade visual" /><datalist id="note-project-options">{data.projects.map((project) => <option key={project.id} value={project.name} />)}</datalist></Field></div>
            <div className="form-grid-two"><Field label="Data de emissão" htmlFor="note-issued"><input id="note-issued" type="date" required value={form.issuedOn} onChange={(event) => setForm({ ...form, issuedOn: event.target.value })} /></Field><Field label="Prazo de entrega" htmlFor="note-deadline"><input id="note-deadline" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></Field></div>
            <Field label="Equipe responsável" htmlFor="note-team"><input id="note-team" maxLength={180} value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} placeholder="Nomes dos responsáveis" /></Field>
            <Field label="Briefing" htmlFor="note-briefing"><textarea id="note-briefing" rows={2} maxLength={3000} value={form.briefing} onChange={(event) => setForm({ ...form, briefing: event.target.value })} placeholder="Escopo, referências e combinados" /></Field>

            <fieldset className="note-line-items"><legend>Itens e serviços</legend><div className="note-items-heading"><span>Descrição</span><span>Qtd.</span><span>Valor unitário</span><span>Total</span><span className="sr-only">Remover item</span></div>
              {form.items.map((item) => <div className="note-line-row" key={item.id}><input aria-label="Descrição do serviço" required maxLength={180} value={item.description} onChange={(event) => updateLine(item.id, "description", event.target.value)} placeholder="Ex.: Identidade visual" /><input aria-label="Quantidade" type="number" min="0.01" max="100000" step="0.01" required value={item.quantity} onChange={(event) => updateLine(item.id, "quantity", event.target.value)} /><input aria-label="Valor unitário em reais" type="number" min="0" max="9999999999.99" step="0.01" required value={item.unitPrice} onChange={(event) => updateLine(item.id, "unitPrice", event.target.value)} placeholder="0,00" /><strong>{formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</strong><button className="icon-button small-icon danger-icon" type="button" aria-label="Remover item" disabled={form.items.length <= 1} onClick={() => setForm({ ...form, items: form.items.filter((current) => current.id !== item.id) })}><Minus aria-hidden="true" /></button></div>)}
              <button className="text-button add-note-line" type="button" onClick={addLine}><Plus aria-hidden="true" /> Adicionar item</button>
            </fieldset>

            <div className="chip-picker-stack"><ChipPicker label="Ferramentas utilizadas" options={toolOptions} selected={form.tools} onToggle={(value, checked) => toggleTag("tools", value, checked)} onCustom={(value) => updateCustomTags("tools", toolOptions, value)} placeholder="Outra ferramenta, separada por vírgula" /><ChipPicker label="Material de entrega" options={formatOptions} selected={form.formats} onToggle={(value, checked) => toggleTag("formats", value, checked)} onCustom={(value) => updateCustomTags("formats", formatOptions, value)} placeholder="Outro formato, separado por vírgula" /><ChipPicker label="Entrega via" options={deliveryOptions} selected={form.delivery} onToggle={(value, checked) => toggleTag("delivery", value, checked)} onCustom={(value) => updateCustomTags("delivery", deliveryOptions, value)} placeholder="Outra via, separada por vírgula" /></div>
            <div className="form-grid-three"><Field label="Código do cupom" htmlFor="note-coupon"><input id="note-coupon" maxLength={50} value={form.couponCode} onChange={(event) => setForm({ ...form, couponCode: event.target.value.toUpperCase() })} placeholder="Ex.: ADDEX10" /></Field><Field label="Desconto (%)" htmlFor="note-discount"><input id="note-discount" type="number" min="0" max="100" step="0.1" value={form.discount} onChange={(event) => setForm({ ...form, discount: event.target.value })} /></Field><Field label="Forma de pagamento" htmlFor="note-payment"><input id="note-payment" maxLength={100} list="note-payment-options" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} placeholder="Ex.: PIX" /><datalist id="note-payment-options"><option value="PIX" /><option value="Cartão de crédito" /><option value="Boleto" /><option value="Dinheiro" /><option value="Transferência" /></datalist></Field></div>
            <Field label="Status do pagamento" htmlFor="note-status"><select id="note-status" value={form.paymentStatus} onChange={(event) => setForm({ ...form, paymentStatus: event.target.value })}><option value="Pendente">Pendente</option><option value="Parcial">Parcial</option><option value="Pago">Pago</option></select></Field>
            <Field label="Observações" htmlFor="note-observations"><textarea id="note-observations" rows={3} maxLength={2000} value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} placeholder="Condições, escopo ou informações adicionais" /></Field>
            <div className="note-total-summary"><span>Subtotal <strong>{formatCurrency(subtotal)}</strong></span>{discountValue > 0 ? <span>Desconto <strong>− {formatCurrency(discountValue)}</strong></span> : null}<span className="note-grand-total">Total <strong>{formatCurrency(total)}</strong></span></div>
            <button className="button button-primary note-submit" type="submit" disabled={saving}>{saving ? "Salvando notinha…" : <><Printer aria-hidden="true" /> Salvar e imprimir / PDF</>}</button>
            <p className="field-hint">Na janela de impressão, escolha “Salvar como PDF” para baixar o documento.</p>
          </form>
        </section>

        <aside className="note-preview-column"><div className="preview-label"><span>PRÉVIA DO DOCUMENTO</span>{selected ? <StatusBadge status={form.paymentStatus} /> : null}</div><article className="note-paper print-document">
          <header className="note-paper-header"><div className="note-paper-brand"><span className="brand-loop brand-loop-blue" aria-hidden="true" /><div><strong>Addex</strong><small>Company</small></div></div><div className="note-paper-meta"><span>NOTA DE SERVIÇO</span><strong>{preview.number || "ADX-2026-001"}</strong></div></header>
          <div className="note-paper-rule" />
          <div className="note-paper-intro"><div><span>CLIENTE</span><strong>{preview.client || "Nome do cliente"}</strong>{preview.discordId ? <small>Discord: {preview.discordId}</small> : null}{preview.project ? <small>{preview.project}</small> : null}</div><div><span>EMISSÃO</span><strong>{formatDate(preview.issuedOn, { year: "numeric" })}</strong>{preview.deadline ? <><span>PRAZO DE ENTREGA</span><strong>{formatDate(preview.deadline, { year: "numeric" })}</strong></> : null}</div></div>
          {preview.team ? <div className="note-paper-detail-row"><span>EQUIPE</span><strong>{preview.team}</strong></div> : null}
          {preview.tools.length ? <div className="note-paper-detail-row"><span>FERRAMENTAS</span><strong>{preview.tools.join(", ")}</strong></div> : null}
          {preview.briefing ? <div className="note-paper-observations"><span>BRIEFING</span><p>{preview.briefing}</p></div> : null}
          <div className="note-paper-items"><div className="note-paper-table-head"><span>DESCRIÇÃO</span><span>QTD.</span><span>VALOR</span></div>{preview.items.map((item) => <div className="note-paper-item" key={item.id}><span>{item.description || "Serviço Addex"}</span><span>{item.quantity}</span><span>{formatCurrency(item.quantity * item.unitPrice)}</span></div>)}{!preview.items.length ? <div className="note-paper-item"><span>Serviço Addex</span><span>1</span><span>{formatCurrency(0)}</span></div> : null}</div>
          <div className="note-paper-totals"><div><span>Subtotal</span><strong>{formatCurrency(previewSubtotal)}</strong></div>{preview.discount > 0 ? <div><span>Desconto{preview.couponCode ? ` · ${preview.couponCode}` : ""} ({preview.discount}%)</span><strong>− {formatCurrency(previewSubtotal - previewTotal)}</strong></div> : null}<div className="note-paper-final"><span>Total</span><strong>{formatCurrency(Math.max(0, previewTotal))}</strong></div></div>
          <div className="note-paper-details"><div><span>PAGAMENTO</span><strong>{preview.paymentMethod || "A combinar"}</strong></div><div><span>STATUS</span><strong>{preview.paymentStatus}</strong></div>{preview.formats.length ? <div><span>MATERIAL</span><strong>{preview.formats.join(", ")}</strong></div> : null}{preview.delivery.length ? <div><span>ENTREGA VIA</span><strong>{preview.delivery.join(", ")}</strong></div> : null}</div>
          {preview.observations ? <div className="note-paper-observations"><span>OBSERVAÇÕES</span><p>{preview.observations}</p></div> : null}
          <footer className="note-paper-footer"><span>Obrigado por confiar na Addex Company.</span><strong>addexcompany.com</strong></footer>
        </article></aside>
      </div>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Notinhas salvas" description="Documentos registrados para consulta e impressão." wide>
        <div className="saved-notes-list">{data.notes.map((note) => <div className="saved-note-row" key={note.id}><button type="button" className="saved-note-main" onClick={() => loadNote(note)}><span className="saved-note-icon"><ReceiptText aria-hidden="true" /></span><span><strong>{note.payload.number} · {note.client}</strong><small>{note.project || "Serviço Addex"} · {formatDate(note.createdAt, { year: "numeric" })}</small></span></button><strong>{formatCurrency(note.total)}</strong><StatusBadge status={note.payload.paymentStatus} /><button className="icon-button small-icon danger-icon" type="button" aria-label={`Remover notinha ${note.payload.number}`} onClick={() => void removeNote(note)}><Trash2 aria-hidden="true" /></button></div>)}{!data.notes.length ? <div className="table-empty"><span className="empty-mark" aria-hidden="true">A</span><strong>Nenhuma notinha salva</strong><p>Os documentos criados serão listados aqui.</p></div> : null}</div>
      </Modal>
    </div>
  )
}
