import { Link } from 'react-router-dom'

export type Crumb = { label: string; to?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="mb-4">
      <ol className="text-ink-500 flex flex-wrap items-center gap-1.5 text-xs font-medium">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-brand-700 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={last ? 'text-ink-800 font-semibold' : undefined}>
                  {item.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-ink-300">
                  /
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
