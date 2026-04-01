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

  async function changeHp(participantId: string, _tokenId: string, delta: number) {
    await fetch(`/api/sessions/${session?.id}/combat/participants/${participantId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp_current: Math.max(0, (participants.find(p => p.id === participantId)?.hp_current ?? 0) + delta) })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {/* Заголовок раунда */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
        <div>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.2em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Раунд {round}
          </span>
        </div>
        {isMaster && (
          <button onClick={nextTurn} disabled={loading} className="btn-fantasy btn-gold" style={{ fontSize: '.6rem', padding: '.3rem .75rem' }}>
            {loading ? '...' : 'Следующий →'}
          </button>
        )}
      </div>

      {/* Список участников */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', maxHeight: '24rem', overflowY: 'auto' }}>
        {activeParts.map((p, idx) => (
          <div
            key={p.id}
            style={{
              background: idx === currentTurn ? 'linear-gradient(135deg, rgba(139,105,20,.12), rgba(139,105,20,.05))' : 'var(--bg-elevated)',
              border: `1px solid ${idx === currentTurn ? 'var(--border-gold)' : 'var(--border)'}`,
              borderLeft: idx === currentTurn ? '3px solid var(--gold)' : '3px solid transparent',
              borderRadius: '.45rem',
              padding: '.6rem .75rem',
              transition: 'all .15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              {/* Инициатива */}
              <div style={{
                width: '1.8rem', height: '1.8rem', borderRadius: '50%',
                background: idx === currentTurn ? 'rgba(139,105,20,.25)' : 'var(--bg-overlay)',
                border: `1px solid ${idx === currentTurn ? 'var(--border-gold)' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: idx === currentTurn ? 'var(--gold)' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {p.initiative}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                  <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', color: idx === currentTurn ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '.4rem' }}>КД {p.ac}</span>
                </div>
                <HpBar current={p.hp_current} max={p.hp_max} size="sm" showNumbers={false} />
                <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{p.hp_current}/{p.hp_max} HP</p>
              </div>

              {(isMaster || p.is_player) && (
                <div style={{ display: 'flex', gap: '.3rem', flexShrink: 0 }}>
                  <button
                    onClick={() => changeHp(p.id, p.token_id, -1)}
                    style={{ width: '1.5rem', height: '1.5rem', background: 'rgba(139,21,0,.3)', border: '1px solid var(--crimson)', borderRadius: '.25rem', color: '#e88070', fontSize: '.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Урон -1"
                  >−</button>
                  <button
                    onClick={() => changeHp(p.id, p.token_id, 1)}
                    style={{ width: '1.5rem', height: '1.5rem', background: 'rgba(22,101,52,.3)', border: '1px solid #166534', borderRadius: '.25rem', color: '#4ade80', fontSize: '.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Лечение +1"
                  >+</button>
                </div>
              )}
            </div>

            {p.conditions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.4rem', marginLeft: '2.3rem' }}>
                {p.conditions.map(c => (
                  <span key={c} title={getConditionLabel(c)} style={{ fontSize: '.85rem' }}>{getConditionIcon(c)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
