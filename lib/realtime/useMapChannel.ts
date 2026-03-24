'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/mapStore'
import type { MapToken, MapState, FogState } from '@/lib/supabase/types'

export function useMapChannel(sessionId: string) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const { addToken, updateToken, removeToken, setMapState, setFogState } = useMapStore()

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`map:${sessionId}`)

    // Broadcast — высокочастотное движение токенов
    channel.on('broadcast', { event: 'token:moved' }, ({ payload }) => {
      updateToken(payload.token_id, { x: payload.x, y: payload.y })
    })

    // Postgres Changes — создание токена
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => {
      addToken(token as MapToken)
    })

    // Postgres Changes — обновление токена
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => {
      updateToken((token as MapToken).id, token as Partial<MapToken>)
    })

    // Postgres Changes — удаление токена
    channel.on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ old }) => {
      removeToken((old as { id: string }).id)
    })

    // Postgres Changes — смена карты
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'map_state',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: mapState }) => {
      setMapState(mapState as MapState)
    })

    // Postgres Changes — туман войны
    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'fog_state',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: fogState }) => {
      setFogState(fogState as FogState)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // Функция для отправки движения токена (broadcast)
  const broadcastTokenMove = async (tokenId: string, x: number, y: number) => {
    if (!channelRef.current) return
    await channelRef.current.send({
      type: 'broadcast',
      event: 'token:moved',
      payload: { token_id: tokenId, x, y },
    })
  }

  return { broadcastTokenMove }
}
