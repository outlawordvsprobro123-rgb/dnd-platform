'use client'
import { useState, useEffect, useRef } from 'react'
import { useMusicStore } from '@/lib/stores/musicStore'
import { getAudioManager } from '@/lib/utils/audio'
import type { MusicScene, MusicTrack } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

interface Props { scenes: MusicScene[] }

export function MusicWidget({ scenes: initialScenes }: Props) {
  const { volume, setVolume, currentScene, setCurrentScene, status, setStatus } = useMusicStore()
  const [scenes, setScenes] = useState(initialScenes)

  // Плейлист текущей сцены
  const [trackIndex, setTrackIndex] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)

  // Управление добавлением треков
  const [expandedScene, setExpandedScene] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [trackName, setTrackName] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const audio = getAudioManager()

  // Текущий трек
  const currentTracks = currentScene ? (currentScene.tracks as MusicTrack[]).filter(t => t.url) : []
  const currentTrack = currentTracks[trackIndex] ?? null

  // Авто-следующий трек когда заканчивается
  useEffect(() => {
    const interval = setInterval(() => {
      if (status === 'playing' && !audio.isPlaying() && currentTracks.length > 0) {
        handleNext()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [status, currentTracks, trackIndex, shuffle, repeat])

  function getNextIndex(cur: number, total: number): number {
    if (shuffle) return Math.floor(Math.random() * total)
    if (repeat) return cur
    return (cur + 1) % total
  }

  function playTrack(scene: MusicScene, idx: number) {
    const tracks = (scene.tracks as MusicTrack[]).filter(t => t.url)
    if (!tracks[idx]) return
    setCurrentScene(scene)
    setTrackIndex(idx)
    setStatus('playing')
    audio.playScene([tracks[idx]], volume)
  }

  function handlePlay(scene: MusicScene) {
    if (currentScene?.id === scene.id && status === 'playing') {
      setStatus('paused')
      audio.pause()
    } else if (currentScene?.id === scene.id && status === 'paused') {
      setStatus('playing')
      audio.resume()
    } else {
      playTrack(scene, 0)
    }
  }

  function handlePause() {
    if (status === 'playing') { setStatus('paused'); audio.pause() }
    else { setStatus('playing'); audio.resume() }
  }

  function handleStop() {
    setStatus('stopped')
    setCurrentScene(null)
    setTrackIndex(0)
    audio.stop()
  }

  function handlePrev() {
    if (!currentScene) return
    const tracks = (currentScene.tracks as MusicTrack[]).filter(t => t.url)
    const idx = (trackIndex - 1 + tracks.length) % tracks.length
    playTrack(currentScene, idx)
  }

  function handleNext() {
    if (!currentScene) return
    const tracks = (currentScene.tracks as MusicTrack[]).filter(t => t.url)
    if (!tracks.length) return
    const idx = getNextIndex(trackIndex, tracks.length)
    playTrack(currentScene, idx)
  }

  function handleSelectTrack(scene: MusicScene, idx: number) {
    playTrack(scene, idx)
  }

  // ── Управление треками ──────────────────────────────────────────────────

  async function addTrackByUrl(scene: MusicScene) {
    if (!urlInput.trim()) return
    const track: MusicTrack = { title: trackName.trim() || urlInput.split('/').pop() || 'Трек', url: urlInput.trim() }
    await saveTrack(scene, track)
    setUrlInput('')
    setTrackName('')
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>, scene: MusicScene) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const path = `scenes/${scene.slug}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('audio').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(data.path)
      await saveTrack(scene, { title: file.name.replace(/\.[^.]+$/, ''), url: publicUrl })
    } catch (err) {
      alert('Ошибка: ' + (err instanceof Error ? err.message : 'Создайте bucket "audio" в Supabase Storage'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function saveTrack(scene: MusicScene, track: MusicTrack) {
    const newTracks = [...(scene.tracks as MusicTrack[]), track]
    const res = await fetch(`/api/music/scenes/${scene.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: newTracks }),
    })
    if (res.ok) {
      const updated = { ...scene, tracks: newTracks }
      setScenes(s => s.map(sc => sc.id === scene.id ? updated : sc))
      if (currentScene?.id === scene.id) setCurrentScene(updated)
    }
  }

  async function removeTrack(scene: MusicScene, idx: number) {
    const tracks = [...(scene.tracks as MusicTrack[])]
    tracks.splice(idx, 1)
    const res = await fetch(`/api/music/scenes/${scene.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks }),
    })
    if (res.ok) {
      const updated = { ...scene, tracks }
      setScenes(s => s.map(sc => sc.id === scene.id ? updated : sc))
      if (currentScene?.id === scene.id) {
        setCurrentScene(updated)
        if (idx <= trackIndex) setTrackIndex(Math.max(0, trackIndex - 1))
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>

      {/* ── Текущий плеер ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-gold)', borderRadius: '.5rem', padding: '.6rem .75rem' }}>
        {currentScene ? (
          <>
            {/* Сцена + трек */}
            <div style={{ marginBottom: '.4rem' }}>
              <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', color: 'var(--gold)', marginBottom: '.15rem' }}>
                {currentScene.icon} {currentScene.name}
              </div>
              <div style={{ fontSize: '.65rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentTrack ? currentTrack.title : '—'}
                {currentTracks.length > 1 && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '.4rem' }}>
                    {trackIndex + 1}/{currentTracks.length}
                  </span>
                )}
              </div>
            </div>

            {/* Кнопки управления */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', justifyContent: 'center', marginBottom: '.5rem' }}>
              <CtrlBtn onClick={handlePrev} title="Предыдущий" disabled={currentTracks.length < 2}>⏮</CtrlBtn>
              <CtrlBtn onClick={handlePause} title={status === 'playing' ? 'Пауза' : 'Играть'} large>
                {status === 'playing' ? '⏸' : '▶'}
              </CtrlBtn>
              <CtrlBtn onClick={handleNext} title="Следующий" disabled={currentTracks.length < 2}>⏭</CtrlBtn>
              <CtrlBtn onClick={handleStop} title="Стоп">⏹</CtrlBtn>
              <CtrlBtn onClick={() => setShuffle(s => !s)} title="Случайный" active={shuffle}>⇄</CtrlBtn>
              <CtrlBtn onClick={() => setRepeat(r => !r)} title="Повтор" active={repeat}>↺</CtrlBtn>
            </div>

            {/* Громкость */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>♪</span>
              <input type="range" min={0} max={1} step={0.02} value={volume}
                onChange={e => { const v = parseFloat(e.target.value); setVolume(v); audio.setVolume(v) }}
                style={{ flex: 1, accentColor: 'var(--gold)', height: '3px', cursor: 'pointer' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '.6rem', color: 'var(--gold-dim)', minWidth: '2.2rem', textAlign: 'right' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '.5rem 0', color: 'var(--text-muted)', fontFamily: "'Mookmania','Alegreya SC',serif", fontStyle: 'italic', fontSize: '.8rem' }}>
            Выберите сцену
          </div>
        )}
      </div>

      {/* ── Сетка сцен ────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.35rem' }}>
        {scenes.map(scene => {
          const isActive = currentScene?.id === scene.id && status === 'playing'
          const trackCount = (scene.tracks as MusicTrack[]).filter(t => t.url).length
          const isExpanded = expandedScene === scene.id
          return (
            <div key={scene.id} style={{ position: 'relative' }}>
              <button
                onClick={() => handlePlay(scene)}
                title={scene.description ?? scene.name}
                style={{
                  width: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '.4rem .15rem', borderRadius: '.4rem',
                  border: `1px solid ${isActive ? scene.color : 'var(--border)'}`,
                  background: isActive ? `${scene.color}18` : 'var(--bg-elevated)',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: '.9rem', lineHeight: 1 }}>{scene.icon}</span>
                <span style={{ fontFamily: "'Alegreya SC',serif", fontSize: '.42rem', color: 'var(--text-secondary)', marginTop: '.2rem', textAlign: 'center', lineHeight: 1.2 }}>{scene.name}</span>
                {trackCount > 0 && (
                  <span style={{ fontSize: '.4rem', color: isActive ? scene.color : 'var(--text-muted)', marginTop: '.1rem' }}>{trackCount} ♪</span>
                )}
              </button>
              {/* Кнопка раскрыть треки */}
              <button
                onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
                title="Треки сцены"
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: '1rem', height: '1rem',
                  background: isExpanded ? 'var(--gold)' : 'var(--bg-overlay)',
                  border: '1px solid var(--border-gold)',
                  borderRadius: '50%', fontSize: '.55rem',
                  color: isExpanded ? '#1a1209' : 'var(--gold)',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isExpanded ? '−' : '+'}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Панель треков выбранной сцены ─────────────────────────────── */}
      {expandedScene && (() => {
        const scene = scenes.find(s => s.id === expandedScene)
        if (!scene) return null
        const tracks = (scene.tracks as MusicTrack[]).filter(t => t.url)
        const isCurrentScene = currentScene?.id === scene.id
        return (
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.5rem', padding: '.65rem .75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <span style={{ fontFamily: "'Alegreya SC',serif", fontSize: '.7rem', color: 'var(--gold)' }}>
                {scene.icon} {scene.name}
              </span>
              <button onClick={() => setExpandedScene(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem' }}>×</button>
            </div>

            {/* Список треков */}
            {tracks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginBottom: '.5rem', maxHeight: '8rem', overflowY: 'auto' }}>
                {tracks.map((t, i) => {
                  const isPlaying = isCurrentScene && trackIndex === i && status === 'playing'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', background: isPlaying ? 'rgba(139,105,20,.12)' : 'var(--bg-overlay)', border: `1px solid ${isPlaying ? 'var(--border-gold)' : 'transparent'}`, borderRadius: '.3rem', padding: '.2rem .4rem' }}>
                      <button
                        onClick={() => handleSelectTrack(scene, i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: isPlaying ? 'var(--gold)' : 'var(--text-muted)', fontSize: '.7rem', flexShrink: 0, padding: 0 }}
                        title={isPlaying ? 'Играет' : 'Воспроизвести'}
                      >
                        {isPlaying ? '▶' : '▷'}
                      </button>
                      <span style={{ color: isPlaying ? 'var(--gold)' : 'var(--text-secondary)', fontSize: '.65rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </span>
                      <button onClick={() => removeTrack(scene, i)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.7rem', flexShrink: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '.75rem', marginBottom: '.5rem' }}>Треков нет</p>
            )}

            {/* Добавить трек */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <input
                value={trackName}
                onChange={e => setTrackName(e.target.value)}
                placeholder="Название (необязательно)"
                className="input-fantasy"
                style={{ fontSize: '.7rem', padding: '.25rem .5rem' }}
              />
              <div style={{ display: 'flex', gap: '.3rem' }}>
                <input
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="URL аудиофайла"
                  className="input-fantasy"
                  style={{ fontSize: '.7rem', padding: '.25rem .5rem', flex: 1 }}
                  onKeyDown={e => { if (e.key === 'Enter') addTrackByUrl(scene) }}
                />
                <button onClick={() => addTrackByUrl(scene)} disabled={!urlInput.trim()} className="btn-fantasy btn-gold" style={{ fontSize: '.6rem', padding: '.25rem .5rem' }}>
                  + URL
                </button>
              </div>
              <div>
                <input ref={fileRef} type="file" accept="audio/*" onChange={e => uploadFile(e, scene)} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-fantasy btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '.65rem', padding: '.25rem' }}>
                  {uploading ? 'Загрузка...' : '↑ Загрузить файл'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function CtrlBtn({ onClick, title, children, disabled, active, large }: {
  onClick: () => void
  title: string
  children: React.ReactNode
  disabled?: boolean
  active?: boolean
  large?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        background: active ? 'rgba(139,105,20,.25)' : 'var(--bg-overlay)',
        border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border)'}`,
        borderRadius: '.35rem',
        color: active ? 'var(--gold)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: large ? '1rem' : '.75rem',
        width: large ? '2rem' : '1.5rem',
        height: large ? '2rem' : '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        transition: 'all .1s',
      }}
    >
      {children}
    </button>
  )
}
