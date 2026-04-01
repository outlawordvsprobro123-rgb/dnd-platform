'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (data.user) {
          await supabase.from('profiles').insert({ id: data.user.id, username: username || email.split('@')[0] })
        }
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка'
      if (msg.includes('Invalid login')) setError('Неверный email или пароль')
      else if (msg.includes('already registered')) setError('Этот email уже зарегистрирован')
      else setError(msg || 'Произошла ошибка. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-base)' }}>
      {/* Фоновые орнаменты */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(139,21,0,.08) 0%, transparent 70%)',
      }} />

      <div className="w-full max-w-md fade-up" style={{ position: 'relative' }}>
        {/* Карточка */}
        <div style={{
          background: 'linear-gradient(160deg, #1e1508 0%, #130d04 100%)',
          border: '1px solid #6b4f1e',
          borderRadius: '1rem',
          boxShadow: '0 0 60px rgba(0,0,0,.7), 0 0 30px rgba(139,105,20,.08)',
          padding: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Угловые украшения */}
          {['top-3 left-4', 'top-3 right-4', 'bottom-3 left-4', 'bottom-3 right-4'].map(pos => (
            <div key={pos} className={`absolute ${pos}`} style={{ color: '#3d2a10', fontSize: '1.1rem', lineHeight: 1 }}>✦</div>
          ))}

          {/* Заголовок */}
          <div className="text-center mb-8">
            <div style={{ color: '#6b4f1e', fontSize: '1.2rem', letterSpacing: '.5em', marginBottom: '1rem' }}>✦ ✦ ✦</div>
            <h1 style={{
              fontFamily: "'Nodesto Cyrillic', 'Alegreya SC', serif",
              fontSize: '2rem',
              fontWeight: 900,
              color: '#c9a84c',
              letterSpacing: '.1em',
              lineHeight: 1.1,
              marginBottom: '.5rem',
            }}>ВАРНТАЛ</h1>
            <div className="divider-gold-short" style={{ margin: '.75rem auto' }} />
            <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.35em', color: '#7a5c38', textTransform: 'uppercase' }}>
              Платформа приключений
            </p>
          </div>

          {/* Переключатель режима */}
          <div style={{
            display: 'flex',
            background: '#0d0a07',
            border: '1px solid #3d2a10',
            borderRadius: '.5rem',
            padding: '3px',
            marginBottom: '1.5rem',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: '.5rem',
                  borderRadius: '.35rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Alegreya SC', serif",
                  fontSize: '.65rem',
                  letterSpacing: '.15em',
                  textTransform: 'uppercase',
                  transition: 'all .15s',
                  background: mode === m ? 'linear-gradient(135deg, #3a2808, #2a1c05)' : 'transparent',
                  color: mode === m ? '#c9a84c' : '#7a5c38',
                  boxShadow: mode === m ? '0 0 10px rgba(139,105,20,.15)' : 'none',
                }}
              >
                {m === 'login' ? 'Войти' : 'Регистрация'}
              </button>
            ))}
          </div>

          {/* Форма */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {mode === 'register' && (
              <div>
                <label style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.15em', color: '#7a5c38', textTransform: 'uppercase', display: 'block', marginBottom: '.4rem' }}>
                  Имя искателя
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  type="text"
                  placeholder="Странник из далёких земель"
                  className="input-fantasy"
                />
              </div>
            )}
            <div>
              <label style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.15em', color: '#7a5c38', textTransform: 'uppercase', display: 'block', marginBottom: '.4rem' }}>
                Почтовый адрес
              </label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                required
                placeholder="герой@dungeon.com"
                className="input-fantasy"
              />
            </div>
            <div>
              <label style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.65rem', letterSpacing: '.15em', color: '#7a5c38', textTransform: 'uppercase', display: 'block', marginBottom: '.4rem' }}>
                Пароль
              </label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="input-fantasy"
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(139,21,0,.2)', border: '1px solid #5a0e00', borderRadius: '.5rem', padding: '.75rem 1rem', color: '#e88070', fontSize: '.9rem', fontFamily: "'Mookmania', 'Alegreya SC', serif" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-fantasy btn-gold"
              style={{ marginTop: '.5rem', justifyContent: 'center', padding: '.8rem' }}
            >
              {loading
                ? <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(201,168,76,.3)', borderTopColor: '#c9a84c' }} />
                : mode === 'login' ? 'Войти в мир' : 'Начать приключение'
              }
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', color: '#6b4f1e', fontSize: '1rem', letterSpacing: '.3em' }}>✦</div>
        </div>
      </div>
    </div>
  )
}
