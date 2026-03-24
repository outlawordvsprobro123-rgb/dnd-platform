import { create } from 'zustand'
import type { CombatParticipant } from '@/lib/supabase/types'

interface CombatStore {
  participants: CombatParticipant[]
  currentTurn: number
  round: number
  isActive: boolean

  setParticipants: (participants: CombatParticipant[]) => void
  updateParticipant: (id: string, changes: Partial<CombatParticipant>) => void
  setCurrentTurn: (turn: number) => void
  setRound: (round: number) => void
  setIsActive: (active: boolean) => void
  reset: () => void
}

export const useCombatStore = create<CombatStore>((set) => ({
  participants: [],
  currentTurn: 0,
  round: 1,
  isActive: false,

  setParticipants: (participants) => set({ participants }),
  updateParticipant: (id, changes) => set((s) => ({
    participants: s.participants.map(p => p.id === id ? { ...p, ...changes } : p)
  })),
  setCurrentTurn: (currentTurn) => set({ currentTurn }),
  setRound: (round) => set({ round }),
  setIsActive: (isActive) => set({ isActive }),
  reset: () => set({ participants: [], currentTurn: 0, round: 1, isActive: false }),
}))
