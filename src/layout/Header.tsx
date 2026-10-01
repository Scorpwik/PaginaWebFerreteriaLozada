import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { MobileNav } from './MobileNav'
import { useSettings } from '@/features/settings/SettingsProvider'
import { WhatsAppButton } from '@/features/whatsapp/WhatsAppButton'
import { generalInquiryMessage } from '@/features/whatsapp/buildMessage'
import type { ReactNode } from 'react'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/promociones', label: 'Promociones' },
  { to: '/nosotros', label: 'Sobre nosotros' },
]

const HERO_WHATSAPP_ID = 'hero-whatsapp-cta'

/**
 * `actions` es el punto de extension de la cabecera: en el catalogo de solo
 * lectura solo lleva WhatsApp, y el carrito se suma ahi cuando existe.
 */
export function Header({ actions }: { actions?: ReactNode }) {
  const { whatsappNumber } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [showHeaderWhatsApp, setShowHeaderWhatsApp] = useState(
    () => (typeof window === 'undefined' ? true : window.location.pathname !== '/'),
  )

  useEffect(() => setMenuOpen(false), [location.pathname])

  // En Home el CTA verde ya esta junto a "Ver catalogo". El del header solo
  // aparece cuando ese boton sale de vista, para no duplicar.
  useEffect(() => {
    const heroCta = document.getElementById(HERO_WHATSAPP_ID)
    if (!heroCta) {
      setShowHeaderWhatsApp(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeaderWhatsApp(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' },
    )
    observer.observe(heroCta)
    return () => observer.disconnect()
  }, [location.pathname])

  return (
    <header className="border-ink-100 sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="container-page">
        <div className="flex items-center gap-4 py-3">
          <Logo />

          <nav aria-label="Principal" className="ml-4 hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                        isActive
                          ? 'text-brand-700 bg-brand-50'
                          : 'text-ink-700 hover:text-brand-700 hover:bg-ink-50'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {showHeaderWhatsApp ? (
              <WhatsAppButton
                message={generalInquiryMessage()}
                size="sm"
                className="header-wa-in hidden sm:inline-flex"
              >
                Pedir por WhatsApp
              </WhatsAppButton>
            ) : null}

            {actions}

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              className="text-ink-700 hover:bg-ink-50 grid size-11 place-items-center rounded-lg lg:hidden"
            >
              <span className="sr-only">
                {menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="size-6"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <MobileNav
        open={menuOpen}
        links={links}
        whatsappNumber={whatsappNumber}
      />
    </header>
  )
}
