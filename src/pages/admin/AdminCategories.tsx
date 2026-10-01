import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { ErrorState, Skeleton } from '@/components/States'
import {
  AdminCard,
  Field,
  FormError,
} from '@/features/admin/FormControls'
import { useAdminToast } from '@/features/admin/AdminToast'
import { fetchCategories } from '@/data/categories'
import {
  countCategoryUsage,
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/data/admin'
import type { CategoryFormValues } from '@/data/admin'
import { buildCategoryTree } from '@/lib/domain'
import type { Category, CategoryNode } from '@/lib/domain'
import { slugify } from '@/lib/format'
import { useAsync } from '@/lib/useAsync'
import { useDocumentMeta } from '@/lib/useDocumentMeta'

const emptyForm: CategoryFormValues = {
  name: '',
  slug: '',
  parent_id: null,
  sort_order: 0,
}

export default function AdminCategories() {
  useDocumentMeta({ title: 'Categorías | Administración', noIndex: true })
  const toast = useAdminToast()

  const { data, loading, error, reload } = useAsync(() => fetchCategories(), [])
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('categoria')
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryFormValues>(emptyForm)
  const [slugTouched, setSlugTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const tree = useMemo(() => buildCategoryTree(data ?? []), [data])

  /**
   * Solo categorias principales como madre. Asi el arbol tiene como mucho
   * 2 niveles (Fijaciones → Tornillos). Las hijas no aparecen aqui: si eliges
   * "Fijaciones" como madre, la nueva categoria queda DENTRO de Fijaciones
   * junto a sus hermanas; no hace falta elegir una hija como madre.
   */
  const parentOptions = useMemo(
    () =>
      tree
        .filter((node) => node.id !== editing?.id)
        .map((node) => ({ id: node.id, label: node.name })),
    [tree, editing?.id],
  )

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm)
      setSlugTouched(false)
      return
    }
    setForm({
      name: editing.name,
      slug: editing.slug,
      parent_id: editing.parent_id,
      sort_order: editing.sort_order,
    })
    setSlugTouched(true)
  }, [editing])

  useEffect(() => {
    if (!data || !highlightId) return
    const match = data.find((category) => category.id === highlightId)
    if (match) setEditing(match)
  }, [data, highlightId])

  useEffect(() => {
    if (!highlightId) return
    const node = document.getElementById(`categoria-${highlightId}`)
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [highlightId, data])

  const setName = (name: string) => {
    setForm((current) => ({
      ...current,
      name,
      slug: slugTouched ? current.slug : slugify(name),
    }))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)
    setBusy(true)

    try {
      if (editing) {
        await updateCategory(editing.id, form)
        toast.success(`Listo: se guardó "${form.name}".`)
      } else {
        await createCategory(form)
        toast.success(
          form.parent_id
            ? `Listo: se creó la subcategoría "${form.name}".`
            : `Listo: se creó la categoría "${form.name}".`,
        )
      }
      setEditing(null)
      setForm(emptyForm)
      setSlugTouched(false)
      reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo guardar.'
      setFormError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (category: Category) => {
    setFormError(null)

    let usage: { products: number; children: number }
    try {
      usage = await countCategoryUsage(category.id)
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo revisar la categoría.'
      setFormError(message)
      toast.error(message)
      return
    }

    const warnings: string[] = []
    if (usage.products > 0) {
      warnings.push(`${usage.products} producto(s) quedarán sin categoría`)
    }
    if (usage.children > 0) {
      warnings.push(`${usage.children} subcategoría(s) quedarán sin madre`)
    }

    const detail = warnings.length > 0 ? `\n\n${warnings.join('.\n')}.` : ''
    if (!window.confirm(`¿Borrar "${category.name}"?${detail}`)) return

    try {
      await deleteCategory(category.id)
      if (editing?.id === category.id) setEditing(null)
      toast.success(`Se borró "${category.name}".`)
      reload()
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : 'No se pudo borrar.'
      setFormError(message)
      toast.error(message)
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-ink-900 text-2xl font-extrabold">Categorías</h1>
        <p className="text-ink-600 mt-1 text-sm">
          Organiza el catálogo en categorías principales y subcategorías. Pasa el
          ratón sobre el "?" de cada campo para ver un ejemplo.
        </p>
      </div>

      {formError ? <FormError>{formError}</FormError> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <AdminCard
          title="Árbol del catálogo"
          description="Así lo ve el cliente. Las sangrías son subcategorías."
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-10" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <p className="text-ink-500 text-sm">
              Todavía no hay categorías. Crea la primera a la derecha (deja
              "Categoría madre" en Ninguna).
            </p>
          ) : (
            <CategoryTree
              nodes={tree}
              onEdit={setEditing}
              onDelete={(category) => void remove(category)}
              editingId={editing?.id ?? null}
              highlightId={highlightId}
            />
          )}
        </AdminCard>

        <AdminCard title={editing ? 'Editar categoría' : 'Nueva categoría'}>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <Field
              label="Nombre"
              htmlFor="cat-name"
              tip="El nombre que ve el cliente en el menú. Ejemplo: Fijaciones, Pinturas, Herramientas eléctricas."
              hint="Cómo se llama en el catálogo."
            >
              <input
                id="cat-name"
                value={form.name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Ejemplo: Fijaciones"
                className="admin-input"
              />
            </Field>

            <Field
              label="URL"
              htmlFor="cat-slug"
              tip="Es la dirección web, en minúsculas y con guiones. Si escribes «Tornillos para madera», la URL sugerida será tornillos-para-madera. Ejemplo completo: ferreterialozada.com/catalogo/fijaciones"
              hint="Se completa sola al escribir el nombre. Puedes corregirla."
            >
              <input
                id="cat-slug"
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setForm((current) => ({ ...current, slug: event.target.value }))
                }}
                required
                placeholder="ejemplo: fijaciones"
                className="admin-input"
              />
            </Field>

            <Field
              label="Categoría madre"
              htmlFor="cat-parent"
              tip="Déjalo en «Ninguna» para una categoría principal (Fijaciones, Pinturas…). Elige una principal solo si esta es una subcategoría (Tornillos dentro de Fijaciones). Aquí solo salen las principales: al elegir una, esta categoría queda dentro de ella con todo lo demás de esa rama."
              hint="Ninguna = categoría principal. Elegir una = subcategoría."
            >
              <select
                id="cat-parent"
                value={form.parent_id ?? ''}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    parent_id: event.target.value || null,
                  }))
                }
                className="admin-input"
              >
                <option value="">Ninguna (categoría principal)</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Orden"
              htmlFor="cat-order"
              tip="Controla el orden en el menú. El 0 sale primero, luego el 1, el 2… Ejemplo: Fijaciones = 0, Pinturas = 1, Herramientas = 2."
              hint="Número más bajo = aparece antes."
            >
              <input
                id="cat-order"
                type="number"
                min={0}
                max={9999}
                value={form.sort_order}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sort_order: Number(event.target.value),
                  }))
                }
                className="admin-input"
              />
            </Field>

            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear'}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null)
                    toast.info('Edición cancelada. No se guardó nada.')
                  }}
                >
                  Cancelar
                </Button>
              ) : null}
            </div>
          </form>
        </AdminCard>
      </div>
    </div>
  )
}

