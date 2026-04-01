'use client'
import { useState } from 'react'
import type { LootItem } from '@/lib/supabase/types'
import { RARITY_LABELS, RARITY_COLORS, ITEM_TYPE_LABELS } from '@/lib/utils/dnd'

interface Props {
  item: LootItem
  onAdd?: (item: LootItem) => void
}

export default function ItemCard({ item, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-white">{item.name}</h3>
            {item.requires_attunement && (
              <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">Настройка</span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-0.5">
            {ITEM_TYPE_LABELS[item.type] ?? item.type}
            {' · '}
            <span className={RARITY_COLORS[item.rarity] ?? 'text-gray-400'}>
              {RARITY_LABELS[item.rarity] ?? item.rarity}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 ml-3 flex-shrink-0 text-sm text-gray-400">
          {item.cost_gp > 0 && <span>{item.cost_gp} зм</span>}
          {item.weight > 0 && <span>{item.weight} фунт.</span>}
          <span className="text-gray-500">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-700 p-4 space-y-3">
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{item.description}</p>

          {item.properties?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.properties.map((p, i) => (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{p}</span>
              ))}
            </div>
          )}

          <div className="flex gap-4 text-sm text-gray-400">
            {item.cost_gp > 0 && <span>Цена: <span className="text-yellow-400">{item.cost_gp} зм</span></span>}
            {item.weight > 0 && <span>Вес: {item.weight} фунт.</span>}
          </div>

          {onAdd && (
            <button
              onClick={() => onAdd(item)}
              className="w-full bg-green-800 hover:bg-green-700 text-white py-2 rounded-lg text-sm transition-colors"
            >
              + В инвентарь персонажа
            </button>
          )}
        </div>
      )}
    </div>
  )
}
