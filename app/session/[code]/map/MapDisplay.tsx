'use client'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Session, MapToken, MapState, FogState } from '@/lib/supabase/types'
import { useMapStore } from '@/lib/stores/mapStore'
import { useMapChannel } from '@/lib/realtime/useMapChannel'

const MapCanvas = dynamic(() => import('@/components/battlemap/MapCanvas').then(m => ({ default: m.MapCanvas })), { ssr: false })

interface Props { session: Session; initialTokens: MapToken[]; initialMapState: MapState | null; initialFogState: FogState | null }

export default function MapDisplay({ session, initialTokens, initialMapState, initialFogState }: Props) {
  const { setTokens, setMapState, setFogState } = useMapStore()

  useEffect(() => {
    setTokens(initialTokens)
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
  }, [session.id])

  const { broadcastTokenMove } = useMapChannel(session.id)

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <MapCanvas sessionId={session.id} isMaster={false} currentUserId="" broadcastTokenMove={broadcastTokenMove} />
    </div>
  )
}
