'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import type { MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'

export type RealtimeStatus = 'connecting' | 'connected' | 'error' | 'polling'

export function useMapChannel(sessionId: string) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const isSubscribed = useRef(false)
  const pendingQueue = useRef<Array<{ event: string; payload: unknown }>>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastTokensRef = useRef<string>('')

  const { addToken, updateToken, removeToken, setMapState, setFogState, setTokens } = useMapStore()
  const { setWorldState } = useWorldStore()

  // ── Polling fallback ────────────────────────────────────────────────────
  function startPolling() {
    if (pollingRef.current) return
    setRealtimeStatus('polling')
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/tokens`)
        if (!res.ok) return
        const { tokens } = await res.json()
        if (!Array.isArray(tokens)) return
        const hash = JSON.stringify(tokens.map((t: MapToken) => ({ id: t.id, x: t.x, y: t.y, hp_current: t.hp_current, visible_to_players: t.visible_to_players })))
        if (hash !== lastTokensRef.current) {
          lastTokensRef.current = hash
          setTokens(tokens)
        }
      } catch { /* ignore */ }
    }, 2000)
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // ── Realtime channel ────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()
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
      console.log('[Realtime] status:', status, err)
      if (status === 'SUBSCRIBED') {
        isSubscribed.current = true
        channelRef.current = channel
        stopPolling()
        setRealtimeStatus('connected')
        const queued = pendingQueue.current.splice(0)
        for (const { event, payload } of queued) {
          channel.send({ type: 'broadcast', event, payload })
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isSubscribed.current = false
        console.error('[Realtime] failed, switching to polling. err:', err)
        startPolling()
      } else if (status === 'CLOSED') {
        isSubscribed.current = false
        if (!pollingRef.current) startPolling()
      }
    })

    return () => {
      isSubscribed.current = false
      channelRef.current = null
      stopPolling()
      supabase.removeChannel(channel)
    }
  }, [sessionId])

  // ── Send API ─────────────────────────────────────────────────────────────

  const send = async (event: string, payload: unknown) => {
    if (isSubscribed.current && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event, payload })
    } else {
      // В polling-режиме broadcast недоступен — сохраняем только в БД через REST
      // (вызов fetch уже делается в MapCanvas после каждого действия)
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
