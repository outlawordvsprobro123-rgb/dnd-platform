'use client'
import { useState } from 'react'
import type { Spell } from '@/lib/supabase/types'
import { SPELL_SCHOOLS } from '@/lib/utils/dnd'

const LEVEL_LABEL = (level: number) => level === 0 ? 'Заговор' : `${level} уровень`

const CLASS_LABELS: Record<string, string> = {
  bard: 'Бард', cleric: 'Жрец', druid: 'Друид', paladin: 'Паладин',
  ranger: 'Следопыт', sorcerer: 'Чародей', warlock: 'Колдун', wizard: 'Волшебник',
  artificer: 'Изобретатель',
}

const SCHOOL_COLORS: Record<string, string> = {
  abjuration: '#60a5fa',
  conjuration: '#facc15',
  divination: '#22d3ee',
  enchantment: '#f472b6',
  evocation: '#f87171',
  illusion: '#c084fc',
  necromancy: '#4ade80',
  transmutation: '#fb923c',
}

// Fallback school images from 5etools PHB artwork
const SCHOOL_IMAGES: Record<string, string> = {
  evocation:     'https://5e.tools/img/spells/PHB/Fireball.webp',
  necromancy:    'https://5e.tools/img/spells/PHB/Animate Dead.webp',
  enchantment:   'https://5e.tools/img/spells/PHB/Charm Person.webp',
  illusion:      'https://5e.tools/img/spells/PHB/Major Image.webp',
  divination:    'https://5e.tools/img/spells/PHB/Detect Magic.webp',
  abjuration:    'https://5e.tools/img/spells/PHB/Shield.webp',
  conjuration:   'https://5e.tools/img/spells/PHB/Misty Step.webp',
  transmutation: 'https://5e.tools/img/spells/PHB/Polymorph.webp',
}

interface Props {
  spell: Spell
  onAdd?: (spell: Spell) => void
}

export default function SpellCard({ spell, onAdd }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const components = [
    spell.components?.v && 'В',
    spell.components?.s && 'С',
    spell.components?.m && 'М',
  ].filter(Boolean).join(', ')

  const schoolColor = SCHOOL_COLORS[spell.school] ?? 'var(--text-muted)'
  const spellImage = (!imgError && (spell.image_url || SCHOOL_IMAGES[spell.school])) || null

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${expanded ? 'var(--border-gold)' : 'var(--border)'}`,
      borderRadius: '.75rem',
      overflow: 'hidden',
      transition: 'border-color .15s',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', cursor: 'pointer', gap: '.75rem' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* School color bar */}
        <div style={{ width: '3px', height: '2.5rem', borderRadius: '2px', background: schoolColor, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: 'var(--text-primary)', margin: 0 }}>{spell.name}</h3>
            {spell.concentration && (
              <span style={{ fontSize: '.65rem', background: 'rgba(180,130,0,.15)', color: '#fde68a', padding: '.1rem .4rem', borderRadius: '.25rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em' }}>Конц.</span>
            )}
            {spell.ritual && (
              <span style={{ fontSize: '.65rem', background: 'rgba(59,130,246,.15)', color: '#93c5fd', padding: '.1rem .4rem', borderRadius: '.25rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em' }}>Ритуал</span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '.8rem', margin: '.15rem 0 0', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
            <span style={{ color: schoolColor }}>{SPELL_SCHOOLS[spell.school] ?? spell.school}</span>
            {' · '}{LEVEL_LABEL(spell.level)}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexShrink: 0 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }} title="Время">{spell.casting_time}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '.8rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }} title="Дистанция">{spell.range}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-gold)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Изображение + параметры */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            {spellImage && (
              <div style={{ width: '7rem', height: '7rem', borderRadius: '.5rem', flexShrink: 0, overflow: 'hidden', border: `1px solid ${schoolColor}55` }}>
                <img
                  src={spellImage}
                  alt={spell.name}
                  onError={() => setImgError(true)}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              {[
                { label: 'Время', value: spell.casting_time },
                { label: 'Дистанция', value: spell.range },
                { label: 'Компоненты', value: components + (spell.components?.m ? ` (${spell.components.m})` : '') },
                { label: 'Длительность', value: spell.duration },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '.15rem' }}>{label}</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '.85rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Описание */}
          <p style={{ color: 'var(--text-secondary)', fontSize: '.95rem', fontFamily: "'Mookmania', 'Alegreya SC', serif", lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {spell.description}
          </p>

          {/* На высших уровнях */}
          {spell.higher_levels && (
            <div style={{ background: 'var(--bg-overlay)', borderRadius: '.4rem', padding: '.6rem .75rem', borderLeft: `3px solid ${schoolColor}` }}>
              <p style={{ color: 'var(--gold-dim)', fontSize: '.65rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.3rem' }}>На высших уровнях</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>{spell.higher_levels}</p>
            </div>
          )}

          {/* Классы */}
          {spell.classes?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
              {spell.classes.map(cls => (
                <span key={cls} style={{ fontSize: '.7rem', background: 'var(--bg-overlay)', color: 'var(--text-muted)', padding: '.15rem .5rem', borderRadius: '.25rem', fontFamily: "'Alegreya SC', serif", letterSpacing: '.05em', border: '1px solid var(--border)' }}>
                  {CLASS_LABELS[cls] ?? cls}
                </span>
              ))}
            </div>
          )}

          {onAdd && (
            <button
              onClick={() => onAdd(spell)}
              className="btn-fantasy"
              style={{ background: `${schoolColor}18`, borderColor: `${schoolColor}55`, color: schoolColor, width: '100%', justifyContent: 'center' }}
            >
              + Добавить персонажу
            </button>
          )}
        </div>
      )}
    </div>
  )
}
