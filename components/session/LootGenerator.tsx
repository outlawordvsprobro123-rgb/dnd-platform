'use client'

import { useState, useEffect, useCallback } from 'react'
import { LootItem, Rarity } from '@/lib/supabase/types'

// ── CR → rarity weight pools ──────────────────────────────────────────────────

type RarityWeight = { rarity: Rarity; weight: number }

function getRarityPool(cr: number): RarityWeight[] {
  if (cr <= 4) {
    return [
      { rarity: 'common',   weight: 60 },
      { rarity: 'uncommon', weight: 30 },
      { rarity: 'rare',     weight: 10 },
    ]
  }
  if (cr <= 10) {
    return [
      { rarity: 'common',    weight: 20 },
      { rarity: 'uncommon',  weight: 50 },
      { rarity: 'rare',      weight: 25 },
      { rarity: 'very_rare', weight:  5 },
    ]
  }
  if (cr <= 16) {
    return [
      { rarity: 'uncommon',  weight: 10 },
      { rarity: 'rare',      weight: 40 },
      { rarity: 'very_rare', weight: 40 },
      { rarity: 'legendary', weight: 10 },
    ]
  }
  return [
    { rarity: 'rare',      weight: 20 },
    { rarity: 'very_rare', weight: 40 },
    { rarity: 'legendary', weight: 30 },
    { rarity: 'artifact',  weight: 10 },
  ]
}

function pickWeightedRarity(pool: RarityWeight[]): Rarity {
  const total = pool.reduce((s, p) => s + p.weight, 0)
  let roll = Math.random() * total
  for (const entry of pool) {
    roll -= entry.weight
    if (roll <= 0) return entry.rarity
  }
  return pool[pool.length - 1].rarity
}

// ── Rarity display helpers ────────────────────────────────────────────────────

const RARITY_COLOR: Record<Rarity, string> = {
  common:    'text-gray-400',
  uncommon:  'text-green-400',
  rare:      'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact:  'text-red-400',
}

