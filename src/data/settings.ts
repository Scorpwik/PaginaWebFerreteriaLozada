import { supabase } from '@/lib/supabase'
import type { Json } from '@/lib/types.database'

export type ProcessStep = { title: string; text: string }

export type AboutGalleryItem = {
  url: string
  alt: string
  caption: string
}

export type SiteSettings = {
  businessName: string
  whatsappNumber: string
  whatsappDisplay: string
  address: string
  mapsEmbedUrl: string
  quoteValidityDays: number
  schedule: {
    weekdays: string
    saturday: string
    sunday: string
    holidays: string
  }
  homeHero: {
    title: string
    subtitle: string
    /** @deprecated usar imageDesktopUrl / imageMobileUrl */
    imageUrl: string
    imageDesktopUrl: string
    imageMobileUrl: string
    imageAlt: string
    primaryCta: string
    secondaryCta: string
  }
  homeProcess: ProcessStep[]
  aboutHistory: string
  aboutCoverage: string
  aboutGallery: AboutGalleryItem[]
  socialLinks: Record<string, string>
  logoUrl: string
  seo: { title: string; description: string; ogImage: string }
}

/**
 * Valores por defecto. Si site_settings pierde una clave el sitio no se cae:
 * se muestra el texto de respaldo y el admin puede corregirlo.
 */
export const defaultSettings: SiteSettings = {
  businessName: 'Ferretería Lozada',
  whatsappNumber: '593995307272',
  whatsappDisplay: '+593 99 530 7272',
  address: 'Av. Mariscal Sucre s27-184, Chillogallo, Quito',
  mapsEmbedUrl:
    'https://www.google.com/maps?q=Av.+Mariscal+Sucre+s27-184,+Chillogallo,+Quito&output=embed',
  quoteValidityDays: 15,
  schedule: {
    weekdays: 'Lunes a viernes de 8:30 a 17:15',
    saturday: 'Cerrado',
    sunday: 'Cerrado',
    holidays: 'Feriados: consultar disponibilidad',
  },
  homeHero: {
    title: 'Todo para tu obra, en Chillogallo desde 2002',
    subtitle:
      'Te asesoramos antes de venderte. Cuéntanos qué estás haciendo y te decimos qué te conviene para tu proyecto y tu bolsillo.',
    imageUrl: '',
    imageDesktopUrl: '',
    imageMobileUrl: '',
    imageAlt: 'Local de Ferretería Lozada en Chillogallo',
    primaryCta: 'Ver catálogo',
    secondaryCta: 'Pedir por WhatsApp',
  },
  homeProcess: [],
  aboutHistory: '',
  aboutCoverage: '',
  aboutGallery: [],
  socialLinks: {},
  logoUrl: '',
  seo: {
    title: 'Ferretería Lozada | Chillogallo, Quito',
    description:
      'Ferretería en Chillogallo desde 2002. Herramientas, fijaciones y materiales para obra.',
    ogImage: '',
  },
}

function asString(value: Json | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function asNumber(value: Json | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asRecord(value: Json | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, Json>)
    : {}
}

function asStringMap(value: Json | undefined): Record<string, string> {
  const record = asRecord(value)
  const output: Record<string, string> = {}
  for (const [key, item] of Object.entries(record)) {
    if (typeof item === 'string' && item.trim().length > 0) output[key] = item
  }
  return output
}

function asProcessSteps(value: Json | undefined): ProcessStep[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const record = asRecord(entry)
    const title = asString(record.title, '')
    const text = asString(record.text, '')
    return title ? [{ title, text }] : []
  })
}

function asAboutGallery(value: Json | undefined): AboutGalleryItem[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    const record = asRecord(entry)
    const url = asString(record.url, '')
    if (!url) return []
    return [
      {
        url,
        alt: asString(record.alt, 'Foto de Ferretería Lozada'),
        caption: asString(record.caption, ''),
      },
    ]
  })
}

export function parseSettings(rows: { key: string; value: Json }[]): SiteSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]))
  const schedule = asRecord(map.get('schedule'))
  const hero = asRecord(map.get('home_hero'))
  const seo = asRecord(map.get('seo'))
  const fallback = defaultSettings

  return {
    businessName: asString(map.get('business_name'), fallback.businessName),
    whatsappNumber: asString(
      map.get('whatsapp_number'),
      fallback.whatsappNumber,
    ).replace(/\D/g, ''),
    whatsappDisplay: asString(
      map.get('whatsapp_display'),
      fallback.whatsappDisplay,
    ),
    address: asString(map.get('address'), fallback.address),
    mapsEmbedUrl: asString(map.get('maps_embed_url'), fallback.mapsEmbedUrl),
    quoteValidityDays: asNumber(
      map.get('quote_validity_days'),
      fallback.quoteValidityDays,
    ),
    schedule: {
      weekdays: asString(schedule.weekdays, fallback.schedule.weekdays),
      saturday: asString(schedule.saturday, fallback.schedule.saturday),
      sunday: asString(schedule.sunday, fallback.schedule.sunday),
      holidays: asString(schedule.holidays, fallback.schedule.holidays),
    },
    homeHero: (() => {
      // Compat: la foto unica vieja (image_url) alimenta ambos si faltan las nuevas.
      const legacy = asString(hero.image_url, '')
      const desktop = asString(hero.image_desktop_url, legacy)
      const mobile = asString(hero.image_mobile_url, legacy)
      return {
        title: asString(hero.title, fallback.homeHero.title),
        subtitle: asString(hero.subtitle, fallback.homeHero.subtitle),
        imageUrl: desktop,
        imageDesktopUrl: desktop,
        imageMobileUrl: mobile,
        imageAlt: asString(hero.image_alt, fallback.homeHero.imageAlt),
        primaryCta: asString(hero.primary_cta, fallback.homeHero.primaryCta),
        secondaryCta: asString(
          hero.secondary_cta,
          fallback.homeHero.secondaryCta,
        ),
      }
    })(),
    homeProcess: asProcessSteps(map.get('home_process')),
    aboutHistory: asString(map.get('about_history'), ''),
    aboutCoverage: asString(map.get('about_coverage'), ''),
    aboutGallery: asAboutGallery(map.get('about_gallery')),
    socialLinks: asStringMap(map.get('social_links')),
    logoUrl: asString(map.get('logo_url'), ''),
    seo: {
      title: asString(seo.title, fallback.seo.title),
      description: asString(seo.description, fallback.seo.description),
      ogImage: asString(seo.og_image, ''),
    },
  }
}

export async function fetchSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')

  if (error) throw error
  return parseSettings(data ?? [])
}

/** Claves crudas, para el editor del panel admin. */
export async function fetchRawSettings(): Promise<Record<string, Json>> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .order('key')

  if (error) throw error
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]))
}

/**
 * Guarda varias claves en una sola peticion: un grupo del formulario se guarda
 * completo o no se guarda, sin dejar el sitio con la mitad de los cambios.
 */
export async function updateSettings(entries: Record<string, Json>): Promise<void> {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }))
  if (rows.length === 0) return

  const { error } = await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' })

  if (error) throw new Error(error.message || 'No se pudieron guardar los ajustes.')
}

export async function updateSetting(key: string, value: Json): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key, value }, { onConflict: 'key' })

  if (error) throw error
}
