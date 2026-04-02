'use client'
import { useState, useRef, useEffect } from 'react'
import { useCombatStore } from '@/lib/stores/combatStore'
import { useSessionStore } from '@/lib/stores/sessionStore'
import { HpBar } from '@/components/ui/HpBar'
import { CONDITIONS, getConditionIcon, getConditionLabel } from '@/lib/utils/dnd'
import type { BestiaryCreature, CombatParticipant } from '@/lib/supabase/types'

// ── Types ────────────────────────────────────────────────────────────────────

interface SetupEntry {
  key: string
  name: string
  hp_max: number
  hp_current: number
  ac: number
  initiative: number | ''
  is_player: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function roll(sides: number) { return Math.floor(Math.random() * sides) + 1 }

const S = {
  row: (active: boolean): React.CSSProperties => ({
    background: active ? 'linear-gradient(135deg,rgba(139,105,20,.13),rgba(139,105,20,.05))' : 'rgba(0,0,0,.2)',
    border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border)'}`,
    borderLeft: `3px solid ${active ? 'var(--gold)' : 'transparent'}`,
    borderRadius: '.45rem',
    padding: '.6rem .75rem',
    transition: 'all .15s',
  }),
  label: {
    fontFamily: "'Alegreya SC', serif",
    fontSize: '.55rem',
    letterSpacing: '.2em',
    color: 'var(--gold-dim)',
    textTransform: 'uppercase' as const,
  },
  input: (w?: string): React.CSSProperties => ({
    width: w ?? '100%',
    background: 'rgba(0,0,0,.4)',
    border: '1px solid var(--border)',
    borderRadius: '.35rem',
    padding: '.3rem .5rem',
    color: 'var(--text-primary)',
    fontFamily: "'Alegreya SC', serif",
    fontSize: '.8rem',
    outline: 'none',
    textAlign: 'center' as const,
  }),
}

// ── Main component ───────────────────────────────────────────────────────────

