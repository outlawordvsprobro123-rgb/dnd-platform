'use client'
import { useState, useRef } from 'react'
import { useMusicStore } from '@/lib/stores/musicStore'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { createClient } from '@/lib/supabase/client'
import { getAudioManager } from '@/lib/utils/audio'
import type { MusicScene, MusicTrack } from '@/lib/supabase/types'

interface Props { scenes: MusicScene[] }

export function MusicWidget({ scenes: initialScenes }: Props) {
  const { currentScene, status, volume, setCurrentScene, setStatus, setVolume } = useMusicStore()
  const { isMaster, session } = useSessionStore()
  const [scenes, setScenes] = useState(initialScenes)
  const [loading, setLoading] = useState<string | null>(null)
  const [selectedScene, setSelectedScene] = useState<MusicScene | null>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [trackName, setTrackName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function playScene(scene: MusicScene) {
    if (!isMaster || !session) return
    setLoading(scene.id)
    try {
      const isCurrentlyPlaying = currentScene?.id === scene.id && status === 'playing'
      const newStatus = isCurrentlyPlaying ? 'paused' : 'playing'
      const audio = getAudioManager()
      const tracks = scene.tracks as MusicTrack[]
      const validTracks = tracks.filter(t => t.url && !t.url.startsWith('/audio/'))
      if (newStatus === 'playing') {
        if (validTracks.length === 0) {
          alert('Нет рабочих треков. Добавьте URL или загрузите файлы через кнопку + на сцене.')
          setLoading(null)
          return
        }
        setCurrentScene(scene)
        setStatus('playing')
        audio.playScene(validTracks, volume)
      } else {
        setStatus('paused')
        audio.pause()
      }
      await fetch(`/api/sessions/${session.id}/music`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id: scene.id, status: newStatus })
      })
    } finally { setLoading(null) }
  }

  async function stopMusic() {
    if (!isMaster || !session) return
    const audio = getAudioManager()
    audio.stop()
    setStatus('stopped')
    setCurrentScene(null)
    await fetch(`/api/sessions/${session.id}/music`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stopped' })
    })
  }

  async function addTrackByUrl() {
    if (!selectedScene || !urlInput.trim()) return
    const track = { title: trackName.trim() || urlInput.split('/').pop() || 'Track', url: urlInput.trim() }
    await saveTrack(selectedScene, track)
    setUrlInput('')
    setTrackName('')
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedScene) return
    setUploading(true)
    try {
      const path = `scenes/${selectedScene.slug}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('audio').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(data.path)
      await saveTrack(selectedScene, { title: file.name.replace(/\.[^.]+$/, ''), url: publicUrl })
    } catch (err) {
      alert('Ошибка загрузки: ' + (err instanceof Error ? err.message : 'Убедитесь что bucket "audio" создан в Supabase Storage'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function saveTrack(scene: MusicScene, track: { title: string; url: string }) {
    const newTracks = [...(scene.tracks as {title:string;url:string}[]), track]
    const res = await fetch(`/api/music/scenes/${scene.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks: newTracks })
    })
    if (res.ok) {
      const updated = { ...scene, tracks: newTracks as unknown as MusicScene['tracks'] }
      setScenes(s => s.map(sc => sc.id === scene.id ? updated : sc))
      setSelectedScene(updated)
    }
  }

  async function removeTrack(scene: MusicScene, idx: number) {
    const tracks = [...(scene.tracks as {title:string;url:string}[])]
    tracks.splice(idx, 1)
    const res = await fetch(`/api/music/scenes/${scene.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracks })
    })
    if (res.ok) {
      const updated = { ...scene, tracks: tracks as unknown as MusicScene['tracks'] }
      setScenes(s => s.map(sc => sc.id === scene.id ? updated : sc))
      setSelectedScene(updated)
    }
  }

  const tracks = selectedScene ? (selectedScene.tracks as {title:string;url:string}[]) : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {/* Текущая сцена */}
      {currentScene && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(139,105,20,.08)', border: '1px solid var(--border-gold)', borderRadius: '.5rem', padding: '.5rem .75rem' }}>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', color: 'var(--gold)' }}>
            ▶ {currentScene.icon} {currentScene.name}
            <span style={{ color: 'var(--text-muted)', marginLeft: '.4rem', fontSize: '.6rem' }}>{status === 'playing' ? 'играет' : 'пауза'}</span>
          </span>
          {isMaster && (
            <button onClick={stopMusic} style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '.08em' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e88070')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              ■ Стоп
            </button>
          )}
        </div>
      )}

      {/* Сетка сцен */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.4rem' }}>
        {scenes.map(scene => {
          const isActive = currentScene?.id === scene.id && status === 'playing'
          const trackCount = (scene.tracks as {title:string;url:string}[]).length
          return (
            <div key={scene.id} style={{ position: 'relative' }} className="group">
              <button
                onClick={() => playScene(scene)}
                disabled={!isMaster || loading === scene.id}
                title={scene.description ?? scene.name}
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '.45rem .2rem',
                  borderRadius: '.4rem',
                  border: `1px solid ${isActive ? scene.color : 'var(--border)'}`,
                  background: isActive ? `${scene.color}18` : 'var(--bg-elevated)',
                  cursor: isMaster ? 'pointer' : 'default',
                  opacity: isActive ? 1 : 0.75,
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { if (isMaster && !isActive) { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)' } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.opacity = '0.75'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' } }}
              >
                <span style={{ fontSize: '.95rem', lineHeight: 1 }}>{scene.icon}</span>
                <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.45rem', letterSpacing: '.05em', color: 'var(--text-secondary)', marginTop: '.25rem', lineHeight: 1.2, textAlign: 'center' }}>{scene.name}</span>
                {trackCount > 0 && <span style={{ fontSize: '.45rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>{trackCount} ♪</span>}
              </button>
              {isMaster && (
                <button
                  onClick={() => setSelectedScene(scene)}
                  style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    width: '1rem', height: '1rem',
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border-gold)',
                    borderRadius: '50%',
                    fontSize: '.55rem',
                    color: 'var(--gold)',
                    cursor: 'pointer',
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  className="group-hover:!flex"
                  title="Управление треками"
                >+</button>
              )}
            </div>
          )
        })}
      </div>

      {/* Громкость */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.15em', color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>Громкость</span>
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={e => { const v = parseFloat(e.target.value); setVolume(v); getAudioManager().setVolume(v) }}
          style={{ flex: 1, accentColor: 'var(--gold)', height: '3px', cursor: 'pointer' }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: '.65rem', color: 'var(--gold-dim)', minWidth: '2rem', textAlign: 'right' }}>{Math.round(volume * 100)}%</span>
      </div>

      {/* Панель управления треками */}
      {selectedScene && isMaster && (
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.5rem', padding: '.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', color: 'var(--gold)' }}>
              {selectedScene.icon} {selectedScene.name}
            </span>
            <button onClick={() => setSelectedScene(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.8rem' }}>×</button>
          </div>

          {tracks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '.6rem', maxHeight: '7rem', overflowY: 'auto' }}>
              {tracks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', borderRadius: '.3rem', padding: '.25rem .5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{t.title}</span>
                  <button onClick={() => removeTrack(selectedScene, i)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.75rem', marginLeft: '.4rem' }}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic', fontSize: '.8rem', marginBottom: '.6rem' }}>Нет треков. Добавьте URL или загрузите файл.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            <input
              value={trackName}
              onChange={e => setTrackName(e.target.value)}
              placeholder="Название трека"
              className="input-fantasy"
              style={{ fontSize: '.75rem', padding: '.3rem .6rem' }}
            />
            <div style={{ display: 'flex', gap: '.4rem' }}>
              <input
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                placeholder="URL аудиофайла"
                className="input-fantasy"
                style={{ fontSize: '.75rem', padding: '.3rem .6rem', flex: 1 }}
              />
              <button onClick={addTrackByUrl} disabled={!urlInput.trim()} className="btn-fantasy btn-gold" style={{ fontSize: '.65rem', padding: '.3rem .65rem' }}>+</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <input ref={fileRef} type="file" accept="audio/*" onChange={uploadFile} style={{ display: 'none' }} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-fantasy btn-ghost"
                style={{ flex: 1, justifyContent: 'center', fontSize: '.65rem', padding: '.3rem' }}
              >
                {uploading ? 'Загрузка...' : '↑ Загрузить файл'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
