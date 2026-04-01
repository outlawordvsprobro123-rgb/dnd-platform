'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { BestiaryCreature } from '@/lib/supabase/types'

const XP_THRESHOLDS: Record<number, [number, number, number, number]> = {
  1:  [25,   50,   75,   100],
  2:  [50,   100,  150,  200],
  3:  [75,   150,  225,  400],
  4:  [125,  250,  375,  500],
  5:  [250,  500,  750,  1100],
  6:  [300,  600,  900,  1400],
  7:  [350,  750,  1100, 1700],
  8:  [450,  900,  1400, 2100],
  9:  [550,  1100, 1600, 2400],
  10: [600,  1200, 1900, 2800],
  11: [800,  1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700],
}

const CR_XP: Record<string, number> = {
  '0': 10, '0.125': 25, '0.25': 50, '0.5': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000,
  '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000, '30': 155000,
}

function getMultiplier(totalCount: number): number {
  if (totalCount === 1) return 1
  if (totalCount === 2) return 1.5
  if (totalCount <= 6) return 2
  if (totalCount <= 10) return 2.5
  if (totalCount <= 14) return 3
  return 4
}

function getMultiplierLabel(totalCount: number): string {
  if (totalCount === 1) return 'x1'
  if (totalCount === 2) return 'x1.5'
  if (totalCount <= 6) return 'x2'
  if (totalCount <= 10) return 'x2.5'
  if (totalCount <= 14) return 'x3'
  return 'x4'
}

function formatCR(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return String(cr)
}

function crToKey(cr: number): string {
  return String(cr)
}

type MonsterEntry = {
  id: string
  name: string
  cr: number
  count: number
}

type Difficulty = 'Тривиально' | 'Лёгкий' | 'Средний' | 'Тяжёлый' | 'Смертельный'

interface Props {
  sessionId: string
  isMaster: boolean
}

