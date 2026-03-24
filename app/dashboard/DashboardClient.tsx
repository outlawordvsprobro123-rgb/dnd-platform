'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, Character } from '@/lib/supabase/types'
import { STAT_LABELS, getModifier, formatModifier } from '@/lib/utils/dnd'

interface Props {
  sessions: Session[]
  characters: Character[]
  userId: string
}

export default function DashboardClient({ sessions, characters, userId }: Props) {
  const router = useRouter()
  const [showCreateSession, setShowCreateSession] = useState(false)
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally { setLoading(false) }
  }

  async function joinSession() {
    if (!joinCode.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/sessions/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode.toUpperCase() }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/session/${joinCode.toUpperCase()}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally { setLoading(false) }
  }

  const statusLabel = (s: Session['status']) => ({ waiting: 'Ожидание', active: 'Активна', paused: 'Пауза', ended: 'Завершена' })[s]
  const statusColor = (s: Session['status']) => ({ waiting: 'text-yellow-400', active: 'text-green-400', paused: 'text-blue-400', ended: 'text-gray-500' })[s]

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-purple-400">⚔️ DnD Companion</h1>
          <div className="flex gap-3">
            <button onClick={() => setShowJoin(true)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">Присоединиться</button>
            <button onClick={() => setShowCreateSession(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">+ Новая кампания</button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Сессии */}
          <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Мои кампании</h2>
            {sessions.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <p className="text-gray-500">Нет кампаний</p>
                <button onClick={() => setShowCreateSession(true)} className="mt-3 text-purple-400 hover:text-purple-300 text-sm">+ Создать первую</button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} onClick={() => router.push(`/session/${session.code}`)} className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-4 cursor-pointer transition-colors hover:border-purple-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-white">{session.name}</h3>
                        <p className="text-gray-500 text-sm mt-1">Код: <span className="text-purple-400 font-mono">{session.code}</span></p>
                      </div>
                      <span className={`text-xs font-medium ${statusColor(session.status)}`}>{statusLabel(session.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Персонажи */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-200">Персонажи</h2>
              <button onClick={() => router.push('/character/new')} className="text-purple-400 hover:text-purple-300 text-sm">+ Создать</button>
            </div>
            {characters.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                <p className="text-gray-500">Нет персонажей</p>
                <button onClick={() => router.push('/character/new')} className="mt-3 text-purple-400 hover:text-purple-300 text-sm">+ Создать первого</button>
              </div>
            ) : (
              <div className="space-y-3">
                {characters.map(char => (
                  <div key={char.id} onClick={() => router.push(`/character/${char.id}`)} className="bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl p-4 cursor-pointer transition-colors hover:border-purple-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-white">{char.name}</h3>
                        <p className="text-gray-400 text-sm">{char.race} · {char.class} · {char.level} ур.</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-red-400">{char.hp_current}/{char.hp_max} HP</p>
                        <p className="text-gray-500">КД {char.armor_class}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Модал создания сессии */}
        {showCreateSession && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Новая кампания</h3>
              <input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Название кампании" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white mb-4 focus:outline-none focus:border-purple-500" onKeyDown={e => e.key === 'Enter' && createSession()} />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowCreateSession(false); setError('') }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Отмена</button>
                <button onClick={createSession} disabled={loading || !sessionName.trim()} className="flex-1 bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg">{loading ? 'Создание...' : 'Создать'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Модал присоединения */}
        {showJoin && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">Присоединиться к сессии</h3>
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="Код сессии (ABC-123)" className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono tracking-widest text-center mb-4 focus:outline-none focus:border-purple-500" maxLength={7} onKeyDown={e => e.key === 'Enter' && joinSession()} />
              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setShowJoin(false); setError('') }} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Отмена</button>
                <button onClick={joinSession} disabled={loading || joinCode.length < 7} className="flex-1 bg-purple-600 disabled:opacity-50 text-white py-2 rounded-lg">{loading ? 'Поиск...' : 'Войти'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
