'use client'
import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text, Image as KonvaImage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useMapStore } from '@/lib/stores/mapStore'
import type { MapToken } from '@/lib/supabase/types'

interface Props {
  sessionId: string
  isMaster: boolean
  currentUserId: string
  broadcastTokenMove: (tokenId: string, x: number, y: number) => Promise<void>
}

const CANVAS_W = 1200
const CANVAS_H = 700

export function MapCanvas({ sessionId, isMaster, currentUserId, broadcastTokenMove }: Props) {
  const { tokens, mapState, fogState, updateToken } = useMapStore()
  const [bgImage, setBgImage] = useState<HTMLImageElement | HTMLVideoElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animRef = useRef<number>(0)
  const [videoFrame, setVideoFrame] = useState<HTMLCanvasElement | null>(null)

  // Загрузка карты
  useEffect(() => {
    if (!mapState?.map_url) return
    if (mapState.map_type === 'image' || mapState.map_type === 'gif') {
      const img = new window.Image()
      img.src = mapState.map_url
      img.onload = () => setBgImage(img)
    } else if (mapState.map_type === 'video') {
      const video = document.createElement('video')
      video.src = mapState.map_url
      video.loop = true
      video.muted = true
      video.autoplay = true
      video.play()
      videoRef.current = video

      const canvas = document.createElement('canvas')
      canvas.width = CANVAS_W
      canvas.height = CANVAS_H
      setVideoFrame(canvas)

      const draw = () => {
        canvas.getContext('2d')?.drawImage(video, 0, 0, CANVAS_W, CANVAS_H)
        animRef.current = requestAnimationFrame(draw)
      }
      video.oncanplay = () => { animRef.current = requestAnimationFrame(draw) }
    }
    return () => {
      cancelAnimationFrame(animRef.current)
      videoRef.current?.pause()
    }
  }, [mapState?.map_url, mapState?.map_type])

  // Генерация сетки
  const gridLines: React.ReactNode[] = []
  if (mapState?.grid_type !== 'none') {
    const size = mapState?.grid_size ?? 50
    const color = mapState?.grid_color ?? '#ffffff20'
    for (let x = 0; x < CANVAS_W; x += size) {
      gridLines.push(<Line key={`v${x}`} points={[x, 0, x, CANVAS_H]} stroke={color} strokeWidth={0.5} />)
    }
    for (let y = 0; y < CANVAS_H; y += size) {
      gridLines.push(<Line key={`h${y}`} points={[0, y, CANVAS_W, y]} stroke={color} strokeWidth={0.5} />)
    }
  }

  function canDragToken(token: MapToken): boolean {
    if (isMaster) return true
    if (token.owner_type === 'player' && token.owner_id) return true
    return false
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent>, token: MapToken) {
    const { x, y } = e.target.position()
    updateToken(token.id, { x, y })
    broadcastTokenMove(token.id, x, y)
    fetch(`/api/sessions/${sessionId}/tokens/${token.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y })
    })
  }

  const visibleTokens = tokens.filter(t => isMaster || t.visible_to_players)

  return (
    <Stage width={CANVAS_W} height={CANVAS_H}>
      {/* Слой фона */}
      <Layer>
        <Rect width={CANVAS_W} height={CANVAS_H} fill="#1a1a2e" />
        {bgImage && !videoFrame && (
          <KonvaImage image={bgImage as HTMLImageElement} width={CANVAS_W} height={CANVAS_H} />
        )}
        {videoFrame && (
          <KonvaImage image={videoFrame} width={CANVAS_W} height={CANVAS_H} />
        )}
      </Layer>

      {/* Слой сетки */}
      <Layer>{gridLines}</Layer>

      {/* Слой токенов */}
      <Layer>
        {visibleTokens.map(token => (
          <TokenNode key={token.id} token={token} draggable={canDragToken(token)} onDragEnd={(e) => handleDragEnd(e, token)} />
        ))}
      </Layer>

      {/* Слой тумана войны */}
      {fogState?.fog_enabled && (
        <Layer>
          <Rect width={CANVAS_W} height={CANVAS_H} fill="rgba(0,0,0,0.75)" />
        </Layer>
      )}
    </Stage>
  )
}

function TokenNode({ token, draggable, onDragEnd }: { token: MapToken; draggable: boolean; onDragEnd: (e: KonvaEventObject<DragEvent>) => void }) {
  const size = token.width ?? 50

  return (
    <>
      <Circle
        x={token.x} y={token.y}
        radius={size / 2}
        fill={token.image_url ? '#4b5563' : '#7c3aed'}
        stroke={draggable ? '#a78bfa' : '#6b7280'}
        strokeWidth={2}
        draggable={draggable}
        onDragEnd={onDragEnd}
      />
      <Text
        x={token.x - size / 2} y={token.y + size / 2 + 4}
        width={size} text={token.label}
        fontSize={10} fill="white"
        align="center"
      />
      {token.show_hp && token.hp_max && (
        <>
          <Rect x={token.x - size / 2} y={token.y - size / 2 - 6} width={size} height={4} fill="#374151" cornerRadius={2} />
          <Rect x={token.x - size / 2} y={token.y - size / 2 - 6}
            width={Math.max(0, size * ((token.hp_current ?? 0) / token.hp_max))} height={4}
            fill={((token.hp_current ?? 0) / token.hp_max) > 0.5 ? '#22c55e' : ((token.hp_current ?? 0) / token.hp_max) > 0.25 ? '#eab308' : '#ef4444'}
            cornerRadius={2}
          />
        </>
      )}
    </>
  )
}
