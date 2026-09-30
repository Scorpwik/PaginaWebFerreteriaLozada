import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export type QuoteLine = {
  code: string
  productName: string
  variantLabel: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export type QuotePdfInput = {
  businessName: string
  address: string
  phone: string
  schedule: string
  logoBytes: Uint8Array | null
  logoMime: string | null
  quoteNumber: string
  clientName: string
  createdAt: Date
  validUntil: string
  lines: QuoteLine[]
  total: number
  validityDays: number
}

const BRAND = rgb(0.949, 0.188, 0.02)
const INK = rgb(0.149, 0.149, 0.149)
const MUTED = rgb(0.45, 0.45, 0.45)
const RULE = rgb(0.85, 0.85, 0.85)

/**
 * Las fuentes estandar de pdf-lib codifican en WinAnsi y lanzan error con
 * cualquier caracter fuera de ese rango. Los acentos del espanol si entran;
 * las comillas tipograficas y los guiones largos se normalizan a ASCII.
 */
function safeText(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

function money(value: number): string {
  return `$${value.toFixed(2)}`
}

function unitPrice(value: number): string {
  // Un tornillo puede costar $0.0130: con dos decimales se veria como $0.01.
  return value < 0.1 && value > 0 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`
}

function quantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  })
}

/**
 * valid_until es un 'date' de Postgres ('2026-10-15'). Date lo lee a medianoche
 * UTC, que en Ecuador es el dia anterior, asi que se formatea en UTC para que el
 * PDF diga la misma fecha que guarda la base.
 */
function formatDateOnly(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export async function buildQuotePdf(input: QuotePdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(`Cotizacion ${input.quoteNumber}`)
  doc.setAuthor(input.businessName)
  doc.setCreator(input.businessName)

  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 46
  const contentWidth = pageWidth - margin * 2

  let page = doc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const text = (
    value: string,
    x: number,
    size: number,
    options: { font?: typeof regular; color?: typeof INK } = {},
  ) => {
    page.drawText(safeText(value), {
      x,
      y,
      size,
      font: options.font ?? regular,
      color: options.color ?? INK,
    })
  }

  /* ---------- Encabezado ---------- */

  let headerTextX = margin

  if (input.logoBytes) {
    try {
      const image =
        input.logoMime === 'image/png'
          ? await doc.embedPng(input.logoBytes)
          : await doc.embedJpg(input.logoBytes)
      const scaled = image.scaleToFit(96, 48)
      page.drawImage(image, {
        x: margin,
        y: y - scaled.height,
        width: scaled.width,
        height: scaled.height,
      })
      headerTextX = margin + scaled.width + 14
    } catch {
      // Un logo ilegible no debe impedir emitir la cotizacion.
    }
  }

  y -= 14
  text(input.businessName, headerTextX, 17, { font: bold, color: BRAND })
  y -= 15
  text(input.address, headerTextX, 9, { color: MUTED })
  y -= 12
  text(`WhatsApp: ${input.phone}`, headerTextX, 9, { color: MUTED })
  y -= 12
  text(input.schedule, headerTextX, 9, { color: MUTED })

  y -= 26
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 2,
    color: BRAND,
  })

  /* ---------- Datos de la cotizacion ---------- */

  y -= 26
  text('COTIZACION', margin, 20, { font: bold })

  const rightColumn = pageWidth - margin - 190
  const savedY = y
  text(`No. ${input.quoteNumber}`, rightColumn, 11, { font: bold })
  y -= 14
  text(`Fecha: ${formatDate(input.createdAt)}`, rightColumn, 9, { color: MUTED })
  y -= 12
  text(`Valida hasta: ${formatDateOnly(input.validUntil)}`, rightColumn, 9, {
    color: MUTED,
  })
  y = savedY

  y -= 34
  text('Cliente', margin, 8, { font: bold, color: MUTED })
  y -= 13
  text(input.clientName, margin, 12, { font: bold })

  /* ---------- Tabla ---------- */

  const columns = {
    code: margin,
    product: margin + 58,
    variant: margin + 232,
    quantity: margin + 330,
    unitPrice: margin + 386,
    subtotal: margin + 462,
  }

  const drawTableHeader = () => {
    y -= 26
    page.drawRectangle({
      x: margin,
      y: y - 6,
      width: contentWidth,
      height: 20,
      color: rgb(0.965, 0.965, 0.965),
    })
    const labels: [string, number][] = [
      ['CODIGO', columns.code + 4],
      ['PRODUCTO', columns.product],
      ['OPCION', columns.variant],
      ['CANT.', columns.quantity],
      ['P. UNIT.', columns.unitPrice],
      ['SUBTOTAL', columns.subtotal],
    ]
    for (const [label, x] of labels) {
      page.drawText(label, { x, y, size: 7.5, font: bold, color: MUTED })
    }
    y -= 8
  }

  /** Corta un texto para que no invada la columna siguiente. */
  const clip = (value: string, size: number, maxWidth: number): string[] => {
    const words = safeText(value).split(' ')
    const lines: string[] = []
    let current = ''

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (regular.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate
      } else {
        if (current) lines.push(current)
        current = word
      }
      if (lines.length === 2) break
    }
    if (current && lines.length < 2) lines.push(current)

    return lines.length > 0 ? lines : ['']
  }

  drawTableHeader()

  for (const line of input.lines) {
    const nameLines = clip(line.productName, 8.5, columns.variant - columns.product - 8)
    const variantLines = clip(
      line.variantLabel,
      8,
      columns.quantity - columns.variant - 8,
    )
    const rowHeight = Math.max(nameLines.length, variantLines.length, 1) * 11 + 8

    // Salto de pagina si la fila no entra.
    if (y - rowHeight < margin + 90) {
      page = doc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      drawTableHeader()
    }

    y -= 14
    const rowTop = y

    page.drawText(safeText(line.code), {
      x: columns.code + 4,
      y: rowTop,
      size: 8,
      font: regular,
      color: MUTED,
    })

    nameLines.forEach((value, index) => {
      page.drawText(value, {
        x: columns.product,
        y: rowTop - index * 11,
        size: 8.5,
        font: index === 0 ? bold : regular,
        color: INK,
      })
    })

    variantLines.forEach((value, index) => {
      page.drawText(value, {
        x: columns.variant,
        y: rowTop - index * 11,
        size: 8,
        font: regular,
        color: MUTED,
      })
    })

    page.drawText(quantity(line.quantity), {
      x: columns.quantity,
      y: rowTop,
      size: 8.5,
      font: regular,
      color: INK,
    })
    page.drawText(unitPrice(line.unitPrice), {
      x: columns.unitPrice,
      y: rowTop,
      size: 8.5,
      font: regular,
      color: INK,
    })
    page.drawText(money(line.subtotal), {
      x: columns.subtotal,
      y: rowTop,
      size: 8.5,
      font: bold,
      color: INK,
    })

    y = rowTop - (rowHeight - 14)
    page.drawLine({
      start: { x: margin, y: y - 4 },
      end: { x: pageWidth - margin, y: y - 4 },
      thickness: 0.5,
      color: RULE,
    })
  }

  /* ---------- Total ---------- */

  y -= 26
  page.drawRectangle({
    x: columns.quantity - 14,
    y: y - 8,
    width: pageWidth - margin - (columns.quantity - 14),
    height: 26,
    color: rgb(0.965, 0.965, 0.965),
  })
  page.drawText('TOTAL', {
    x: columns.quantity,
    y,
    size: 11,
    font: bold,
    color: INK,
  })
  page.drawText(money(input.total), {
    x: columns.subtotal,
    y,
    size: 12,
    font: bold,
    color: BRAND,
  })

  /* ---------- Pie ---------- */

  y -= 46
  const notes = [
    `Cotizacion referencial con vigencia de ${input.validityDays} dias.`,
    'Los precios pueden variar segun disponibilidad y no incluyen transporte.',
    'Para confirmar tu pedido escribenos por WhatsApp al numero de arriba.',
  ]
  for (const note of notes) {
    page.drawText(safeText(note), {
      x: margin,
      y,
      size: 8,
      font: regular,
      color: MUTED,
    })
    y -= 11
  }

  return await doc.save()
}
