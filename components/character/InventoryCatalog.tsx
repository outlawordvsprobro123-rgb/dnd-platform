'use client'
import { useState, useEffect, useRef } from 'react'
import type { LootItem, Spell, BestiaryCreature, Rarity } from '@/lib/supabase/types'

type CatalogTab = 'loot' | 'spells' | 'bestiary'

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'text-gray-400', uncommon: 'text-green-400', rare: 'text-blue-400',
  very_rare: 'text-purple-400', legendary: 'text-orange-400', artifact: 'text-red-400',
}
const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Обычный', uncommon: 'Необычный', rare: 'Редкий',
  very_rare: 'Очень редкий', legendary: 'Легендарный', artifact: 'Артефакт',
}
const LEVEL_LABEL = (l: number) => l === 0 ? 'Заговор' : `${l} ур.`

interface Props {
  characterId: string
  onAdded: (item: { name: string; description: string; weight: number; item_id?: string }) => Promise<void>
}

export function InventoryCatalog({ characterId, onAdded }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<CatalogTab>('loot')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<(LootItem | Spell | BestiaryCreature)[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch when search or tab changes
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(tab, search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, tab, open])

  // Reset search when tab changes
  useEffect(() => {
    setSearch('')
    setResults([])
    if (open) fetchResults(tab, '')
  }, [tab])

  useEffect(() => {
    if (open) fetchResults(tab, search)
  }, [open])

  async function fetchResults(t: CatalogTab, q: string) {
    setLoading(true)
    try {
      const qs = q ? `&search=${encodeURIComponent(q)}` : ''
      let url = ''
      if (t === 'loot')     url = `/api/loot?limit=20${qs}`
      if (t === 'spells')   url = `/api/spells?limit=20${qs}`
      if (t === 'bestiary') url = `/api/bestiary?limit=20${qs}`

      const res = await fetch(url)
      if (!res.ok) { setResults([]); return }
      const data = await res.json()
      if (t === 'loot')     setResults(data.items ?? [])
      if (t === 'spells')   setResults(data.spells ?? [])
      if (t === 'bestiary') setResults(data.creatures ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function addItem(entry: LootItem | Spell | BestiaryCreature) {
    setAdding(entry.id)
    try {
      let name = ''
      let description = ''
      let weight = 0
      let item_id: string | undefined

      if (tab === 'loot') {
        const item = entry as LootItem
        name = item.name
        description = `${RARITY_LABEL[item.rarity]}. ${item.description}`.slice(0, 300)
        weight = item.weight ?? 0
        item_id = item.id
      } else if (tab === 'spells') {
        const spell = entry as Spell
        name = `📜 ${spell.name}`
        description = `${LEVEL_LABEL(spell.level)} · ${spell.casting_time} · ${spell.range}. ${spell.description}`.slice(0, 300)
        weight = 0
      } else {
        const creature = entry as BestiaryCreature
        name = `🐾 ${creature.name}`
        description = `КО ${creature.cr} · ${creature.type} · HP ${creature.hp} · КД ${creature.ac}`.slice(0, 300)
        weight = 0
      }

      await onAdded({ name, description, weight, item_id })
      setAddedIds(prev => new Set([...prev, entry.id]))
      setTimeout(() => setAddedIds(prev => { const s = new Set(prev); s.delete(entry.id); return s }), 2000)
    } finally {
      setAdding(null)
    }
  }

  const TABS: { id: CatalogTab; label: string }[] = [
    { id: 'loot', label: '💎 Предметы' },
    { id: 'spells', label: '✨ Заклинания' },
    { id: 'bestiary', label: '🐉 Бестиарий' },
  ]

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800 border border-gray-700 hover:border-purple-600 rounded-xl text-sm text-gray-300 hover:text-white transition-colors"
      >
        <span>📦 Добавить из каталога</span>
        <span className="text-gray-500 text-xs">{open ? '▲ Скрыть' : '▼ Открыть'}</span>
      </button>

      {open && (
        <div className="mt-2 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          {/* Вкладки */}
          <div className="flex border-b border-gray-700">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${tab === t.id ? 'bg-gray-700 text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Поиск */}
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={
                tab === 'loot' ? 'Поиск предметов...' :
                tab === 'spells' ? 'Поиск заклинаний...' :
                'Поиск существ...'
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Результаты */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-700">
            {loading && (
              <div className="py-6 text-center text-gray-500 text-sm">Загрузка...</div>
            )}
            {!loading && results.length === 0 && (
              <div className="py-6 text-center text-gray-500 text-sm">Ничего не найдено</div>
            )}
            {!loading && results.map(entry => {
              const isAdded = addedIds.has(entry.id)
              const isAdding = adding === entry.id
              const isExpanded = expandedId === entry.id

              return (
                <div key={entry.id} className="border-b border-gray-700 last:border-0">
                  <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-750 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <div className="flex-1 min-w-0">
                      {tab === 'loot' && (() => {
                        const item = entry as LootItem
                        return (
                          <>
                            <p className="text-sm text-white">{item.name}</p>
                            <p className="text-xs text-gray-500">
                              <span className={RARITY_COLOR[item.rarity]}>{RARITY_LABEL[item.rarity]}</span>
                              {item.weight > 0 && ` · ${item.weight} фнт`}
                              {item.cost_gp > 0 && ` · ${item.cost_gp} зм`}
                            </p>
                          </>
                        )
                      })()}
                      {tab === 'spells' && (() => {
                        const spell = entry as Spell
                        return (
                          <>
                            <p className="text-sm text-white">{spell.name}</p>
                            <p className="text-xs text-gray-500">
                              {LEVEL_LABEL(spell.level)} · {spell.casting_time} · {spell.range}
                            </p>
                          </>
                        )
                      })()}
                      {tab === 'bestiary' && (() => {
                        const creature = entry as BestiaryCreature
                        return (
                          <>
                            <p className="text-sm text-white">{creature.name}</p>
                            <p className="text-xs text-gray-500">
                              КО {creature.cr} · {creature.type} · HP {creature.hp} · КД {creature.ac}
                            </p>
                          </>
                        )
                      })()}
                    </div>

                    <span className="text-gray-600 text-xs flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>

                    <button
                      onClick={e => { e.stopPropagation(); addItem(entry) }}
                      disabled={isAdding || isAdded}
                      className={`flex-shrink-0 w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                        isAdded
                          ? 'bg-green-700 text-green-200 cursor-default'
                          : 'bg-purple-700 hover:bg-purple-600 text-white disabled:opacity-50'
                      }`}
                    >
                      {isAdded ? '✓' : isAdding ? '…' : '+'}
                    </button>
                  </div>

                  {/* Раскрытое описание */}
                  {isExpanded && (
                    <div className="px-3 pb-3 text-xs text-gray-300 leading-relaxed bg-gray-900 border-t border-gray-700">
                      {tab === 'loot' && (() => {
                        const item = entry as LootItem
                        return (
                          <div className="pt-2 space-y-1">
                            {item.requires_attunement && <p className="text-yellow-500">Требует настройки</p>}
                            {item.description && <p>{item.description}</p>}
                          </div>
                        )
                      })()}
                      {tab === 'spells' && (() => {
                        const spell = entry as Spell
                        const compParts = [
                          spell.components?.v ? 'В' : '',
                          spell.components?.s ? 'С' : '',
                          spell.components?.m ? `М (${spell.components.m})` : '',
                        ].filter(Boolean).join(', ')
                        return (
                          <div className="pt-2 space-y-1">
                            <p className="text-gray-400">
                              {compParts && <><span className="text-gray-300">Компоненты:</span> {compParts} · </>}
                              <span className="text-gray-300">Длительность:</span> {spell.duration}
                            </p>
                            {spell.description && <p>{spell.description}</p>}
                            {spell.higher_levels && <p className="text-purple-300"><span className="text-gray-300">На высоких уровнях:</span> {spell.higher_levels}</p>}
                          </div>
                        )
                      })()}
                      {tab === 'bestiary' && (() => {
                        const creature = entry as BestiaryCreature
                        const speedParts = Object.entries(creature.speed ?? {})
                          .filter(([, v]) => v)
                          .map(([k, v]) => `${k} ${v} фт`)
                          .join(', ')
                        const sensesParts = Object.entries(creature.senses ?? {})
                          .map(([k, v]) => `${k} ${v}`)
                          .join(', ')
                        return (
                          <div className="pt-2 space-y-1">
                            <p><span className="text-gray-400">Размер:</span> {creature.size} · <span className="text-gray-400">Тип:</span> {creature.type}</p>
                            {speedParts && <p><span className="text-gray-400">Скорость:</span> {speedParts}</p>}
                            {sensesParts && <p><span className="text-gray-400">Чувства:</span> {sensesParts}</p>}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
