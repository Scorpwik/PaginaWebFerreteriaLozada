import { Link } from 'react-router-dom'
import { ProductImage } from '@/components/ProductImage'
import { formatPrice } from '@/lib/format'
import { productPath } from '@/lib/routes'
import type { ProductCard } from '@/lib/domain'

/**
 * Cinta horizontal de productos. Base con scroll nativo, que funciona bien al
 * tocar en movil; la animacion suave se monta encima en la capa de animacion.
 */
export function ProductStrip({
  products,
  label,
}: {
  products: ProductCard[]
  label: string
}) {
  if (products.length === 0) return null

  return (
    <div
      data-marquee
      className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      role="region"
      aria-label={label}
    >
      <ul data-marquee-track className="flex w-max gap-4">
        {products.map((product) => (
          <li key={product.id} className="w-44 shrink-0 sm:w-52">
            <Link
              to={productPath(product)}
              className="card-hover-desktop group border-ink-100 rounded-card block overflow-hidden border bg-white"
            >
              <div className="bg-ink-50 aspect-square overflow-hidden">
                <ProductImage
                  url={product.imageUrl}
                  alt={product.name}
                  sizes="13rem"
                  className="size-full lg:transition-transform lg:duration-500 lg:group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <p className="text-ink-900 line-clamp-2 text-xs font-semibold leading-snug">
                  {product.name}
                </p>
                <p className="text-ink-700 mt-1.5 text-sm font-bold">
                  {product.priceFrom === null
                    ? 'Consultar'
                    : formatPrice(product.priceFrom)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
