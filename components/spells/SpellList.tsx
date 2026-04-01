'use client'
import { useState, useMemo } from 'react'
import type { Spell } from '@/lib/supabase/types'
import { SPELL_SCHOOLS } from '@/lib/utils/dnd'
import SpellCard from './SpellCard'

const CLASS_OPTIONS = [
  { value: 'bard', label: 'Бард' },
  { value: 'cleric', label: 'Жрец' },
  { value: 'druid', label: 'Друид' },
  { value: 'paladin', label: 'Паладин' },
  { value: 'ranger', label: 'Следопыт' },
  { value: 'sorcerer', label: 'Чародей' },
  { value: 'warlock', label: 'Колдун' },
  { value: 'wizard', label: 'Волшебник' },
]

interface Props {
  spells: Spell[]
  onAdd?: (spell: Spell) => void
}

export default function SpellList({ spells, onAdd }: Props) {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<number | ''>('')
  const [schoolFilter, setSchoolFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')

  const filtered = useMemo(() => {
    return spells.filter(s => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (levelFilter !== '' && s.level !== levelFilter) return false
      if (schoolFilter && s.school !== schoolFilter) return false
      if (classFilter && !s.classes?.includes(classFilter)) return false
      return true
    })
  }, [spells, search, levelFilter, schoolFilter, classFilter])

  const grouped = useMemo(() => {
    if (levelFilter !== '') return null
    const map = new Map<number, Spell[]>()
    for (const s of filtered) {
      const arr = map.get(s.level) ?? []
      arr.push(s)
      map.set(s.level, arr)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b)
  }, [filtered, levelFilter])

  const levelLabel = (level: number) => level === 0 ? 'Заговоры' : `${level} уровень`

  return (
    <div>
      {/* Фильтры */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '.75rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-fantasy"
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center' }}>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value === '' ? '' : Number(e.target.value))} className="input-fantasy" style={{ width: 'auto' }}>
            <option value="">Все уровни</option>
            <option value={0}>Заговор</option>
            {[1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{l} ур.</option>)}
          </select>
          <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)} className="input-fantasy" style={{ width: 'auto' }}>
            <option value="">Все школы</option>
            {Object.entries(SPELL_SCHOOLS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="input-fantasy" style={{ width: 'auto' }}>
            <option value="">Все классы</option>
            {CLASS_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {(search || levelFilter !== '' || schoolFilter || classFilter) && (
            <button
              onClick={() => { setSearch(''); setLevelFilter(''); setSchoolFilter(''); setClassFilter('') }}
              style={{ fontSize: '.8rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Alegreya SC', serif" }}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginBottom: '.75rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
        {filtered.length === spells.length ? `${spells.length} заклинаний` : `${filtered.length} из ${spells.length}`}
      </p>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic' }}>
          Ничего не найдено
        </div>
      ) : grouped ? (
        grouped.map(([level, list]) => (
          <div key={level} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ color: 'var(--gold-dim)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: '.75rem' }}>
              {levelLabel(level)} — {list.length}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {list.map(s => <SpellCard key={s.id} spell={s} onAdd={onAdd} />)}
            </div>
          </div>
        ))
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtered.map(s => <SpellCard key={s.id} spell={s} onAdd={onAdd} />)}
        </div>
      )}
    </div>
  )
}
