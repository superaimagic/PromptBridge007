/**
 * Safe localStorage wrapper with fallback for SSR and error handling
 */
export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : fallback
    } catch {
      return fallback
    }
  },

  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      console.warn(`Failed to save to localStorage: ${key}`)
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }
}

// Storage keys - must match between read and write
export const STORAGE_KEYS = {
  SIDEBAR_COLLAPSED: 'pb007_sidebar_collapsed',
  THEME: 'pb007_theme',
  SETTINGS: 'pb007_settings',
  SEARCH_HISTORY: 'pb007_search_history',
} as const
