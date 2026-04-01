'use client'
import { useState, useMemo } from 'react'
import type { LootItem } from '@/lib/supabase/types'
import { RARITY_LABELS, ITEM_TYPE_LABELS } from '@/lib/utils/dnd'
import ItemCard from './ItemCard'

interface Props {
  items: LootItem[]
  onAdd?: (item: LootItem) => void
}

export default function LootList({ items, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rarityFilter, setRarityFilter] = useState('')
  const [attunementFilter, setAttunementFilter] = useState(false)

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && item.type !== typeFilter) return false
      if (rarityFilter && item.rarity !== rarityFilter) return false
      if (attunementFilter && !item.requires_attunement) return false
      return true
    })
  }, [items, search, typeFilter, rarityFilter, attunementFilter])

  const rarityOrder = ['common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact']

  const grouped = useMemo(() => {
    if (rarityFilter) return null
    const map = new Map<string, LootItem[]>()
    for (const item of filtered) {
      const arr = map.get(item.rarity) ?? []
      arr.push(item)
      map.set(item.rarity, arr)
    }
    return rarityOrder.filter(r => map.has(r)).map(r => [r, map.get(r)!] as const)
  }, [filtered, rarityFilter])

  return (
    <div>
      {/* Фильтры */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-6 space-y-3">
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">Все типы</option>
            {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={rarityFilter}
            onChange={e => setRarityFilter(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="">Все редкости</option>
            {Object.entries(RARITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={attunementFilter} onChange={e => setAttunementFilter(e.target.checked)} className="accent-purple-500" />
            Требует настройки
          </label>
          {(search || typeFilter || rarityFilter) && (
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setRarityFilter(''); setAttunementFilter(false) }}
              className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      <p className="text-gray-500 text-sm mb-3">
        {filtered.length === items.length ? `${items.length} предметов` : `${filtered.length} из ${items.length}`}
      </p>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Ничего не найдено</div>
      ) : grouped ? (
        grouped.map(([rarity, list]) => (
          <div key={rarity} className="mb-6">
            <h2 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-3">
              {RARITY_LABELS[rarity]} — {list.length}
            </h2>
            <div className="space-y-2">
              {list.map(item => <ItemCard key={item.id} item={item} onAdd={onAdd} />)}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-2">
          {filtered.map(item => <ItemCard key={item.id} item={item} onAdd={onAdd} />)}
        </div>
      )}
    </div>
  )
}
