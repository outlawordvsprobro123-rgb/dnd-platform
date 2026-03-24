interface HpBarProps {
  current: number
  max: number
  temp?: number
  size?: 'sm' | 'md' | 'lg'
  showNumbers?: boolean
}

export function HpBar({ current, max, temp = 0, size = 'md', showNumbers = true }: HpBarProps) {
  const ratio = max > 0 ? current / max : 0
  const color = ratio > 0.5 ? 'bg-green-500' : ratio > 0.25 ? 'bg-yellow-500' : 'bg-red-500'
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div>
      <div className={`relative w-full bg-gray-700 rounded-full overflow-hidden ${heights[size]}`}
           role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div className={`${color} h-full rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
        {temp > 0 && (
          <div className="absolute top-0 right-0 h-full bg-blue-400 rounded-full opacity-70" style={{ width: `${Math.min(100, (temp / max) * 100)}%` }} />
        )}
      </div>
      {showNumbers && (
        <p className="text-xs text-gray-400 mt-0.5">
          {current}/{max} HP{temp > 0 ? ` (+${temp})` : ''}
        </p>
      )}
    </div>
  )
}
