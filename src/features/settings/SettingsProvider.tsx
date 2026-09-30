import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { defaultSettings, fetchSettings } from '@/data/settings'
import type { SiteSettings } from '@/data/settings'
import { useAsync } from '@/lib/useAsync'

type SettingsContextValue = {
  settings: SiteSettings
  loading: boolean
  reload: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/**
 * Unica fuente de los datos del negocio. Ningun componente escribe el
 * telefono, los horarios ni los textos: todo sale de site_settings.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, reload } = useAsync(fetchSettings, [])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings: data ?? defaultSettings, loading, reload }),
    [data, loading, reload],
  )

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  )
}

export function useSettings(): SiteSettings {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider.')
  }
  return context.settings
}

export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettingsContext debe usarse dentro de SettingsProvider.')
  }
  return context
}
