'use client'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Session, MapToken, MapState, FogState } from '@/lib/supabase/types'
import { useMapStore } from '@/lib/stores/mapStore'
import { useMapChannel } from '@/lib/realtime/useMapChannel'

const MapCanvas = dynamic(() => import('@/components/battlemap/MapCanvas').then(m => ({ default: m.MapCanvas })), { ssr: false })

interface Props {
  session: Session
  isMaster: boolean
  initialTokens: MapToken[]
  initialMapState: MapState | null
  initialFogState: FogState | null
}

export default function MapDisplay({ session, isMaster, initialTokens, initialMapState, initialFogState }: Props) {
  const { setTokens, setMapState, setFogState } = useMapStore()

  useEffect(() => {
    setTokens(initialTokens)
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
  }, [session.id])

  const { broadcastTokenMove, send } = useMapChannel(session.id)

  function openMasterPanel() {
    window.open(
      `/session/${session.code}/master`,
      'master-panel',
      'width=380,height=820,resizable=yes,scrollbars=yes'
    )
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <MapCanvas
        sessionId={session.id}
        isMaster={isMaster}
        currentUserId=""
        broadcastTokenMove={broadcastTokenMove}
        broadcast={send}
      />

      {/* Controls overlay */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <button
          onClick={toggleFullscreen}
          title="Полный экран"
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-sm shadow-lg transition-colors"
        >
          ⛶
        </button>
        {isMaster && (
          <button
            onClick={openMasterPanel}
            title="Открыть панель мастера"
            className="bg-purple-800 hover:bg-purple-700 border border-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg transition-colors"
          >
            ⚙ Мастер
          </button>
        )}
      </div>
    </div>
  )
}
