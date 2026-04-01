'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Character, InventoryItem } from '@/lib/supabase/types'
import { StatsBlock } from './StatsBlock'
import { HpTracker } from './HpTracker'
import { InventoryCatalog } from './InventoryCatalog'
import { SKILLS, STAT_LABELS, getProficiencyBonus, getModifier, formatModifier } from '@/lib/utils/dnd'

const CLASSES_RU = ['Варвар', 'Бард', 'Жрец', 'Друид', 'Воин', 'Монах', 'Паладин', 'Следопыт', 'Плут', 'Чародей', 'Колдун', 'Волшебник', 'Изобретатель']
const RACES_RU = ['Человек', 'Эльф', 'Дварф', 'Полурослик', 'Гном', 'Полуэльф', 'Полуорк', 'Тифлинг', 'Драконорождённый', 'Другое']
const ALIGNMENTS = ['Законопослушный добрый', 'Нейтральный добрый', 'Хаотичный добрый', 'Законопослушный нейтральный', 'Истинно нейтральный', 'Хаотичный нейтральный', 'Законопослушный злой', 'Нейтральный злой', 'Хаотичный злой']

interface Props {
  character: Character
  inventory: InventoryItem[]
}

type Tab = 'main' | 'skills' | 'inventory' | 'features' | 'notes'

