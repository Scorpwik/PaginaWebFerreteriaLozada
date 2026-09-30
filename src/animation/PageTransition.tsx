import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from './useReducedMotion'

/**
 * Entrada suave al cambiar de pagina (fade + leve subida). Sin libreria extra:
 * solo CSS. Se apaga con prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()

  return (
    <div
      key={pathname}
      className={reduced ? undefined : 'page-enter'}
    >
      {children}
    </div>
  )
}
