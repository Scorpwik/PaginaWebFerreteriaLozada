type Props = {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** Ventana corta de paginas para que quepa en 320px. */
function pageWindow(page: number, totalPages: number): number[] {
  const span = 1
  const pages = new Set<number>([1, totalPages])
  for (let i = page - span; i <= page + span; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i)
  }
  return [...pages].sort((a, b) => a - b)
}

export function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  return (
    <nav aria-label="Paginación del catálogo" className="mt-10">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="border-ink-200 text-ink-700 hover:border-brand-600 hover:text-brand-700 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-700"
          >
            Anterior
          </button>
        </li>

        {pages.map((value, index) => {
          const previous = pages[index - 1]
          const gap = previous !== undefined && value - previous > 1

          return (
            <li key={value} className="flex items-center gap-2">
              {gap ? (
                <span className="text-ink-400 px-1" aria-hidden="true">
                  …
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onChange(value)}
                aria-current={value === page ? 'page' : undefined}
                className={
                  value === page
                    ? 'bg-brand-700 min-w-11 rounded-lg px-3 py-2 text-sm font-bold text-white'
                    : 'border-ink-200 text-ink-700 hover:border-brand-600 hover:text-brand-700 min-w-11 rounded-lg border px-3 py-2 text-sm font-semibold'
                }
              >
                {value}
              </button>
            </li>
          )
        })}

        <li>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className="border-ink-200 text-ink-700 hover:border-brand-600 hover:text-brand-700 rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 disabled:hover:border-ink-200 disabled:hover:text-ink-700"
          >
            Siguiente
          </button>
        </li>
      </ul>
    </nav>
  )
}
