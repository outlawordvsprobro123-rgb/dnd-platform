'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMusicStore } from '@/lib/stores/musicStore'
import { getAudioManager } from '@/lib/utils/audio'

const MusicWidget = dynamic(
  () => import('./MusicWidget').then(m => ({ default: m.MusicWidget })),
  { ssr: false }
)

// Сцены грузятся один раз при первом открытии
export function GlobalMusicPlayer() {
  const { currentScene, status, volume, setVolume } = useMusicStore()
  const [open, setOpen] = useState(false)
  const [scenes, setScenes] = useState<Parameters<typeof MusicWidget>[0]['scenes']>([])
  const [loaded, setLoaded] = useState(false)

  async function handleOpen() {
    if (!loaded) {
      try {
        const res = await fetch('/api/music/scenes')
        if (res.ok) {
          const data = await res.json()
          setScenes(data.scenes ?? [])
        }
      } catch { /* ignore */ }
      setLoaded(true)
    }
    setOpen(o => !o)
  }

  const audio = getAudioManager()
  const isPlaying = status === 'playing'

  return (
    <>
      {/* Фиксированная панель снизу */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        height: '2.75rem',
        background: 'linear-gradient(180deg, #1a1209ee 0%, #0d0a07f5 100%)',
        borderTop: '1px solid var(--border-gold)',
        backdropFilter: 'blur(8px)',
        padding: '0 1rem',
        gap: '0.75rem',
      }}>
        {/* Кнопка открыть/закрыть плеер */}
        <button
          onClick={handleOpen}
          style={{
            fontFamily: "'Alegreya SC', serif",
            fontSize: '.65rem',
            letterSpacing: '.1em',
            color: open ? 'var(--gold)' : 'var(--gold-dim)',
            background: 'none',
            border: '1px solid var(--border)',
            borderRadius: '.35rem',
            padding: '.2rem .7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '.4rem',
            flexShrink: 0,
          }}
        >
          ♪ Музыка
        </button>

        {/* Текущая сцена + трек */}
        <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
          {currentScene ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', overflow: 'hidden' }}>
              <span style={{ fontSize: '.9rem', flexShrink: 0 }}>{currentScene.icon}</span>
              <span style={{
                fontFamily: "'Alegreya SC', serif",
                fontSize: '.6rem',
                color: 'var(--gold)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentScene.name}
              </span>
              <span style={{ fontSize: '.55rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {isPlaying ? '▶ играет' : '⏸ пауза'}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '.6rem', color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif" }}>
              Ничего не играет
            </span>
          )}
        </div>

        {/* Быстрые кнопки */}
        {currentScene && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', flexShrink: 0 }}>
            <MiniBtn
              onClick={() => { isPlaying ? audio.pause() : audio.resume(); useMusicStore.getState().setStatus(isPlaying ? 'paused' : 'playing') }}
              title={isPlaying ? 'Пауза' : 'Играть'}
            >
              {isPlaying ? '⏸' : '▶'}
            </MiniBtn>
            <MiniBtn
              onClick={() => { audio.stop(); useMusicStore.getState().setStatus('stopped'); useMusicStore.getState().setCurrentScene(null) }}
              title="Стоп"
            >
              ⏹
            </MiniBtn>
          </div>
        )}

        {/* Громкость */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexShrink: 0, width: '7rem' }}>
          <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>♪</span>
          <input
            type="range" min={0} max={1} step={0.02} value={volume}
            onChange={e => { const v = parseFloat(e.target.value); setVolume(v); audio.setVolume(v) }}
            style={{ flex: 1, accentColor: 'var(--gold)', height: '3px', cursor: 'pointer' }}
          />
          <span style={{ fontFamily: 'monospace', fontSize: '.55rem', color: 'var(--gold-dim)', minWidth: '1.8rem', textAlign: 'right' }}>
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* Раскрывающийся виджет над панелью */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '2.75rem',
          left: 0,
          zIndex: 999,
          width: '22rem',
          maxHeight: 'calc(100vh - 6rem)',
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #1a1209 0%, #0d0a07 100%)',
          border: '1px solid var(--border-gold)',
          borderBottom: 'none',
          borderRadius: '.5rem .5rem 0 0',
          boxShadow: '4px -4px 24px rgba(0,0,0,.6)',
          padding: '.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', letterSpacing: '.15em', color: 'var(--gold)' }}>
              ♪ Музыкальный плеер
            </span>
            <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem' }}>×</button>
          </div>
          {loaded ? (
            <MusicWidget scenes={scenes} />
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.8rem' }}>Загрузка...</div>
          )}
        </div>
      )}

      {/* Клик вне панели — закрыть */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}

function MiniBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{
      background: 'var(--bg-overlay)',
      border: '1px solid var(--border)',
      borderRadius: '.3rem',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      fontSize: '.7rem',
      width: '1.5rem', height: '1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {children}
    </button>
  )
}
