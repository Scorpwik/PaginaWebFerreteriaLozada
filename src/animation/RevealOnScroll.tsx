import { useReveal } from './useReveal'

/** Activa las apariciones GSAP dentro del shell publico. */
export function RevealOnScroll() {
  useReveal('main#contenido')
  return null
}
