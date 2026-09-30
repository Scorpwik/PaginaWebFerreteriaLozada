import { formatMoney, formatPrice, formatQuantity } from '@/lib/format'

export type WhatsAppLine = {
  productName: string
  variantLabel: string | null
  quantity: number
  unitPrice: number
  subtotal: number
}

/** wa.me acepta solo digitos; el '+' y los espacios rompen el enlace. */
export function whatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** Consulta de un producto agotado o sin precio publicado. */
export function productInquiryMessage(
  productName: string,
  variantLabel?: string | null,
): string {
  const what = variantLabel ? `${productName} (${variantLabel})` : productName
  return `Hola, quiero consultar la disponibilidad y el precio de: ${what}.`
}

export function generalInquiryMessage(): string {
  return 'Hola, necesito ayuda con un pedido para mi obra.'
}

/**
 * Mensaje del pedido. No incluye el codigo de producto a proposito: el codigo
 * viaja en el PDF de la cotizacion, no en el chat.
 */
export function quoteMessage(input: {
  clientName: string
  quoteNumber: string
  lines: WhatsAppLine[]
  total: number
  pdfUrl?: string | null
}): string {
  const parts: string[] = []

  parts.push(`Hola, soy ${input.clientName}.`)
  parts.push(`Quiero hacer este pedido (cotización ${input.quoteNumber}):`)
  parts.push('')

  for (const line of input.lines) {
    const name = line.variantLabel
      ? `${line.productName} — ${line.variantLabel}`
      : line.productName
    parts.push(`• ${name}`)
    parts.push(
      `   ${formatQuantity(line.quantity)} x ${formatPrice(line.unitPrice)} = ${formatMoney(line.subtotal)}`,
    )
  }

  parts.push('')
  parts.push(`TOTAL: ${formatMoney(input.total)}`)

  if (input.pdfUrl) {
    parts.push('')
    parts.push(`Cotización en PDF: ${input.pdfUrl}`)
  }

  return parts.join('\n')
}
