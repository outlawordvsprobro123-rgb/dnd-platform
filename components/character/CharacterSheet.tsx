'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Character, InventoryItem, CharacterSpell, SpellSlot } from '@/lib/supabase/types'
import { HpTracker } from './HpTracker'
import { InventoryCatalog } from './InventoryCatalog'
import { SKILLS, STAT_LABELS, getProficiencyBonus, getModifier, formatModifier } from '@/lib/utils/dnd'

// ── Constants ────────────────────────────────────────────────────────────────

const CLASSES_RU = ['Варвар', 'Бард', 'Жрец', 'Друид', 'Воин', 'Монах', 'Паладин', 'Следопыт', 'Плут', 'Чародей', 'Колдун', 'Волшебник', 'Изобретатель']
const RACES_RU = ['Человек', 'Эльф', 'Дварф', 'Полурослик', 'Гном', 'Полуэльф', 'Полуорк', 'Тифлинг', 'Драконорождённый', 'Другое']
const ALIGNMENTS = ['Законопослушный добрый', 'Нейтральный добрый', 'Хаотичный добрый', 'Законопослушный нейтральный', 'Истинно нейтральный', 'Хаотичный нейтральный', 'Законопослушный злой', 'Нейтральный злой', 'Хаотичный злой']

const SPELL_LEVEL_LABEL = (l: number) => l === 0 ? 'Заговоры' : `${l} уровень`

type Tab = 'main' | 'inventory' | 'magic' | 'notes'
type InvCategory = 'weapon' | 'armor' | 'food' | 'misc'

const INV_CATEGORIES: { id: InvCategory; label: string; icon: string }[] = [
  { id: 'weapon', label: 'Оружие', icon: '⚔' },
  { id: 'armor', label: 'Доспехи', icon: '🛡' },
  { id: 'food', label: 'Еда и зелья', icon: '🧪' },
  { id: 'misc', label: 'Разное', icon: '💼' },
]

const WEAPON_KW = ['меч', 'кинжал', 'топор', 'копьё', 'копье', 'лук', 'арбалет', 'посох', 'булава', 'молот', 'рапира', 'sword', 'dagger', 'axe', 'bow', 'staff', '+1', '+2', '+3', 'weapon', 'оружие', 'клинок', 'острие', 'нож']
const ARMOR_KW = ['доспех', 'броня', 'кольчуга', 'щит', 'шлем', 'нагрудник', 'поножи', 'наручи', 'кираса', 'armor', 'shield', 'plate', 'chain', 'leather', 'перчатки', 'сапоги', 'плащ защит', 'кольцо защит', 'амулет здоровья', 'амулет защит']
const FOOD_KW = ['еда', 'пища', 'хлеб', 'вода', 'зелье', 'эликсир', 'зел', 'пайка', 'паёк', 'food', 'ration', 'potion', 'elixir', 'ale', 'wine', 'мясо', 'рыба', 'суп', 'напиток']

function detectCategory(name: string, desc?: string | null): InvCategory {
  const s = (name + ' ' + (desc ?? '')).toLowerCase()
  if (WEAPON_KW.some(k => s.includes(k))) return 'weapon'
  if (ARMOR_KW.some(k => s.includes(k))) return 'armor'
  if (FOOD_KW.some(k => s.includes(k))) return 'food'
  return 'misc'
}

// ── Styles ───────────────────────────────────────────────────────────────────

