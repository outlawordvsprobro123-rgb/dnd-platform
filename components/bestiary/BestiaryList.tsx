'use client'
import { useState, useMemo } from 'react'
import type { BestiaryCreature } from '@/lib/supabase/types'
import { crToString } from '@/lib/utils/dnd'
import CreatureCard from './CreatureCard'

const CREATURE_TYPES = ['Зверь', 'Гуманоид', 'Нежить', 'Дракон', 'Демон', 'Дьявол', 'Великан', 'Монстр', 'Растение', 'Слизь', 'Фея', 'Элементаль', 'Конструкт', 'Небожитель']
const CR_OPTIONS = [0, 0.125, 0.25, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30]

interface Props {
  creatures: BestiaryCreature[]
  onAddToCombat?: (creature: BestiaryCreature) => void
}

export default function BestiaryList({ creatures, onAddToCombat }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [crMin, setCrMin] = useState<number | ''>('')
  const [crMax, setCrMax] = useState<number | ''>('')
  const [showHomebrew, setShowHomebrew] = useState(false)

  const filtered = useMemo(() => {
    return creatures.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.type.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter && !c.type.toLowerCase().includes(typeFilter.toLowerCase())) return false
      if (crMin !== '' && c.cr < crMin) return false
      if (crMax !== '' && c.cr > crMax) return false
      if (showHomebrew && !c.is_homebrew) return false
      return true
    })
  }, [creatures, search, typeFilter, crMin, crMax, showHomebrew])

  return (
    <div>
      {/* Фильтры */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <input
          type="text"
          placeholder="Поиск по имени или типу..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-fantasy"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center' }}>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-fantasy" style={{ width: 'auto' }}>
            <option value="">Все типы</option>
            {CREATURE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontFamily: "'Alegreya SC', serif" }}>КО от</span>
            <select value={crMin} onChange={e => setCrMin(e.target.value === '' ? '' : Number(e.target.value))} className="input-fantasy" style={{ width: 'auto' }}>
              <option value="">—</option>
              {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{crToString(cr)}</option>)}
            </select>
            <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontFamily: "'Alegreya SC', serif" }}>до</span>
            <select value={crMax} onChange={e => setCrMax(e.target.value === '' ? '' : Number(e.target.value))} className="input-fantasy" style={{ width: 'auto' }}>
              <option value="">—</option>
              {CR_OPTIONS.map(cr => <option key={cr} value={cr}>{crToString(cr)}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: "'Alegreya SC', serif" }}>
            <input type="checkbox" checked={showHomebrew} onChange={e => setShowHomebrew(e.target.checked)} style={{ accentColor: 'var(--gold)' }} />
            Только homebrew
          </label>
          {(search || typeFilter || crMin !== '' || crMax !== '') && (
            <button
              onClick={() => { setSearch(''); setTypeFilter(''); setCrMin(''); setCrMax('') }}
              style={{ fontSize: '.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Alegreya SC', serif" }}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Счётчик */}
      <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: '.75rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
        {filtered.length === creatures.length
          ? `${creatures.length} существ`
          : `${filtered.length} из ${creatures.length}`}
      </p>

      {/* Список */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic' }}>
          Ничего не найдено
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtered.map(c => (
            <CreatureCard key={c.id} creature={c} onAddToCombat={onAddToCombat} />
          ))}
        </div>
      )}
    </div>
  )
}
