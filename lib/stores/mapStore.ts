import { create } from 'zustand'
import type { MapToken, MapState, FogState, FogZone } from '@/lib/supabase/types'

type MapTool = 'select' | 'fog-reveal' | 'fog-hide' | 'ruler' | 'token'

interface MapStore {
  tokens: MapToken[]
  mapState: MapState | null
  fogState: FogState | null
  selectedTool: MapTool
  selectedTokenId: string | null

  setTokens: (tokens: MapToken[]) => void
  addToken: (token: MapToken) => void
  updateToken: (id: string, changes: Partial<MapToken>) => void
  removeToken: (id: string) => void
  setMapState: (state: MapState) => void
  setFogState: (state: FogState) => void
  updateFogZones: (zones: FogZone[]) => void
  setSelectedTool: (tool: MapTool) => void
  setSelectedTokenId: (id: string | null) => void
  reset: () => void
}

export const useMapStore = create<MapStore>((set) => ({
  tokens: [],
  mapState: null,
  fogState: null,
  selectedTool: 'select',
  selectedTokenId: null,

  setTokens: (tokens) => set({ tokens }),
  addToken: (token) => set((s) => ({ tokens: [...s.tokens, token] })),
  updateToken: (id, changes) => set((s) => ({
    tokens: s.tokens.map(t => t.id === id ? { ...t, ...changes } : t)
  })),
  removeToken: (id) => set((s) => ({ tokens: s.tokens.filter(t => t.id !== id) })),
  setMapState: (mapState) => set({ mapState }),
  setFogState: (fogState) => set({ fogState }),
  updateFogZones: (zones) => set((s) => ({
    fogState: s.fogState ? { ...s.fogState, revealed_zones: zones } : null
  })),
  setSelectedTool: (selectedTool) => set({ selectedTool }),
  setSelectedTokenId: (selectedTokenId) => set({ selectedTokenId }),
  reset: () => set({ tokens: [], mapState: null, fogState: null, selectedTool: 'select', selectedTokenId: null }),
}))
