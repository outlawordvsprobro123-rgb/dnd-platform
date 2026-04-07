'use client'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Session, MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import { useMapChannel } from '@/lib/realtime/useMapChannel'

const MapCanvas = dynamic(() => import('@/components/battlemap/MapCanvas').then(m => ({ default: m.MapCanvas })), { ssr: false })

const WEATHER_ICONS: Record<string, string> = {
  clear: '☀', cloudy: '⛅', rain: '🌧', storm: '⛈', snow: '❄', fog: '≋', heat: '🔥',
}
const WEATHER_LABELS: Record<string, string> = {
  clear: 'Ясно', cloudy: 'Облачно', rain: 'Дождь', storm: 'Гроза', snow: 'Снег', fog: 'Туман', heat: 'Жара',
}
const TIME_ICONS: Record<string, string> = {
  dawn: '◑', day: '○', dusk: '◐', night: '●', midnight: '◉',
}
const TIME_LABELS: Record<string, string> = {
  dawn: 'Рассвет', day: 'День', dusk: 'Закат', night: 'Ночь', midnight: 'Полночь',
}

interface Props {
  session: Session
  isMaster: boolean
  currentUserId: string
  initialTokens: MapToken[]
  initialMapState: MapState | null
  initialFogState: FogState | null
  initialWorldState: WorldState | null
}

export default function MapDisplay({
  session, isMaster, currentUserId,
  initialTokens, initialMapState, initialFogState, initialWorldState,
}: Props) {
  const { setTokens, setMapState, setFogState } = useMapStore()
  const { worldState, setWorldState } = useWorldStore()

  useEffect(() => {
    setTokens(initialTokens)
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
    if (initialWorldState) setWorldState(initialWorldState)
  }, [session.id])

  const { broadcastTokenMove, broadcastPing, send, realtimeStatus } = useMapChannel(session.id)

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
        currentUserId={currentUserId}
        broadcastTokenMove={broadcastTokenMove}
        broadcast={send}
        broadcastPing={broadcastPing}
        pingLabel={isMaster ? 'Мастер' : 'Игрок'}
      />

      {/* Оверлей погоды и времени */}
      {worldState && (
        <div className="absolute bottom-12 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 pointer-events-none select-none">
          <span>{WEATHER_ICONS[worldState.weather]} {WEATHER_LABELS[worldState.weather]}</span>
          <span className="text-gray-600">·</span>
          <span>{TIME_ICONS[worldState.time_of_day]} {TIME_LABELS[worldState.time_of_day]}</span>
        </div>
      )}

      {/* Индикатор realtime-соединения */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/70 border border-gray-700 rounded-full px-2.5 py-1 text-xs">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
          realtimeStatus === 'connected' ? 'bg-green-400' :
          realtimeStatus === 'polling' ? 'bg-orange-400' :
          realtimeStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400'
        }`} />
        <span className="text-gray-300">
          {realtimeStatus === 'connected' ? 'Live' :
           realtimeStatus === 'polling' ? 'Polling (2s)' :
           realtimeStatus === 'error' ? 'Ошибка' : 'Подключение...'}
        </span>
      </div>

      {/* Кнопки управления */}
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
