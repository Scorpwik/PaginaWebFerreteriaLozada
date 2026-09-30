import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from './Logo'
import { useSettings } from '@/features/settings/SettingsProvider'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppButton'
import { whatsappUrl, generalInquiryMessage } from '@/features/whatsapp/buildMessage'
import type { ReactNode } from 'react'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/nosotros', label: 'Sobre nosotros' },
]

/**
 * `actions` es el punto de extension de la cabecera: en el catalogo de solo
 * lectura solo lleva WhatsApp, y el carrito se suma ahi cuando existe.
 */
export function Header({ actions }: { actions?: ReactNode }) {
  const { whatsappNumber } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setMenuOpen(false), [location.pathname])

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
            <a
              href={whatsappUrl(whatsappNumber, generalInquiryMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-lg bg-[#1c8c4c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#166b3b] sm:inline-flex"
            >
              <WhatsAppIcon />
              Pedir por WhatsApp
            </a>

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

      {menuOpen ? (
        <nav
          id="menu-movil"
          aria-label="Menú móvil"
          className="border-ink-100 border-t bg-white lg:hidden"
        >
          <ul className="container-page py-2">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-ink-800 hover:bg-ink-50 block rounded-lg px-3 py-3 font-semibold"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={whatsappUrl(whatsappNumber, generalInquiryMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg px-3 py-3 font-semibold text-[#166b3b]"
              >
                <WhatsAppIcon />
                Pedir por WhatsApp
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
