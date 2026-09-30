import { ProductCard } from './ProductCard'
import { ProductCardSkeleton } from '@/components/States'
import type { ProductCard as ProductCardData } from '@/lib/domain'

export function ProductGrid({
  products,
  loading = false,
  skeletonCount = 8,
}: {
  products: ProductCardData[]
  loading?: boolean
  skeletonCount?: number
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: skeletonCount }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          // Las primeras cuatro entran en el viewport inicial: cargarlas
          // perezosas empeoraria el LCP.
          eager={index < 4}
        />
      ))}
    </div>
  )
}
