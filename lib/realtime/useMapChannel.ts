'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import type { MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'

export function useMapChannel(sessionId: string) {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const { addToken, updateToken, removeToken, setMapState, setFogState } = useMapStore()
  const { setWorldState } = useWorldStore()

  useEffect(() => {
    if (!sessionId) return

    const channel = supabase.channel(`map:${sessionId}`)

    // ── Broadcast (мгновенно, без БД) ──────────────────────────────────────

    // Движение токена (высокочастотное)
    channel.on('broadcast', { event: 'token:moved' }, ({ payload }) => {
      updateToken(payload.token_id, { x: payload.x, y: payload.y })
    })

    // Токен добавлен мастером
    channel.on('broadcast', { event: 'token:added' }, ({ payload }) => {
      addToken(payload as MapToken)
    })

    // Токен обновлён мастером (размер, видимость, hp)
    channel.on('broadcast', { event: 'token:patched' }, ({ payload }) => {
      updateToken(payload.id as string, payload as Partial<MapToken>)
    })

    // Токен удалён мастером
    channel.on('broadcast', { event: 'token:deleted' }, ({ payload }) => {
      removeToken(payload.id as string)
    })

    // Настройки карты обновлены
    channel.on('broadcast', { event: 'map:updated' }, ({ payload }) => {
      setMapState(payload as MapState)
    })

    // Туман обновлён
    channel.on('broadcast', { event: 'fog:updated' }, ({ payload }) => {
      setFogState(payload as FogState)
    })

    // Мир обновлён (погода/время)
    channel.on('broadcast', { event: 'world:updated' }, ({ payload }) => {
      setWorldState(payload as WorldState)
    })

    // Пинг на карте
    channel.on('broadcast', { event: 'map:ping' }, ({ payload }) => {
      const { addPing, removePing } = useMapStore.getState()
      const id = payload.id as string
      addPing({ id, x: payload.x as number, y: payload.y as number, label: payload.label as string })
      setTimeout(() => removePing(id), 3000)
    })

    // ── Postgres Changes (fallback для других клиентов / перезагрузки) ──────

    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => { addToken(token as MapToken) })

    channel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => { updateToken((token as MapToken).id, token as Partial<MapToken>) })

    channel.on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ old }) => { removeToken((old as { id: string }).id) })

    const onMapState = ({ new: ms }: { new: unknown }) => setMapState(ms as MapState)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_state', filter: `session_id=eq.${sessionId}` }, onMapState)
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_state', filter: `session_id=eq.${sessionId}` }, onMapState)

    const onFogState = ({ new: fs }: { new: unknown }) => setFogState(fs as FogState)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fog_state', filter: `session_id=eq.${sessionId}` }, onFogState)
    channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fog_state', filter: `session_id=eq.${sessionId}` }, onFogState)

    channel.subscribe()
    channelRef.current = channel

    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  const send = async (event: string, payload: unknown) => {
    channelRef.current?.send({ type: 'broadcast', event, payload })
  }

  const broadcastTokenMove = async (tokenId: string, x: number, y: number) =>
    send('token:moved', { token_id: tokenId, x, y })

  const broadcastPing = async (x: number, y: number, label: string) => {
    const id = Math.random().toString(36).slice(2)
    send('map:ping', { id, x, y, label })
    // Also add locally (sender doesn't receive own broadcast)
    const { addPing, removePing } = useMapStore.getState()
    addPing({ id, x, y, label })
    setTimeout(() => removePing(id), 3000)
  }

  return { broadcastTokenMove, broadcastPing, send }
}
