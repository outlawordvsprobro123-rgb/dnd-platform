'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { Session, SessionPlayer, MapToken, MapState, FogState, WorldState, CombatState, CombatParticipant, MusicScene, MusicState, Character } from '@/lib/supabase/types'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { useMapStore } from '@/lib/stores/mapStore'
import { useCombatStore } from '@/lib/stores/combatStore'
import { useMusicStore } from '@/lib/stores/musicStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import { useSessionChannel } from '@/lib/realtime/useSessionChannel'
import { useMapChannel } from '@/lib/realtime/useMapChannel'
import { useCombatChannel } from '@/lib/realtime/useCombatChannel'
import { useMusicChannel } from '@/lib/realtime/useMusicChannel'
import { CombatTracker } from '@/components/combat/CombatTracker'
import { MusicWidget } from '@/components/music/MusicWidget'
import { PlayerList } from '@/components/session/PlayerList'
import { DiceRoller } from '@/components/session/DiceRoller'
import { RandomTables } from '@/components/session/RandomTables'
import { EncounterBuilder } from '@/components/session/EncounterBuilder'
import { LootGenerator } from '@/components/session/LootGenerator'
import { getModifier, formatModifier } from '@/lib/utils/dnd'
import PlayerMobileView from './PlayerMobileView'

const MapCanvas = dynamic(() => import('@/components/battlemap/MapCanvas').then(m => ({ default: m.MapCanvas })), { ssr: false })

interface Props {
  session: Session
  isMaster: boolean
  currentUserId: string
  initialPlayers: SessionPlayer[]
  initialTokens: MapToken[]
  initialMapState: MapState | null
  initialFogState: FogState | null
  initialWorldState: WorldState | null
  initialCombatState: CombatState | null
  initialCombatParticipants: CombatParticipant[]
  musicScenes: MusicScene[]
  initialMusicState: MusicState | null
  characters: Character[]
}

type RightTab = 'music' | 'combat' | 'characters' | 'dice' | 'tools'

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

const TAB_ICONS: Record<RightTab, string> = {
  music: '♪', combat: '⚔', characters: '◈', dice: '⬡', tools: '✦',
}