function CategoryTree({
  nodes,
  onEdit,
  onDelete,
  editingId,
  highlightId,
  depth = 0,
}: {
  nodes: CategoryNode[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  editingId: string | null
  highlightId: string | null
  depth?: number
}) {
  return (
    <ul className={depth === 0 ? 'divide-ink-100 divide-y' : ''}>
      {nodes.map((node) => (
        <li key={node.id}>
          <div
            id={`categoria-${node.id}`}
            className={`flex items-center gap-3 py-2.5 ${
              editingId === node.id || highlightId === node.id
                ? 'bg-brand-50 -mx-2 rounded-lg px-2'
                : ''
            }`}
            style={{ paddingLeft: depth * 18 }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-ink-900 truncate text-sm font-semibold">
                {node.name}
                {depth === 0 && node.children.length > 0 ? (
                  <span className="text-ink-500 ml-2 text-xs font-medium">
                    ({node.children.length}{' '}
                    {node.children.length === 1 ? 'subcategoría' : 'subcategorías'})
                  </span>
                ) : null}
              </p>
              <p className="text-ink-500 truncate text-xs">
                /{node.slug} · orden {node.sort_order}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(node)}
              className="text-brand-700 shrink-0 text-sm font-semibold underline"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => onDelete(node)}
              className="shrink-0 text-sm font-semibold text-red-700 underline"
            >
              Borrar
            </button>
          </div>

          {node.children.length > 0 ? (
            <CategoryTree
              nodes={node.children}
              onEdit={onEdit}
              onDelete={onDelete}
              editingId={editingId}
              highlightId={highlightId}
              depth={depth + 1}
            />
          ) : null}
        </li>
      ))}
    </ul>
  )
}
