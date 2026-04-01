'use client'
import { useState, useEffect } from 'react'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import { createClient } from '@/lib/supabase/client'
import type { WeatherType, TimeOfDay } from '@/lib/supabase/types'

interface BestiaryRow { id: string; name: string; size: string; type: string; cr: number; hp: number; ac: number; image_url: string | null }
interface CharacterRow { id: string; name: string; race: string; class: string; level: number; hp_current: number; hp_max: number; image_url: string | null }
interface SessionCharacter { id: string; name: string; image_url: string | null }
interface LootRow { id: string; name: string; type: string; rarity: string; description: string; weight: number }
interface SpellRow { id: string; name: string; level: number; school: string; classes: string[] }

interface Props {
  sessionId: string
  bestiaryCreatures: BestiaryRow[]
  characters: CharacterRow[]
  sessionCharacters: SessionCharacter[]
  lootItems: LootRow[]
  spells: SpellRow[]
  onClose: () => void
  broadcast: (event: string, payload: unknown) => void
}

type Tab = 'map' | 'tokens' | 'fog' | 'world' | 'give'
type GiveSubTab = 'loot' | 'spell'

const LOGICAL_W = 1200
const LOGICAL_H = 700

const WEATHER_OPTIONS: { value: WeatherType; label: string; icon: string }[] = [
  { value: 'clear', label: 'Ясно', icon: '☀️' },
  { value: 'cloudy', label: 'Облачно', icon: '⛅' },
  { value: 'rain', label: 'Дождь', icon: '🌧' },
  { value: 'storm', label: 'Гроза', icon: '⛈' },
  { value: 'snow', label: 'Снег', icon: '🌨' },
  { value: 'fog', label: 'Туман', icon: '🌫' },
  { value: 'heat', label: 'Жара', icon: '🔥' },
]

const TIME_OPTIONS: { value: TimeOfDay; label: string; icon: string }[] = [
  { value: 'dawn', label: 'Рассвет', icon: '🌅' },
  { value: 'day', label: 'День', icon: '🌞' },
  { value: 'dusk', label: 'Закат', icon: '🌆' },
  { value: 'night', label: 'Ночь', icon: '🌙' },
  { value: 'midnight', label: 'Полночь', icon: '🌑' },
]

const RARITY_COLORS: Record<string, string> = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact: 'text-red-400',
}

