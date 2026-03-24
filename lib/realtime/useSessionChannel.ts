'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSessionStore } from '@/lib/stores/sessionStore'
import type { SessionPlayer } from '@/lib/supabase/types'

export function useSessionChannel(sessionId: string) {
  const supabase = createClient()
  const { addPlayer, updatePlayerStatus, setConnectionStatus } = useSessionStore()

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`session:${sessionId}`)

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'session_players',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: player }) => {
      addPlayer(player as SessionPlayer)
    })

    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'session_players',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: player }) => {
      const p = player as SessionPlayer
      updatePlayerStatus(p.user_id, p.status)
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnectionStatus('connected')
      if (status === 'CLOSED') setConnectionStatus('disconnected')
      if (status === 'CHANNEL_ERROR') setConnectionStatus('reconnecting')
    })

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])
}
