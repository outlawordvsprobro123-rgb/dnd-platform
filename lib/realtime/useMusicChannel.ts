'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMusicStore } from '@/lib/stores/musicStore'
import { getAudioManager } from '@/lib/utils/audio'
import type { MusicState } from '@/lib/supabase/types'

export function useMusicChannel(sessionId: string) {
  const supabase = createClient()
  const { scenes, setCurrentScene, setStatus, volume } = useMusicStore()

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`music:${sessionId}`)

    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'music_state',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: state }) => {
      const musicState = state as MusicState
      const audio = getAudioManager()

      if (musicState.status === 'playing' && musicState.scene_id) {
        const scene = scenes.find(s => s.id === musicState.scene_id)
        if (scene) {
          setCurrentScene(scene)
          setStatus('playing')
          audio.playScene(scene.tracks, volume)
        }
      } else if (musicState.status === 'paused') {
        setStatus('paused')
        audio.pause()
      } else if (musicState.status === 'stopped') {
        setStatus('stopped')
        setCurrentScene(null)
        audio.stop()
      }
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sessionId, scenes, volume])
}
