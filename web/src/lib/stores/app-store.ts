import { create } from 'zustand'

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  selectedTags: Record<string, string[]>
  setSelectedTags: (tags: Record<string, string[]>) => void
  toggleTag: (dimension: string, value: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  selectedTags: {},
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  toggleTag: (dimension, value) =>
    set((s) => {
      const current = s.selectedTags[dimension] || []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { selectedTags: { ...s.selectedTags, [dimension]: next } }
    }),
}))
