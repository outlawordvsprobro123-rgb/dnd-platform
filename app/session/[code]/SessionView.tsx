'use client'
import { useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { Session, SessionPlayer, MapToken, MapState, FogState, CombatState, CombatParticipant, MusicScene, MusicState } from '@/lib/supabase/types'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { useMapStore } from '@/lib/stores/mapStore'
import { useCombatStore } from '@/lib/stores/combatStore'
import { useMusicStore } from '@/lib/stores/musicStore'
import { useSessionChannel } from '@/lib/realtime/useSessionChannel'
import { useMapChannel } from '@/lib/realtime/useMapChannel'
import { useCombatChannel } from '@/lib/realtime/useCombatChannel'
import { useMusicChannel } from '@/lib/realtime/useMusicChannel'
import { CombatTracker } from '@/components/combat/CombatTracker'
import { SceneGrid } from '@/components/music/SceneGrid'
import { PlayerList } from '@/components/session/PlayerList'

const MapCanvas = dynamic(() => import('@/components/battlemap/MapCanvas').then(m => ({ default: m.MapCanvas })), { ssr: false })

interface Props {
  session: Session
  isMaster: boolean
  currentUserId: string
  initialPlayers: SessionPlayer[]
  initialTokens: MapToken[]
  initialMapState: MapState | null
  initialFogState: FogState | null
  initialCombatState: CombatState | null
  initialCombatParticipants: CombatParticipant[]
  musicScenes: MusicScene[]
  initialMusicState: MusicState | null
}

export default function SessionView({ session, isMaster, currentUserId, initialPlayers, initialTokens, initialMapState, initialFogState, initialCombatState, initialCombatParticipants, musicScenes, initialMusicState }: Props) {
  const { setSession, setPlayers, setIsMaster, setCurrentUserId } = useSessionStore()
  const { setTokens, setMapState, setFogState } = useMapStore()
  const { setParticipants, setCurrentTurn, setRound, setIsActive } = useCombatStore()
  const { setScenes } = useMusicStore()

  // Инициализация сторов
  useEffect(() => {
    setSession(session)
    setPlayers(initialPlayers)
    setIsMaster(isMaster)
    setCurrentUserId(currentUserId)
    setTokens(initialTokens)
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
    if (initialCombatState) {
      setIsActive(initialCombatState.is_active)
      setCurrentTurn(initialCombatState.current_turn)
      setRound(initialCombatState.round)
    }
    setParticipants(initialCombatParticipants)
    setScenes(musicScenes)
  }, [session.id])

  // Realtime подписки
  useSessionChannel(session.id)
  const { broadcastTokenMove } = useMapChannel(session.id)
  useCombatChannel(session.id)
  useMusicChannel(session.id)

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Заголовок */}
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-purple-400">⚔️ {session.name}</h1>
          <span className="text-gray-500 text-sm font-mono">{session.code}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isMaster && <span className="bg-purple-900 text-purple-300 px-2 py-0.5 rounded text-xs">Мастер</span>}
          <a href={`/session/${session.code}/map`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">🗺 Открыть карту</a>
        </div>
      </header>

      {/* Основной layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Левая панель */}
        <aside className="w-64 flex-shrink-0 flex flex-col gap-3 p-3 overflow-y-auto border-r border-gray-700">
          <PlayerList />
          <SceneGrid scenes={musicScenes} />
        </aside>

        {/* Карта по центру */}
        <main className="flex-1 bg-black overflow-hidden">
          <MapCanvas sessionId={session.id} isMaster={isMaster} currentUserId={currentUserId} broadcastTokenMove={broadcastTokenMove} />
        </main>

        {/* Правая панель — боевой трекер */}
        <aside className="w-72 flex-shrink-0 p-3 overflow-y-auto border-l border-gray-700">
          <CombatTracker />
        </aside>
      </div>
    </div>
  )
}
