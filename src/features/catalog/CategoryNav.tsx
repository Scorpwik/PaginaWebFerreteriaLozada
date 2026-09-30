import { NavLink } from 'react-router-dom'
import { categoryPath } from '@/lib/routes'
import type { CategoryNode } from '@/lib/domain'

/**
 * Arbol de categorias. En escritorio es una columna; en movil se convierte en
 * una fila de chips desplazable, que es como se navega con una mano en obra.
 */
export function CategoryNav({
  tree,
  activeSlug,
}: {
  tree: CategoryNode[]
  activeSlug?: string
}) {
  if (tree.length === 0) return null

  return (
    <>
      <nav aria-label="Categorías" className="hidden lg:block">
        <h2 className="text-ink-900 mb-3 text-sm font-bold uppercase tracking-wide">
          Categorías
        </h2>
        <ul className="space-y-1">
          {tree.map((node) => (
            <li key={node.id}>
              <NavLink
                to={categoryPath(node.slug)}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-700 hover:bg-ink-50'
                  }`
                }
              >
                {node.name}
              </NavLink>

              {node.children.length > 0 ? (
                <ul className="border-ink-100 ml-3 mt-1 space-y-0.5 border-l pl-3">
                  {node.children.map((child) => (
                    <li key={child.id}>
                      <NavLink
                        to={categoryPath(node.slug, child.slug)}
                        className={({ isActive }) =>
                          `block rounded-lg px-3 py-1.5 text-sm ${
                            isActive
                              ? 'text-brand-700 font-semibold'
                              : 'text-ink-600 hover:text-ink-900'
                          }`
                        }
                      >
                        {child.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>

      <div className="lg:hidden">
        <h2 className="sr-only">Categorías</h2>
        <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tree.flatMap((node) => [
            <li key={node.id} className="snap-start">
              <NavLink
                to={categoryPath(node.slug)}
                className={
                  activeSlug === node.slug
                    ? 'bg-brand-700 inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white'
                    : 'border-ink-200 text-ink-700 inline-flex whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold'
                }
              >
                {node.name}
              </NavLink>
            </li>,
            ...node.children.map((child) => (
              <li key={child.id} className="snap-start">
                <NavLink
                  to={categoryPath(node.slug, child.slug)}
                  className={
                    activeSlug === child.slug
                      ? 'bg-brand-700 inline-flex whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white'
                      : 'border-ink-200 text-ink-600 inline-flex whitespace-nowrap rounded-full border px-4 py-2 text-sm'
                  }
                >
                  {child.name}
                </NavLink>
              </li>
            )),
          ])}
        </ul>
      </div>
    </>
  )
}