export function EncounterBuilder({ sessionId, isMaster }: Props) {
  const [partySize, setPartySize] = useState(4)
  const [partyLevel, setPartyLevel] = useState(5)
  const [monsters, setMonsters] = useState<MonsterEntry[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<BestiaryCreature[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCreatures = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowSearch(false)
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/bestiary?search=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: BestiaryCreature[] = await res.json()
        setSearchResults(data)
        setShowSearch(true)
      }
    } catch {
      // ignore
    } finally {
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchCreatures(search)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search, fetchCreatures])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addMonster = useCallback((creature: BestiaryCreature) => {
    setMonsters(prev => {
      const existing = prev.find(m => m.id === creature.id)
      if (existing) {
        return prev.map(m => m.id === creature.id ? { ...m, count: m.count + 1 } : m)
      }
      return [...prev, { id: creature.id, name: creature.name, cr: creature.cr, count: 1 }]
    })
    setSearch('')
    setShowSearch(false)
    setSearchResults([])
  }, [])

  const changeCount = useCallback((id: string, delta: number) => {
    setMonsters(prev =>
      prev
        .map(m => m.id === id ? { ...m, count: m.count + delta } : m)
        .filter(m => m.count > 0)
    )
  }, [])

  const removeMonster = useCallback((id: string) => {
    setMonsters(prev => prev.filter(m => m.id !== id))
  }, [])

  if (!isMaster) return null

  // Calculations
  const totalMonsterCount = monsters.reduce((sum, m) => sum + m.count, 0)
  const totalRawXP = monsters.reduce((sum, m) => {
    const xp = CR_XP[crToKey(m.cr)] ?? 0
    return sum + xp * m.count
  }, 0)
  const multiplier = getMultiplier(totalMonsterCount)
  const adjustedXP = Math.floor(totalRawXP * multiplier)

  const thresholds = XP_THRESHOLDS[partyLevel] ?? XP_THRESHOLDS[1]
  const [easyT, mediumT, hardT, deadlyT] = thresholds.map(t => t * partySize)

  let difficulty: Difficulty = 'Тривиально'
  if (adjustedXP >= deadlyT) difficulty = 'Смертельный'
  else if (adjustedXP >= hardT) difficulty = 'Тяжёлый'
  else if (adjustedXP >= mediumT) difficulty = 'Средний'
  else if (adjustedXP >= easyT) difficulty = 'Лёгкий'

  const difficultyColor: Record<Difficulty, string> = {
    'Тривиально': 'text-gray-400',
    'Лёгкий':    'text-green-400',
    'Средний':   'text-yellow-400',
    'Тяжёлый':  'text-orange-400',
    'Смертельный': 'text-red-400',
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-100">Конструктор столкновений</h2>

      {/* Party config */}
      <div className="flex gap-4 items-center flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          Игроков:
          <input
            type="number"
            min={1}
            max={8}
            value={partySize}
            onChange={e => setPartySize(Math.min(8, Math.max(1, Number(e.target.value))))}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          Уровень:
          <input
            type="number"
            min={1}
            max={20}
            value={partyLevel}
            onChange={e => setPartyLevel(Math.min(20, Math.max(1, Number(e.target.value))))}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
          />
        </label>
      </div>

      {/* Difficulty thresholds */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs text-gray-400 self-center mr-1">Пороги XP:</span>
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-900/40 text-green-400 border border-green-700">
          Лёгкий {easyT.toLocaleString()}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-yellow-900/40 text-yellow-400 border border-yellow-700">
          Средний {mediumT.toLocaleString()}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-900/40 text-orange-400 border border-orange-700">
          Тяжёлый {hardT.toLocaleString()}
        </span>
        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-400 border border-red-700">
          Смертельный {deadlyT.toLocaleString()}
        </span>
      </div>

      {/* Monster search */}
      <div ref={searchRef} className="relative">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Найти существо..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          {searchLoading && (
            <div className="flex items-center px-2">
              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {showSearch && searchResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map(creature => (
              <button
                key={creature.id}
                onClick={() => addMonster(creature)}
                className="w-full text-left px-3 py-2 hover:bg-gray-600 transition-colors flex items-center justify-between gap-2 border-b border-gray-600 last:border-0"
              >
                <span className="text-sm text-gray-100 truncate">{creature.name}</span>
                <div className="flex gap-2 items-center flex-shrink-0">
                  <span className="text-xs text-gray-400">{creature.type}</span>
                  <span className="text-xs font-mono text-purple-400">КО {formatCR(creature.cr)}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {showSearch && searchResults.length === 0 && !searchLoading && search.trim() && (
          <div className="absolute z-20 top-full mt-1 w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
            <p className="text-sm text-gray-400">Ничего не найдено</p>
          </div>
        )}
      </div>

      {/* Monster list */}
      {monsters.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300">Существа в столкновении</h3>
          <div className="space-y-1">
            {monsters.map(m => {
              const xpEach = CR_XP[crToKey(m.cr)] ?? 0
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-100 truncate block">{m.name}</span>
                    <span className="text-xs text-gray-400">
                      КО {formatCR(m.cr)} · {xpEach.toLocaleString()} XP каждый
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => changeCount(m.id, -1)}
                      className="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      -
                    </button>
                    <span className="w-6 text-center text-sm text-gray-100 font-semibold">{m.count}</span>
                    <button
                      onClick={() => changeCount(m.id, 1)}
                      className="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-bold flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeMonster(m.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-sm ml-1"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* XP summary */}
      {monsters.length > 0 && (
        <div className="bg-gray-700/50 rounded-lg px-4 py-3 space-y-1 border border-gray-600">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Базовый XP:</span>
            <span className="text-gray-200 font-mono">{totalRawXP.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Множитель ({totalMonsterCount} сущ.):</span>
            <span className="text-gray-200 font-mono">{getMultiplierLabel(totalMonsterCount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-600 pt-1 mt-1">
            <span className="text-gray-300">Скорректированный XP:</span>
            <span className="text-purple-400 font-mono">{adjustedXP.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Difficulty indicator */}
      <div className="text-center py-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Сложность</p>
        <p className={`text-3xl font-extrabold tracking-wide ${difficultyColor[difficulty]}`}>
          {difficulty}
        </p>
      </div>

      {/* Start combat button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={monsters.length === 0}
        className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        Начать бой
      </button>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-80 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-100 mb-2">Начать столкновение?</h3>
            <p className="text-sm text-gray-400 mb-4">
              {totalMonsterCount} существ(о) · {adjustedXP.toLocaleString()} XP ·{' '}
              <span className={difficultyColor[difficulty]}>{difficulty}</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('[EncounterBuilder] Начать бой', {
                    sessionId,
                    partySize,
                    partyLevel,
                    monsters,
                    totalRawXP,
                    adjustedXP,
                    difficulty,
                  })
                  setShowConfirm(false)
                }}
                className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors"
              >
                Подтвердить
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold text-sm transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
