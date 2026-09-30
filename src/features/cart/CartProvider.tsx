import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  addLine,
  cartTotals,
  emptyCart,
  removeLine,
  replaceVariant,
  setQuantity,
} from './cart'
import type { Cart, CartLine } from './cart'
import { clearStoredCart, loadCart, saveCart } from './storage'

type CartContextValue = {
  cart: Cart
  itemCount: number
  total: number
  /** Cambia en cada alta para disparar la microanimacion del badge. */
  addPulse: number
  add: (line: CartLine) => void
  update: (variantId: string, quantity: number) => void
  remove: (variantId: string) => void
  swapVariant: (fromVariantId: string, replacement: CartLine) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  // Se hidrata en el inicializador y no en un efecto: con un efecto, el efecto
  // de guardado corria antes de que el estado hidratado se aplicara y pisaba
  // sessionStorage con un carrito vacio en cada carga de pagina.
  const [cart, setCart] = useState<Cart>(loadCart)
  const [addPulse, setAddPulse] = useState(0)

  useEffect(() => {
    saveCart(cart)
  }, [cart])

  const add = useCallback((line: CartLine) => {
    setCart((current) => addLine(current, line))
    setAddPulse((value) => value + 1)
  }, [])

  const update = useCallback((variantId: string, quantity: number) => {
    setCart((current) => setQuantity(current, variantId, quantity))
  }, [])

  const remove = useCallback((variantId: string) => {
    setCart((current) => removeLine(current, variantId))
  }, [])

  const swapVariant = useCallback(
    (fromVariantId: string, replacement: CartLine) => {
      setCart((current) => replaceVariant(current, fromVariantId, replacement))
    },
    [],
  )

  const clear = useCallback(() => {
    setCart(emptyCart)
    clearStoredCart()
  }, [])

  const value = useMemo<CartContextValue>(() => {
    const totals = cartTotals(cart)
    return {
      cart,
      itemCount: totals.itemCount,
      total: totals.total,
      addPulse,
      add,
      update,
      remove,
      swapVariant,
      clear,
    }
  }, [cart, addPulse, add, update, remove, swapVariant, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider.')
  return context
}
