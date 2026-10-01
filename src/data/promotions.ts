import { supabase } from '@/lib/supabase'
import type { Promotion } from '@/lib/domain'
import { todayInQuito } from '@/lib/format'
import type { Tables } from '@/lib/types.database'

type PromotionRow = Pick<
  Tables<'promotions'>,
  | 'id'
  | 'title'
  | 'description'
  | 'price_label'
  | 'image_url'
  | 'start_date'
  | 'end_date'
  | 'created_at'
>

function toPromotion(row: PromotionRow): Promotion {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceLabel: row.price_label,
    imageUrl: row.image_url,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  }
}

const PROMOTION_COLUMNS =
  'id, title, description, price_label, image_url, start_date, end_date, created_at' as const

/**
 * Vigentes en el calendario de Quito: ya empezó y todavía no vence.
 * Si no hay ninguna, el Home no pinta la sección.
 */
export async function fetchActivePromotions(): Promise<Promotion[]> {
  const today = todayInQuito()
  const { data, error } = await supabase
    .from('promotions')
    .select(PROMOTION_COLUMNS)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('end_date', { ascending: true })

  if (error) throw error
  return (data ?? []).map(toPromotion)
}
