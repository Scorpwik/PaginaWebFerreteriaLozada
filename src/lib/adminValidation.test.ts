import { describe, expect, it } from 'vitest'
import {
  aboutSettingsSchema,
  brandSettingsSchema,
  categoryFormSchema,
  contactSettingsSchema,
  heroSettingsSchema,
  parseOrThrow,
  processSettingsSchema,
  productFormSchema,
  productImageUrlSchema,
  promotionFormSchema,
  scheduleSettingsSchema,
  socialSettingsSchema,
  validateFields,
  variantFormSchema,
  variantPatchSchema,
} from './validation'

const contact = {
  business_name: 'Ferretería Lozada',
  whatsapp_number: '+593 99 530 7272',
  whatsapp_display: '+593 99 530 7272',
  address: 'Av. Mariscal Sucre s27-184, Quito',
  maps_embed_url: 'https://www.google.com/maps?q=quito&output=embed',
  quote_validity_days: '15',
}

describe('contactSettingsSchema', () => {
  it('limpia el WhatsApp a solo digitos y convierte los dias a numero', () => {
    const result = validateFields(contactSettingsSchema, contact)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.whatsapp_number).toBe('593995307272')
      expect(result.data.quote_validity_days).toBe(15)
    }
  })

  it('rechaza un WhatsApp demasiado corto', () => {
    const result = validateFields(contactSettingsSchema, {
      ...contact,
      whatsapp_number: '0995',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.whatsapp_number).toBeDefined()
  })

  it('rechaza dias fuera de 1-90 o con decimales', () => {
    for (const days of ['0', '91', '7.5', '', 'abc']) {
      const result = validateFields(contactSettingsSchema, {
        ...contact,
        quote_validity_days: days,
      })
      expect(result.ok, `dias=${days}`).toBe(false)
    }
  })

  it('rechaza un mapa que no sea https de Google', () => {
    for (const url of [
      'http://www.google.com/maps',
      'https://evil.example.com/maps',
      'javascript:alert(1)',
      'no es una url',
    ]) {
      const result = validateFields(contactSettingsSchema, {
        ...contact,
        maps_embed_url: url,
      })
      expect(result.ok, url).toBe(false)
    }
  })

  it('permite dejar el mapa vacio', () => {
    expect(
      validateFields(contactSettingsSchema, { ...contact, maps_embed_url: '' }).ok,
    ).toBe(true)
  })

  it('exige nombre y direccion', () => {
    const result = validateFields(contactSettingsSchema, {
      ...contact,
      business_name: '  ',
      address: '',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.business_name).toBeDefined()
      expect(result.errors.address).toBeDefined()
    }
  })
})

describe('scheduleSettingsSchema', () => {
  it('exige todos los campos del horario', () => {
    const result = validateFields(scheduleSettingsSchema, {
      weekdays: 'Lunes a viernes 8:30-17:15',
      saturday: '',
      sunday: 'Cerrado',
      holidays: 'Consultar',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['saturday'])
  })
})

describe('heroSettingsSchema', () => {
  const hero = {
    title: 'Todo para tu obra',
    subtitle: 'Te asesoramos.',
    image_desktop_url: '',
    image_mobile_url: '',
    image_alt: 'Local',
    primary_cta: 'Ver catálogo',
    secondary_cta: 'Pedir por WhatsApp',
  }

  it('acepta imagen vacia o https', () => {
    expect(validateFields(heroSettingsSchema, hero).ok).toBe(true)
    expect(
      validateFields(heroSettingsSchema, {
        ...hero,
        image_desktop_url: 'https://x.supabase.co/storage/v1/object/public/a.jpg',
        image_mobile_url: 'https://x.supabase.co/storage/v1/object/public/b.jpg',
      }).ok,
    ).toBe(true)
  })

  it('rechaza esquemas peligrosos en la URL de imagen', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,hi', 'http://x.com/a.jpg']) {
      expect(
        validateFields(heroSettingsSchema, { ...hero, image_desktop_url: url }).ok,
        url,
      ).toBe(false)
    }
  })

  it('recorta espacios y colapsa saltos en textos de una linea', () => {
    const result = validateFields(heroSettingsSchema, {
      ...hero,
      title: '  Todo   para\ntu obra  ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.title).toBe('Todo para tu obra')
  })
})

describe('processSettingsSchema', () => {
  it('acepta hasta 6 pasos y rechaza 7', () => {
    const step = { title: 'Paso', text: 'Texto' }
    expect(validateFields(processSettingsSchema, Array(6).fill(step)).ok).toBe(true)
    expect(validateFields(processSettingsSchema, Array(7).fill(step)).ok).toBe(false)
  })

  it('reporta el error en la posicion del paso', () => {
    const result = validateFields(processSettingsSchema, [
      { title: 'Uno', text: '' },
      { title: '', text: 'sin titulo' },
    ])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors['1.title']).toBeDefined()
  })
})

