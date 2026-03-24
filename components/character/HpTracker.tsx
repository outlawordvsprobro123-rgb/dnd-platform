'use client'
import { useState } from 'react'
import type { Character } from '@/lib/supabase/types'
import { HpBar } from '@/components/ui/HpBar'

interface Props {
  character: Character
  onUpdate?: (hp: number) => void
}

export function HpTracker({ character, onUpdate }: Props) {
  const [delta, setDelta] = useState('')
  const [loading, setLoading] = useState(false)

  async function applyDelta(type: 'damage' | 'heal') {
    const amount = parseInt(delta) || 1
    const d = type === 'damage' ? -amount : amount
    setLoading(true)
    try {
      const res = await fetch(`/api/characters/${character.id}/hp`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: d })
      })
      const data = await res.json()
      onUpdate?.(data.hp_current)
      setDelta('')
    } finally { setLoading(false) }
  }

  return (
    <div className="bg-gray-700 rounded-xl p-4 border border-gray-600">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">Хит-пойнты</span>
        <span className="text-lg font-bold text-white">{character.hp_current}/{character.hp_max}</span>
      </div>
      <HpBar current={character.hp_current} max={character.hp_max} temp={character.hp_temp} size="lg" showNumbers={false} />
      {character.hp_temp > 0 && <p className="text-xs text-blue-400 mt-1">+{character.hp_temp} врем. HP</p>}

      <div className="flex gap-2 mt-3">
        <input
          type="number" min={1} value={delta} onChange={e => setDelta(e.target.value)}
          placeholder="1" className="w-16 bg-gray-600 border border-gray-500 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none focus:border-purple-500"
        />
        <button onClick={() => applyDelta('damage')} disabled={loading} className="flex-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm py-1.5 rounded-lg transition-colors">
          − Урон
        </button>
        <button onClick={() => applyDelta('heal')} disabled={loading} className="flex-1 bg-green-800 hover:bg-green-700 disabled:opacity-50 text-white text-sm py-1.5 rounded-lg transition-colors">
          + Лечение
        </button>
      </div>

      {character.hp_current === 0 && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm font-medium text-center">💀 Броски смерти</p>
          <div className="flex justify-around mt-2 text-sm">
            <div className="text-center">
              <p className="text-green-400 text-xs">Успехи</p>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map(i => <div key={i} className={`w-4 h-4 rounded-full border ${i < character.death_saves.successes ? 'bg-green-500 border-green-500' : 'border-gray-500'}`} />)}
              </div>
            </div>
            <div className="text-center">
              <p className="text-red-400 text-xs">Провалы</p>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map(i => <div key={i} className={`w-4 h-4 rounded-full border ${i < character.death_saves.failures ? 'bg-red-500 border-red-500' : 'border-gray-500'}`} />)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
