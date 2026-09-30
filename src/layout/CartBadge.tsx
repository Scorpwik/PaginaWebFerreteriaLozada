import { Link } from 'react-router-dom'
import { useCart } from '@/features/cart/CartProvider'

/**
 * El contador hace un pulso pequeño al añadir. Nunca bloquea la navegacion:
 * es solo una animacion CSS de 320ms sobre el badge.
 */
export function CartBadge() {
  const { itemCount, addPulse } = useCart()

  return (
    <Link
      to="/carrito"
      className="text-ink-800 hover:bg-ink-50 relative grid size-11 place-items-center rounded-lg"
      aria-label={
        itemCount === 0
          ? 'Carrito vacío'
          : `Carrito con ${itemCount} ${itemCount === 1 ? 'producto' : 'productos'}`
      }
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-6"
        aria-hidden="true"
      >
        <path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21 8H6" />
        <circle cx="9.5" cy="20" r="1.4" />
        <circle cx="17.5" cy="20" r="1.4" />
      </svg>

      {itemCount > 0 ? (
        <span
          // El key fuerza a React a remontar el span, que es lo que reinicia
          // la animacion en cada alta.
          key={addPulse}
          className="bg-brand-600 cart-pop absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.6875rem] font-extrabold leading-none text-white"
          aria-hidden="true"
        >
          {itemCount}
        </span>
      ) : null}
    </Link>
  )
}
