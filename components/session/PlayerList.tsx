'use client'
import { useSessionStore } from '@/lib/stores/sessionStore'

export function PlayerList() {
  const { players, session } = useSessionStore()

  return (
    <div className="card" style={{ padding: '.75rem', borderColor: 'var(--border)' }}>
      <div style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.6rem', letterSpacing: '.25em', color: 'var(--gold-dim)', textTransform: 'uppercase', marginBottom: '.6rem' }}>
        Игроки
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
        {players.map(player => (
          <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <div style={{
              width: '.45rem', height: '.45rem', borderRadius: '50%', flexShrink: 0,
              background: player.status === 'online' ? '#4ade80' : 'var(--text-muted)',
              boxShadow: player.status === 'online' ? '0 0 6px rgba(74,222,128,.5)' : 'none',
            }} />
            <span style={{ fontSize: '.75rem', color: 'var(--text-secondary)', fontFamily: "'Mookmania', 'Alegreya SC', serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {player.user_id.slice(0, 8)}...
            </span>
            {player.status === 'kicked' && (
              <span style={{ fontSize: '.6rem', color: '#e88070', fontFamily: "'Alegreya SC', serif" }}>исключён</span>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontFamily: "'Mookmania', 'Alegreya SC', serif", fontStyle: 'italic', fontSize: '.8rem' }}>Нет игроков</p>
        )}
      </div>
      {session && (
        <div style={{ marginTop: '.6rem', paddingTop: '.6rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontFamily: "'Alegreya SC', serif", fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '.3rem' }}>Код сессии:</p>
          <p style={{ fontFamily: 'monospace', fontSize: '.9rem', color: 'var(--gold)', letterSpacing: '.25em', fontWeight: 700 }}>{session.code}</p>
        </div>
      )}
    </div>
  )
}
