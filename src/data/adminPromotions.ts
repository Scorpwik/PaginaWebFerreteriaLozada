import { supabase } from '@/lib/supabase'
import { readableDbError, removePublicImage, uploadPublicImage } from '@/data/admin'
import { parseOrThrow, productImageUrlSchema, promotionFormSchema } from '@/lib/validation'
import type { PromotionFormValues } from '@/lib/validation'
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

function assertAffected(rows: unknown[] | null, action: string): void {
  if (!rows || rows.length === 0) {
    throw new Error(
      `No se pudo ${action}: el registro ya no existe o tu cuenta no tiene permiso.`,
    )
  }
}

export async function fetchAdminPromotions(
  scope: 'active' | 'expired',
): Promise<Promotion[]> {
  const today = todayInQuito()
  let query = supabase.from('promotions').select(PROMOTION_COLUMNS)

  if (scope === 'active') {
    query = query.lte('start_date', today).gte('end_date', today)
  } else {
    query = query.lt('end_date', today)
  }

  const { data, error } = await query.order('end_date', {
    ascending: scope === 'active',
  })

  if (error) throw new Error(readableDbError(error))
  return (data ?? []).map(toPromotion)
}

export async function createPromotion(
  values: PromotionFormValues,
): Promise<void> {
  const payload = parseOrThrow(promotionFormSchema, values)
  const { error } = await supabase.from('promotions').insert(payload)
  if (error) throw new Error(readableDbError(error))
}

export async function updatePromotion(
  id: string,
  values: PromotionFormValues,
): Promise<void> {
  const payload = parseOrThrow(promotionFormSchema, values)

  const { data: previous } = await supabase
    .from('promotions')
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('promotions')
    .update(payload)
    .eq('id', id)
    .select('id')

  if (error) throw new Error(readableDbError(error))
  assertAffected(data, 'guardar la promoción')

  if (previous?.image_url && previous.image_url !== payload.image_url) {
    await removePublicImage(previous.image_url)
  }
}

export async function deletePromotion(promotion: Promotion): Promise<void> {
  const { data, error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', promotion.id)
    .select('id')

  if (error) throw new Error(readableDbError(error))
  assertAffected(data, 'borrar la promoción')
  await removePublicImage(promotion.imageUrl)
}

/**
 * Sube el recorte al bucket (carpeta promotions/) o valida una URL pegada.
 * La fila en promotions se inserta después, en create/update.
 */
export async function resolvePromotionImageUrl(input: {
  file: File | null
  url: string
  fallbackUrl?: string | null
}): Promise<string> {
  if (input.file) {
    return uploadPublicImage('promotions', input.file)
  }
  const trimmed = input.url.trim()
  if (trimmed) {
    return parseOrThrow(productImageUrlSchema, trimmed)
  }
  if (input.fallbackUrl) return input.fallbackUrl
  throw new Error('Sube una imagen o pega una URL https.')
}
