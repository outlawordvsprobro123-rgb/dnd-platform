'use client'
import { useState } from 'react'
import { useCombatStore } from '@/lib/stores/combatStore'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { HpBar } from '@/components/ui/HpBar'
import { getConditionIcon, getConditionLabel } from '@/lib/utils/dnd'

export function CombatTracker() {
  const { participants, currentTurn, round, isActive } = useCombatStore()
  const { isMaster, session } = useSessionStore()
  const [loading, setLoading] = useState(false)

  if (!isActive) return null

  const activeParts = participants.filter(p => !p.is_defeated)

  async function nextTurn() {
    if (!session) return
    setLoading(true)
    try {
      await fetch(`/api/sessions/${session.id}/combat/next-turn`, { method: 'POST' })
    } finally {
      setLoading(false)
    }
  }

  async function changeHp(participantId: string, tokenId: string, delta: number) {
    await fetch(`/api/sessions/${session?.id}/combat/participants/${participantId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp_current: Math.max(0, (participants.find(p => p.id === participantId)?.hp_current ?? 0) + delta) })
    })
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-white">⚔️ Бой</h3>
          <p className="text-xs text-gray-400">Раунд {round}</p>
        </div>
        {isMaster && (
          <button onClick={nextTurn} disabled={loading} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            {loading ? '...' : 'Следующий ход →'}
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-700 max-h-96 overflow-y-auto">
        {activeParts.map((p, idx) => (
          <div key={p.id} className={`px-4 py-3 transition-colors ${idx === currentTurn ? 'bg-purple-900/30 border-l-2 border-purple-500' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
                {p.initiative}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm truncate">{p.name}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">КД {p.ac}</span>
                </div>
                <HpBar current={p.hp_current} max={p.hp_max} size="sm" showNumbers={false} />
                <p className="text-xs text-gray-400 mt-0.5">{p.hp_current}/{p.hp_max} HP</p>
              </div>
              {(isMaster || p.is_player) && (
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => changeHp(p.id, p.token_id, -1)} className="w-6 h-6 bg-red-800 hover:bg-red-700 rounded text-xs" title="Урон -1">−</button>
                  <button onClick={() => changeHp(p.id, p.token_id, 1)} className="w-6 h-6 bg-green-800 hover:bg-green-700 rounded text-xs" title="Лечение +1">+</button>
                </div>
              )}
            </div>
            {p.conditions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 ml-11">
                {p.conditions.map(c => (
                  <span key={c} title={getConditionLabel(c)} className="text-sm">{getConditionIcon(c)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
