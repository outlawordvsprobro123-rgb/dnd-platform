'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Character } from '@/lib/supabase/types'
import { getModifier, formatModifier } from '@/lib/utils/dnd'

interface Props {
  sessions: Session[]
  characters: Character[]
  userId: string
}

const STATUS_LABEL: Record<string, string> = { waiting: 'Ожидание', active: 'Активна', paused: 'Пауза', ended: 'Завершена' }
const STATUS_COLOR: Record<string, string> = { waiting: '#c9a84c', active: '#4ade80', paused: '#60a5fa', ended: '#7a5c38' }

export default function DashboardClient({ sessions, characters }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function createSession() {
    if (!sessionName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/sessions/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: sessionName }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/session/${data.session.code}`)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка') }
    finally { setLoading(false) }
  }

  async function joinSession() {
    if (!joinCode.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/sessions/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.toUpperCase() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/session/${joinCode.toUpperCase()}`)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Ошибка') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Герой-баннер */}
      <div style={{
        background: 'linear-gradient(180deg, rgba(139,21,0,.12) 0%, transparent 100%)',
        borderBottom: '1px solid #3d2a10',
        padding: '2rem 2rem 1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ color: '#6b4f1e', fontSize: '1rem', letterSpacing: '.4em', marginBottom: '.75rem' }}>✦ ✦ ✦</div>
        <h1 style={{ fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif", fontSize: '2.2rem', fontWeight: 900, color: '#c9a84c', letterSpacing: '.08em', marginBottom: '.5rem' }}>
          ВАРНТАЛ
        </h1>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.35em', color: '#7a5c38', textTransform: 'uppercase' }}>
          Между вздохами · D&D 5e Homebrew
        </p>
        <div className="divider-gold-short" style={{ marginTop: '1.25rem' }} />
      </div>

      {/* Быстрые действия */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '.75rem', padding: '1.25rem 2rem', borderBottom: '1px solid #3d2a10' }}>
        <button className="btn-fantasy btn-crimson" onClick={() => setShowCreate(true)}>
          ✦ Новая кампания
        </button>
        <button className="btn-fantasy btn-ghost" onClick={() => setShowJoin(true)}>
          ◈ Присоединиться
        </button>
        <a href="/campaign/import" className="btn-fantasy btn-ghost" style={{ textDecoration: 'none' }}>
          ⬆ Импорт Варнтала
        </a>
      </div>

      {/* Основной контент */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* Кампании */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.3em', color: '#8b6914', textTransform: 'uppercase' }}>Мои кампании</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #3d2a10, transparent)' }} />
          </div>

          {sessions.length === 0 ? (
            <div className="card card-gold" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '.75rem', opacity: .4 }}>⚔</div>
              <p style={{ color: '#7a5c38', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '1rem', fontStyle: 'italic' }}>Нет кампаний</p>
              <button className="btn-fantasy btn-gold" style={{ marginTop: '1rem', fontSize: '.65rem' }} onClick={() => setShowCreate(true)}>
                Начать кампанию
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/session/${s.code}`)}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    cursor: 'pointer',
                    borderColor: '#3d2a10',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b4f1e'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(139,105,20,.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3d2a10'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: '#f4e8cc', marginBottom: '.3rem' }}>{s.name}</h3>
                      <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.15em', color: '#7a5c38' }}>
                        КОД: <span style={{ color: '#c9a84c', fontFamily: 'monospace', letterSpacing: '.2em' }}>{s.code}</span>
                      </p>
                    </div>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.1em', color: STATUS_COLOR[s.status] ?? '#7a5c38', textTransform: 'uppercase' }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Персонажи */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.25rem' }}>
            <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.3em', color: '#8b6914', textTransform: 'uppercase' }}>Персонажи</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #3d2a10, transparent)' }} />
            <button
              className="btn-fantasy btn-ghost"
              style={{ fontSize: '.6rem', padding: '.3rem .75rem' }}
              onClick={() => router.push('/character/new')}
            >+ Создать</button>
          </div>

          {characters.length === 0 ? (
            <div className="card card-gold" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '.75rem', opacity: .4 }}>✧</div>
              <p style={{ color: '#7a5c38', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '1rem', fontStyle: 'italic' }}>Нет персонажей</p>
              <button className="btn-fantasy btn-gold" style={{ marginTop: '1rem', fontSize: '.65rem' }} onClick={() => router.push('/character/new')}>
                Создать персонажа
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {characters.map(char => (
                <div
                  key={char.id}
                  onClick={() => router.push(`/character/${char.id}`)}
                  className="card"
                  style={{ padding: '1rem 1.25rem', cursor: 'pointer', borderColor: '#3d2a10', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#6b4f1e'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(139,105,20,.1)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3d2a10'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: '#f4e8cc', marginBottom: '.3rem' }}>{char.name}</h3>
                      <p style={{ color: '#7a5c38', fontSize: '.85rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
                        {char.race} · {char.class} · {char.level} ур.
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: "'Alegreya SC', serif", fontSize: '.65rem' }}>
                      <p style={{ color: '#c0392b', letterSpacing: '.08em' }}>{char.hp_current}/{char.hp_max} HP</p>
                      <p style={{ color: '#7a5c38', marginTop: '.2rem' }}>КД {char.armor_class}</p>
                    </div>
                  </div>
                  {/* Мини статы */}
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
                    {(['str','dex','con','int','wis','cha'] as const).map(stat => (
                      <div key={stat} style={{ textAlign: 'center', minWidth: '2.5rem' }}>
                        <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.5rem', letterSpacing: '.1em', color: '#6b4f1e', textTransform: 'uppercase' }}>{stat}</div>
                        <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', color: '#c9a884' }}>{formatModifier(getModifier((char.stats as Record<string, number>)?.[stat] ?? 10))}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Модал создания сессии */}
      {showCreate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,.75)' }} onClick={() => { setShowCreate(false); setError('') }}>
          <div className="w-full max-w-md fade-up" style={{ background: 'linear-gradient(160deg, #1e1508, #130d04)', border: '1px solid #6b4f1e', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 0 40px rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1rem', color: '#c9a84c', letterSpacing: '.08em', marginBottom: '1.25rem' }}>Новая кампания</h3>
            <input
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="Название кампании"
              className="input-fantasy"
              style={{ marginBottom: '1rem' }}
              onKeyDown={e => e.key === 'Enter' && createSession()}
            />
            {error && <p style={{ color: '#e88070', fontSize: '.9rem', marginBottom: '.75rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn-fantasy btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowCreate(false); setError('') }}>Отмена</button>
              <button className="btn-fantasy btn-crimson" style={{ flex: 1, justifyContent: 'center' }} disabled={loading || !sessionName.trim()} onClick={createSession}>
                {loading ? '...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал присоединения */}
      {showJoin && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,.75)' }} onClick={() => { setShowJoin(false); setError('') }}>
          <div className="w-full max-w-md fade-up" style={{ background: 'linear-gradient(160deg, #1e1508, #130d04)', border: '1px solid #6b4f1e', borderRadius: '.75rem', padding: '2rem', boxShadow: '0 0 40px rgba(0,0,0,.8)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1rem', color: '#c9a84c', letterSpacing: '.08em', marginBottom: '1.25rem' }}>Присоединиться к сессии</h3>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC-123"
              className="input-fantasy"
              style={{ marginBottom: '1rem', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '.3em', fontSize: '1.2rem' }}
              maxLength={7}
              onKeyDown={e => e.key === 'Enter' && joinSession()}
            />
            {error && <p style={{ color: '#e88070', fontSize: '.9rem', marginBottom: '.75rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '.75rem' }}>
              <button className="btn-fantasy btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowJoin(false); setError('') }}>Отмена</button>
              <button className="btn-fantasy btn-gold" style={{ flex: 1, justifyContent: 'center' }} disabled={loading || joinCode.length < 7} onClick={joinSession}>
                {loading ? '...' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
