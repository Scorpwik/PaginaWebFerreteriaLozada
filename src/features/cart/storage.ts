import { z } from 'zod'
import { emptyCart, normalizeQuantity } from './cart'
import type { Cart } from './cart'

const STORAGE_KEY = 'ferreteria-lozada.cart.v1'

// El carrito viene de sessionStorage, que el usuario puede editar: se valida
// igual que cualquier otra entrada externa.
const lineSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  productOriginId: z.number().int().nullable(),
  productName: z.string().min(1).max(200),
  variantLabel: z.string().max(200).nullable(),
  saleUnit: z.string().max(60).nullable(),
  unitPrice: z.number().nonnegative().finite(),
  quantity: z.number().positive().finite(),
  imageUrl: z.string().max(2000).nullable(),
})

const cartSchema = z.object({ lines: z.array(lineSchema).max(80) })

export function loadCart(): Cart {
  if (typeof window === 'undefined') return emptyCart

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCart

    const parsed = cartSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return emptyCart

    return {
      lines: parsed.data.lines.map((line) => ({
        ...line,
        quantity: normalizeQuantity(line.quantity),
      })),
    }
  } catch {
    return emptyCart
  }
}

export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Modo privado o cuota llena: el carrito sigue vivo en memoria.
  }
}

export function clearStoredCart(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin persistencia no se rompe nada.
  }
}