const S = {
  card: {
    background: 'linear-gradient(135deg, rgba(139,105,20,.06), rgba(0,0,0,.25))',
    border: '1px solid var(--border)',
    borderRadius: '.6rem',
    padding: '1rem',
  } as React.CSSProperties,
  label: {
    fontFamily: "'Alegreya SC', serif",
    fontSize: '.55rem',
    letterSpacing: '.2em',
    color: 'var(--gold-dim)',
    textTransform: 'uppercase' as const,
    marginBottom: '.3rem',
    display: 'block',
  },
  input: {
    width: '100%',
    background: 'rgba(0,0,0,.35)',
    border: '1px solid var(--border)',
    borderRadius: '.4rem',
    padding: '.45rem .7rem',
    color: 'var(--text-primary)',
    fontFamily: "'Mookmania', 'Alegreya SC', serif",
    fontSize: '.85rem',
    outline: 'none',
  } as React.CSSProperties,
  select: {
    width: '100%',
    background: 'rgba(0,0,0,.35)',
    border: '1px solid var(--border)',
    borderRadius: '.4rem',
    padding: '.45rem .7rem',
    color: 'var(--text-primary)',
    fontFamily: "'Mookmania', 'Alegreya SC', serif",
    fontSize: '.85rem',
    outline: 'none',
  } as React.CSSProperties,
  sectionTitle: {
    fontFamily: "'Alegreya SC', serif",
    fontSize: '.6rem',
    letterSpacing: '.3em',
    color: 'var(--gold-dim)',
    textTransform: 'uppercase' as const,
    marginBottom: '.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
}

interface Props {
  character: Character
  inventory: InventoryItem[]
  spells: CharacterSpell[]
  spellSlots: SpellSlot[]
}

export default function CharacterSheet({ character: initial, inventory: initialInventory, spells: initialSpells, spellSlots: initialSpellSlots }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [char, setChar] = useState(initial)
  const [inventory, setInventory] = useState(initialInventory)
  const [spells, setSpells] = useState(initialSpells)
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [spellSlots, setSpellSlots] = useState<SpellSlot[]>(initialSpellSlots)
  const [slotEditing, setSlotEditing] = useState<number | null>(null) // level being edited
  const [newSlotTotal, setNewSlotTotal] = useState(1)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [invCategory, setInvCategory] = useState<InvCategory>('weapon')
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, weight: 0, description: '', category: 'misc' as InvCategory })
  const [addingItem, setAddingItem] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const prof = getProficiencyBonus(char.level)

  // ── Persisting ──────────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/characters/${char.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error()
      setChar(draft)
      setEditMode(false)
      setSaveMsg('Сохранено')
      setTimeout(() => setSaveMsg(''), 2500)
    } catch {
      setSaveMsg('Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCharacter() {
    if (!confirm('Удалить персонажа? Это нельзя отменить.')) return
    await fetch(`/api/characters/${char.id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  async function uploadAvatar(file: File) {
    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/characters/${char.id}/avatar`, { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok && data.avatar_url) {
        setChar(c => ({ ...c, avatar_url: data.avatar_url }))
        setDraft(d => ({ ...d, avatar_url: data.avatar_url }))
      }
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Inventory ───────────────────────────────────────────────────────────────

  async function addInventoryItem() {
    if (!newItem.name.trim()) return
    setAddingItem(true)
    try {
      const res = await fetch(`/api/characters/${char.id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.name, quantity: newItem.quantity, weight: newItem.weight, description: newItem.description }),
      })
      const data = await res.json()
      setInventory(prev => [...prev, data.item])
      setNewItem({ name: '', quantity: 1, weight: 0, description: '', category: 'misc' })
    } finally {
      setAddingItem(false)
    }
  }

  async function removeInventoryItem(itemId: string) {
    await fetch(`/api/characters/${char.id}/inventory/${itemId}`, { method: 'DELETE' })
    setInventory(prev => prev.filter(i => i.id !== itemId))
  }

  async function toggleEquipped(item: InventoryItem) {
    await fetch(`/api/characters/${char.id}/inventory/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipped: !item.equipped }),
    })
    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, equipped: !i.equipped } : i))
  }

  // ── Spells ──────────────────────────────────────────────────────────────────

  async function togglePrepared(spell: CharacterSpell) {
    await fetch(`/api/characters/${char.id}/spells/${spell.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prepared: !spell.prepared }),
    })
    setSpells(prev => prev.map(s => s.id === spell.id ? { ...s, prepared: !s.prepared } : s))
  }

  async function removeSpell(spellId: string) {
    await fetch(`/api/characters/${char.id}/spells/${spellId}`, { method: 'DELETE' })
    setSpells(prev => prev.filter(s => s.id !== spellId))
  }

  // ── Spell Slots ─────────────────────────────────────────────────────────────

  async function upsertSlot(level: number, total: number, used: number) {
    const res = await fetch(`/api/characters/${char.id}/spell-slots`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, total, used }),
    })
    const data = await res.json()
    if (res.ok && data.slot) {
      setSpellSlots(prev => {
        const exists = prev.find(s => s.level === level)
        return exists ? prev.map(s => s.level === level ? data.slot : s) : [...prev, data.slot]
      })
    }
  }

  async function deleteSlot(level: number) {
    await fetch(`/api/characters/${char.id}/spell-slots?level=${level}`, { method: 'DELETE' })
    setSpellSlots(prev => prev.filter(s => s.level !== level))
  }

  async function toggleSlotUsed(slot: SpellSlot) {
    const newUsed = slot.used < slot.total ? slot.used + 1 : 0
    await upsertSlot(slot.level, slot.total, newUsed)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const skillModifier = (skillId: string, statId: string) => {
    const base = getModifier(char.stats[statId as keyof typeof char.stats])
    const proficient = char.skills?.[skillId]
    return base + (proficient ? prof : 0)
  }

  const savingThrowMod = (statId: string) => {
    const base = getModifier(char.stats[statId as keyof typeof char.stats])
    const proficient = char.saving_throws?.[statId]
    return base + (proficient ? prof : 0)
  }

  const groupedInventory = INV_CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = inventory.filter(i => detectCategory(i.name, i.description) === cat.id)
    return acc
  }, {} as Record<InvCategory, InventoryItem[]>)

  const groupedSpells = spells.reduce((acc, spell) => {
    const lvl = spell.spell_level
    if (!acc[lvl]) acc[lvl] = []
    acc[lvl].push(spell)
    return acc
  }, {} as Record<number, CharacterSpell[]>)

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'main', label: 'Основное', icon: '◈' },
    { id: 'inventory', label: 'Инвентарь', icon: '⚔' },
    { id: 'magic', label: 'Магия', icon: '✦' },
    { id: 'notes', label: 'Заметки', icon: '📜' },
  ]

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>

      {/* ── ШАПКА ── */}
      <div style={{
        background: 'linear-gradient(180deg, #1a1209 0%, #120c04 100%)',
        borderBottom: '1px solid var(--border-gold)',
        padding: '1rem 1.5rem',
        boxShadow: '0 2px 20px rgba(0,0,0,.5)',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <button onClick={() => router.push('/dashboard')} style={{
            color: 'var(--text-muted)', fontFamily: "'Alegreya SC', serif", fontSize: '.75rem',
            letterSpacing: '.05em', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '.75rem',
          }}>← Главная</button>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
            {/* Аватар */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '96px', height: '96px', borderRadius: '.6rem',
                  border: '2px solid var(--border-gold)',
                  background: 'rgba(0,0,0,.4)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 0 15px rgba(139,105,20,.2)',
                }}
              >
                {char.avatar_url ? (
                  <Image src={char.avatar_url} alt={char.name} fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <span style={{ fontSize: '2.5rem', opacity: .4 }}>◈</span>
                )}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(0,0,0,.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity .2s',
                  fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: '#fff', letterSpacing: '.1em',
                }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                >
                  {avatarUploading ? '...' : 'Изменить'}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f) }} />
            </div>

            {/* Имя и инфо */}
            <div style={{ flex: 1 }}>
              {editMode ? (
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  style={{ ...S.input, fontSize: '1.6rem', fontFamily: "'Alegreya SC', serif", marginBottom: '.4rem', background: 'transparent', borderBottom: '1px solid var(--border-gold)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, padding: '0 0 .3rem' }} />
              ) : (
                <h1 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1.6rem', color: 'var(--gold)', letterSpacing: '.06em', marginBottom: '.3rem' }}>{char.name}</h1>
              )}
              <p style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.9rem', color: 'var(--text-secondary)' }}>
                {char.race} · {char.class}{char.subclass ? ` (${char.subclass})` : ''} · {char.level} уровень
              </p>
              {char.alignment && (
                <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: 'var(--text-muted)', letterSpacing: '.1em', marginTop: '.25rem' }}>{char.alignment}</p>
              )}
            </div>

            {/* Кнопки */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexShrink: 0 }}>
              {saveMsg && <span style={{ color: saveMsg === 'Сохранено' ? '#6be07a' : '#e07070', fontSize: '.8rem', fontFamily: "'Alegreya SC', serif" }}>{saveMsg}</span>}
              {editMode ? (
                <>
                  <button onClick={() => { setDraft(char); setEditMode(false) }}
                    className="btn-fantasy btn-ghost" style={{ fontSize: '.65rem' }}>Отмена</button>
                  <button onClick={save} disabled={saving}
                    className="btn-fantasy btn-gold" style={{ fontSize: '.65rem' }}>
                    {saving ? '...' : 'Сохранить'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)}
                    className="btn-fantasy btn-ghost" style={{ fontSize: '.65rem' }}>✎ Изменить</button>
                  <button onClick={deleteCharacter}
                    className="btn-fantasy" style={{ fontSize: '.65rem', borderColor: '#7a1a1a', color: '#e07070', background: 'rgba(120,20,20,.1)' }}>
                    Удалить
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Полоска HP */}
          <div style={{ marginTop: '1rem' }}>
            <HpTracker character={char} onUpdate={hp => setChar(c => ({ ...c, hp_current: hp }))} />
          </div>
        </div>
      </div>

      {/* ── БЫСТРЫЕ СТАТЫ ── */}
      <div style={{ background: 'rgba(0,0,0,.2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', padding: '.6rem 1.5rem', gap: '.5rem' }}>
          {[
            { label: 'Уровень', value: editMode ? null : char.level, field: 'level' as const, color: 'var(--gold)' },
            { label: 'КД', value: editMode ? null : char.armor_class, field: 'armor_class' as const, color: '#70b8e0' },
            { label: 'Инициатива', value: editMode ? null : formatModifier(char.initiative ?? getModifier(char.stats.dex)), field: null, color: '#e0c870' },
            { label: 'Скорость', value: editMode ? null : `${char.speed} фт`, field: 'speed' as const, color: '#70e0a0' },
            { label: 'Проф. бонус', value: editMode ? null : formatModifier(prof), field: null, color: '#c070e0' },
            { label: 'Кость хитов', value: editMode ? null : char.hit_dice, field: null, color: '#e07070' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', padding: '.5rem .25rem' }}>
              <div style={S.label}>{stat.label}</div>
              {editMode && stat.field ? (
                <input
                  type="number"
                  value={draft[stat.field] as number}
                  onChange={e => setDraft(d => ({ ...d, [stat.field!]: parseInt(e.target.value) || 0 }))}
                  style={{ ...S.input, textAlign: 'center', fontSize: '.9rem', fontFamily: "'Alegreya SC', serif", color: stat.color, padding: '.2rem .3rem', width: '100%' }}
                />
              ) : (
                <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1.1rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── КОНТЕНТ ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.5rem 2rem' }}>

        {/* Вкладки */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '.7rem 1.25rem',
              fontFamily: "'Alegreya SC', serif",
              fontSize: '.7rem',
              letterSpacing: '.15em',
              textTransform: 'uppercase',
              background: activeTab === tab.id ? 'linear-gradient(180deg, rgba(139,105,20,.1), transparent)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: '.4rem',
            }}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* ══ ОСНОВНОЕ ══ */}
        {activeTab === 'main' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

            {/* Левая колонка: характеристики */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Редактирование деталей персонажа */}
              {editMode && (
                <div style={{ ...S.card }}>
                  <div style={S.sectionTitle}>Детали персонажа</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                    {[
                      { label: 'Раса', field: 'race' as const, options: RACES_RU },
                      { label: 'Класс', field: 'class' as const, options: CLASSES_RU },
                    ].map(({ label, field, options }) => (
                      <div key={field}>
                        <span style={S.label}>{label}</span>
                        <select value={draft[field]} onChange={e => setDraft(d => ({ ...d, [field]: e.target.value }))} style={S.select}>
                          {options.map(o => <option key={o}>{o}</option>)}
                          {!options.includes(draft[field]) && <option value={draft[field]}>{draft[field]}</option>}
                        </select>
                      </div>
                    ))}
                    <div>
                      <span style={S.label}>Подкласс</span>
                      <input value={draft.subclass ?? ''} onChange={e => setDraft(d => ({ ...d, subclass: e.target.value || null }))} style={S.input} placeholder="—" />
                    </div>
                    <div>
                      <span style={S.label}>Макс. HP</span>
                      <input type="number" min={1} value={draft.hp_max} onChange={e => setDraft(d => ({ ...d, hp_max: parseInt(e.target.value) || 1 }))} style={S.input} />
                    </div>
                    <div>
                      <span style={S.label}>Кость хитов</span>
                      <input value={draft.hit_dice} onChange={e => setDraft(d => ({ ...d, hit_dice: e.target.value }))} style={S.input} placeholder="1d8" />
                    </div>
                    <div>
                      <span style={S.label}>Предыстория</span>
                      <input value={draft.background ?? ''} onChange={e => setDraft(d => ({ ...d, background: e.target.value }))} style={S.input} placeholder="Солдат..." />
                    </div>
                    <div style={{ gridColumn: '1/-1' }}>
                      <span style={S.label}>Мировоззрение</span>
                      <select value={draft.alignment ?? ''} onChange={e => setDraft(d => ({ ...d, alignment: e.target.value || null }))} style={S.select}>
                        <option value="">—</option>
                        {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 6 характеристик */}
              <div style={S.card}>
                <div style={S.sectionTitle}>Характеристики</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.6rem' }}>
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => {
                    const val = editMode ? draft.stats[stat] : char.stats[stat]
                    const mod = getModifier(val)
                    return (
                      <div key={stat} style={{
                        textAlign: 'center',
                        border: '1px solid var(--border)',
                        borderRadius: '.5rem',
                        padding: '.6rem .4rem',
                        background: 'rgba(0,0,0,.2)',
                      }}>
                        <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '.25rem' }}>
                          {STAT_LABELS[stat]}
                        </div>
                        <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                          {formatModifier(mod)}
                        </div>
                        {editMode ? (
                          <input
                            type="number" min={1} max={30} value={draft.stats[stat]}
                            onChange={e => setDraft(d => ({ ...d, stats: { ...d.stats, [stat]: parseInt(e.target.value) || 10 } }))}
                            style={{ ...S.input, textAlign: 'center', fontSize: '.75rem', padding: '.2rem', marginTop: '.3rem', width: '100%' }}
                          />
                        ) : (
                          <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                            {val}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Спасброски */}
              <div style={S.card}>
                <div style={S.sectionTitle}>Спасброски</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                  {(['str', 'dex', 'con', 'int', 'wis', 'cha'] as const).map(stat => {
                    const proficient = char.saving_throws?.[stat]
                    const mod = savingThrowMod(stat)
                    return (
                      <div key={stat} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.4rem .6rem', borderRadius: '.35rem', background: 'rgba(0,0,0,.2)', border: '1px solid var(--border)' }}>
                        <div style={{ width: '.65rem', height: '.65rem', borderRadius: '50%', border: `1.5px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                        <span style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.8rem', color: 'var(--text-secondary)', flex: 1 }}>{STAT_LABELS[stat]}</span>
                        <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.8rem', fontWeight: 700, color: mod >= 0 ? '#6be07a' : '#e07070' }}>{formatModifier(mod)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Правая колонка: навыки */}
            <div style={S.card}>
              <div style={{ ...S.sectionTitle, justifyContent: 'space-between' }}>
                <span>Навыки</span>
                <span style={{ fontSize: '.55rem', color: 'var(--text-muted)' }}>Проф. {formatModifier(prof)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                {SKILLS.map(skill => {
                  const proficient = char.skills?.[skill.id]
                  const mod = skillModifier(skill.id, skill.stat)
                  return (
                    <div key={skill.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.35rem .5rem', borderRadius: '.3rem', background: proficient ? 'rgba(139,105,20,.07)' : 'transparent' }}>
                      <div style={{ width: '.6rem', height: '.6rem', borderRadius: '50%', border: `1.5px solid ${proficient ? 'var(--gold)' : 'var(--border)'}`, background: proficient ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.8rem', color: 'var(--text-secondary)', flex: 1 }}>{skill.ru}</span>
                      <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)' }}>{STAT_LABELS[skill.stat]}</span>
                      <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.8rem', fontWeight: 700, color: mod >= 0 ? '#6be07a' : '#e07070', minWidth: '2rem', textAlign: 'right' }}>{formatModifier(mod)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ ИНВЕНТАРЬ ══ */}
        {activeTab === 'inventory' && (
          <div>
            {/* Каталог */}
            <InventoryCatalog
              characterId={char.id}
              onAdded={async (item) => {
                const res = await fetch(`/api/characters/${char.id}/inventory`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: item.name, quantity: 1, weight: item.weight, description: item.description, item_id: item.item_id }),
                })
                const data = await res.json()
                setInventory(prev => [...prev, data.item])
              }}
            />

            {/* Подразделы */}
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {INV_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setInvCategory(cat.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '.4rem',
                  padding: '.4rem .9rem',
                  fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.1em',
                  border: `1px solid ${invCategory === cat.id ? 'var(--border-gold)' : 'var(--border)'}`,
                  borderRadius: '.4rem',
                  background: invCategory === cat.id ? 'rgba(139,105,20,.12)' : 'transparent',
                  color: invCategory === cat.id ? 'var(--gold)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}>
                  {cat.icon} {cat.label}
                  <span style={{ background: 'rgba(0,0,0,.3)', borderRadius: '999px', padding: '0 .4rem', fontSize: '.55rem' }}>
                    {groupedInventory[cat.id].length}
                  </span>
                </button>
              ))}
            </div>

            {/* Добавить вручную */}
            <div style={{ ...S.card, marginBottom: '1rem' }}>
              <div style={S.sectionTitle}>Добавить предмет</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '.5rem', marginBottom: '.5rem' }}>
                <input type="text" placeholder="Название *" value={newItem.name}
                  onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
                  style={S.input} />
                <input type="number" placeholder="Кол." min={1} value={newItem.quantity}
                  onChange={e => setNewItem(n => ({ ...n, quantity: parseInt(e.target.value) || 1 }))}
                  style={{ ...S.input, width: '4.5rem', textAlign: 'center' }} />
                <input type="number" placeholder="Вес" min={0} step={0.1} value={newItem.weight}
                  onChange={e => setNewItem(n => ({ ...n, weight: parseFloat(e.target.value) || 0 }))}
                  style={{ ...S.input, width: '4.5rem', textAlign: 'center' }} />
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <input type="text" placeholder="Описание" value={newItem.description}
                  onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
                  style={{ ...S.input, flex: 1 }} />
                <button onClick={addInventoryItem} disabled={addingItem || !newItem.name.trim()}
                  className="btn-fantasy btn-gold" style={{ fontSize: '.65rem', flexShrink: 0 }}>
                  + Добавить
                </button>
              </div>
            </div>

            {/* Список по категории */}
            {groupedInventory[invCategory].length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic' }}>
                {INV_CATEGORIES.find(c => c.id === invCategory)?.icon} Нет предметов в этой категории
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {groupedInventory[invCategory].map(item => {
                  const isExpanded = expandedItemId === item.id
                  return (
                    <div key={item.id} style={{
                      ...S.card, padding: 0,
                      borderColor: item.equipped ? 'var(--border-gold)' : 'var(--border)',
                      overflow: 'hidden',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.75rem 1rem', cursor: 'pointer' }}
                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                        <button onClick={e => { e.stopPropagation(); toggleEquipped(item) }}
                          title={item.equipped ? 'Снять' : 'Надеть'}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                          <div style={{ width: '1rem', height: '1rem', borderRadius: '.2rem', border: `1.5px solid ${item.equipped ? 'var(--gold)' : 'var(--border)'}`, background: item.equipped ? 'rgba(139,105,20,.4)' : 'transparent' }} />
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: item.equipped ? 'var(--gold)' : 'var(--text-primary)' }}>{item.name}</p>
                          {item.description && !isExpanded && (
                            <p style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</p>
                          )}
                        </div>
                        <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>×{item.quantity}</span>
                        {item.description && <span style={{ color: 'var(--border)', fontSize: '.7rem', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>}
                        <button onClick={e => { e.stopPropagation(); removeInventoryItem(item.id) }}
                          style={{ background: 'none', border: 'none', color: 'var(--border)', fontSize: '.9rem', cursor: 'pointer', flexShrink: 0, transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e07070'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--border)'}>✕</button>
                      </div>
                      {isExpanded && item.description && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '.75rem 1rem', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ МАГИЯ ══ */}
        {activeTab === 'magic' && (
          <div>

            {/* ── Ячейки заклинаний ── */}
            <div style={{ ...S.card, marginBottom: '1.5rem' }}>
              <div style={{ ...S.sectionTitle, justifyContent: 'space-between' }}>
                <span>Ячейки заклинаний</span>
                <button
                  onClick={() => setSlotEditing(slotEditing !== null ? null : 1)}
                  style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.1em', color: 'var(--gold-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {slotEditing !== null ? '✓ Готово' : '+ Добавить'}
                </button>
              </div>

              {spellSlots.length === 0 && slotEditing === null ? (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '.8rem' }}>
                  Нет ячеек. Нажмите «+ Добавить» чтобы настроить.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {spellSlots.sort((a, b) => a.level - b.level).map(slot => (
                    <div key={slot.level} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                      <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', color: 'var(--gold-dim)', minWidth: '3.5rem' }}>
                        {slot.level} уровень
                      </span>
                      <div style={{ display: 'flex', gap: '.3rem', flex: 1, flexWrap: 'wrap' }}>
                        {Array.from({ length: slot.total }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => toggleSlotUsed(slot)}
                            title={i < slot.used ? 'Ячейка использована' : 'Ячейка доступна'}
                            style={{
                              width: '1.1rem', height: '1.1rem',
                              borderRadius: '50%',
                              border: `1.5px solid ${i < slot.used ? 'var(--border)' : 'var(--gold)'}`,
                              background: i < slot.used ? 'transparent' : 'rgba(139,105,20,.35)',
                              cursor: 'pointer',
                              transition: 'all .15s',
                              padding: 0,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: '.7rem', color: 'var(--text-muted)', minWidth: '2.5rem', textAlign: 'right' }}>
                        {slot.total - slot.used}/{slot.total}
                      </span>
                      {slotEditing !== null && (
                        <button onClick={() => deleteSlot(slot.level)} title="Удалить уровень"
                          style={{ background: 'none', border: 'none', color: 'var(--border)', fontSize: '.85rem', cursor: 'pointer', transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e07070'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--border)'}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Форма добавления нового уровня */}
              {slotEditing !== null && (
                <div style={{ marginTop: '.75rem', borderTop: '1px solid var(--border)', paddingTop: '.75rem', display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={S.label}>Уровень:</span>
                  <select
                    value={slotEditing}
                    onChange={e => setSlotEditing(parseInt(e.target.value))}
                    style={{ ...S.select, width: '5rem' }}
                  >
                    {[1,2,3,4,5,6,7,8,9].filter(l => !spellSlots.find(s => s.level === l)).map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <span style={S.label}>Ячеек:</span>
                  <input
                    type="number" min={1} max={20} value={newSlotTotal}
                    onChange={e => setNewSlotTotal(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{ ...S.input, width: '4rem', textAlign: 'center' }}
                  />
                  <button
                    onClick={() => {
                      const available = [1,2,3,4,5,6,7,8,9].filter(l => !spellSlots.find(s => s.level === l))
                      if (!available.length) return
                      upsertSlot(slotEditing, newSlotTotal, 0)
                      const next = available.find(l => l > slotEditing) ?? available[0] ?? null
                      setSlotEditing(next)
                      setNewSlotTotal(1)
                    }}
                    disabled={spellSlots.find(s => s.level === slotEditing) !== undefined}
                    className="btn-fantasy btn-gold"
                    style={{ fontSize: '.6rem', padding: '.3rem .7rem' }}
                  >
                    + Добавить
                  </button>
                </div>
              )}
            </div>

            {spells.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.75rem', opacity: .3 }}>✦</div>
                Нет заклинаний. Мастер может выдать их через панель управления.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {Object.keys(groupedSpells).map(Number).sort((a, b) => a - b).map(level => (
                  <div key={level}>
                    <div style={{ ...S.sectionTitle, marginBottom: '.6rem' }}>
                      <span style={{ fontSize: '.8rem' }}>✦</span>
                      {SPELL_LEVEL_LABEL(level)}
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--border), transparent)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                      {groupedSpells[level].map(spell => (
                        <div key={spell.id} style={{
                          ...S.card, padding: '.7rem 1rem',
                          display: 'flex', alignItems: 'center', gap: '.75rem',
                          borderColor: spell.prepared ? 'rgba(139,105,20,.4)' : 'var(--border)',
                          background: spell.prepared ? 'rgba(139,105,20,.07)' : 'rgba(0,0,0,.15)',
                        }}>
                          <button onClick={() => togglePrepared(spell)} title={spell.prepared ? 'Снять подготовку' : 'Подготовить'}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                            <div style={{ width: '1rem', height: '1rem', borderRadius: '50%', border: `1.5px solid ${spell.prepared ? 'var(--gold)' : 'var(--border)'}`, background: spell.prepared ? 'rgba(139,105,20,.5)' : 'transparent', transition: 'all .15s' }} />
                          </button>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.9rem', color: spell.prepared ? 'var(--gold)' : 'var(--text-primary)' }}>{spell.name}</p>
                            {spell.notes && <p style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '.75rem', color: 'var(--text-muted)' }}>{spell.notes}</p>}
                          </div>
                          <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', color: 'var(--text-muted)', letterSpacing: '.1em' }}>
                            {level === 0 ? 'Заговор' : `${level} ур.`}
                          </span>
                          <button onClick={() => removeSpell(spell.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--border)', fontSize: '.9rem', cursor: 'pointer', flexShrink: 0, transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e07070'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--border)'}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ЗАМЕТКИ ══ */}
        {activeTab === 'notes' && (
          <div>
            <textarea
              value={editMode ? (draft.notes ?? '') : (char.notes ?? '')}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              readOnly={!editMode}
              placeholder={editMode ? 'Заметки о персонаже...' : 'Нет заметок. Нажмите «Изменить» для добавления.'}
              rows={18}
              style={{
                width: '100%', boxSizing: 'border-box',
                ...S.input,
                resize: 'none',
                lineHeight: 1.7,
                fontSize: '.9rem',
                opacity: editMode ? 1 : .8,
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
