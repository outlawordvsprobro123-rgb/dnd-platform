interface BadgeProps { label: string; color?: string; className?: string }

export function Badge({ label, color = 'bg-gray-700 text-gray-300', className = '' }: BadgeProps) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color} ${className}`}>{label}</span>
}
