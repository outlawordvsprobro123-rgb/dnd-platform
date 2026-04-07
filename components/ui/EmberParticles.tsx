'use client'
import { useEffect, useState } from 'react'

interface Ember {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
}

export function EmberParticles({ count = 25 }: { count?: number }) {
  const [embers, setEmbers] = useState<Ember[]>([])

  useEffect(() => {
    setEmbers(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        duration: 5 + Math.random() * 7,
        delay: Math.random() * 10,
        drift: (Math.random() - 0.5) * 80,
        opacity: 0.4 + Math.random() * 0.5,
      }))
    )
  }, [count])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {embers.map(e => (
        <span
          key={e.id}
          style={{
            position: 'absolute',
            bottom: `${-e.size}px`,
            left: `${e.left}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            borderRadius: '50%',
            background: `radial-gradient(circle at 40% 40%, #e8c96a, rgba(139,21,0,.2))`,
            boxShadow: `0 0 ${e.size * 2}px rgba(201,168,76,.5)`,
            animation: `emberFloat ${e.duration}s ${e.delay}s ease-in infinite`,
            '--ember-drift': `${e.drift}px`,
            opacity: e.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
