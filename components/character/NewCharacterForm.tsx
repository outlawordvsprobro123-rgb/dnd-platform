'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatsBlock } from './StatsBlock'
import { getProficiencyBonus } from '@/lib/utils/dnd'

const CLASSES = ['Варвар', 'Бард', 'Жрец', 'Друид', 'Воин', 'Монах', 'Паладин', 'Следопыт', 'Плут', 'Чародей', 'Колдун', 'Волшебник', 'Изобретатель']
const RACES = ['Человек', 'Эльф', 'Дварф', 'Полурослик', 'Гном', 'Полуэльф', 'Полуорк', 'Тифлинг', 'Драконорождённый', 'Другое']

const HIT_DICE: Record<string, string> = {
  'Варвар': 'd12', 'Воин': 'd10', 'Паладин': 'd10', 'Следопыт': 'd10',
  'Бард': 'd8', 'Жрец': 'd8', 'Друид': 'd8', 'Монах': 'd8', 'Плут': 'd8',
  'Изобретатель': 'd8', 'Чародей': 'd6', 'Колдун': 'd8', 'Волшебник': 'd6',
}

export default function NewCharacterForm() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    race: 'Человек',
    class: 'Воин',
    level: 1,
    alignment: '',
    background: '',
    stats: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hp_max: 10,
    armor_class: 10,
    speed: 30,
  })

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function submit() {
    if (!form.name.trim()) { setError('Введите имя персонажа'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          hp_current: form.hp_max,
          hit_dice: HIT_DICE[form.class] ?? 'd8',
          proficiency_bonus: getProficiencyBonus(form.level),
          hp_temp: 0,
          experience: 0,
          death_saves: { successes: 0, failures: 0 },
          saving_throws: {},
          skills: {},
          features: [],
          traits: {},
          notes: '',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Ошибка')
      router.push(`/character/${data.character.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка создания')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-300 text-sm mb-2 block">← Назад</button>
        <h1 className="text-2xl font-bold text-white">Новый персонаж</h1>
        <p className="text-gray-400 text-sm">Шаг {step} из 2</p>
      </div>

      {/* Прогресс */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-purple-500' : 'bg-gray-700'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Основная информация</h2>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Имя персонажа *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Боромир Дубовый..."
              autoFocus
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Раса</label>
              <select value={form.race} onChange={e => set('race', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                {RACES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Класс</label>
              <select value={form.class} onChange={e => set('class', e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                {CLASSES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Уровень</label>
              <input type="number" min={1} max={20} value={form.level}
                onChange={e => set('level', parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Мировоззрение</label>
              <input type="text" value={form.alignment}
                onChange={e => set('alignment', e.target.value)}
                placeholder="Нейтральный"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Предыстория</label>
              <input type="text" value={form.background}
                onChange={e => set('background', e.target.value)}
                placeholder="Солдат"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>
          <button
            onClick={() => { if (!form.name.trim()) { setError('Введите имя'); return } setError(''); setStep(2) }}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2.5 rounded-lg font-medium mt-2"
          >
            Далее →
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Характеристики</h2>
            <StatsBlock
              stats={form.stats}
              editable
              onChange={(stat, val) => set('stats', { ...form.stats, [stat]: val })}
            />
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 grid grid-cols-3 gap-4">
            <div>
              <label className="text-gray-400 text-sm block mb-1">Максимум HP</label>
              <input type="number" min={1} value={form.hp_max}
                onChange={e => set('hp_max', parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Класс доспеха</label>
              <input type="number" min={1} value={form.armor_class}
                onChange={e => set('armor_class', parseInt(e.target.value) || 10)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div>
              <label className="text-gray-400 text-sm block mb-1">Скорость (фт)</label>
              <input type="number" min={0} step={5} value={form.speed}
                onChange={e => set('speed', parseInt(e.target.value) || 30)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg">← Назад</button>
            <button onClick={submit} disabled={loading} className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
              {loading ? 'Создание...' : 'Создать персонажа'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
