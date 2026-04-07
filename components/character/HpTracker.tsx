'use client'
import { useState } from 'react'
import type { Character } from '@/lib/supabase/types'
import { HpBar } from '@/components/ui/HpBar'

interface DeathSaves { successes: number; failures: number }

interface Props {
  character: Character
  onUpdate?: (hp: number) => void
  onDeathSavesUpdate?: (saves: DeathSaves) => void
}

export function HpTracker({ character, onUpdate, onDeathSavesUpdate }: Props) {
  const [delta, setDelta] = useState('')
  const [loading, setLoading] = useState(false)
  const [dsLoading, setDsLoading] = useState(false)
  const [deathSaves, setDeathSaves] = useState<DeathSaves>(
    character.death_saves as DeathSaves ?? { successes: 0, failures: 0 }
  )

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

  async function recordDeathSave(type: 'success' | 'failure') {
    if (dsLoading) return
    setDsLoading(true)
    try {
      const res = await fetch(`/api/characters/${character.id}/death-saves`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok && data.death_saves) {
        setDeathSaves(data.death_saves)
        onDeathSavesUpdate?.(data.death_saves)
      }
    } finally { setDsLoading(false) }
  }

  async function resetDeathSaves() {
    if (dsLoading) return
    setDsLoading(true)
    try {
      const res = await fetch(`/api/characters/${character.id}/death-saves`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'success', reset: true }),
      })
      const data = await res.json()
      if (res.ok && data.death_saves) {
        setDeathSaves(data.death_saves)
        onDeathSavesUpdate?.(data.death_saves)
      }
    } finally { setDsLoading(false) }
  }

  const isDying = character.hp_current === 0
  const isStabilized = deathSaves.successes >= 3
  const isDead = deathSaves.failures >= 3

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

      {isDying && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <p className="text-red-400 text-sm font-medium">
              {isDead ? '💀 Персонаж мёртв' : isStabilized ? '💚 Стабилизирован' : '💀 Броски смерти'}
            </p>
            <button
              onClick={resetDeathSaves}
              disabled={dsLoading}
              title="Сбросить броски смерти"
              className="text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 transition-colors"
            >
              ↺ Сброс
            </button>
          </div>

          <div className="flex justify-around text-sm">
            {/* Успехи */}
            <div className="text-center">
              <p className="text-green-400 text-xs mb-1">Успехи</p>
              <div className="flex gap-1.5 justify-center">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => !isStabilized && !isDead && recordDeathSave('success')}
                    disabled={dsLoading || isStabilized || isDead}
                    title="Записать успех"
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      i < deathSaves.successes
                        ? 'bg-green-500 border-green-400'
                        : 'border-gray-500 hover:border-green-500'
                    } disabled:cursor-default`}
                  />
                ))}
              </div>
            </div>

            {/* Провалы */}
            <div className="text-center">
              <p className="text-red-400 text-xs mb-1">Провалы</p>
              <div className="flex gap-1.5 justify-center">
                {[0, 1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => !isStabilized && !isDead && recordDeathSave('failure')}
                    disabled={dsLoading || isStabilized || isDead}
                    title="Записать провал"
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      i < deathSaves.failures
                        ? 'bg-red-500 border-red-400'
                        : 'border-gray-500 hover:border-red-500'
                    } disabled:cursor-default`}
                  />
                ))}
              </div>
            </div>
          </div>

          {!isDead && !isStabilized && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Нажмите на кружок чтобы записать бросок
            </p>
          )}
        </div>
      )}
    </div>
  )
}
