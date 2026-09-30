import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { ButtonLink } from '@/components/Button'
import { ClientNameForm } from '@/features/quote/ClientNameForm'
import { QuoteResultPanel } from '@/features/quote/QuoteResultPanel'
import { useCart } from '@/features/cart/CartProvider'
import { toQuoteItems } from '@/features/cart/cart'
import { createQuote, QuoteError } from '@/data/orders'
import type { QuoteResult } from '@/data/orders'
import { formatMoney } from '@/lib/format'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export function QuotePage() {
  const { cart, total } = useCart()
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<QuoteError | null>(null)

  useDocumentMeta({ title: 'Generar cotización | Ferretería Lozada', noIndex: true })

  const submit = async (name: string) => {
    setSubmitting(true)
    setError(null)

    try {
      setResult(await createQuote({ client_name: name, items: toQuoteItems(cart) }))
    } catch (cause) {
      setError(
        cause instanceof QuoteError
          ? cause
          : new QuoteError('No pudimos generar la cotización.'),
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Con la cotizacion ya creada el carrito se vacia, asi que el guard va antes.
  if (!result && cart.lines.length === 0) {
    return <Navigate to="/carrito" replace />
  }

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { label: 'Inicio', to: '/' },
          { label: 'Carrito', to: '/carrito' },
          { label: 'Cotización' },
        ]}
      />

      {result ? (
        <>
          <h1 className="text-ink-900 text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            ¡Listo, {result.client_name}!
          </h1>
          <p className="text-ink-600 mx-auto mt-2 max-w-md text-center text-sm">
            Guarda el PDF y mándanos el pedido por WhatsApp. Nosotros confirmamos
            disponibilidad y coordinamos la entrega.
          </p>
          <div className="mt-8">
            <QuoteResultPanel result={result} />
          </div>
        </>
      ) : (
        <div className="mx-auto max-w-xl">
          <h1 className="text-ink-900 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Último paso
          </h1>
          <p className="text-ink-600 mt-2 text-sm">
            {cart.lines.length}{' '}
            {cart.lines.length === 1 ? 'producto' : 'productos'} por{' '}
            <span className="text-ink-900 font-semibold">
              {formatMoney(total)}
            </span>{' '}
            (referencial).
          </p>

          <div className="border-ink-100 rounded-card mt-6 border p-5 sm:p-6">
            <ClientNameForm onSubmit={submit} submitting={submitting} />

            {error ? (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm"
              >
                <p className="font-semibold text-red-900">{error.message}</p>
                {error.details.length > 0 ? (
                  <ul className="mt-1.5 list-inside list-disc text-red-800">
                    {error.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-4 text-center">
            <ButtonLink to="/carrito" variant="ghost" size="sm">
              Volver al carrito
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  )
}
