'use client'

import { useState } from 'react'

const TERRAIN_ENCOUNTERS: Record<string, string[]> = {
  'Лес': ['Волк-одиночка', 'Стая гоблинов (2к6)', 'Медведь', 'Разбойники (1к4+2)', 'Дриада', 'Паук-великан', 'Банда орков (1к8)', 'Заблудший олень', 'Фея-проказница', 'Лесной тролль'],
  'Подземелье': ['Скелеты (1к6)', 'Крысиный рой', 'Зомби', 'Кобольды-охотники (2к4)', 'Мимик', 'Гарпия', 'Трогглодиты (1к8)', 'Призрак', 'Куб студня', 'Минотавр'],
  'Город': ['Карманный вор', 'Городская стража (1к4)', 'Пьяный дворянин', 'Культисты (1к6)', 'Информатор', 'Нищий-шпион', 'Торговец краденым', 'Убийца по найму', 'Беглый раб', 'Городской маг'],
  'Дорога': ['Торговый обоз', 'Разбойники на постое (2к4)', 'Паломники', 'Гонец короля', 'Сломанная телега', 'Беженцы', 'Рыцарь без лошади', 'Монах-странник', 'Наёмники', 'Скрытая засада (1к8+2)'],
  'Горы': ['Горный козёл-переросток', 'Орлы-гиганты', 'Каменный великан', 'Банда орков-горцев', 'Снежный барс', 'Дракончик', 'Обвал', 'Пещерный тролль', 'Шторм с молниями', 'Потерявшийся дварф'],
  'Болото': ['Будильник-лягушка', 'Болотные огни', 'Ящеролюди (1к6)', 'Утопленник', 'Гидра', 'Рой насекомых', 'Ведьма-болотница', 'Крокодил-переросток', 'Туман с галлюцинациями', 'Дух болота'],
}

const NPC_MALE = ['Торин', 'Аларик', 'Брандор', 'Эйдан', 'Кассиус', 'Вилгельм', 'Ренн', 'Дамир', 'Сорин', 'Гавриэль', 'Лорик', 'Нивен', 'Остар', 'Питрос', 'Кадо', 'Зефрим', 'Инар', 'Хельги', 'Юрик', 'Браэн']
const NPC_FEMALE = ['Эльза', 'Мирра', 'Саэра', 'Лирия', 'Виора', 'Кессандра', 'Нила', 'Ридара', 'Юэна', 'Бриэнн', 'Тавита', 'Сири', 'Алвина', 'Матека', 'Зара', 'Хелен', 'Корви', 'Нова', 'Эйла', 'Фин']
const NPC_SURNAMES = ['Железная Рука', 'Темнолес', 'Серебряный', 'Чёрная Кость', 'Громовой', 'из Перекрёстка', 'Ветромет', 'Дальний', 'Скалистый', 'Светлогор', 'из Болот', 'Кривой Нож', 'Тихоступ', 'Огненный', 'Снегорок']
const TAVERN_NAMES = ['Кривой Якорь', 'Три Короны', 'Спящий Дракон', 'Золотой Гусь', 'Красная Лиса', 'Пьяная Сова', 'Серебряная Монета', 'Обломанный Меч', 'Старая Ступа', 'Лунная Тропа', 'Кабаний Клык', 'Горящий Факел', 'Зелёная Ведьма', 'Сломанный Посох', 'Ленивый Лев', 'Пёстрый Шут', 'Гром и Молния', 'Тихая Заводь', 'Корона и Якорь', 'Пьяный Рыцарь']
const PLOT_HOOKS = ['Местный торговец предлагает вознаграждение за голову лидера банды', 'Ребёнок видел что-то страшное в лесу и теперь молчит', 'Церковь наняла искателей приключений для тайного поручения', 'Шахты перестали работать — говорят, что-то там завелось', 'Магический артефакт пропал из городской библиотеки', 'Путник предупреждает: впереди дорога перекрыта', 'Знатная семья ищет пропавшего наследника', 'Странный незнакомец платит золотом за молчание', 'В колодце нашли послание зашифрованное дварфийскими рунами', 'Местная ведьма просит достать редкий ингредиент', 'Стражники нашли тело без следов насилия — сердце остановилось от ужаса', 'Купец из дальнего города ищет охрану для каравана', 'Старый храм ожил после ста лет запустения', 'Рыбаки видели в реке что-то большое', 'Городской архив сгорел — кто-то специально уничтожал следы']
const WEATHER = ['Ясное небо, приятный ветерок', 'Переменная облачность', 'Моросящий дождь весь день', 'Сильный ливень с громом', 'Гроза с молниями — опасно на открытом месте', 'Туман снижает видимость до 10 метров', 'Порывистый ветер мешает стрелкам', 'Снегопад (если сезон подходит)', 'Аномальная жара — проверки на истощение', 'Магическая аномалия — странные цвета неба']

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

const resultStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-gold)',
  borderRadius: '.45rem',
  padding: '.6rem .75rem',
  marginTop: '.6rem',
}

const histItemStyle = {
  color: 'var(--text-muted)',
  fontFamily: "'Mookmania', 'Alegreya SC', serif",
  fontSize: '.8rem',
  background: 'var(--bg-elevated)',
  borderRadius: '.3rem',
  padding: '.2rem .5rem',
}

function ResultHistory({ history }: { history: string[] }) {
  if (history.length === 0) return null
  return (
    <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
      <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.15em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Предыдущие</span>
      {history.map((item, i) => <div key={i} style={histItemStyle}>{item}</div>)}
    </div>
  )
}

function RollBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn-fantasy btn-gold" style={{ marginTop: '.6rem', fontSize: '.65rem', padding: '.4rem .9rem' }}>
      {label}
    </button>
  )
}

function EncounterTab() {
  const terrains = Object.keys(TERRAIN_ENCOUNTERS)
  const [terrain, setTerrain] = useState(terrains[0])
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  function roll() { const r = pick(TERRAIN_ENCOUNTERS[terrain]); setHistory(prev => (result ? [result, ...prev].slice(0, 4) : prev)); setResult(r) }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.12em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Местность:</span>
        <select value={terrain} onChange={e => setTerrain(e.target.value)} className="input-fantasy" style={{ fontSize: '.75rem', padding: '.25rem .5rem', width: 'auto' }}>
          {terrains.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <RollBtn label="Случайная встреча" onClick={roll} />
      {result && <div style={resultStyle}>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--gold-dim)', marginBottom: '.25rem', textTransform: 'uppercase', letterSpacing: '.1em' }}>{terrain}</p>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.85rem', color: 'var(--text-primary)' }}>{result}</p>
      </div>}
      <ResultHistory history={history} />
    </div>
  )
}

function NamesTab() {
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  function generate() { const r = `${pick(gender === 'male' ? NPC_MALE : NPC_FEMALE)} ${pick(NPC_SURNAMES)}`; setHistory(prev => (result ? [result, ...prev].slice(0, 4) : prev)); setResult(r) }
  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {(['male', 'female'] as const).map(g => (
          <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.1em', color: gender === g ? 'var(--gold)' : 'var(--text-muted)' }}>
            <input type="radio" name="gender" value={g} checked={gender === g} onChange={() => setGender(g)} style={{ accentColor: 'var(--gold)' }} />
            {g === 'male' ? 'Мужское' : 'Женское'}
          </label>
        ))}
      </div>
      <RollBtn label="Сгенерировать" onClick={generate} />
      {result && <div style={resultStyle}>
        <p style={{ fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif", fontSize: '1.1rem', color: 'var(--gold)', letterSpacing: '.08em' }}>{result}</p>
      </div>}
      <ResultHistory history={history} />
    </div>
  )
}

function TavernsTab() {
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  function roll() { const r = pick(TAVERN_NAMES); setHistory(prev => (result ? [result, ...prev].slice(0, 4) : prev)); setResult(r) }
  return (
    <div>
      <RollBtn label="Случайная таверна" onClick={roll} />
      {result && <div style={resultStyle}>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--gold-dim)', marginBottom: '.25rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>Таверна</p>
        <p style={{ fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif", fontSize: '.95rem', color: 'var(--text-primary)' }}>«{result}»</p>
      </div>}
      <ResultHistory history={history} />
    </div>
  )
}

function PlotHooksTab() {
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  function roll() { const r = pick(PLOT_HOOKS); setHistory(prev => (result ? [result, ...prev].slice(0, 4) : prev)); setResult(r) }
  return (
    <div>
      <RollBtn label="Случайная зацепка" onClick={roll} />
      {result && <div style={resultStyle}>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--gold-dim)', marginBottom: '.3rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>Сюжетная зацепка</p>
        <p style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{result}</p>
      </div>}
      <ResultHistory history={history} />
    </div>
  )
}

function WeatherTab() {
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  function roll() { const r = pick(WEATHER); setHistory(prev => (result ? [result, ...prev].slice(0, 4) : prev)); setResult(r) }
  return (
    <div>
      <RollBtn label="Случайная погода" onClick={roll} />
      {result && <div style={resultStyle}>
        <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', color: 'var(--gold-dim)', marginBottom: '.25rem', letterSpacing: '.1em', textTransform: 'uppercase' }}>Погода</p>
        <p style={{ fontFamily: "'Mookmania', 'Alegreya SC', serif", fontSize: '1rem', color: 'var(--text-primary)' }}>{result}</p>
      </div>}
      <ResultHistory history={history} />
    </div>
  )
}

type TabId = 'encounters' | 'names' | 'taverns' | 'hooks' | 'weather'
const TABS: { id: TabId; label: string }[] = [
  { id: 'encounters', label: 'Встречи' },
  { id: 'names', label: 'Имена' },
  { id: 'taverns', label: 'Таверны' },
  { id: 'hooks', label: 'Зацепки' },
  { id: 'weather', label: 'Погода' },
]

export function RandomTables() {
  const [activeTab, setActiveTab] = useState<TabId>('encounters')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
      <span style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.25em', color: 'var(--gold-dim)', textTransform: 'uppercase' }}>Случайные таблицы</span>
      <div style={{ display: 'flex', gap: '.3rem', borderBottom: '1px solid var(--border)', paddingBottom: '.4rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              fontFamily: "'Alegreya SC', serif",
              fontSize: '.55rem',
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              padding: '.3rem .6rem',
              borderRadius: '.3rem',
              border: `1px solid ${activeTab === tab.id ? 'var(--border-gold)' : 'var(--border)'}`,
              background: activeTab === tab.id ? 'linear-gradient(135deg, #3a2a08, #2a1c05)' : 'transparent',
              color: activeTab === tab.id ? 'var(--gold)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all .15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ minHeight: '8rem' }}>
        {activeTab === 'encounters' && <EncounterTab />}
        {activeTab === 'names' && <NamesTab />}
        {activeTab === 'taverns' && <TavernsTab />}
        {activeTab === 'hooks' && <PlotHooksTab />}
        {activeTab === 'weather' && <WeatherTab />}
      </div>
    </div>
  )
}
