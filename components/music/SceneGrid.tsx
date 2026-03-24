'use client'
import { useState } from 'react'
import { useMusicStore } from '@/lib/stores/musicStore'
import { useSessionStore } from '@/lib/stores/sessionStore'
import type { MusicScene } from '@/lib/supabase/types'

interface Props { scenes: MusicScene[] }

export function SceneGrid({ scenes }: Props) {
  const { currentScene, status } = useMusicStore()
  const { isMaster, session } = useSessionStore()
  const [loading, setLoading] = useState<string | null>(null)

  async function playScene(scene: MusicScene) {
    if (!isMaster || !session) return
    setLoading(scene.id)
    try {
      const newStatus = currentScene?.id === scene.id && status === 'playing' ? 'paused' : 'playing'
      await fetch(`/api/sessions/${session.id}/music`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id: scene.id, status: newStatus })
      })
    } finally {
      setLoading(null)
    }
  }

  async function stopMusic() {
    if (!isMaster || !session) return
    await fetch(`/api/sessions/${session.id}/music`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'stopped' })
    })
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm text-gray-200">🎵 Атмосфера</h3>
        {isMaster && currentScene && (
          <button onClick={stopMusic} className="text-xs text-gray-400 hover:text-white">⏹ Стоп</button>
        )}
      </div>
      {currentScene && (
        <div className="mb-3 px-3 py-2 bg-gray-700 rounded-lg text-sm text-gray-300">
          Сейчас: <span style={{ color: currentScene.color }}>{currentScene.icon} {currentScene.name}</span>
        </div>
      )}
      <div className="grid grid-cols-5 gap-1.5">
        {scenes.map(scene => {
          const isActive = currentScene?.id === scene.id && status === 'playing'
          return (
            <button
              key={scene.id}
              onClick={() => playScene(scene)}
              disabled={!isMaster || loading === scene.id}
              title={scene.description ?? scene.name}
              className={`relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center ${
                isActive
                  ? 'border-current opacity-100 animate-pulse'
                  : 'border-gray-600 opacity-70 hover:opacity-100 hover:border-gray-500'
              } ${!isMaster ? 'cursor-default' : 'cursor-pointer'}`}
              style={{ borderColor: isActive ? scene.color : undefined, backgroundColor: isActive ? `${scene.color}20` : undefined }}
            >
              <span className="text-lg">{scene.icon}</span>
              <span className="text-xs text-gray-300 mt-0.5 leading-tight">{scene.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
