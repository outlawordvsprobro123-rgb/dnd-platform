'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import type { MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'

export type RealtimeStatus = 'connecting' | 'connected' | 'error'

export function useMapChannel(sessionId: string) {
  const broadcastChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const isSubscribed = useRef(false)
  const pendingQueue = useRef<Array<{ event: string; payload: unknown }>>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  const { addToken, updateToken, removeToken, setMapState, setFogState } = useMapStore()
  const { setWorldState } = useWorldStore()

  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()

    // ── Канал 1: только broadcast (не требует RLS, работает всегда) ──────────
    const broadcastChannel = supabase.channel(`map-broadcast:${sessionId}`)

    broadcastChannel.on('broadcast', { event: 'token:moved' }, ({ payload }) => {
      updateToken(payload.token_id as string, { x: payload.x as number, y: payload.y as number })
    })
    broadcastChannel.on('broadcast', { event: 'token:added' }, ({ payload }) => {
      addToken(payload as MapToken)
    })
    broadcastChannel.on('broadcast', { event: 'token:patched' }, ({ payload }) => {
      updateToken(payload.id as string, payload as Partial<MapToken>)
    })
    broadcastChannel.on('broadcast', { event: 'token:deleted' }, ({ payload }) => {
      removeToken(payload.id as string)
    })
    broadcastChannel.on('broadcast', { event: 'map:updated' }, ({ payload }) => {
      setMapState(payload as MapState)
    })
    broadcastChannel.on('broadcast', { event: 'fog:updated' }, ({ payload }) => {
      setFogState(payload as FogState)
    })
    broadcastChannel.on('broadcast', { event: 'world:updated' }, ({ payload }) => {
      setWorldState(payload as WorldState)
    })
    broadcastChannel.on('broadcast', { event: 'map:ping' }, ({ payload }) => {
      const { addPing, removePing } = useMapStore.getState()
      const id = payload.id as string
      addPing({ id, x: payload.x as number, y: payload.y as number, label: payload.label as string })
      setTimeout(() => removePing(id), 3000)
    })

    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribed.current = true
        broadcastChannelRef.current = broadcastChannel
        setRealtimeStatus('connected')
        // Flush queued messages
        const queued = pendingQueue.current.splice(0)
        for (const { event, payload } of queued) {
          broadcastChannel.send({ type: 'broadcast', event, payload })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isSubscribed.current = false
        setRealtimeStatus('error')
      } else if (status === 'CLOSED') {
        isSubscribed.current = false
        setRealtimeStatus('connecting')
      }
    })

    // ── Канал 2: postgres_changes (fallback, отдельно — не блокирует broadcast) ──
    const dbChannel = supabase.channel(`map-db:${sessionId}`)

    dbChannel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => { addToken(token as MapToken) })

    dbChannel.on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ new: token }) => { updateToken((token as MapToken).id, token as Partial<MapToken>) })

    dbChannel.on('postgres_changes', {
      event: 'DELETE', schema: 'public', table: 'map_tokens',
      filter: `session_id=eq.${sessionId}`
    }, ({ old }) => { removeToken((old as { id: string }).id) })

    const onMapState = ({ new: ms }: { new: unknown }) => setMapState(ms as MapState)
    dbChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'map_state', filter: `session_id=eq.${sessionId}` }, onMapState)
    dbChannel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'map_state', filter: `session_id=eq.${sessionId}` }, onMapState)

    const onFogState = ({ new: fs }: { new: unknown }) => setFogState(fs as FogState)
    dbChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fog_state', filter: `session_id=eq.${sessionId}` }, onFogState)
    dbChannel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fog_state', filter: `session_id=eq.${sessionId}` }, onFogState)

    // Не отслеживаем статус DB-канала — ошибка там не критична
    dbChannel.subscribe()

    return () => {
      isSubscribed.current = false
      broadcastChannelRef.current = null
      supabase.removeChannel(broadcastChannel)
      supabase.removeChannel(dbChannel)
    }
  }, [sessionId])

  // ── Send API ─────────────────────────────────────────────────────────────

  const send = async (event: string, payload: unknown) => {
    if (isSubscribed.current && broadcastChannelRef.current) {
      broadcastChannelRef.current.send({ type: 'broadcast', event, payload })
    } else {
      pendingQueue.current.push({ event, payload })
    }
  }

  const broadcastTokenMove = async (tokenId: string, x: number, y: number) =>
    send('token:moved', { token_id: tokenId, x, y })

  const broadcastPing = async (x: number, y: number, label: string) => {
    const id = Math.random().toString(36).slice(2)
    send('map:ping', { id, x, y, label })
    const { addPing, removePing } = useMapStore.getState()
    addPing({ id, x, y, label })
    setTimeout(() => removePing(id), 3000)
  }

  return { broadcastTokenMove, broadcastPing, send, realtimeStatus }
}
