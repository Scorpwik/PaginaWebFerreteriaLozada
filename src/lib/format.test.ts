import { describe, expect, it } from 'vitest'
import {
  addDaysToIsoDate,
  daysUntilDate,
  remainingDaysLabel,
} from './format'

describe('fechas de promociones', () => {
  it('suma dias sobre una fecha ISO sin corrirse por zona horaria', () => {
    expect(addDaysToIsoDate('2026-10-01', 7)).toBe('2026-10-08')
    expect(addDaysToIsoDate('2026-12-30', 3)).toBe('2027-01-02')
  })

  it('cuenta los dias que faltan hasta el fin', () => {
    expect(daysUntilDate('2026-10-08', '2026-10-01')).toBe(7)
    expect(daysUntilDate('2026-10-01', '2026-10-01')).toBe(0)
  })

  it('escribe el badge en singular, plural o ultimo dia', () => {
    expect(remainingDaysLabel(0)).toBe('Último día')
    expect(remainingDaysLabel(1)).toBe('Queda 1 día')
    expect(remainingDaysLabel(7)).toBe('Quedan 7 días')
  })
})