export function CombatTracker() {
  const { participants, currentTurn, round, isActive, setIsActive, setParticipants, setCurrentTurn, setRound, reset } = useCombatStore()
  const { isMaster, session, players } = useSessionStore()

  // Setup state
  const [setup, setSetup] = useState<SetupEntry[]>([])
  const [bSearch, setBSearch] = useState('')
  const [bResults, setBResults] = useState<BestiaryCreature[]>([])
  const [bLoading, setBLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Combat state
  const [loading, setLoading] = useState(false)
  const [hpInputs, setHpInputs] = useState<Record<string, string>>({})
  const [activeCondPanel, setActiveCondPanel] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const activeParts = participants.filter(p => !p.is_defeated)
  const defeatedParts = participants.filter(p => p.is_defeated)

  // ── Bestiary search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!bSearch.trim()) { setBResults([]); return }
    debounce.current = setTimeout(async () => {
      setBLoading(true)
      try {
        const res = await fetch(`/api/bestiary?search=${encodeURIComponent(bSearch)}&limit=15`)
        if (res.ok) {
          const data = await res.json()
          setBResults(data.creatures ?? data ?? [])
        }
      } finally { setBLoading(false) }
    }, 280)
  }, [bSearch])

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setBResults([])
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  // ── Setup helpers ────────────────────────────────────────────────────────

  function addCreature(c: BestiaryCreature) {
    const existing = setup.filter(e => e.name.startsWith(c.name))
    const suffix = existing.length > 0 ? ` ${existing.length + 1}` : ''
    setSetup(s => [...s, {
      key: crypto.randomUUID(),
      name: c.name + suffix,
      hp_max: c.hp, hp_current: c.hp, ac: c.ac,
      initiative: '', is_player: false,
    }])
    setBSearch(''); setBResults([])
  }

  function addPlayer(name: string) {
    if (setup.find(e => e.name === name)) return
    setSetup(s => [...s, {
      key: crypto.randomUUID(), name,
      hp_max: 20, hp_current: 20, ac: 10,
      initiative: '', is_player: true,
    }])
  }

  function updateSetup(key: string, changes: Partial<SetupEntry>) {
    setSetup(s => s.map(e => e.key === key ? { ...e, ...changes } : e))
  }

  function rollInitiative(key: string) {
    updateSetup(key, { initiative: roll(20) })
  }

  function rollAllInitiative() {
    setSetup(s => s.map(e => ({ ...e, initiative: e.initiative === '' ? roll(20) : e.initiative })))
  }

  // ── Start / End combat ───────────────────────────────────────────────────

  async function startCombat() {
    if (!session || setup.length === 0) return
    const invalid = setup.find(e => e.initiative === '')
    if (invalid) { alert(`Задайте инициативу для: ${invalid.name}`); return }
    setStarting(true)
    try {
      const res = await fetch(`/api/sessions/${session.id}/combat/start`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participants: setup.map(e => ({
            name: e.name, initiative: Number(e.initiative),
            hp_max: e.hp_max, hp_current: e.hp_current,
            ac: e.ac, is_player: e.is_player,
          }))
        }),
      })
      if (res.ok) { setSetup([]) }
    } finally { setStarting(false) }
  }

  async function endCombat() {
    if (!session || !confirm('Завершить бой?')) return
    setLoading(true)
    try {
      await fetch(`/api/sessions/${session.id}/combat/end`, { method: 'POST' })
      reset()
    } finally { setLoading(false) }
  }

  async function nextTurn() {
    if (!session) return
    setLoading(true)
    try { await fetch(`/api/sessions/${session.id}/combat/next-turn`, { method: 'POST' }) }
    finally { setLoading(false) }
  }

  // ── Participant actions ──────────────────────────────────────────────────

  async function applyHp(p: CombatParticipant, delta: number) {
    if (!session) return
    const newHp = Math.max(0, Math.min(p.hp_max, p.hp_current + delta))
    await fetch(`/api/sessions/${session.id}/combat/participants/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp_current: newHp }),
    })
  }

  async function applyHpInput(p: CombatParticipant, raw: string, isDamage: boolean) {
    const val = parseInt(raw)
    if (isNaN(val) || val <= 0) return
    await applyHp(p, isDamage ? -val : val)
    setHpInputs(h => ({ ...h, [p.id]: '' }))
  }

  async function toggleCondition(p: CombatParticipant, condId: string) {
    if (!session) return
    const has = p.conditions.includes(condId)
    const next = has ? p.conditions.filter(c => c !== condId) : [...p.conditions, condId]
    await fetch(`/api/sessions/${session.id}/combat/participants/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conditions: next }),
    })
  }

  async function toggleDefeated(p: CombatParticipant) {
    if (!session) return
    await fetch(`/api/sessions/${session.id}/combat/participants/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_defeated: !p.is_defeated }),
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // ── SETUP (not active, master only) ──────────────────────────────────────
  if (!isActive) {
    if (!isMaster) return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontFamily: "'Mookmania', serif", fontStyle: 'italic', fontSize: '.9rem' }}>
        <div style={{ fontSize: '1.5rem', opacity: .3, marginBottom: '.5rem' }}>⚔</div>
        Бой ещё не начат
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.25em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>
            Участники боя
          </span>
          <button onClick={rollAllInitiative} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', letterSpacing: '.1em' }}>
            🎲 Бросить всё
          </button>
        </div>

        {/* Поиск существа */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <input
            value={bSearch} onChange={e => setBSearch(e.target.value)}
            placeholder="Добавить существо из бестиария..."
            style={{ ...S.input(), textAlign: 'left', padding: '.45rem .75rem', fontSize: '.8rem' }}
          />
          {bLoading && <span style={{ position: 'absolute', right: '.6rem', top: '.4rem', fontSize: '.7rem', color: 'var(--text-muted)' }}>...</span>}
          {bResults.length > 0 && (
            <div style={{ position: 'absolute', zIndex: 30, top: '100%', left: 0, right: 0, marginTop: '.25rem', background: '#1a1209', border: '1px solid var(--border-gold)', borderRadius: '.45rem', overflow: 'hidden', maxHeight: '12rem', overflowY: 'auto' }}>
              {bResults.map(c => (
                <button key={c.id} onClick={() => addCreature(c)} style={{ width: '100%', textAlign: 'left', padding: '.45rem .75rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(139,105,20,.1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  <span style={{ fontFamily: "'Mookmania', serif", fontSize: '.8rem', color: 'var(--text-primary)' }}>{c.name}</span>
                  <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: 'var(--text-muted)' }}>КО {c.cr} · HP {c.hp} · КД {c.ac}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Игроки сессии */}
        {players.length > 0 && (
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            {players.map(pl => (
              <button key={pl.user_id} onClick={() => addPlayer(pl.character_id ?? pl.user_id)}
                style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.08em', padding: '.3rem .65rem', border: '1px solid var(--border)', borderRadius: '.35rem', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-gold)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'}>
                + {pl.character_id ? `Игрок ${players.indexOf(pl) + 1}` : `Игрок ${players.indexOf(pl) + 1}`}
              </button>
            ))}
          </div>
        )}

        {/* Список участников */}
        {setup.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', maxHeight: '18rem', overflowY: 'auto' }}>
            {setup.map(e => (
              <div key={e.key} style={{ background: 'rgba(0,0,0,.2)', border: '1px solid var(--border)', borderRadius: '.4rem', padding: '.5rem .65rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.7rem', color: e.is_player ? '#70b8e0' : 'var(--text-secondary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.is_player ? '⚔' : '👾'} {e.name}
                </div>
                {/* HP */}
                <input type="number" value={e.hp_max} min={1} onChange={ev => updateSetup(e.key, { hp_max: parseInt(ev.target.value) || 1, hp_current: parseInt(ev.target.value) || 1 })}
                  style={{ ...S.input('3.5rem') }} title="HP" />
                {/* AC */}
                <input type="number" value={e.ac} min={1} onChange={ev => updateSetup(e.key, { ac: parseInt(ev.target.value) || 10 })}
                  style={{ ...S.input('3rem') }} title="КД" />
                {/* Initiative */}
                <div style={{ display: 'flex', gap: '.2rem', alignItems: 'center' }}>
                  <input type="number" value={e.initiative} placeholder="—" min={1} max={30}
                    onChange={ev => updateSetup(e.key, { initiative: parseInt(ev.target.value) || '' })}
                    style={{ ...S.input('3rem'), borderColor: e.initiative === '' ? '#7a3a1a' : 'var(--border)' }} title="Инициатива" />
                  <button onClick={() => rollInitiative(e.key)} title="Бросить d20" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', lineHeight: 1 }}>🎲</button>
                </div>
                <button onClick={() => setSetup(s => s.filter(x => x.key !== e.key))}
                  style={{ background: 'none', border: 'none', color: 'var(--border)', cursor: 'pointer', fontSize: '.9rem', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e07070'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--border)'}>✕</button>
              </div>
            ))}
          </div>
        )}

        {setup.length > 0 && (
          <div style={{ display: 'flex', gap: '.5rem', paddingTop: '.25rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ flex: 1, fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ ...S.label }}>HP</span>
              <span style={{ ...S.label }}>КД</span>
              <span style={{ ...S.label }}>Иниц.</span>
            </div>
            <button onClick={() => setSetup([])} className="btn-fantasy btn-ghost" style={{ fontSize: '.6rem', padding: '.3rem .65rem' }}>Очистить</button>
            <button onClick={startCombat} disabled={starting || setup.length === 0} className="btn-fantasy btn-crimson" style={{ fontSize: '.6rem', padding: '.3rem .9rem' }}>
              {starting ? '...' : '⚔ Начать бой'}
            </button>
          </div>
        )}

        {setup.length === 0 && (
          <p style={{ fontFamily: "'Mookmania', serif", fontStyle: 'italic', fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '.75rem 0' }}>
            Добавьте участников для начала боя
          </p>
        )}
      </div>
    )
  }

  // ── ACTIVE COMBAT ─────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>

      {/* Шапка раунда */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '.4rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.25em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>Раунд</span>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>{round}</span>
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: 'var(--text-muted)' }}>
            {activeParts[currentTurn]?.name ?? '—'}
          </span>
        </div>
        {isMaster && (
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={nextTurn} disabled={loading} className="btn-fantasy btn-gold" style={{ fontSize: '.6rem', padding: '.3rem .75rem' }}>
              {loading ? '...' : 'Ход →'}
            </button>
            <button onClick={endCombat} disabled={loading} className="btn-fantasy" style={{ fontSize: '.6rem', padding: '.3rem .65rem', borderColor: '#7a1a1a', color: '#e07070', background: 'rgba(120,20,20,.12)' }}>
              Конец
            </button>
          </div>
        )}
      </div>

      {/* Участники */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', maxHeight: '28rem', overflowY: 'auto' }}>
        {activeParts.map((p, idx) => {
          const isCurrent = idx === currentTurn
          const isExpanded = expandedId === p.id
          const hpVal = hpInputs[p.id] ?? ''

          return (
            <div key={p.id} style={S.row(isCurrent)}>
              {/* Основная строка */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                {/* Инициатива */}
                <div style={{
                  width: '1.75rem', height: '1.75rem', borderRadius: '50%', flexShrink: 0,
                  background: isCurrent ? 'rgba(139,105,20,.25)' : 'rgba(0,0,0,.3)',
                  border: `1px solid ${isCurrent ? 'var(--border-gold)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Alegreya SC', serif", fontSize: '.65rem',
                  color: isCurrent ? 'var(--gold)' : 'var(--text-muted)',
                }}>
                  {p.initiative}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.25rem' }}>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.is_player ? '⚔ ' : ''}{p.name}
                    </span>
                    <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: '.35rem' }}>КД {p.ac}</span>
                  </div>
                  <HpBar current={p.hp_current} max={p.hp_max} size="sm" showNumbers={false} />
                  <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--text-muted)', marginTop: '.15rem' }}>
                    {p.hp_current}/{p.hp_max} HP
                  </p>
                </div>

                {/* Кнопки раскрыть + победить */}
                <div style={{ display: 'flex', gap: '.25rem', flexShrink: 0 }}>
                  <button onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    style={{ width: '1.4rem', height: '1.4rem', background: 'rgba(0,0,0,.3)', border: '1px solid var(--border)', borderRadius: '.25rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Управление">
                    {isExpanded ? '▲' : '▼'}
                  </button>
                  {isMaster && (
                    <button onClick={() => toggleDefeated(p)}
                      title="Пометить побеждённым"
                      style={{ width: '1.4rem', height: '1.4rem', background: 'rgba(139,21,0,.2)', border: '1px solid var(--crimson)', borderRadius: '.25rem', cursor: 'pointer', color: '#e88070', fontSize: '.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      💀
                    </button>
                  )}
                </div>
              </div>

              {/* Состояния */}
              {p.conditions.length > 0 && (
                <div style={{ display: 'flex', gap: '.3rem', marginTop: '.35rem', marginLeft: '2.25rem', flexWrap: 'wrap' }}>
                  {p.conditions.map(c => (
                    <span key={c} title={getConditionLabel(c)} style={{ fontSize: '.85rem', cursor: isMaster ? 'pointer' : 'default' }}
                      onClick={() => isMaster && toggleCondition(p, c)}>
                      {getConditionIcon(c)}
                    </span>
                  ))}
                </div>
              )}

              {/* Раскрытая панель управления */}
              {isExpanded && (
                <div style={{ marginTop: '.5rem', paddingTop: '.5rem', borderTop: '1px solid var(--border)', marginLeft: '2.25rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>

                  {/* HP управление */}
                  {(isMaster || p.is_player) && (
                    <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <input
                        type="number" min={1} placeholder="0"
                        value={hpVal}
                        onChange={e => setHpInputs(h => ({ ...h, [p.id]: e.target.value }))}
                        style={{ ...S.input('4rem') }}
                      />
                      <button onClick={() => applyHpInput(p, hpVal, true)}
                        style={{ padding: '.3rem .6rem', background: 'rgba(139,21,0,.3)', border: '1px solid var(--crimson)', borderRadius: '.3rem', color: '#e88070', fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', cursor: 'pointer', letterSpacing: '.05em' }}>
                        Урон
                      </button>
                      <button onClick={() => applyHpInput(p, hpVal, false)}
                        style={{ padding: '.3rem .6rem', background: 'rgba(22,101,52,.3)', border: '1px solid #166534', borderRadius: '.3rem', color: '#4ade80', fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', cursor: 'pointer', letterSpacing: '.05em' }}>
                        Лечение
                      </button>
                      <button onClick={() => applyHp(p, -1)} style={{ width: '1.4rem', height: '1.4rem', background: 'rgba(139,21,0,.2)', border: '1px solid var(--crimson)', borderRadius: '.2rem', color: '#e88070', cursor: 'pointer', fontSize: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <button onClick={() => applyHp(p, 1)} style={{ width: '1.4rem', height: '1.4rem', background: 'rgba(22,101,52,.2)', border: '1px solid #166534', borderRadius: '.2rem', color: '#4ade80', cursor: 'pointer', fontSize: '.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  )}

                  {/* Состояния */}
                  {isMaster && (
                    <div>
                      <div style={{ ...S.label, marginBottom: '.35rem' }}>Состояния</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                        {CONDITIONS.map(cond => {
                          const active = p.conditions.includes(cond.id)
                          return (
                            <button key={cond.id} onClick={() => toggleCondition(p, cond.id)}
                              title={cond.ru}
                              style={{
                                padding: '.2rem .4rem',
                                background: active ? 'rgba(139,105,20,.25)' : 'rgba(0,0,0,.3)',
                                border: `1px solid ${active ? 'var(--border-gold)' : 'var(--border)'}`,
                                borderRadius: '.3rem',
                                cursor: 'pointer',
                                fontSize: '.8rem',
                                opacity: active ? 1 : .5,
                                transition: 'all .12s',
                              }}>
                              {cond.icon}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Побеждённые */}
      {defeatedParts.length > 0 && (
        <div>
          <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '.35rem', marginTop: '.25rem' }}>Побеждённые</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
            {defeatedParts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem .65rem', background: 'rgba(0,0,0,.15)', border: '1px solid var(--border)', borderRadius: '.4rem', opacity: .6 }}>
                <span style={{ fontSize: '.8rem' }}>💀</span>
                <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', color: 'var(--text-muted)', flex: 1, textDecoration: 'line-through' }}>{p.name}</span>
                {isMaster && (
                  <button onClick={() => toggleDefeated(p)} title="Вернуть в бой"
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif" }}>
                    ↩
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
