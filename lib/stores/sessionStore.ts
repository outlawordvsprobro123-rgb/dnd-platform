import { create } from 'zustand'
import type { Session, SessionPlayer } from '@/lib/supabase/types'

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

interface SessionStore {
  session: Session | null
  players: SessionPlayer[]
  connectionStatus: ConnectionStatus
  isMaster: boolean
  currentUserId: string | null

  setSession: (session: Session) => void
  setPlayers: (players: SessionPlayer[]) => void
  addPlayer: (player: SessionPlayer) => void
  removePlayer: (userId: string) => void
  updatePlayerStatus: (userId: string, status: SessionPlayer['status']) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setIsMaster: (isMaster: boolean) => void
  setCurrentUserId: (id: string) => void
  reset: () => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  players: [],
  connectionStatus: 'disconnected',
  isMaster: false,
  currentUserId: null,

  setSession: (session) => set({ session }),
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((s) => ({
    players: s.players.some(p => p.user_id === player.user_id)
      ? s.players.map(p => p.user_id === player.user_id ? player : p)
      : [...s.players, player]
  })),
  removePlayer: (userId) => set((s) => ({
    players: s.players.filter(p => p.user_id !== userId)
  })),
  updatePlayerStatus: (userId, status) => set((s) => ({
    players: s.players.map(p => p.user_id === userId ? { ...p, status } : p)
  })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setIsMaster: (isMaster) => set({ isMaster }),
  setCurrentUserId: (currentUserId) => set({ currentUserId }),
  reset: () => set({ session: null, players: [], connectionStatus: 'disconnected', isMaster: false }),
}))