export function MapMasterPanel({
  sessionId, bestiaryCreatures, characters, sessionCharacters, lootItems, spells, onClose, broadcast,
}: Props) {
  const { mapState, fogState, setMapState, setFogState, addToken, selectedTool, setSelectedTool } = useMapStore()
  const { worldState, setWorldState } = useWorldStore()
  const [tab, setTab] = useState<Tab>('map')

  // Map tab state
  const [mapUrl, setMapUrl] = useState(mapState?.map_url ?? '')
  const [mapType, setMapType] = useState<'image' | 'gif' | 'video'>(mapState?.map_type ?? 'image')
  const [gridType, setGridType] = useState(mapState?.grid_type ?? 'square')
  const [gridSize, setGridSize] = useState(mapState?.grid_size ?? 50)
  const [gridStroke, setGridStroke] = useState(mapState?.grid_stroke_width ?? 1)
  const [uploading, setUploading] = useState(false)

  // Tokens tab state
  const [tokenSearch, setTokenSearch] = useState('')
  const [adding, setAdding] = useState<string | null>(null)

  // Give tab state
  const [giveSubTab, setGiveSubTab] = useState<GiveSubTab>('loot')
  const [giveSearch, setGiveSearch] = useState('')
  const [targetCharId, setTargetCharId] = useState<string>('')
  const [giving, setGiving] = useState(false)
  const [giveResult, setGiveResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [liveChars, setLiveChars] = useState<SessionCharacter[]>(sessionCharacters)
  const [charsLoading, setCharsLoading] = useState(false)

  async function reloadChars() {
    setCharsLoading(true)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/players`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setLiveChars(data)
      }
    } finally {
      setCharsLoading(false)
    }
  }

  useEffect(() => { reloadChars() }, [])

  const supabase = createClient()

  const filteredBestiary = bestiaryCreatures.filter(c =>
    c.name.toLowerCase().includes(tokenSearch.toLowerCase())
  ).slice(0, 30)

  const filteredLoot = lootItems.filter(i =>
    i.name.toLowerCase().includes(giveSearch.toLowerCase())
  ).slice(0, 40)

  const filteredSpells = spells.filter(s =>
    s.name.toLowerCase().includes(giveSearch.toLowerCase())
  ).slice(0, 40)

  // ── Map ─────────────────────────────────────────────────────────────────────

  async function applyMap() {
    const body = { map_url: mapUrl || null, map_type: mapType, grid_type: gridType, grid_size: gridSize, grid_stroke_width: gridStroke }
    const res = await fetch(`/api/sessions/${sessionId}/map`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const { map_state } = await res.json()
      setMapState(map_state)
      broadcast('map:updated', map_state)
    }
  }

  async function uploadMapFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const path = `maps/${sessionId}/${Date.now()}.${ext}`
      const { data, error } = await supabase.storage.from('maps').upload(path, file)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('maps').getPublicUrl(data.path)
      const type: 'image' | 'gif' | 'video' = file.type.startsWith('video/') ? 'video' : ext === 'gif' ? 'gif' : 'image'
      setMapUrl(publicUrl)
      setMapType(type)
      const res = await fetch(`/api/sessions/${sessionId}/map`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ map_url: publicUrl, map_type: type, grid_type: gridType, grid_size: gridSize, grid_stroke_width: gridStroke }),
      })
      if (res.ok) {
        const { map_state } = await res.json()
        setMapState(map_state)
        broadcast('map:updated', map_state)
      }
    } catch (err) {
      alert('Ошибка загрузки: ' + (err instanceof Error ? err.message : 'Создайте bucket "maps" в Supabase Storage'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // ── Tokens ──────────────────────────────────────────────────────────────────

  async function addBestiaryToken(creature: BestiaryRow) {
    setAdding(creature.id)
    try {
      const sizeMap: Record<string, number> = { Tiny: 25, Small: 35, Medium: 50, Large: 75, Huge: 100, Gargantuan: 150 }
      const size = sizeMap[creature.size] ?? 50
      const res = await fetch(`/api/sessions/${sessionId}/tokens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: 'npc', label: creature.name, image_url: creature.image_url,
          x: LOGICAL_W / 2 + Math.random() * 100 - 50,
          y: LOGICAL_H / 2 + Math.random() * 100 - 50,
          width: size, height: size, hp_max: creature.hp, hp_current: creature.hp,
        }),
      })
      if (!res.ok) { alert('Ошибка: ' + (await res.json()).error); return }
      const { token } = await res.json()
      addToken(token)
      broadcast('token:added', token)
    } finally { setAdding(null) }
  }

  async function addCharacterToken(char: CharacterRow) {
    setAdding(char.id)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/tokens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: 'player', owner_id: char.id, label: char.name, image_url: char.image_url,
          x: LOGICAL_W / 2 + Math.random() * 100 - 50,
          y: LOGICAL_H / 2 + Math.random() * 100 - 50,
          width: 50, height: 50, hp_max: char.hp_max, hp_current: char.hp_current,
        }),
      })
      if (!res.ok) { alert('Ошибка: ' + (await res.json()).error); return }
      const { token } = await res.json()
      addToken(token)
      broadcast('token:added', token)
    } finally { setAdding(null) }
  }

  // ── Fog ─────────────────────────────────────────────────────────────────────

  async function toggleFog() {
    const newEnabled = !fogState?.fog_enabled
    const res = await fetch(`/api/sessions/${sessionId}/fog`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fog_enabled: newEnabled }),
    })
    if (res.ok) {
      const { fog_state } = await res.json()
      setFogState(fog_state)
      broadcast('fog:updated', fog_state)
    }
  }

  async function clearFog() {
    const res = await fetch(`/api/sessions/${sessionId}/fog`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed_zones: [] }),
    })
    if (res.ok) {
      const { fog_state } = await res.json()
      setFogState(fog_state)
      broadcast('fog:updated', fog_state)
    }
  }

  async function revealAll() {
    const res = await fetch(`/api/sessions/${sessionId}/fog`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed_zones: [{ x: LOGICAL_W / 2, y: LOGICAL_H / 2, radius: Math.max(LOGICAL_W, LOGICAL_H) }] }),
    })
    if (res.ok) {
      const { fog_state } = await res.json()
      setFogState(fog_state)
      broadcast('fog:updated', fog_state)
    }
  }

  // ── World ────────────────────────────────────────────────────────────────────

  async function setWeather(weather: WeatherType) {
    const res = await fetch(`/api/sessions/${sessionId}/world`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weather }),
    })
    if (res.ok) {
      const { world_state } = await res.json()
      setWorldState(world_state)
      broadcast('world:updated', world_state)
    }
  }

  async function setTimeOfDay(time_of_day: TimeOfDay) {
    const res = await fetch(`/api/sessions/${sessionId}/world`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_of_day }),
    })
    if (res.ok) {
      const { world_state } = await res.json()
      setWorldState(world_state)
      broadcast('world:updated', world_state)
    }
  }

  // ── Give ─────────────────────────────────────────────────────────────────────

  async function giveLoot(item: LootRow) {
    if (!targetCharId) { setGiveResult({ ok: false, msg: 'Выберите персонажа' }); return }
    setGiving(true)
    setGiveResult(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/give/loot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: targetCharId,
          item_id: item.id,
          name: item.name,
          description: item.description,
          quantity: 1,
          weight: item.weight,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        const char = liveChars.find(c => c.id === targetCharId)
        setGiveResult({ ok: true, msg: `${item.name} → ${char?.name ?? 'персонаж'}` })
      } else {
        setGiveResult({ ok: false, msg: json.error ?? 'Ошибка' })
      }
    } finally { setGiving(false) }
  }

  async function giveSpell(spell: SpellRow) {
    if (!targetCharId) { setGiveResult({ ok: false, msg: 'Выберите персонажа' }); return }
    setGiving(true)
    setGiveResult(null)
    try {
      const res = await fetch(`/api/sessions/${sessionId}/give/spell`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: targetCharId,
          spell_id: spell.id,
          name: spell.name,
          spell_level: spell.level,
        }),
      })
      const json = await res.json()
      if (res.ok) {
        const char = liveChars.find(c => c.id === targetCharId)
        setGiveResult({ ok: true, msg: `${spell.name} → ${char?.name ?? 'персонаж'}` })
      } else {
        setGiveResult({ ok: false, msg: json.error ?? 'Ошибка' })
      }
    } finally { setGiving(false) }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string }[] = [
    { key: 'map', label: '🗺' },
    { key: 'tokens', label: '🪙' },
    { key: 'fog', label: '🌫' },
    { key: 'world', label: '🌍' },
    { key: 'give', label: '🎁' },
  ]

  return (
    <div className="h-full bg-gray-900 border-l border-gray-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 flex-shrink-0">
        <h2 className="font-bold text-white text-sm">⚙ Панель мастера</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
      </div>

      <div className="flex border-b border-gray-700 flex-shrink-0">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-gray-700 text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── MAP TAB ── */}
        {tab === 'map' && (
          <>
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium">Тип карты</label>
              <div className="flex gap-1">
                {(['image', 'gif', 'video'] as const).map(t => (
                  <button key={t} onClick={() => setMapType(t)}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${mapType === t ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                    {t === 'image' ? '🖼 Фото' : t === 'gif' ? '✨ GIF' : '🎬 Видео'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">URL карты</label>
              <input value={mapUrl} onChange={e => setMapUrl(e.target.value)} placeholder="https://..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              <button onClick={applyMap} className="w-full bg-purple-700 hover:bg-purple-600 text-white text-xs py-1.5 rounded transition-colors">
                Применить
              </button>
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Загрузить файл</label>
              <label className={`block w-full text-center py-2 text-xs rounded border border-gray-600 cursor-pointer transition-colors ${uploading ? 'opacity-50' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                {uploading ? 'Загрузка...' : '📁 Выбрать файл (JPG/GIF/MP4)'}
                <input type="file" accept="image/*,video/*,.gif" className="hidden" onChange={uploadMapFile} disabled={uploading} />
              </label>
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-3">
              <label className="text-xs text-gray-400 font-medium">Сетка</label>
              <div className="flex gap-1">
                {(['square', 'hex', 'none'] as const).map(g => (
                  <button key={g} onClick={() => setGridType(g)}
                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${gridType === g ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                    {g === 'square' ? '⬜ Квадрат' : g === 'hex' ? '⬡ Гекс' : '✕ Нет'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">Размер {gridSize}px</label>
                <input type="range" min={20} max={150} value={gridSize} onChange={e => setGridSize(Number(e.target.value))} className="flex-1 accent-purple-500" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 w-16">Толщина {gridStroke}px</label>
                <input type="range" min={0.5} max={8} step={0.5} value={gridStroke} onChange={e => setGridStroke(Number(e.target.value))} className="flex-1 accent-purple-500" />
              </div>
              <button onClick={applyMap} className="w-full bg-gray-700 hover:bg-gray-600 text-white text-xs py-1.5 rounded border border-gray-600 transition-colors">
                Применить сетку
              </button>
            </div>
          </>
        )}

        {/* ── TOKENS TAB ── */}
        {tab === 'tokens' && (
          <>
            {characters.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-400 font-medium">Персонажи</p>
                {characters.map(char => (
                  <button key={char.id} onClick={() => addCharacterToken(char)} disabled={adding === char.id}
                    className="w-full flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-600 rounded px-2 py-1.5 text-left transition-colors disabled:opacity-50">
                    <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                      {char.image_url ? <img src={char.image_url} alt="" className="w-full h-full object-cover" /> : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{char.name}</p>
                      <p className="text-xs text-gray-500">{char.race} · {char.class} · {char.level} ур.</p>
                    </div>
                    <span className="text-xs text-green-400">{char.hp_current}/{char.hp_max}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs text-gray-400 font-medium">Бестиарий</p>
              <input value={tokenSearch} onChange={e => setTokenSearch(e.target.value)} placeholder="Поиск монстра..."
                className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {filteredBestiary.map(creature => (
                  <button key={creature.id} onClick={() => addBestiaryToken(creature)} disabled={adding === creature.id}
                    className="w-full flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-purple-600 rounded px-2 py-1.5 text-left transition-colors disabled:opacity-50">
                    <div className="w-7 h-7 rounded-full bg-red-900 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden">
                      {creature.image_url ? <img src={creature.image_url} alt="" className="w-full h-full object-cover" /> : '👾'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{creature.name}</p>
                      <p className="text-xs text-gray-500">CR {creature.cr} · {creature.type}</p>
                    </div>
                    <span className="text-xs text-red-400">{creature.hp} HP</span>
                  </button>
                ))}
                {filteredBestiary.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Ничего не найдено</p>}
              </div>
            </div>
          </>
        )}

        {/* ── FOG TAB ── */}
        {tab === 'fog' && (
          <>
            <div className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
              <span className="text-sm text-gray-200">Туман войны</span>
              <button onClick={toggleFog}
                className={`relative w-10 h-6 rounded-full transition-colors ${fogState?.fog_enabled ? 'bg-purple-600' : 'bg-gray-600'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${fogState?.fog_enabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium">Инструменты рисования</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setSelectedTool('fog-reveal')}
                  className={`py-2 text-xs rounded border transition-colors ${selectedTool === 'fog-reveal' ? 'bg-yellow-700 border-yellow-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                  ☀ Открыть
                </button>
                <button onClick={() => setSelectedTool('fog-hide')}
                  className={`py-2 text-xs rounded border transition-colors ${selectedTool === 'fog-hide' ? 'bg-gray-600 border-gray-400 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                  🌑 Закрыть
                </button>
                <button onClick={() => setSelectedTool('select')}
                  className={`py-2 text-xs rounded border transition-colors ${selectedTool === 'select' ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                  ↖ Выбор
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button onClick={revealAll} className="py-2 text-xs bg-yellow-700 hover:bg-yellow-600 text-white rounded transition-colors">
                ☀ Открыть всё
              </button>
              <button onClick={clearFog} className="py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600 transition-colors">
                🌑 Закрыть всё
              </button>
            </div>
          </>
        )}

        {/* ── WORLD TAB ── */}
        {tab === 'world' && (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">Погода</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {WEATHER_OPTIONS.map(w => (
                    <button key={w.value} onClick={() => setWeather(w.value)}
                      className={`flex items-center gap-2 px-2 py-2 text-xs rounded border transition-colors ${worldState?.weather === w.value ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                      <span className="text-base">{w.icon}</span>
                      <span>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-400 font-medium mb-2">Время суток</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TIME_OPTIONS.map(t => (
                    <button key={t.value} onClick={() => setTimeOfDay(t.value)}
                      className={`flex items-center gap-2 px-2 py-2 text-xs rounded border transition-colors ${worldState?.time_of_day === t.value ? 'bg-purple-700 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                      <span className="text-base">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {worldState && (
                <div className="border-t border-gray-700 pt-3">
                  <p className="text-xs text-gray-500">Текущее состояние мира:</p>
                  <p className="text-sm text-white mt-1">
                    {WEATHER_OPTIONS.find(w => w.value === worldState.weather)?.icon}{' '}
                    {WEATHER_OPTIONS.find(w => w.value === worldState.weather)?.label}
                    {' · '}
                    {TIME_OPTIONS.find(t => t.value === worldState.time_of_day)?.icon}{' '}
                    {TIME_OPTIONS.find(t => t.value === worldState.time_of_day)?.label}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── GIVE TAB ── */}
        {tab === 'give' && (
          <>
            {/* Target character */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400 font-medium">Получатель</label>
                <button onClick={reloadChars} disabled={charsLoading} className="text-xs text-gray-500 hover:text-gray-300 transition-colors" title="Обновить список">
                  {charsLoading ? '...' : '↻ Обновить'}
                </button>
              </div>
              {liveChars.length === 0 ? (
                <p className="text-xs text-gray-500 py-2 text-center">
                  {charsLoading ? 'Загрузка...' : 'Нет персонажей в сессии'}
                </p>
              ) : (
                <select value={targetCharId} onChange={e => setTargetCharId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500">
                  <option value="">— выбрать персонажа —</option>
                  {liveChars.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1">
              <button onClick={() => { setGiveSubTab('loot'); setGiveSearch(''); setGiveResult(null) }}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${giveSubTab === 'loot' ? 'bg-yellow-700 border-yellow-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                💎 Лут
              </button>
              <button onClick={() => { setGiveSubTab('spell'); setGiveSearch(''); setGiveResult(null) }}
                className={`flex-1 py-1.5 text-xs rounded border transition-colors ${giveSubTab === 'spell' ? 'bg-blue-700 border-blue-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'}`}>
                ✨ Заклинание
              </button>
            </div>

            {/* Result message */}
            {giveResult && (
              <div className={`text-xs px-3 py-2 rounded ${giveResult.ok ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {giveResult.ok ? '✓ ' : '✗ '}{giveResult.msg}
              </div>
            )}

            {/* Search */}
            <input value={giveSearch} onChange={e => { setGiveSearch(e.target.value); setGiveResult(null) }}
              placeholder={giveSubTab === 'loot' ? 'Поиск предмета...' : 'Поиск заклинания...'}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />

            {/* Loot list */}
            {giveSubTab === 'loot' && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredLoot.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${RARITY_COLORS[item.rarity] ?? 'text-white'}`}>{item.name}</p>
                      <p className="text-xs text-gray-500">{item.type} · {item.rarity}</p>
                    </div>
                    <button onClick={() => giveLoot(item)} disabled={giving || !targetCharId}
                      className="flex-shrink-0 px-2 py-1 bg-yellow-700 hover:bg-yellow-600 text-white text-xs rounded transition-colors disabled:opacity-40">
                      Выдать
                    </button>
                  </div>
                ))}
                {filteredLoot.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Ничего не найдено</p>}
              </div>
            )}

            {/* Spell list */}
            {giveSubTab === 'spell' && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredSpells.map(spell => (
                  <div key={spell.id} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-300 truncate">{spell.name}</p>
                      <p className="text-xs text-gray-500">
                        {spell.level === 0 ? 'Заговор' : `${spell.level} ур.`} · {spell.school}
                      </p>
                    </div>
                    <button onClick={() => giveSpell(spell)} disabled={giving || !targetCharId}
                      className="flex-shrink-0 px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded transition-colors disabled:opacity-40">
                      Выдать
                    </button>
                  </div>
                ))}
                {filteredSpells.length === 0 && <p className="text-xs text-gray-500 text-center py-4">Ничего не найдено</p>}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
