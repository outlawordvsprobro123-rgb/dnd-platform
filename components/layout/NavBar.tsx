'use client'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Главная',    icon: '⚔' },
  { href: '/bestiary',     label: 'Бестиарий',  icon: '🐉' },
  { href: '/spells',       label: 'Заклинания', icon: '✦' },
  { href: '/loot',         label: 'Предметы',   icon: '◈' },
  { href: '/character/new',label: 'Персонаж',   icon: '✧' },
  { href: '/campaign',     label: 'Кампания',   icon: '📜', target: '_blank' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav style={{
      background: 'linear-gradient(180deg, #1a1209 0%, #120d06 100%)',
      borderBottom: '1px solid #3d2a10',
      boxShadow: '0 2px 20px rgba(0,0,0,.5)',
    }} className="px-6 py-0 flex items-center sticky top-0 z-40">
      {/* Лого */}
      <a href="/dashboard" className="flex items-center gap-2 py-3 mr-8 group" style={{ textDecoration: 'none' }}>
        <span style={{
          fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif",
          fontSize: '1.1rem',
          fontWeight: 900,
          color: '#c9a84c',
          letterSpacing: '.1em',
          lineHeight: 1,
        }}>ВАРНТАЛ</span>
        <span style={{
          fontFamily: "'Alegreya SC', serif",
          fontSize: '.55rem',
          letterSpacing: '.3em',
          color: '#8b6914',
          textTransform: 'uppercase',
          marginTop: '2px',
        }}>D&D 5e</span>
      </a>

      {/* Разделитель */}
      <div style={{ width: 1, height: 28, background: '#3d2a10', marginRight: '1.5rem' }} />

      {/* Ссылки */}
      <div className="flex items-center gap-0.5 flex-1">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              target={item.target}
              style={{
                fontFamily: "'Alegreya SC', serif",
                fontSize: '.7rem',
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                padding: '.85rem .9rem',
                textDecoration: 'none',
                borderBottom: active ? '2px solid #c9a84c' : '2px solid transparent',
                color: active ? '#c9a84c' : '#7a5c38',
                background: active ? 'rgba(201,168,76,.06)' : 'transparent',
                transition: 'all .15s',
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#c9a884'
                  ;(e.currentTarget as HTMLElement).style.borderBottomColor = '#3d2a10'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#7a5c38'
                  ;(e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '.8rem', opacity: .8 }}>{item.icon}</span>
              {item.label}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