export default function CharacterSheet({ character: initial, inventory: initialInventory }: Props) {
  const router = useRouter()
  const [char, setChar] = useState(initial)
  const [inventory, setInventory] = useState(initialInventory)
  const [activeTab, setActiveTab] = useState<Tab>('main')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Инвентарь — добавление
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, weight: 0, description: '' })
  const [addingItem, setAddingItem] = useState(false)

  const prof = getProficiencyBonus(char.level)

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
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {
      setSaveMsg('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCharacter() {
    if (!confirm('Удалить персонажа? Это действие нельзя отменить.')) return
    await fetch(`/api/characters/${char.id}`, { method: 'DELETE' })
    router.push('/dashboard')
  }

  async function addInventoryItem() {
    if (!newItem.name.trim()) return
    setAddingItem(true)
    try {
      const res = await fetch(`/api/characters/${char.id}/inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      })
      const data = await res.json()
      setInventory(prev => [...prev, data.item])
      setNewItem({ name: '', quantity: 1, weight: 0, description: '' })
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipped: !item.equipped }),
    })
    setInventory(prev => prev.map(i => i.id === item.id ? { ...i, equipped: !i.equipped } : i))
  }

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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'main', label: 'Основное' },
    { id: 'skills', label: 'Навыки' },
    { id: 'inventory', label: 'Инвентарь' },
    { id: 'features', label: 'Черты' },
    { id: 'notes', label: 'Заметки' },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Шапка */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-300 text-sm mb-1 block">← Назад</button>
            {editMode ? (
              <input
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                className="text-2xl font-bold bg-transparent border-b border-purple-500 text-white focus:outline-none"
              />
            ) : (
              <h1 className="text-2xl font-bold text-white">{char.name}</h1>
            )}
            <p className="text-gray-400 text-sm">{char.race} · {char.class} {char.subclass ? `(${char.subclass})` : ''} · {char.level} уровень</p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && <span className="text-sm text-green-400">{saveMsg}</span>}
            {editMode ? (
              <>
                <button onClick={() => { setDraft(char); setEditMode(false) }} className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 rounded-lg border border-gray-600">Отмена</button>
                <button onClick={save} disabled={saving} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm px-4 py-1.5 rounded-lg">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="text-gray-400 hover:text-gray-200 text-sm px-3 py-1.5 rounded-lg border border-gray-600">Редактировать</button>
                <button onClick={deleteCharacter} className="text-red-500 hover:text-red-400 text-sm px-3 py-1.5 rounded-lg border border-red-900">Удалить</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Быстрые характеристики */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Уровень', value: char.level, color: 'text-purple-400' },
            { label: 'КД', value: char.armor_class, color: 'text-blue-400' },
            { label: 'Инициатива', value: formatModifier(char.initiative ?? getModifier(char.stats.dex)), color: 'text-yellow-400' },
            { label: 'Скорость', value: `${char.speed} фт`, color: 'text-green-400' },
            { label: 'Бонус мастерства', value: formatModifier(prof), color: 'text-orange-400' },
            { label: 'Кость хитов', value: char.hit_dice, color: 'text-red-400' },
          ].map(item => (
            <div key={item.label} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
              <p className="text-gray-500 text-xs mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Хит-пойнты */}
        <div className="mb-6">
          <HpTracker character={char} onUpdate={hp => setChar(c => ({ ...c, hp_current: hp }))} />
        </div>

        {/* Вкладки */}
        <div className="flex gap-1 mb-6 border-b border-gray-700">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${activeTab === tab.id ? 'text-white bg-gray-800 border-x border-t border-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ОСНОВНОЕ */}
        {activeTab === 'main' && (
          <div className="space-y-6">
            {/* Описание персонажа */}
            {editMode && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Раса</label>
                  <select value={draft.race} onChange={e => setDraft(d => ({ ...d, race: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    {RACES_RU.map(r => <option key={r}>{r}</option>)}
                    <option value={draft.race}>{draft.race}</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Класс</label>
                  <select value={draft.class} onChange={e => setDraft(d => ({ ...d, class: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    {CLASSES_RU.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Уровень</label>
                  <input type="number" min={1} max={20} value={draft.level}
                    onChange={e => setDraft(d => ({ ...d, level: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">КД</label>
                  <input type="number" min={1} value={draft.armor_class}
                    onChange={e => setDraft(d => ({ ...d, armor_class: parseInt(e.target.value) || 10 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Скорость (фт)</label>
                  <input type="number" min={0} step={5} value={draft.speed}
                    onChange={e => setDraft(d => ({ ...d, speed: parseInt(e.target.value) || 30 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Максимум HP</label>
                  <input type="number" min={1} value={draft.hp_max}
                    onChange={e => setDraft(d => ({ ...d, hp_max: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Мировоззрение</label>
                  <select value={draft.alignment ?? ''} onChange={e => setDraft(d => ({ ...d, alignment: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                    <option value="">—</option>
                    {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Предыстория</label>
                  <input type="text" value={draft.background ?? ''}
                    onChange={e => setDraft(d => ({ ...d, background: e.target.value }))}
                    placeholder="Солдат, Преступник..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>
            )}

            {/* Атрибуты */}
            <div>
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Основные характеристики</h2>
              <StatsBlock
                stats={editMode ? draft.stats : char.stats}
                editable={editMode}
                onChange={(stat, val) => setDraft(d => ({ ...d, stats: { ...d.stats, [stat]: val } }))}
              />
            </div>

            {/* Спасброски */}
            <div>
              <h2 className="text-gray-400 text-xs uppercase tracking-wider mb-3">Спасброски</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['str','dex','con','int','wis','cha'] as const).map(stat => {
                  const proficient = char.saving_throws?.[stat]
                  const mod = savingThrowMod(stat)
                  return (
                    <div key={stat} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                      <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${proficient ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`} />
                      <span className="text-gray-300 text-sm flex-1">{STAT_LABELS[stat]}</span>
                      <span className={`font-semibold text-sm ${mod >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatModifier(mod)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* НАВЫКИ */}
        {activeTab === 'skills' && (
          <div>
            <p className="text-gray-500 text-xs mb-3">Бонус мастерства: {formatModifier(prof)} · Закрашенный кружок — владение</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SKILLS.map(skill => {
                const proficient = char.skills?.[skill.id]
                const mod = skillModifier(skill.id, skill.stat)
                return (
                  <div key={skill.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${proficient ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`} />
                    <span className="text-gray-300 text-sm flex-1">{skill.ru}</span>
                    <span className="text-gray-500 text-xs">{STAT_LABELS[skill.stat]}</span>
                    <span className={`font-semibold text-sm ${mod >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatModifier(mod)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ИНВЕНТАРЬ */}
        {activeTab === 'inventory' && (
          <div>
            {/* Каталог */}
            <InventoryCatalog
              characterId={char.id}
              onAdded={async (item) => {
                setAddingItem(true)
                try {
                  const res = await fetch(`/api/characters/${char.id}/inventory`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: item.name, quantity: 1, weight: item.weight, description: item.description, item_id: item.item_id }),
                  })
                  const data = await res.json()
                  setInventory(prev => [...prev, data.item])
                } finally {
                  setAddingItem(false)
                }
              }}
            />

            {/* Добавить предмет вручную */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
              <h3 className="text-gray-300 text-sm font-medium mb-3">Добавить вручную</h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Название *"
                  value={newItem.name}
                  onChange={e => setNewItem(n => ({ ...n, name: e.target.value }))}
                  className="col-span-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <input
                  type="number"
                  placeholder="Кол-во"
                  min={1}
                  value={newItem.quantity}
                  onChange={e => setNewItem(n => ({ ...n, quantity: parseInt(e.target.value) || 1 }))}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm text-center focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Описание"
                  value={newItem.description}
                  onChange={e => setNewItem(n => ({ ...n, description: e.target.value }))}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={addInventoryItem}
                  disabled={addingItem || !newItem.name.trim()}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm"
                >
                  + Добавить
                </button>
              </div>
            </div>

            {/* Список предметов */}
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Инвентарь пуст</div>
            ) : (
              <div className="space-y-2">
                {inventory.map(item => {
                  const isExpanded = expandedItemId === item.id
                  return (
                    <div key={item.id} className={`bg-gray-800 border rounded-xl ${item.equipped ? 'border-purple-700' : 'border-gray-700'}`}>
                      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                        <button onClick={e => { e.stopPropagation(); toggleEquipped(item) }} title={item.equipped ? 'Снять' : 'Надеть'}>
                          <div className={`w-4 h-4 rounded border ${item.equipped ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{item.name}</p>
                          {item.description && !isExpanded && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                        </div>
                        <span className="text-gray-400 text-sm flex-shrink-0">× {item.quantity}</span>
                        {item.description && <span className="text-gray-600 text-xs flex-shrink-0">{isExpanded ? '▲' : '▼'}</span>}
                        <button onClick={e => { e.stopPropagation(); removeInventoryItem(item.id) }} className="text-gray-600 hover:text-red-400 text-sm transition-colors flex-shrink-0">✕</button>
                      </div>
                      {isExpanded && item.description && (
                        <div className="px-4 pb-3 text-xs text-gray-300 leading-relaxed border-t border-gray-700 pt-2">
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

        {/* ЧЕРТЫ */}
        {activeTab === 'features' && (
          <div>
            {char.features?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Нет черт класса</div>
            ) : (
              <div className="space-y-3">
                {char.features?.map((f, i) => (
                  <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                    <h3 className="font-medium text-white mb-1">{f.name}</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ЗАМЕТКИ */}
        {activeTab === 'notes' && (
          <div>
            <textarea
              value={editMode ? (draft.notes ?? '') : (char.notes ?? '')}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
              readOnly={!editMode}
              placeholder={editMode ? 'Заметки о персонаже...' : 'Нет заметок. Нажмите «Редактировать» для добавления.'}
              rows={15}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm leading-relaxed focus:outline-none focus:border-purple-500 resize-none read-only:cursor-default"
            />
          </div>
        )}
      </div>
    </div>
  )
}
