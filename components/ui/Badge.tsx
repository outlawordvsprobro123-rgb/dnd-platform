interface BadgeProps { label: string; color?: string; className?: string }

export function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-cinzel tracking-wider ${color ?? 'rarity-common'} ${className}`}
      style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.1em' }}
    >
      {label}
    </span>
  )
}

// Хелпер для редкости
export function RarityBadge({ rarity }: { rarity: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    common:    { label: 'Обычный',       cls: 'rarity-common' },
    uncommon:  { label: 'Необычный',     cls: 'rarity-uncommon' },
    rare:      { label: 'Редкий',        cls: 'rarity-rare' },
    very_rare: { label: 'Оч. редкий',   cls: 'rarity-very_rare' },
    legendary: { label: 'Легендарный',  cls: 'rarity-legendary' },
    artifact:  { label: 'Артефакт',     cls: 'rarity-artifact' },
  }
  const { label, cls } = map[rarity] ?? { label: rarity, cls: 'rarity-common' }
  return <Badge label={label} color={cls} />
}