const RARITY_LABEL: Record<Rarity, string> = {
  common:    'Обычный',
  uncommon:  'Необычный',
  rare:      'Редкий',
  very_rare: 'Очень редкий',
  legendary: 'Легендарный',
  artifact:  'Артефакт',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Character {
  id: string
  name: string
}

interface GivenFlash {
  itemId: string
  message: string
}

interface Props {
  sessionId: string
  isMaster: boolean
}

export function LootGenerator({ sessionId, isMaster }: Props) {
  const [cr, setCr] = useState(5)
  const [count, setCount] = useState(3)
  const [generated, setGenerated] = useState<LootItem[]>([])
  const [loading, setLoading] = useState(false)
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedChar, setSelectedChar] = useState<Record<string, string>>({})
  const [flashes, setFlashes] = useState<GivenFlash[]>([])
  const [givingId, setGivingId] = useState<string | null>(null)

  // Fetch session characters on mount
  useEffect(() => {
    async function loadCharacters() {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/players`)
        if (!res.ok) return
        const data = await res.json()
        // Normalise — API may return players with nested character or just { id, name }
        const chars: Character[] = Array.isArray(data)
          ? data
              .filter((p: { character?: { id: string; name: string }; id?: string; name?: string }) => p.character || p.name)
              .map((p: { character?: { id: string; name: string }; id?: string; name?: string }) =>
                p.character
                  ? { id: p.character.id, name: p.character.name }
                  : { id: p.id as string, name: p.name as string }
              )
          : []
        setCharacters(chars)
      } catch {
        // ignore
      }
    }
    loadCharacters()
  }, [sessionId])

  const generate = useCallback(async () => {
    setLoading(true)
    setGenerated([])
    try {
      const pool = getRarityPool(cr)

      // Determine which rarities we need
      const neededRarities = new Set<Rarity>()
      const picks: Rarity[] = []
      for (let i = 0; i < count; i++) {
        const rarity = pickWeightedRarity(pool)
        picks.push(rarity)
        neededRarities.add(rarity)
      }

      // Fetch each unique rarity pool once
      const rarityCache: Record<string, LootItem[]> = {}
      await Promise.all(
        Array.from(neededRarities).map(async rarity => {
          try {
            const res = await fetch(`/api/loot?rarity=${rarity}&limit=50`)
            if (res.ok) {
              const data = await res.json()
              rarityCache[rarity] = Array.isArray(data) ? data : (data.items ?? [])
            } else {
              rarityCache[rarity] = []
            }
          } catch {
            rarityCache[rarity] = []
          }
        })
      )

      // Randomly select one item per pick from the fetched pool
      const items: LootItem[] = []
      for (const rarity of picks) {
        const pool = rarityCache[rarity] ?? []
        if (pool.length === 0) continue
        const item = pool[Math.floor(Math.random() * pool.length)]
        // Avoid exact duplicates if pool has enough variety
        if (!items.find(i => i.id === item.id) || pool.length === 1) {
          items.push(item)
        } else {
          // Try once more to find a different item
          const alt = pool[Math.floor(Math.random() * pool.length)]
          items.push(alt)
        }
      }

      setGenerated(items)
    } finally {
      setLoading(false)
    }
  }, [cr, count])

  const giveItem = useCallback(async (item: LootItem) => {
    const characterId = selectedChar[item.id]
    if (!characterId) return

    setGivingId(item.id)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/give/loot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          item_id: item.id,
          item_name: item.name,
          quantity: 1,
        }),
      })

      const flash: GivenFlash = {
        itemId: item.id,
        message: res.ok ? 'Выдано!' : 'Ошибка',
      }
      setFlashes(prev => [...prev.filter(f => f.itemId !== item.id), flash])
      setTimeout(() => {
        setFlashes(prev => prev.filter(f => f.itemId !== item.id))
      }, 2500)
    } catch {
      const flash: GivenFlash = { itemId: item.id, message: 'Ошибка' }
      setFlashes(prev => [...prev.filter(f => f.itemId !== item.id), flash])
      setTimeout(() => {
        setFlashes(prev => prev.filter(f => f.itemId !== item.id))
      }, 2500)
    } finally {
      setGivingId(null)
    }
  }, [selectedChar, sessionId])

  const crRangeLabel = (v: number) => {
    if (v <= 4)  return `КО 0–4 (обычное/необычное)`
    if (v <= 10) return `КО 5–10 (необычное/редкое)`
    if (v <= 16) return `КО 11–16 (редкое/очень редкое)`
    return `КО 17+ (очень редкое/легендарное)`
  }

  if (!isMaster) return null

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 space-y-5">
      <h2 className="text-lg font-bold text-gray-100">Генератор добычи</h2>

      {/* Controls */}
      <div className="space-y-3">
        {/* CR slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm text-gray-300">
              Уровень угрозы (КО):
              <span className="ml-2 font-semibold text-purple-400">{cr}</span>
            </label>
          </div>
          <input
            type="range"
            min={0}
            max={30}
            value={cr}
            onChange={e => setCr(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <p className="text-xs text-gray-500 mt-1">{crRangeLabel(cr)}</p>
        </div>

        {/* Count */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-300">Количество предметов:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={e => setCount(Math.min(10, Math.max(1, Number(e.target.value))))}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={loading}
        className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Генерация...
          </>
        ) : (
          'Генерировать'
        )}
      </button>

      {/* Generated items list */}
      {generated.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Сгенерированные предметы</h3>
          {generated.map((item, idx) => {
            const flash = flashes.find(f => f.itemId === item.id)
            const charId = selectedChar[item.id] ?? ''

            return (
              <div
                key={`${item.id}-${idx}`}
                className="bg-gray-700 rounded-lg p-3 border border-gray-600 space-y-2"
              >
                {/* Item header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-100 truncate">{item.name}</p>
                    <div className="flex gap-2 items-center mt-0.5 flex-wrap">
                      <span className={`text-xs font-medium ${RARITY_COLOR[item.rarity]}`}>
                        {RARITY_LABEL[item.rarity]}
                      </span>
                      <span className="text-xs text-gray-500">{item.type}</span>
                      {item.requires_attunement && (
                        <span className="text-xs text-yellow-500">настройка</span>
                      )}
                    </div>
                  </div>
                  {item.cost_gp > 0 && (
                    <span className="text-xs text-yellow-400 flex-shrink-0 font-mono">
                      {item.cost_gp} зм
                    </span>
                  )}
                </div>

                {/* Description snippet */}
                {item.description && (
                  <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                )}

                {/* Give to character */}
                <div className="flex gap-2 items-center pt-1">
                  <select
                    value={charId}
                    onChange={e => setSelectedChar(prev => ({ ...prev, [item.id]: e.target.value }))}
                    className="flex-1 bg-gray-600 border border-gray-500 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="">— выбрать персонажа —</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => giveItem(item)}
                    disabled={!charId || givingId === item.id}
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex-shrink-0"
                  >
                    {givingId === item.id ? '...' : 'Выдать →'}
                  </button>
                </div>

                {/* Flash message */}
                {flash && (
                  <p className={`text-xs font-semibold ${flash.message === 'Выдано!' ? 'text-green-400' : 'text-red-400'}`}>
                    {flash.message}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {generated.length === 0 && !loading && (
        <p className="text-sm text-gray-500 text-center py-4">
          Настройте параметры и нажмите «Генерировать»
        </p>
      )}
    </div>
  )
}
