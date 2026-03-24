import { getModifier, formatModifier, STAT_LABELS } from '@/lib/utils/dnd'

interface Props {
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
  editable?: boolean
  onChange?: (stat: string, value: number) => void
}

const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export function StatsBlock({ stats, editable = false, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {STATS.map(stat => {
        const value = stats[stat]
        const mod = getModifier(value)
        return (
          <div key={stat} className="bg-gray-700 rounded-lg p-3 text-center border border-gray-600">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{STAT_LABELS[stat]}</p>
            <p className="text-xl font-bold text-purple-400 my-1">{formatModifier(mod)}</p>
            {editable ? (
              <input
                type="number" min={1} max={30} value={value}
                onChange={e => onChange?.(stat, parseInt(e.target.value) || 10)}
                className="w-full bg-gray-600 text-center text-sm rounded px-1 py-0.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            ) : (
              <p className="text-sm text-gray-300">{value}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
