import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLocation } from 'react-router-dom'
import { useReducedMotion } from './useReducedMotion'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll global con Lenis. Se monta solo en la tienda publica (no en
 * el panel admin) y se apaga si el usuario pide menos movimiento.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (reducedMotion) return

    const lenis = new Lenis({
      // Mas rapido que el default (~1.2): la rueda debe avanzar sin arrastrar.
      duration: 0.68,
      wheelMultiplier: 1.35,
      smoothWheel: true,
      touchMultiplier: 1.15,
    })

    lenis.on('scroll', ScrollTrigger.update)

    let frame = 0
    const tick = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [reducedMotion])

  // Con Lenis activo, window.scrollTo a veces pelea: se fuerza el salto al
  // cambiar de ruta (ScrollToTop ya pide top:0; esto cubre el caso Lenis).
  useEffect(() => {
    if (reducedMotion) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    // Lenis expone el scroll del documento; sin instancia aqui, el nativo basta
    // porque el destroy/create del efecto anterior deja el scroll en 0.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, search, reducedMotion])

  return children
}
