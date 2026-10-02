/**
 * Logica del carrito, sin React y sin Supabase: entra un carrito, sale otro.
 * Los precios que se guardan aqui son referenciales; la Edge Function los
 * vuelve a leer de la base antes de crear la cotizacion.
 */

export type CartLine = {
  variantId: string
  productId: string
  productOriginId: number | null
  productName: string
  variantLabel: string | null
  saleUnit: string | null
  unitPrice: number
  quantity: number
  imageUrl: string | null
}

export type Cart = { lines: CartLine[] }

export const emptyCart: Cart = { lines: [] }

export const MIN_QUANTITY = 1
export const MAX_QUANTITY = 100000

/** Solo dígitos mientras se escribe; enteros positivos, mínimo 1. */
export function sanitizeQuantityDigits(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export function normalizeQuantity(value: number): number {
  if (!Number.isFinite(value)) return MIN_QUANTITY
  const rounded = Math.round(value)
  return Math.min(Math.max(rounded, MIN_QUANTITY), MAX_QUANTITY)
}

/** Añadir la misma variante otra vez suma cantidad en lugar de duplicar linea. */
export function addLine(cart: Cart, line: CartLine): Cart {
  const existing = cart.lines.find((item) => item.variantId === line.variantId)

  if (!existing) {
    return {
      lines: [...cart.lines, { ...line, quantity: normalizeQuantity(line.quantity) }],
    }
  }

  return {
    lines: cart.lines.map((item) =>
      item.variantId === line.variantId
        ? {
            ...item,
            // El precio y la etiqueta se refrescan con lo ultimo que se vio.
            unitPrice: line.unitPrice,
            variantLabel: line.variantLabel,
            saleUnit: line.saleUnit,
            imageUrl: line.imageUrl ?? item.imageUrl,
            quantity: normalizeQuantity(item.quantity + line.quantity),
          }
        : item,
    ),
  }
}

export function setQuantity(
  cart: Cart,
  variantId: string,
  quantity: number,
): Cart {
  const normalized = normalizeQuantity(quantity)
  return {
    lines: cart.lines.map((item) =>
      item.variantId === variantId ? { ...item, quantity: normalized } : item,
    ),
  }
}

export function removeLine(cart: Cart, variantId: string): Cart {
  return { lines: cart.lines.filter((item) => item.variantId !== variantId) }
}

/**
 * Cambiar de variante dentro del carrito: si la nueva ya estaba, se fusionan.
 */
export function replaceVariant(
  cart: Cart,
  fromVariantId: string,
  replacement: CartLine,
): Cart {
  const current = cart.lines.find((item) => item.variantId === fromVariantId)
  if (!current) return cart

  const withoutOld = removeLine(cart, fromVariantId)
  return addLine(withoutOld, { ...replacement, quantity: current.quantity })
}

export function lineSubtotal(line: CartLine): number {
  return Math.round(line.unitPrice * line.quantity * 100) / 100
}

export function cartTotals(cart: Cart): {
  lineCount: number
  itemCount: number
  total: number
} {
  const total = cart.lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
  return {
    lineCount: cart.lines.length,
    // El badge cuenta lineas, no unidades: "3" al lado del carrito significa
    // tres productos distintos, que es lo que el cliente espera ver.
    itemCount: cart.lines.length,
    total: Math.round(total * 100) / 100,
  }
}

/** Lo que se manda a la Edge Function: solo variante y cantidad. */
export function toQuoteItems(
  cart: Cart,
): { variant_id: string; quantity: number }[] {
  return cart.lines.map((line) => ({
    variant_id: line.variantId,
    quantity: line.quantity,
  }))
}
