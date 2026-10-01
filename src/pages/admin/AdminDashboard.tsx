import { Link } from 'react-router-dom'
import { fetchAdminStats } from '@/data/adminQuotes'
import { AdminCard } from '@/features/admin/FormControls'
import { ErrorState, Skeleton } from '@/components/States'
import { formatMoney, formatQuantity } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'warn'
}) {
  return (
    <div className="border-ink-100 rounded-card border bg-white p-4">
      <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`mt-1.5 text-2xl font-extrabold ${
          tone === 'warn' ? 'text-amber-brand-dark' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="text-ink-500 mt-1 text-xs">{hint}</p> : null}
    </div>
  )
}

export default function AdminDashboard() {
  useDocumentMeta({ title: 'Resumen | Administración', noIndex: true })

  const { data, loading, error, reload } = useAsync(() => fetchAdminStats(), [])

  if (error) return <ErrorState error={error} onRetry={reload} />

  if (loading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink-900 text-2xl font-extrabold">Resumen</h1>
        <p className="text-ink-600 mt-1 text-sm">
          Las cotizaciones se borran solas a los 15 días, así que estos números
          reflejan las últimas dos semanas.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Cotizaciones"
          value={String(data.quoteCount)}
          hint="Pedidos generados en los últimos 15 días"
        />
        <Stat
          label="Monto cotizado"
          value={formatMoney(data.quotedTotal)}
          hint="Suma referencial, no ventas confirmadas"
        />
        <Stat
          label="Productos en catálogo"
          value={String(data.productCount)}
          hint={`${data.variantCount} variantes`}
        />
        <Stat
          label="Variantes agotadas"
          value={String(data.outOfStockCount)}
          tone={data.outOfStockCount > 0 ? 'warn' : 'neutral'}
          hint="Se muestran como Agotado en la tienda"
        />
        <Stat
          label="Variantes sin precio"
          value={String(data.noPriceCount)}
          tone={data.noPriceCount > 0 ? 'warn' : 'neutral'}
          hint="No se pueden añadir al carrito"
        />
        <div className="border-ink-100 rounded-card flex flex-col justify-center border border-dashed bg-white p-4">
          <p className="text-ink-700 text-sm font-semibold">Accesos rápidos</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to="/admin/productos" className="text-brand-700 font-semibold underline">
              Editar productos
            </Link>
            <Link
              to="/admin/promociones"
              className="text-brand-700 font-semibold underline"
            >
              Combos y promociones
            </Link>
            <Link
              to="/admin/importar"
              className="text-brand-700 font-semibold underline"
            >
              Importar catálogo
            </Link>
            <Link
              to="/admin/cotizaciones"
              className="text-brand-700 font-semibold underline"
            >
              Ver cotizaciones
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard
          title="Productos más pedidos"
          description="Ordenados por cantidad de cotizaciones en que aparecen."
        >
          {data.topProducts.length === 0 ? (
            <p className="text-ink-500 text-sm">
              Todavía no hay cotizaciones para medir.
            </p>
          ) : (
            <ol className="divide-ink-100 divide-y">
              {data.topProducts.map((row, index) => (
                <li
                  key={row.name}
                  className="flex items-baseline gap-3 py-2.5 text-sm"
                >
                  <span className="text-ink-400 w-5 shrink-0 font-bold">
                    {index + 1}
                  </span>
                  <span className="text-ink-900 min-w-0 flex-1 font-medium">
                    {row.name}
                  </span>
                  <span className="text-ink-600 shrink-0 text-xs">
                    {row.orders}{' '}
                    {row.orders === 1 ? 'cotización' : 'cotizaciones'} ·{' '}
                    {formatQuantity(row.quantity)} u.
                  </span>
                </li>
              ))}
            </ol>
          )}
        </AdminCard>

        <AdminCard
          title="Categorías más pedidas"
          description="Según las categorías de los productos cotizados."
        >
          {data.topCategories.length === 0 ? (
            <p className="text-ink-500 text-sm">
              Todavía no hay cotizaciones para medir.
            </p>
          ) : (
            <ul className="divide-ink-100 divide-y">
              {data.topCategories.map((row) => (
                <li
                  key={row.name}
                  className="flex items-baseline justify-between gap-3 py-2.5 text-sm"
                >
                  <span className="text-ink-900 font-medium">{row.name}</span>
                  <span className="text-ink-600 shrink-0 text-xs">
                    {row.quotes} {row.quotes === 1 ? 'cotización' : 'cotizaciones'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  )
}
