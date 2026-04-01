import { create } from 'zustand'
import type { WorldState } from '@/lib/supabase/types'

interface WorldStore {
  worldState: WorldState | null
  setWorldState: (state: WorldState) => void
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  setWorldState: (worldState) => set({ worldState }),
}))
