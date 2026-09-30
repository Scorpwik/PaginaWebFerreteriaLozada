import { ButtonLink } from '@/components/Button'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

export function NotFoundPage() {
  useDocumentMeta({
    title: 'Página no encontrada | Ferretería Lozada',
    noIndex: true,
  })

  return (
    <div className="container-page py-20 text-center">
      <p className="text-brand-600 text-sm font-bold uppercase tracking-wide">
        Error 404
      </p>
      <h1 className="text-ink-900 mt-3 text-3xl font-extrabold tracking-tight">
        No encontramos esta página
      </h1>
      <p className="text-ink-600 mx-auto mt-3 max-w-md">
        Puede que el producto ya no esté publicado o que el enlace esté
        incompleto. Busca en el catálogo o escríbenos y te ayudamos.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/catalogo" size="lg">
          Ver catálogo
        </ButtonLink>
        <ButtonLink to="/" variant="outline" size="lg">
          Ir al inicio
        </ButtonLink>
      </div>
    </div>
  )
}
