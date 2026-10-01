import { Link } from 'react-router-dom'
import { WhatsAppIcon } from '@/features/whatsapp/WhatsAppButton'
import { whatsappUrl, generalInquiryMessage } from '@/features/whatsapp/buildMessage'

export type NavLinkItem = { to: string; label: string }

export function MobileNav({
  open,
  links,
  whatsappNumber,
}: {
  open: boolean
  links: NavLinkItem[]
  whatsappNumber: string
}) {
  if (!open) return null

  return (
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
  )
}
