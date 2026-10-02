import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ProductImage } from '@/components/ProductImage'
import { Spinner } from '@/components/States'
import { useCart } from './CartProvider'
import { lineSubtotal } from './cart'
import type { CartLine } from './cart'
import { QuantityField } from './QuantityField'
import { fetchProductById } from '@/data/products'
import { canAddToCart, pickPrimaryImage } from '@/lib/domain'
import { formatMoney, formatPrice, variantLabel } from '@/lib/format'
import { productPath } from '@/lib/routes'
import type { Variant } from '@/lib/domain'

export function CartLineRow({ line }: { line: CartLine }) {
  const { update, remove, swapVariant } = useCart()
  const [editing, setEditing] = useState(false)
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)

  const openEditor = async () => {
    setEditing(true)
    if (variants || loadingVariants) return

    setLoadingVariants(true)
    try {
      const product = await fetchProductById(line.productId)
      setVariants(product?.variants.filter(canAddToCart) ?? [])
    } finally {
      setLoadingVariants(false)
    }
  }

  const chooseVariant = async (variantId: string) => {
    const product = await fetchProductById(line.productId)
    const next = product?.variants.find((item) => item.id === variantId)
    if (!product || !next) return

    swapVariant(line.variantId, {
      variantId: next.id,
      productId: product.id,
      productOriginId: product.origin_id,
      productName: product.name,
      variantLabel: variantLabel(next) || null,
      saleUnit: next.sale_unit,
      unitPrice: next.price,
      quantity: line.quantity,
      imageUrl: pickPrimaryImage(
        product.images.filter(
          (image) => image.variant_id === next.id || image.variant_id === null,
        ),
      ),
    })
    setEditing(false)
  }

  return (
    <li className="border-ink-100 flex gap-4 border-b py-5 last:border-b-0">
      <Link
        to={productPath({
          id: line.productId,
          origin_id: line.productOriginId,
          name: line.productName,
        })}
        className="bg-ink-50 size-20 shrink-0 overflow-hidden rounded-lg sm:size-24"
      >
        <ProductImage
          url={line.imageUrl}
          alt={line.productName}
          sizes="6rem"
          className="size-full"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <h3 className="text-ink-900 text-sm font-semibold leading-snug">
          <Link
            to={productPath({
              id: line.productId,
              origin_id: line.productOriginId,
              name: line.productName,
            })}
            className="hover:text-brand-700"
          >
            {line.productName}
          </Link>
        </h3>

        {line.variantLabel || line.saleUnit ? (
          <p className="text-ink-600 mt-1 text-xs">
            {[line.variantLabel, line.saleUnit].filter(Boolean).join(' · ')}
          </p>
        ) : null}

        <p className="text-ink-700 mt-1.5 text-xs">
          {formatPrice(line.unitPrice)}
          {line.saleUnit ? ` / ${line.saleUnit}` : ''}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <QuantityField
            value={line.quantity}
            onChange={(next) => update(line.variantId, next)}
            aria-label={`Cantidad de ${line.productName}`}
            className="border"
            inputClassName="sm:w-16 sm:py-2 sm:text-sm"
          />

          <button
            type="button"
            onClick={openEditor}
            className="text-brand-700 text-xs font-semibold underline decoration-dotted"
          >
            Cambiar opción
          </button>

          <button
            type="button"
            onClick={() => remove(line.variantId)}
            className="text-ink-500 hover:text-red-700 text-xs font-semibold underline decoration-dotted"
          >
            Eliminar
          </button>
        </div>

        {editing ? (
          <div className="border-ink-200 mt-3 rounded-lg border bg-ink-50 p-3">
            {loadingVariants ? (
              <Spinner label="Cargando opciones" />
            ) : variants && variants.length > 1 ? (
              <>
                <label
                  htmlFor={`variante-${line.variantId}`}
                  className="text-ink-700 mb-1.5 block text-xs font-semibold"
                >
                  Elige otra opción
                </label>
                <select
                  id={`variante-${line.variantId}`}
                  defaultValue={line.variantId}
                  onChange={(event) => void chooseVariant(event.target.value)}
                  className="border-ink-200 w-full rounded-lg border-2 bg-white px-3 py-2 text-sm font-semibold"
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variantLabel(variant) || variant.sale_unit || 'Unidad'} —{' '}
                      {formatPrice(variant.price)}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-ink-600 text-xs">
                Este producto no tiene otras opciones disponibles.
              </p>
            )}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-ink-500 mt-2 text-xs font-semibold underline"
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
          Subtotal
        </p>
        <p className="text-ink-900 font-extrabold">
          {formatMoney(lineSubtotal(line))}
        </p>
      </div>
    </li>
  )
}
