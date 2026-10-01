import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { useIsDesktop } from './useIsDesktop'
import { useReducedMotion } from './useReducedMotion'

/**
 * Entrada al cambiar de pagina. En movil: CSS corto (transform + opacity).
 * En desktop: GSAP ~360ms. Se apaga con prefers-reduced-motion.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const isDesktop = useIsDesktop()
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = rootRef.current
    if (!node || reduced || !isDesktop) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        node,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power2.out' },
      )
    }, node)

    return () => ctx.revert()
  }, [pathname, reduced, isDesktop])

  return (
    <div
      key={pathname}
      ref={rootRef}
      className={reduced || isDesktop ? undefined : 'page-enter'}
    >
      {children}
    </div>
  )
}
