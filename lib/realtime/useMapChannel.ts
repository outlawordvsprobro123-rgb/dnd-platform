'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import type { MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'

export type RealtimeStatus = 'connecting' | 'connected' | 'error'

export function useMapChannel(sessionId: string) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const isSubscribed = useRef(false)
  const pendingQueue = useRef<Array<{ event: string; payload: unknown }>>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const [errorMsg, setErrorMsg] = useState<string>('')

  const { addToken, updateToken, removeToken, setMapState, setFogState } = useMapStore()
  const { setWorldState } = useWorldStore()

  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()

    // Один канал — только broadcast, без postgres_changes
    const channel = supabase.channel(`map:${sessionId}`)

    channel.on('broadcast', { event: 'token:moved' }, ({ payload }) => {
      updateToken(payload.token_id as string, { x: payload.x as number, y: payload.y as number })
    })
    channel.on('broadcast', { event: 'token:added' }, ({ payload }) => {
      addToken(payload as MapToken)
    })
    channel.on('broadcast', { event: 'token:patched' }, ({ payload }) => {
      updateToken(payload.id as string, payload as Partial<MapToken>)
    })
    channel.on('broadcast', { event: 'token:deleted' }, ({ payload }) => {
      removeToken(payload.id as string)
    })
    channel.on('broadcast', { event: 'map:updated' }, ({ payload }) => {
      setMapState(payload as MapState)
    })
    channel.on('broadcast', { event: 'fog:updated' }, ({ payload }) => {
      setFogState(payload as FogState)
    })
    channel.on('broadcast', { event: 'world:updated' }, ({ payload }) => {
      setWorldState(payload as WorldState)
    })
    channel.on('broadcast', { event: 'map:ping' }, ({ payload }) => {
      const { addPing, removePing } = useMapStore.getState()
      const id = payload.id as string
      addPing({ id, x: payload.x as number, y: payload.y as number, label: payload.label as string })
      setTimeout(() => removePing(id), 3000)
    })

    channel.subscribe((status, err) => {
      console.log('[Realtime] status:', status, 'err:', err)
      if (status === 'SUBSCRIBED') {
        isSubscribed.current = true
        channelRef.current = channel
        setRealtimeStatus('connected')
        setErrorMsg('')
        const queued = pendingQueue.current.splice(0)
        for (const { event, payload } of queued) {
          channel.send({ type: 'broadcast', event, payload })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isSubscribed.current = false
        const msg = err ? JSON.stringify(err) : status
        setErrorMsg(msg)
        console.error('[Realtime] FAILED:', msg)
        setRealtimeStatus('error')
      } else if (status === 'CLOSED') {
        isSubscribed.current = false
        setRealtimeStatus('connecting')
      }
    })

    return () => {
      isSubscribed.current = false
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  const send = async (event: string, payload: unknown) => {
    if (isSubscribed.current && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event, payload })
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

  return { broadcastTokenMove, broadcastPing, send, realtimeStatus, errorMsg }
}
