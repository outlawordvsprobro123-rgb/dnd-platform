'use client'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Главная',    icon: '⚔' },
  { href: '/bestiary',      label: 'Бестиарий',  icon: '🐉' },
  { href: '/spells',        label: 'Заклинания', icon: '✦' },
  { href: '/loot',          label: 'Предметы',   icon: '◈' },
  { href: '/character/new', label: 'Персонаж',   icon: '✧' },
  { href: '/campaign',      label: 'Кампания',   icon: '📜', target: '_blank' },
]

export function NavBar() {
  const pathname = usePathname()
  return (
    <nav
      style={{
        background: 'linear-gradient(180deg, rgba(26,18,9,.97) 0%, rgba(18,13,6,.98) 100%)',
        borderBottom: '1px solid #3d2a10',
        boxShadow: '0 2px 30px rgba(0,0,0,.7), 0 1px 0 rgba(201,168,76,.04)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
      className="px-6 py-0 flex items-center"
    >
      {/* Лого */}
      <a
        href="/dashboard"
        className="flex items-center gap-2 py-3 mr-8 group"
        style={{ textDecoration: 'none', position: 'relative' }}
      >
        {/* Мерцающий орнамент */}
        <span
          className="animate-twinkle"
          style={{ fontSize: '.75rem', color: 'var(--gold-dim)', animationDelay: '0s' }}
        >✦</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <span
            className="animate-text-glow"
            style={{
              fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif",
              fontSize: '1.05rem',
              fontWeight: 900,
              color: 'var(--gold)',
              letterSpacing: '.12em',
              lineHeight: 1,
              transition: 'letter-spacing .3s ease',
            }}
          >
            ВАРНТАЛ
          </span>
          <span style={{
            fontFamily: "'Alegreya SC', serif",
            fontSize: '.5rem',
            letterSpacing: '.3em',
            color: 'var(--gold-dim)',
            textTransform: 'uppercase',
            marginTop: '2px',
          }}>
            D&amp;D 5e
          </span>
        </div>

        <span
          className="animate-twinkle"
          style={{ fontSize: '.75rem', color: 'var(--gold-dim)', animationDelay: '.8s' }}
        >✦</span>
      </a>

      {/* Разделитель */}
      <div style={{
        width: 1,
        height: 28,
        background: 'linear-gradient(180deg, transparent, var(--border-gold), transparent)',
        marginRight: '1.5rem',
        flexShrink: 0,
      }} />

      {/* Навигационные ссылки */}
      <div className="flex items-center gap-0.5 flex-1">
        {NAV_ITEMS.map((item, i) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <a
              key={item.href}
              href={item.href}
              target={item.target}
              className={`animate-fade-down delay-${i + 1}`}
              style={{
                fontFamily: "'Alegreya SC', serif",
                fontSize: '.7rem',
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                padding: '.85rem .85rem',
                textDecoration: 'none',
                position: 'relative',
                color: active ? 'var(--gold)' : 'var(--text-muted)',
                background: active ? 'rgba(201,168,76,.06)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '.35rem',
                transition: 'color .2s ease, background .2s ease',
                borderBottom: '2px solid transparent',
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,.04)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              {/* Иконка с анимацией */}
              <span
                style={{
                  fontSize: '.85rem',
                  opacity: active ? 1 : .7,
                  transition: 'transform .2s ease, opacity .2s ease',
                  display: 'inline-block',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.2) rotate(-5deg)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1) rotate(0deg)' }}
              >
                {item.icon}
              </span>
              {item.label}

              {/* Активная линия с шиммером */}
              {active && (
                <span
                  className="nav-active-line"
                  style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 2.5s linear infinite',
                  }}
                />
              )}
            </a>
          )
        })}
      </div>
    </nav>
  )
}