describe('aboutSettingsSchema', () => {
  it('conserva parrafos pero colapsa lineas en blanco de mas', () => {
    const result = validateFields(aboutSettingsSchema, {
      about_history: 'Uno\n\n\n\nDos',
      about_coverage: '',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.about_history).toBe('Uno\n\nDos')
  })
})

describe('socialSettingsSchema', () => {
  it('descarta las redes vacias y valida las demas', () => {
    const result = validateFields(socialSettingsSchema, {
      facebook: 'https://facebook.com/ferreteria',
      instagram: '',
      tiktok: '  ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ facebook: 'https://facebook.com/ferreteria' })
    }
  })

  it('rechaza una red sin https', () => {
    expect(
      validateFields(socialSettingsSchema, {
        facebook: 'facebook.com/ferreteria',
        instagram: '',
        tiktok: '',
      }).ok,
    ).toBe(false)
  })
})

describe('brandSettingsSchema', () => {
  it('limita el titulo SEO a 70 caracteres', () => {
    const result = validateFields(brandSettingsSchema, {
      logo_url: '',
      seo_title: 'x'.repeat(200),
      seo_description: 'Descripción suficientemente larga',
      seo_og_image: '',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.seo_title).toHaveLength(70)
  })
})

describe('variantPatchSchema', () => {
  it('acepta precio, disponibilidad o ambos', () => {
    expect(variantPatchSchema.safeParse({ price: 1.5 }).success).toBe(true)
    expect(variantPatchSchema.safeParse({ availability: 'agotado' }).success).toBe(true)
    expect(
      variantPatchSchema.safeParse({ price: 0, availability: 'consultar' }).success,
    ).toBe(true)
  })

  it('rechaza precio negativo, enorme o no numerico', () => {
    for (const price of [-1, 1_000_001, Number.NaN, Infinity]) {
      expect(variantPatchSchema.safeParse({ price }).success, String(price)).toBe(false)
    }
  })

  it('rechaza disponibilidad inventada y parches vacios', () => {
    expect(variantPatchSchema.safeParse({ availability: 'quizas' }).success).toBe(false)
    expect(variantPatchSchema.safeParse({}).success).toBe(false)
  })
})

describe('productImageUrlSchema', () => {
  it('acepta una URL https y recorta espacios', () => {
    const result = productImageUrlSchema.safeParse(
      '  https://cdn.example.com/tornillo.jpg  ',
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('https://cdn.example.com/tornillo.jpg')
    }
  })

  it('rechaza vacio, http plano y esquemas peligrosos', () => {
    for (const url of [
      '',
      '   ',
      'http://cdn.example.com/a.jpg',
      'javascript:alert(1)',
      'data:image/png;base64,xxx',
      'cdn.example.com/a.jpg',
    ]) {
      expect(productImageUrlSchema.safeParse(url).success, url).toBe(false)
    }
  })
})

describe('promotionFormSchema', () => {
  const base = {
    title: 'Combo maestro',
    description: 'Taladro + brocas',
    price_label: 'Desde $45',
    image_url: 'https://cdn.example.com/combo.jpg',
    start_date: '2026-10-01',
    end_date: '2026-10-08',
  }

  it('acepta un combo con precio en texto libre', () => {
    const result = validateFields(promotionFormSchema, base)
    expect(result.ok).toBe(true)
  })

  it('rechaza si la fecha de fin es anterior al inicio', () => {
    const result = validateFields(promotionFormSchema, {
      ...base,
      end_date: '2026-09-30',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.end_date).toBeDefined()
  })

  it('exige titulo e imagen https', () => {
    const result = validateFields(promotionFormSchema, {
      ...base,
      title: ' ',
      image_url: 'http://cdn.example.com/combo.jpg',
    })
    expect(result.ok).toBe(false)
  })
})

describe('parseOrThrow', () => {
  it('lanza un Error con mensaje legible, no el JSON de Zod', () => {
    expect(() =>
      parseOrThrow(categoryFormSchema, {
        name: 'Fijaciones',
        slug: 'Con Espacios',
        parent_id: null,
        sort_order: 0,
      }),
    ).toThrowError('Usa solo minusculas, numeros y guiones.')
  })
})

describe('esquemas de producto y variante', () => {
  const product = {
    name: 'Tornillo para madera',
    origin_id: 1855,
    description: '',
    category_id: null,
    is_offer: false,
    is_bestseller: false,
  }

  it('guarda la descripcion vacia como null', () => {
    const result = productFormSchema.parse(product)
    expect(result.description).toBeNull()
  })

  it('exige un nombre de al menos 2 caracteres', () => {
    expect(productFormSchema.safeParse({ ...product, name: ' a ' }).success).toBe(false)
  })

  it('acepta precios de centavos con 4 decimales', () => {
    const result = variantFormSchema.parse({
      origin_id: null,
      size: '6x2',
      color: '',
      presentation: null,
      sale_unit: 'ciento',
      price: 0.0135,
      barcode: '',
      availability: 'disponible',
    })
    expect(result.price).toBe(0.0135)
    expect(result.color).toBeNull()
    expect(result.barcode).toBeNull()
  })
})
