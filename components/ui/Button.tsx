import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'btn-fantasy btn-gold',
  secondary: 'btn-fantasy btn-ghost',
  danger:    'btn-fantasy btn-crimson',
  ghost:     'btn-fantasy btn-ghost',
}
const sizes = {
  sm: 'text-xs px-3 py-1.5',
  md: '',
  lg: 'text-sm px-6 py-3',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading
        ? <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin"
            style={{ borderColor: 'rgba(201,168,76,.3)', borderTopColor: '#c9a84c' }} />
        : children}
    </button>
  )
})
