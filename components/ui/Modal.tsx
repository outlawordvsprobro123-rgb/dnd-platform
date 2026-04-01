'use client'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,.75)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} fade-up`}
        style={{
          background: 'linear-gradient(160deg, #1e1508 0%, #150f05 100%)',
          border: '1px solid #6b4f1e',
          borderRadius: '.75rem',
          boxShadow: '0 0 40px rgba(0,0,0,.8), 0 0 20px rgba(139,105,20,.1)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Угловые орнаменты */}
        <div style={{ position:'absolute', top:8, left:10, color:'#3d2a10', fontSize:'1rem', lineHeight:1, pointerEvents:'none' }}>✦</div>
        <div style={{ position:'absolute', top:8, right:10, color:'#3d2a10', fontSize:'1rem', lineHeight:1, pointerEvents:'none' }}>✦</div>

        {title && (
          <div style={{ borderBottom: '1px solid #3d2a10', padding: '1rem 1.5rem' }} className="flex justify-between items-center">
            <h2 style={{ fontFamily: "'Alegreya SC', serif", fontSize: '1rem', letterSpacing: '.08em', color: '#c9a84c', margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{ color: '#7a5c38', fontSize: '1.25rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '0 .25rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
              onMouseLeave={e => (e.currentTarget.style.color = '#7a5c38')}
            >×</button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
