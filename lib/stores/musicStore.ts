'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MusicScene } from '@/lib/supabase/types'

interface MusicStore {
  currentScene: MusicScene | null
  status: 'playing' | 'paused' | 'stopped'
  volume: number
  scenes: MusicScene[]

  setCurrentScene: (scene: MusicScene | null) => void
  setStatus: (status: 'playing' | 'paused' | 'stopped') => void
  setVolume: (volume: number) => void
  setScenes: (scenes: MusicScene[]) => void
}

export const useMusicStore = create<MusicStore>()(
  persist(
    (set) => ({
      currentScene: null,
      status: 'stopped',
      volume: 0.7,
      scenes: [],

      setCurrentScene: (currentScene) => set({ currentScene }),
      setStatus: (status) => set({ status }),
      setVolume: (volume) => set({ volume }),
      setScenes: (scenes) => set({ scenes }),
    }),
    {
      name: 'dnd-music',
      partialize: (state) => ({ volume: state.volume }), // Сохраняем только громкость
    }
  )
)
