import { useState } from 'react'
import { Button } from '@/components/Button'
import { Pagination } from '@/components/Pagination'
import { ErrorState, Skeleton } from '@/components/States'
import { AdminCard, FormError } from '@/features/admin/FormControls'
import { useAdminToast } from '@/features/admin/AdminToast'
import {
  deleteQuote,
  fetchQuoteLines,
  fetchQuotes,
  signQuotePdf,
} from '@/data/adminQuotes'
import type { QuoteHistoryRow, QuoteLineRow } from '@/data/adminQuotes'
import { formatDate, formatMoney, formatPrice, formatQuantity } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

/** 'YYYY-MM-DD' de hoy en hora local, comparable con el date de Postgres. */
function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function QuoteLines({ orderId }: { orderId: string }) {
  const { data, loading, error, reload } = useAsync<QuoteLineRow[]>(
    () => fetchQuoteLines(orderId),
    [orderId],
  )

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <Skeleton className="h-24" />

  if (data.length === 0) {
    return <p className="text-ink-600 text-sm">Esta cotización no tiene líneas.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <caption className="sr-only">Productos de la cotización</caption>
        <thead>
          <tr className="text-ink-500 border-ink-100 border-b text-xs uppercase">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Producto
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Cantidad
            </th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">
              Precio
            </th>
            <th scope="col" className="py-2 pl-3 text-right font-semibold">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="divide-ink-100 divide-y">
          {data.map((line, index) => (
            <tr key={`${line.productName}-${index}`}>
              <td className="py-2 pr-3">
                <span className="text-ink-900 font-medium">{line.productName}</span>
                {line.variantLabel ? (
                  <span className="text-ink-500 block text-xs">
                    {line.variantLabel}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 text-right">{formatQuantity(line.quantity)}</td>
              <td className="px-3 py-2 text-right">{formatPrice(line.unitPrice)}</td>
              <td className="py-2 pl-3 text-right font-semibold">
                {formatMoney(line.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminQuotes() {
  useDocumentMeta({ title: 'Cotizaciones | Administración', noIndex: true })

  const toast = useAdminToast()
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const quotes = useAsync(() => fetchQuotes(page), [page])
  const today = todayIso()

  const openPdf = async (row: QuoteHistoryRow) => {
    if (!row.pdfPath) return
    setActionError(null)
    setBusyId(row.id)

    // La ventana se abre en el clic, antes del await: si se abre despues de la
    // llamada a la red, el navegador la toma por una ventana emergente y la bloquea.
    const win = window.open('', '_blank')
    if (win) win.opener = null

    try {
      const url = await signQuotePdf(row.pdfPath)
      if (win) win.location.href = url
      else window.location.href = url
      toast.info(`Abriendo PDF de ${row.quoteNumber}…`)
    } catch (cause) {
      win?.close()
      const message =
        cause instanceof Error ? cause.message : 'No se pudo abrir el PDF.'
      setActionError(message)
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (row: QuoteHistoryRow) => {
    if (
      !window.confirm(
        `¿Borrar la cotización ${row.quoteNumber} de ${row.clientName}?\n\nEsto no se puede deshacer.`,
      )
    ) {
      return
    }
    setActionError(null)
    setBusyId(row.id)
    try {
      await deleteQuote(row.id)
      if (openId === row.id) setOpenId(null)
      toast.success(`Se borró la cotización ${row.quoteNumber}.`)
      // Si era la unica de la ultima pagina, se retrocede para no quedar en blanco.
      if ((quotes.data?.items.length ?? 0) <= 1 && page > 1) setPage(page - 1)
      else quotes.reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setActionError(message)
      toast.error(message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink-900 text-2xl font-extrabold">Cotizaciones</h1>
        <p className="text-ink-600 mt-1 text-sm">
          {quotes.data
            ? `${quotes.data.total} cotización(es) guardadas. `
            : ''}
          Se borran solas cuando vencen, así que aquí solo aparecen las recientes.
        </p>
      </div>

      {actionError ? <FormError>{actionError}</FormError> : null}

      {quotes.error ? (
        <ErrorState error={quotes.error} onRetry={quotes.reload} />
      ) : quotes.loading && !quotes.data ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : quotes.data && quotes.data.items.length === 0 ? (
        <AdminCard>
          <p className="text-ink-600 text-sm">
            Todavía no hay cotizaciones. Aparecerán aquí cuando un cliente genere
            una desde el carrito.
          </p>
        </AdminCard>
      ) : (
        <>
          <ul className="space-y-2">
            {quotes.data?.items.map((row) => {
              const expanded = openId === row.id
              const expired = row.validUntil < today
              const busy = busyId === row.id

              return (
                <li
                  key={row.id}
                  className="border-ink-100 rounded-card border bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-900 font-semibold">
                        {row.quoteNumber}{' '}
                        <span className="text-ink-700 font-medium">
                          · {row.clientName}
                        </span>
                        {expired ? (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
                            Vencida
                          </span>
                        ) : null}
                      </p>
                      <p className="text-ink-500 mt-0.5 text-xs">
                        {formatDate(row.createdAt)} · válida hasta{' '}
                        {formatDate(row.validUntil)} · {row.itemCount}{' '}
                        {row.itemCount === 1 ? 'línea' : 'líneas'}
                      </p>
                    </div>

                    <p className="text-ink-900 shrink-0 text-lg font-extrabold">
                      {formatMoney(row.total)}
                    </p>

                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm font-semibold">
                      <button
                        type="button"
                        onClick={() => setOpenId(expanded ? null : row.id)}
                        aria-expanded={expanded}
                        aria-controls={`quote-lines-${row.id}`}
                        className="text-brand-700 underline"
                      >
                        {expanded ? 'Ocultar líneas' : 'Ver líneas'}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!row.pdfPath || busy}
                        onClick={() => void openPdf(row)}
                        title={row.pdfPath ? undefined : 'Esta cotización no tiene PDF'}
                      >
                        {row.pdfPath ? 'Ver PDF' : 'Sin PDF'}
                      </Button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(row)}
                        className="text-red-700 underline disabled:opacity-50"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>

                  {expanded ? (
                    <div
                      id={`quote-lines-${row.id}`}
                      className="border-ink-100 mt-4 border-t pt-4"
                    >
                      <QuoteLines orderId={row.id} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <Pagination
            page={page}
            totalPages={quotes.data?.totalPages ?? 1}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}
