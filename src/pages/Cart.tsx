import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Button, ButtonLink } from '@/components/Button'
import { EmptyState } from '@/components/States'
import { CartLineRow } from '@/features/cart/CartLineRow'
import { useCart } from '@/features/cart/CartProvider'
import { WhatsAppButton } from '@/features/whatsapp/WhatsAppButton'
import { generalInquiryMessage } from '@/features/whatsapp/buildMessage'
import { formatMoney } from '@/lib/format'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export function CartPage() {
  const { cart, total, clear } = useCart()

  useDocumentMeta({
    title: 'Tu carrito | Ferretería Lozada',
    noIndex: true,
  })

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: 'Inicio', to: '/' }, { label: 'Carrito' }]} />

      <h1 className="text-ink-900 text-2xl font-extrabold tracking-tight sm:text-3xl">
        Tu carrito
      </h1>

      {cart.lines.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Todavía no has añadido nada"
            description="Busca lo que necesitas en el catálogo y ármate la lista. Después te generamos la cotización y la envías por WhatsApp."
            action={
              <ButtonLink to="/catalogo" size="lg">
                Ver catálogo
              </ButtonLink>
            }
          />
        </div>
      ) : (
        <div className="mt-8 lg:grid lg:grid-cols-[1fr_20rem] lg:gap-10 lg:items-start">
          <div>
            <ul className="border-ink-100 rounded-card border px-4">
              {cart.lines.map((line) => (
                <CartLineRow key={line.variantId} line={line} />
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink to="/catalogo" variant="outline" size="sm">
                Seguir comprando
              </ButtonLink>
              <Button variant="ghost" size="sm" onClick={clear}>
                Vaciar carrito
              </Button>
            </div>
          </div>

          <aside className="border-ink-100 rounded-card mt-8 border p-5 lg:sticky lg:top-40 lg:mt-0">
            <h2 className="text-ink-900 text-sm font-bold uppercase tracking-wide">
              Resumen
            </h2>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">
                  {cart.lines.length}{' '}
                  {cart.lines.length === 1 ? 'producto' : 'productos'}
                </dt>
                <dd className="text-ink-900 font-semibold">
                  {formatMoney(total)}
                </dd>
              </div>
              <div className="border-ink-100 flex justify-between border-t pt-3">
                <dt className="text-ink-900 font-bold">Total referencial</dt>
                <dd className="text-ink-900 text-lg font-extrabold">
                  {formatMoney(total)}
                </dd>
              </div>
            </dl>

            <p className="text-ink-500 mt-3 text-xs leading-relaxed">
              Los precios son referenciales y se confirman por WhatsApp. No se
              paga nada en el sitio.
            </p>

            <ButtonLink to="/carrito/cotizar" size="lg" className="mt-5 w-full">
              Continuar con el pedido
            </ButtonLink>

            <div className="mt-3">
              <WhatsAppButton
                message={generalInquiryMessage()}
                variant="outline"
                className="w-full"
              >
                Tengo una duda
              </WhatsAppButton>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
