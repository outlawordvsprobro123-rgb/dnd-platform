'use client'
import { useSessionStore } from '@/lib/stores/sessionStore'

export function PlayerList() {
  const { players, session, isMaster } = useSessionStore()

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="font-semibold text-sm text-gray-200 mb-3">👥 Игроки</h3>
      <div className="space-y-2">
        {players.map(player => (
          <div key={player.id} className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${player.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span className="text-sm text-gray-300 truncate">{player.user_id.slice(0, 8)}...</span>
            {player.status === 'kicked' && <span className="text-xs text-red-400">исключён</span>}
          </div>
        ))}
        {players.length === 0 && <p className="text-gray-500 text-sm">Нет игроков</p>}
      </div>
      {session && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500">Код сессии:</p>
          <p className="text-purple-400 font-mono text-lg font-bold tracking-widest">{session.code}</p>
        </div>
      )}
    </div>
  )
}
