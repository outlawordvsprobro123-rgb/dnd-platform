'use client'
import { useState, useRef } from 'react'
import type { BestiaryCreature } from '@/lib/supabase/types'
import { crToString, formatModifier, getModifier, STAT_LABELS } from '@/lib/utils/dnd'

const SIZE_LABELS: Record<string, string> = {
  Tiny: 'Крохотный', Small: 'Маленький', Medium: 'Средний',
  Large: 'Большой', Huge: 'Огромный', Gargantuan: 'Колоссальный',
}

const TYPE_ICONS: Record<string, string> = {
  beast: '🐾', humanoid: '🧑', undead: '💀', dragon: '🐉', fiend: '😈',
  giant: '🗿', monstrosity: '👾', aberration: '🧿', elemental: '🌊',
  fey: '🧚', construct: '⚙️', plant: '🌿', ooze: '🫧', celestial: '⭐',
}

interface Props {
  creature: BestiaryCreature
  onAddToCombat?: (creature: BestiaryCreature) => void
}

export default function CreatureCard({ creature, onAddToCombat }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [imageUrl, setImageUrl] = useState(creature.image_url)
  const [imgError, setImgError] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const stats = creature.stats as Record<string, number>
  const typeIcon = TYPE_ICONS[creature.type] ?? '👾'

  async function uploadFile(file: File) {
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/bestiary/${creature.id}/image`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка загрузки')
      setImageUrl(data.image_url)
      setImgError(false)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setUploading(false)
    }
  }

  async function saveUrl() {
    if (!urlInput.trim()) return
    setUploading(true)
    setUploadError('')
    try {
      const res = await fetch(`/api/bestiary/${creature.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: urlInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка')
      setImageUrl(urlInput.trim())
      setImgError(false)
      setUrlInput('')
      setShowUrlInput(false)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${expanded ? 'var(--border-gold)' : 'var(--border)'}`,
      borderRadius: '.75rem',
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      {/* Заголовок */}
      <div
        style={{ display: 'flex', alignItems: 'center', padding: '.75rem 1rem', cursor: 'pointer', gap: '.75rem' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Изображение существа */}
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden', border: '1px solid var(--border-gold)',
          background: 'var(--bg-overlay)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={creature.name}
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '1.4rem' }}>{typeIcon}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: 'var(--text-primary)', margin: 0 }}>{creature.name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '.75rem', fontFamily: "'Mookmania', 'Alegreya SC', serif", margin: 0, marginTop: '.15rem' }}>
            {SIZE_LABELS[creature.size] ?? creature.size} · {creature.type}
            {creature.alignment && ` · ${creature.alignment}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '.6rem', color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', margin: 0 }}>КО</p>
            <p style={{ color: 'var(--gold)', fontFamily: "'Alegreya SC', serif", fontWeight: 700, fontSize: '.85rem', margin: 0 }}>{crToString(creature.cr)}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '.6rem', color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', margin: 0 }}>HP</p>
            <p style={{ color: '#e88070', fontFamily: "'Alegreya SC', serif", fontWeight: 600, fontSize: '.85rem', margin: 0 }}>{creature.hp}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '.6rem', color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', margin: 0 }}>КД</p>
            <p style={{ color: '#7ec8e3', fontFamily: "'Alegreya SC', serif", fontWeight: 600, fontSize: '.85rem', margin: 0 }}>{creature.ac}</p>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', marginLeft: '.25rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Детали */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-gold)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Изображение крупное + атрибуты */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            {/* Блок изображения с загрузкой */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <div style={{
                width: '8rem', height: '10rem', borderRadius: '.5rem',
                overflow: 'hidden', border: '1px solid var(--border-gold)',
                background: 'var(--bg-overlay)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {imageUrl && !imgError ? (
                  <img src={imageUrl} alt={creature.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgError(true)} />
                ) : (
                  <span style={{ fontSize: '3rem', opacity: .3 }}>{typeIcon}</span>
                )}
                {uploading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--gold)', fontSize: '.7rem', fontFamily: "'Alegreya SC', serif" }}>...</span>
                  </div>
                )}
              </div>

              {/* Кнопки загрузки */}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = '' }} />
              <div style={{ display: 'flex', gap: '.3rem' }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  title="Загрузить изображение"
                  style={{
                    flex: 1, background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    borderRadius: '.3rem', color: 'var(--text-muted)', fontSize: '.6rem',
                    padding: '.25rem', cursor: 'pointer', fontFamily: "'Alegreya SC', serif",
                    opacity: uploading ? .5 : 1,
                  }}
                >
                  ↑ Файл
                </button>
                <button
                  onClick={() => setShowUrlInput(v => !v)}
                  title="Указать URL"
                  style={{
                    flex: 1, background: showUrlInput ? 'rgba(139,105,20,.15)' : 'var(--bg-overlay)',
                    border: `1px solid ${showUrlInput ? 'var(--border-gold)' : 'var(--border)'}`,
                    borderRadius: '.3rem', color: showUrlInput ? 'var(--gold)' : 'var(--text-muted)',
                    fontSize: '.6rem', padding: '.25rem', cursor: 'pointer', fontFamily: "'Alegreya SC', serif",
                  }}
                >
                  URL
                </button>
              </div>

              {/* URL ввод */}
              {showUrlInput && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', width: '8rem' }}>
                  <input
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    onKeyDown={e => e.key === 'Enter' && saveUrl()}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,.35)', border: '1px solid var(--border)',
                      borderRadius: '.3rem', padding: '.25rem .4rem',
                      color: 'var(--text-primary)', fontSize: '.6rem', outline: 'none',
                    }}
                  />
                  <button onClick={saveUrl} disabled={!urlInput.trim() || uploading}
                    style={{
                      background: 'rgba(139,105,20,.2)', border: '1px solid var(--border-gold)',
                      borderRadius: '.3rem', color: 'var(--gold)', fontSize: '.6rem',
                      padding: '.2rem', cursor: 'pointer', fontFamily: "'Alegreya SC', serif",
                      opacity: !urlInput.trim() || uploading ? .5 : 1,
                    }}>
                    Сохранить
                  </button>
                </div>
              )}

              {uploadError && (
                <p style={{ color: '#e07070', fontSize: '.6rem', fontFamily: "'Alegreya SC', serif", wordBreak: 'break-word', maxWidth: '8rem' }}>{uploadError}</p>
              )}
            </div>

            <div style={{ flex: 1 }}>
              {/* Атрибуты */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '.35rem', textAlign: 'center' }}>
                {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => (
                  <div key={stat} style={{ background: 'var(--bg-overlay)', borderRadius: '.4rem', padding: '.4rem .2rem', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '.6rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', margin: 0 }}>{STAT_LABELS[stat]}</p>
                    <p style={{ color: 'var(--text-primary)', fontFamily: "'Alegreya SC', serif", fontWeight: 700, fontSize: '.85rem', margin: '0.1rem 0 0' }}>{stats[stat]}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", margin: 0 }}>{formatModifier(getModifier(stats[stat]))}</p>
                  </div>
                ))}
              </div>

              {/* Скорость и чувства */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginTop: '.75rem' }}>
                {creature.speed && Object.keys(creature.speed).length > 0 && (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '.25rem' }}>Скорость</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
                      {Object.entries(creature.speed as Record<string, number>)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k === 'walk' ? '' : k + ' '}${v} фт.`)
                        .join(', ')}
                    </p>
                  </div>
                )}
                {creature.senses && Object.keys(creature.senses).length > 0 && (
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '.25rem' }}>Чувства</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '.8rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
                      {Object.entries(creature.senses as Record<string, string | number>)
                        .map(([k, v]) => `${k} ${v}`)
                        .join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Иммунитеты / сопротивления */}
          {(creature.damage_resist?.length > 0 || creature.damage_immune?.length > 0) && (
            <div style={{ fontSize: '.85rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
              {creature.damage_resist?.length > 0 && (
                <p style={{ margin: 0 }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Сопротивление: </span>
                  <span style={{ color: '#fde68a', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{creature.damage_resist.join(', ')}</span>
                </p>
              )}
              {creature.damage_immune?.length > 0 && (
                <p style={{ margin: 0 }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Иммунитет: </span>
                  <span style={{ color: '#4ade80', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{creature.damage_immune.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          {/* Черты */}
          {creature.traits?.length > 0 && (
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '.5rem' }}>Черты</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {creature.traits.map((t, i) => (
                  <div key={i}>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontWeight: 600, color: 'var(--text-primary)', fontSize: '.85rem' }}>{t.name}. </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{t.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Действия */}
          {creature.actions?.length > 0 && (
            <div>
              <p style={{ color: 'var(--gold-dim)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '.5rem' }}>Действия</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {creature.actions.map((a, i) => (
                  <div key={i}>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontWeight: 600, color: 'var(--text-primary)', fontSize: '.85rem' }}>{a.name}. </span>
                    {a.attack_bonus != null && (
                      <span style={{ color: 'var(--gold)', fontSize: '.75rem', marginRight: '.25rem', fontFamily: "'Alegreya SC', serif" }}>{formatModifier(a.attack_bonus)} к попаданию</span>
                    )}
                    {a.damage && <span style={{ color: '#e88070', fontSize: '.75rem', marginRight: '.25rem', fontFamily: "'Alegreya SC', serif" }}>({a.damage})</span>}
                    <span style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{a.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Легендарные действия */}
          {creature.legendary?.length > 0 && (
            <div>
              <p style={{ color: 'var(--gold)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.15em', textTransform: 'uppercase', marginBottom: '.5rem' }}>Легендарные действия</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {creature.legendary.map((a, i) => (
                  <div key={i}>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontWeight: 600, color: 'var(--gold)', fontSize: '.85rem' }}>{a.name}. </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{a.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка добавить в бой */}
          {onAddToCombat && (
            <button
              onClick={() => onAddToCombat(creature)}
              className="btn-fantasy"
              style={{ background: 'linear-gradient(135deg, rgba(139,21,0,.4), rgba(80,0,0,.3))', borderColor: 'var(--crimson)', color: '#e88070', width: '100%', justifyContent: 'center', marginTop: '.25rem' }}
            >
              + Добавить в бой
            </button>
          )}
        </div>
      )}
    </div>
  )
}
