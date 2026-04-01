'use client'
import { useState } from 'react'

type ImportResult = {
  creatures?: { inserted?: number; error?: string }
  loot?: { inserted?: number; error?: string }
  spells?: { inserted?: number; error?: string }
}

export default function CampaignImportClient() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [results, setResults] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  async function runImport() {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/campaign/seed', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Неизвестная ошибка')
      setResults(data.results)
      setStatus('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">📜</div>
          <h1 className="text-xl font-bold text-white">Импорт кампании Варнтал</h1>
          <p className="text-gray-400 text-sm mt-2">
            Загрузит в базу данных всех NPC, магические предметы и заклинания из книги кампании.
          </p>
        </div>

        <div className="space-y-2 mb-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚔️</span>
            <span>8 существ — Каэл, Сарвэн, Тюремщик и другие</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-purple-400">💎</span>
            <span>7 предметов — 4 Осколка + Жезл Заточения и другие</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-400">✨</span>
            <span>4 заклинания — homebrew механики кампании</span>
          </div>
        </div>

        {status === 'idle' && (
          <button
            onClick={runImport}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-xl font-medium transition-colors"
          >
            Импортировать контент Варнтала
          </button>
        )}

        {status === 'loading' && (
          <div className="text-center py-4 text-gray-400">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mb-2" />
            <p>Загрузка...</p>
          </div>
        )}

        {status === 'done' && results && (
          <div className="space-y-3">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-green-400 font-medium">Импорт завершён!</p>
              <div className="text-gray-300 space-y-1">
                {results.creatures?.error ? (
                  <p className="text-red-400">⚔️ Существа: {results.creatures.error}</p>
                ) : (
                  <p>⚔️ Существа: добавлено {results.creatures?.inserted ?? 0}</p>
                )}
                {results.loot?.error ? (
                  <p className="text-red-400">💎 Предметы: {results.loot.error}</p>
                ) : (
                  <p>💎 Предметы: добавлено {results.loot?.inserted ?? 0}</p>
                )}
                {results.spells?.error ? (
                  <p className="text-red-400">✨ Заклинания: {results.spells.error}</p>
                ) : (
                  <p>✨ Заклинания: добавлено {results.spells?.inserted ?? 0}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/bestiary" className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors">
                Бестиарий
              </a>
              <a href="/loot" className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors">
                Предметы
              </a>
              <a href="/spells" className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm transition-colors">
                Заклинания
              </a>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm text-red-400">
              {error}
            </div>
            <button
              onClick={runImport}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl text-sm transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}

        <div className="mt-4 text-center">
          <a href="/dashboard" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
            ← Назад на главную
          </a>
        </div>
      </div>
    </div>
  )
}
