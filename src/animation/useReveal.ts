import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from './useReducedMotion'

gsap.registerPlugin(ScrollTrigger)

const REVEALED = 'data-reveal-done'

/**
 * Aparecen al entrar en viewport los nodos con [data-reveal].
 * Soporta nodos que llegan despues (tarjetas async del catalogo) via MutationObserver.
 */
export function useReveal(rootSelector = 'main'): void {
  const reducedMotion = useReducedMotion()
  const { pathname, search } = useLocation()

  useEffect(() => {
    if (reducedMotion) return

    const root = document.querySelector(rootSelector)
    if (!root) return

    const armed = new WeakSet<Element>()

    const arm = (elements: HTMLElement[]) => {
      const fresh = elements.filter((el) => {
        if (armed.has(el) || el.hasAttribute(REVEALED)) return false
        armed.add(el)
        return true
      })
      if (fresh.length === 0) return

      gsap.set(fresh, { autoAlpha: 0, y: 22 })

      ScrollTrigger.batch(fresh, {
        start: 'top 92%',
        once: true,
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.06,
            overwrite: true,
            onComplete: () => {
              gsap.set(batch, { clearProps: 'transform,opacity,visibility' })
              for (const node of batch) {
                ;(node as HTMLElement).setAttribute(REVEALED, '')
              }
            },
          })
        },
      })
    }

    arm(Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]')))

    const observer = new MutationObserver((mutations) => {
      const added: HTMLElement[] = []
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.matches('[data-reveal]')) added.push(node)
          added.push(
            ...Array.from(node.querySelectorAll<HTMLElement>('[data-reveal]')),
          )
        }
      }
      if (added.length > 0) arm(added)
    })

    observer.observe(root, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
      gsap.killTweensOf('[data-reveal]')
    }
  }, [pathname, search, reducedMotion, rootSelector])
}
