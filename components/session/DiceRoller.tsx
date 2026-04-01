'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'

interface RollEntry {
  id: string
  playerName: string
  diceType: DiceType
  roll: number
  modifier: number
  total: number
  timestamp: string
}

interface DiceRollerProps {
  sessionId: string
  playerName: string
}

const DICE: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']

const DICE_FACES: Record<DiceType, string> = {
  d4: '▲', d6: '■', d8: '◆', d10: '⬟', d12: '⬠', d20: '⬡', d100: '%',
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function getSides(diceType: DiceType): number {
  if (diceType === 'd100') return 100
  return parseInt(diceType.slice(1), 10)
}

function getTotalColor(total: number, diceType: DiceType): string {
  if (diceType !== 'd20') return 'var(--text-primary)'
  if (total >= 15) return '#4ade80'
  if (total <= 4) return '#e88070'
  return 'var(--text-primary)'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatEntry(entry: RollEntry): string {
  const modStr = entry.modifier > 0 ? `+${entry.modifier}` : entry.modifier < 0 ? `${entry.modifier}` : ''
  const calcStr = entry.modifier !== 0 ? ` (${entry.roll}${modStr})` : ''
  return `[${entry.playerName}] ${entry.diceType}${modStr} = ${entry.total}${calcStr}`
}

export function DiceRoller({ sessionId, playerName }: DiceRollerProps) {
  const [selectedDice, setSelectedDice] = useState<DiceType>('d20')
  const [modifier, setModifier] = useState<number>(0)
  const [modifierInput, setModifierInput] = useState<string>('0')
  const [history, setHistory] = useState<RollEntry[]>([])
  const [lastRoll, setLastRoll] = useState<RollEntry | null>(null)
  const historyTopRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`map:${sessionId}`)
    channel.on('broadcast', { event: 'dice:roll' }, ({ payload }) => {
      const entry: RollEntry = {
        id: `${payload.timestamp}-${Math.random()}`,
        playerName: payload.playerName,
        diceType: payload.diceType,
        roll: payload.roll,
        modifier: payload.modifier,
        total: payload.total,
        timestamp: payload.timestamp,
      }
      setHistory(prev => [entry, ...prev].slice(0, 15))
    }).subscribe()
    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [sessionId])

  function handleRoll(dice: DiceType) {
    const sides = getSides(dice)
    const roll = rollDie(sides)
    const total = roll + modifier
    const timestamp = new Date().toISOString()
    const entry: RollEntry = { id: `${timestamp}-${Math.random()}`, playerName, diceType: dice, roll, modifier, total, timestamp }
    setLastRoll(entry)
    setHistory(prev => [entry, ...prev].slice(0, 15))
    channelRef.current?.send({ type: 'broadcast', event: 'dice:roll', payload: { playerName, diceType: dice, roll, modifier, total, timestamp } })
    setTimeout(() => historyTopRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function handleModifierInput(value: string) {
    setModifierInput(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed)) setModifier(parsed)
    else if (value === '-' || value === '') setModifier(0)
  }

  function adjustModifier(delta: number) {
    const next = modifier + delta
    setModifier(next)
    setModifierInput(String(next))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {/* Кнопки кубиков */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
        {DICE.map(dice => {
          const isSelected = selectedDice === dice
          return (
            <button
              key={dice}
              onClick={() => { setSelectedDice(dice); handleRoll(dice) }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: '2.8rem', height: '2.8rem',
                borderRadius: '.4rem',
                border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
                background: isSelected ? 'linear-gradient(135deg, #3a2a08, #2a1c05)' : 'var(--bg-elevated)',
                color: isSelected ? 'var(--gold)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all .15s',
                fontFamily: "'Alegreya SC', serif",
              }}
              title={`Бросить ${dice}`}
              onMouseEnter={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-gold)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' } }}
              onMouseLeave={e => { if (!isSelected) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' } }}
            >
              <span style={{ fontSize: '.9rem', lineHeight: 1 }}>{DICE_FACES[dice]}</span>
              <span style={{ fontSize: '.45rem', marginTop: '.2rem', letterSpacing: '.05em' }}>{dice}</span>
            </button>
          )
        })}
      </div>

      {/* Модификатор */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.15em', color: 'var(--text-muted)', textTransform: 'uppercase', flexShrink: 0 }}>Модиф.:</span>
        <button onClick={() => adjustModifier(-1)} style={{ width: '1.5rem', height: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.25rem', color: 'var(--text-secondary)', fontSize: '.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <input
          type="text"
          value={modifierInput}
          onChange={e => handleModifierInput(e.target.value)}
          style={{ width: '3rem', textAlign: 'center', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: '.3rem', padding: '.25rem .3rem', color: 'var(--text-primary)', fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', outline: 'none' }}
        />
        <button onClick={() => adjustModifier(1)} style={{ width: '1.5rem', height: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.25rem', color: 'var(--text-secondary)', fontSize: '.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>

      {/* Результат */}
      {lastRoll && (
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-gold)',
          borderRadius: '.5rem',
          padding: '.75rem',
          textAlign: 'center',
          boxShadow: '0 0 20px rgba(139,105,20,.1)',
        }}>
          <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.15em', color: 'var(--text-muted)', marginBottom: '.4rem', textTransform: 'uppercase' }}>
            {lastRoll.diceType}{lastRoll.modifier !== 0 ? (lastRoll.modifier > 0 ? `+${lastRoll.modifier}` : `${lastRoll.modifier}`) : ''} — бросок: {lastRoll.roll}
          </div>
          <div style={{ fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif", fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: getTotalColor(lastRoll.total, lastRoll.diceType) }}>
            {lastRoll.total}
          </div>
          {lastRoll.modifier !== 0 && (
            <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>
              {lastRoll.roll}{lastRoll.modifier > 0 ? '+' : ''}{lastRoll.modifier} = {lastRoll.total}
            </div>
          )}
        </div>
      )}

      {/* История */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', maxHeight: '12rem', overflowY: 'auto' }}>
          <div ref={historyTopRef} />
          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '.25rem' }}>История</span>
          {history.map(entry => (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: '.3rem', padding: '.25rem .5rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{formatEntry(entry)}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '.6rem', marginLeft: '.4rem', flexShrink: 0, fontFamily: 'monospace' }}>{formatTime(entry.timestamp)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