export default function SessionView({
  session, isMaster, currentUserId, initialPlayers, initialTokens, initialMapState, initialFogState, initialWorldState,
  initialCombatState, initialCombatParticipants, musicScenes, initialMusicState, characters,
}: Props) {
  const { setSession, setPlayers, setIsMaster, setCurrentUserId } = useSessionStore()
  const { setTokens, setMapState, setFogState, selectedTool } = useMapStore()
  const { setParticipants, setCurrentTurn, setRound, setIsActive } = useCombatStore()
  const { setScenes } = useMusicStore()
  const { worldState, setWorldState } = useWorldStore()
  const [rightTab, setRightTab] = useState<RightTab>('music')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setSession(session)
    setPlayers(initialPlayers)
    setIsMaster(isMaster)
    setCurrentUserId(currentUserId)
    setTokens(initialTokens)
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
    if (initialWorldState) setWorldState(initialWorldState)
    if (initialCombatState) {
      setIsActive(initialCombatState.is_active)
      setCurrentTurn(initialCombatState.current_turn)
      setRound(initialCombatState.round)
    }
    setParticipants(initialCombatParticipants)
    setScenes(musicScenes)
  }, [session.id])

  useSessionChannel(session.id)
  const { broadcastTokenMove, broadcastPing, send, realtimeStatus } = useMapChannel(session.id)
  useCombatChannel(session.id)
  useMusicChannel(session.id)

  if (isMobile && !isMaster) {
    return <PlayerMobileView session={session} characters={characters} />
  }

  return (
    <div style={{ height: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Шапка */}
      <header style={{
        flexShrink: 0,
        background: 'linear-gradient(180deg, #1a1209 0%, #120c04 100%)',
        borderBottom: '1px solid var(--border-gold)',
        padding: '0 1.25rem',
        height: '2.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 20px rgba(0,0,0,.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <a href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
            ← Главная
          </a>
          <span style={{ color: 'var(--border)', fontSize: '.7rem' }}>✦</span>
          <span style={{ fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif", fontSize: '.85rem', color: 'var(--gold)', letterSpacing: '.1em' }}>варнтал</span>
          <span style={{ fontFamily: 'monospace', fontSize: '.75rem', color: 'var(--gold-dim)', letterSpacing: '.2em', background: 'rgba(139,105,20,.1)', border: '1px solid var(--border)', borderRadius: '.3rem', padding: '.1rem .4rem' }}>
            {session.code}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <a href="/bestiary" style={{ color: 'var(--text-muted)', fontSize: '.75rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>Бестиарий</a>
          <a href="/spells" style={{ color: 'var(--text-muted)', fontSize: '.75rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>Заклинания</a>
          <a href="/loot" style={{ color: 'var(--text-muted)', fontSize: '.75rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>Лут</a>
          {isMaster && (
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.15em', background: 'linear-gradient(135deg, #3a0800, #2a0500)', border: '1px solid var(--crimson)', color: '#e88070', borderRadius: '.3rem', padding: '.2rem .6rem', textTransform: 'uppercase' }}>
              Мастер
            </span>
          )}
          <a href={`/session/${session.code}/map`} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold-dim)', border: '1px solid var(--border)', borderRadius: '.3rem', padding: '.25rem .65rem', textDecoration: 'none', background: 'rgba(139,105,20,.05)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-gold)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold-dim)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}>
            ⊞ Открыть карту
          </a>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Левая панель — игроки */}
        <aside style={{
          width: '11rem',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '.75rem',
          padding: '.75rem',
          overflowY: 'auto',
          borderRight: '1px solid var(--border)',
          background: 'linear-gradient(180deg, #130d04 0%, #0d0a07 100%)',
        }}>
          <PlayerList />
        </aside>

        {/* Карта по центру */}
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#0a0805' }}>
          <MapCanvas
            sessionId={session.id}
            isMaster={isMaster}
            currentUserId={currentUserId}
            broadcastTokenMove={broadcastTokenMove}
            broadcast={send}
            broadcastPing={broadcastPing}
            pingLabel={isMaster ? 'Мастер' : 'Игрок'}
          />

          {/* Индикатор realtime */}
          <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 20, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9999px', padding: '0.2rem 0.6rem' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: realtimeStatus === 'connected' ? '#4ade80' : realtimeStatus === 'error' ? '#f87171' : '#facc15',
            }} />
            <span style={{ fontSize: '0.6rem', color: '#9ca3af', fontFamily: 'monospace' }}>
              {realtimeStatus === 'connected' ? 'live' : realtimeStatus === 'error' ? 'err' : '...'}
            </span>
          </div>

          {/* Пинг */}
          <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 20 }}>
            <button
              onClick={() => useMapStore.getState().setSelectedTool(selectedTool === 'ping' ? 'select' : 'ping')}
              className="btn-fantasy"
              style={{
                fontSize: '.65rem',
                padding: '.35rem .85rem',
                background: selectedTool === 'ping'
                  ? 'linear-gradient(135deg, #4a3510, #3a2808)'
                  : 'rgba(13,10,7,.85)',
                borderColor: selectedTool === 'ping' ? 'var(--gold)' : 'var(--border)',
                color: selectedTool === 'ping' ? 'var(--gold-bright)' : 'var(--text-muted)',
                backdropFilter: 'blur(4px)',
              }}
            >
              ◎ Пинг
            </button>
          </div>

          {/* Погода / время */}
          {worldState && (
            <div style={{
              position: 'absolute',
              bottom: '.75rem',
              left: '.75rem',
              zIndex: 20,
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              background: 'rgba(13,10,7,.85)',
              backdropFilter: 'blur(4px)',
              border: '1px solid var(--border)',
              borderRadius: '.5rem',
              padding: '.35rem .8rem',
              fontFamily: "'Alegreya SC', serif",
              fontSize: '.6rem',
              letterSpacing: '.1em',
              color: 'var(--text-secondary)',
              pointerEvents: 'none',
              userSelect: 'none',
            }}>
              <span>{WEATHER_ICONS[worldState.weather]} {WEATHER_LABELS[worldState.weather]}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span>{TIME_ICONS[worldState.time_of_day]} {TIME_LABELS[worldState.time_of_day]}</span>
            </div>
          )}
        </main>

        {/* Правая панель */}
        <aside style={{
          width: '19rem',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--border)',
          background: 'linear-gradient(180deg, #130d04 0%, #0d0a07 100%)',
        }}>
          {/* Вкладки */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {(['music', 'combat', 'characters', 'dice', 'tools'] as RightTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                style={{
                  flex: 1,
                  padding: '.6rem .25rem',
                  fontSize: '1rem',
                  background: rightTab === tab ? 'linear-gradient(180deg, rgba(139,105,20,.12), transparent)' : 'transparent',
                  border: 'none',
                  borderBottom: rightTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
                  color: rightTab === tab ? 'var(--gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all .15s',
                  lineHeight: 1,
                }}
                title={tab}
              >
                {TAB_ICONS[tab]}
              </button>
            ))}
          </div>

          {/* Заголовок вкладки */}
          <div style={{ padding: '.5rem 1rem .25rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.3em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
              {{ music: 'Атмосфера', combat: 'Инициатива', characters: 'Персонажи', dice: 'Кости', tools: 'Инструменты' }[rightTab]}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '.75rem' }}>
            {rightTab === 'music' && <MusicWidget scenes={musicScenes} />}
            {rightTab === 'combat' && <CombatTracker />}
            {rightTab === 'dice' && (
              <DiceRoller sessionId={session.id} playerName={isMaster ? 'Мастер' : 'Игрок'} />
            )}
            {rightTab === 'tools' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <RandomTables />
                {isMaster && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <EncounterBuilder sessionId={session.id} isMaster={isMaster} />
                    </div>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                      <LootGenerator sessionId={session.id} isMaster={isMaster} />
                    </div>
                  </>
                )}
              </div>
            )}
            {rightTab === 'characters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                  <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.15em', color: 'var(--text-secondary)' }}>Ваши персонажи</span>
                  <a href="/character/new" target="_blank" style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--gold-dim)', textDecoration: 'none', letterSpacing: '.1em' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--gold-dim)')}>
                    + Новый
                  </a>
                </div>
                {characters.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <div style={{ fontSize: '1.5rem', opacity: .3, marginBottom: '.5rem' }}>◈</div>
                    <p style={{ color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic', fontSize: '.9rem' }}>Нет персонажей</p>
                    <a href="/character/new" target="_blank" className="btn-fantasy btn-ghost" style={{ marginTop: '.75rem', display: 'inline-block', fontSize: '.6rem', textDecoration: 'none' }}>
                      + Создать
                    </a>
                  </div>
                ) : (
                  characters.map(char => (
                    <a
                      key={char.id}
                      href={`/character/${char.id}`}
                      target="_blank"
                      className="card"
                      style={{ padding: '.75rem 1rem', textDecoration: 'none', display: 'block', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-gold)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 15px rgba(139,105,20,.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.8rem', color: 'var(--text-primary)', marginBottom: '.2rem' }}>{char.name}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '.75rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{char.race} · {char.class} · {char.level} ур.</p>
                        </div>
                        <div style={{ textAlign: 'right', fontFamily: "'Alegreya SC', serif", fontSize: '.6rem' }}>
                          <p style={{ color: '#c0392b' }}>{char.hp_current}/{char.hp_max} HP</p>
                          <p style={{ color: 'var(--text-muted)', marginTop: '.15rem' }}>КД {char.armor_class}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
                        {(['str','dex','con','int','wis','cha'] as const).map(stat => (
                          <div key={stat} style={{ textAlign: 'center', minWidth: '2rem' }}>
                            <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.45rem', letterSpacing: '.08em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>{stat}</div>
                            <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: 'var(--text-secondary)' }}>{formatModifier(getModifier((char.stats as Record<string, number>)?.[stat] ?? 10))}</div>
                          </div>
                        ))}
                      </div>
                    </a>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
