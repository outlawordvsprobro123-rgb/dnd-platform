// ============================================================
// DnD 5e утилиты
// ============================================================

export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2
  if (level <= 8) return 3
  if (level <= 12) return 4
  if (level <= 16) return 5
  return 6
}

export function rollD20(modifier: number = 0): { roll: number; total: number } {
  const roll = Math.floor(Math.random() * 20) + 1
  return { roll, total: roll + modifier }
}

export function rollDice(sides: number, count: number = 1, modifier: number = 0): number {
  let total = modifier
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return Math.max(0, total)
}

export function parseDiceFormula(formula: string): { count: number; sides: number; modifier: number } {
  const match = formula.match(/(\d+)d(\d+)([+-]\d+)?/)
  if (!match) return { count: 1, sides: 6, modifier: 0 }
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
    modifier: match[3] ? parseInt(match[3]) : 0,
  }
}

export function crToString(cr: number): string {
  if (cr === 0.125) return '1/8'
  if (cr === 0.25) return '1/4'
  if (cr === 0.5) return '1/2'
  return cr.toString()
}

export const CONDITIONS = [
  { id: 'blinded',        ru: 'Ослеплён',      icon: '👁️' },
  { id: 'charmed',        ru: 'Очарован',       icon: '💕' },
  { id: 'deafened',       ru: 'Оглушён',        icon: '🔇' },
  { id: 'exhaustion',     ru: 'Истощение',      icon: '😴' },
  { id: 'frightened',     ru: 'Напуган',        icon: '😨' },
  { id: 'grappled',       ru: 'Схвачен',        icon: '🤝' },
  { id: 'incapacitated',  ru: 'Недееспособен',  icon: '💫' },
  { id: 'invisible',      ru: 'Невидим',        icon: '👻' },
  { id: 'paralyzed',      ru: 'Парализован',    icon: '⚡' },
  { id: 'petrified',      ru: 'Окаменевший',    icon: '🗿' },
  { id: 'poisoned',       ru: 'Отравлен',       icon: '🟢' },
  { id: 'prone',          ru: 'Лежачий',        icon: '⬇️' },
  { id: 'restrained',     ru: 'Сдержан',        icon: '⛓️' },
  { id: 'stunned',        ru: 'Оглушён (шок)',  icon: '💥' },
  { id: 'unconscious',    ru: 'Без сознания',   icon: '💤' },
] as const

export type ConditionId = typeof CONDITIONS[number]['id']

export function getConditionLabel(id: string): string {
  return CONDITIONS.find(c => c.id === id)?.ru ?? id
}

export function getConditionIcon(id: string): string {
  return CONDITIONS.find(c => c.id === id)?.icon ?? '❓'
}

export const SKILLS = [
  { id: 'acrobatics',      ru: 'Акробатика',          stat: 'dex' },
  { id: 'animal_handling', ru: 'Уход за животными',   stat: 'wis' },
  { id: 'arcana',          ru: 'Магия',                stat: 'int' },
  { id: 'athletics',       ru: 'Атлетика',             stat: 'str' },
  { id: 'deception',       ru: 'Обман',                stat: 'cha' },
  { id: 'history',         ru: 'История',              stat: 'int' },
  { id: 'insight',         ru: 'Проницательность',     stat: 'wis' },
  { id: 'intimidation',    ru: 'Запугивание',          stat: 'cha' },
  { id: 'investigation',   ru: 'Расследование',        stat: 'int' },
  { id: 'medicine',        ru: 'Медицина',             stat: 'wis' },
  { id: 'nature',          ru: 'Природа',              stat: 'int' },
  { id: 'perception',      ru: 'Внимательность',       stat: 'wis' },
  { id: 'performance',     ru: 'Выступление',          stat: 'cha' },
  { id: 'persuasion',      ru: 'Убеждение',            stat: 'cha' },
  { id: 'religion',        ru: 'Религия',              stat: 'int' },
  { id: 'sleight_of_hand', ru: 'Ловкость рук',         stat: 'dex' },
  { id: 'stealth',         ru: 'Скрытность',           stat: 'dex' },
  { id: 'survival',        ru: 'Выживание',            stat: 'wis' },
] as const

export const STAT_LABELS: Record<string, string> = {
  str: 'СИЛ',
  dex: 'ЛОВ',
  con: 'ТЕЛ',
  int: 'ИНТ',
  wis: 'МДР',
  cha: 'ХАР',
}

export const STAT_FULL_LABELS: Record<string, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
}

export const SPELL_SCHOOLS: Record<string, string> = {
  abjuration:   'Ограждение',
  conjuration:  'Вызов',
  divination:   'Прорицание',
  enchantment:  'Очарование',
  evocation:    'Воплощение',
  illusion:     'Иллюзия',
  necromancy:   'Некромантия',
  transmutation:'Преобразование',
}

export const RARITY_LABELS: Record<string, string> = {
  common:    'Обычный',
  uncommon:  'Необычный',
  rare:      'Редкий',
  very_rare: 'Очень редкий',
  legendary: 'Легендарный',
  artifact:  'Артефакт',
}

export const RARITY_COLORS: Record<string, string> = {
  common:    'text-gray-400',
  uncommon:  'text-green-400',
  rare:      'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact:  'text-red-400',
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  weapon:   'Оружие',
  armor:    'Броня',
  potion:   'Зелье',
  ring:     'Кольцо',
  wondrous: 'Чудесный предмет',
  tool:     'Инструмент',
  misc:     'Разное',
}

export function getHpColor(current: number, max: number): string {
  const ratio = current / max
  if (ratio > 0.5) return 'bg-green-500'
  if (ratio > 0.25) return 'bg-yellow-500'
  return 'bg-red-500'
}
