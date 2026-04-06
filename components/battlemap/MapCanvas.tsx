'use client'
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Stage, Layer, Rect, Line, Circle, Text, Image as KonvaImage, Group } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useMapStore } from '@/lib/stores/mapStore'
import type { MapToken, FogZone } from '@/lib/supabase/types'

const LOGICAL_W = 1200
const LOGICAL_H = 700

const ZOOM_MIN = 0.25
const ZOOM_MAX = 5

interface Props {
  sessionId: string
  isMaster: boolean
  currentUserId: string
  broadcastTokenMove: (tokenId: string, x: number, y: number) => Promise<void>
  broadcast?: (event: string, payload: unknown) => Promise<void>
  broadcastPing?: (x: number, y: number, label: string) => Promise<void>
  pingLabel?: string
}

interface TokenPopup { tokenId: string; x: number; y: number }
interface PopupEdit { label: string; hpCurrent: string; hpMax: string }

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ w: LOGICAL_W, h: LOGICAL_H })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize({ w: width, h: height })
    })
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [ref])
  return size
}

export function MapCanvas({
  sessionId, isMaster, currentUserId, broadcastTokenMove, broadcast, broadcastPing, pingLabel
}: Props) {
  const {
    tokens, mapState, fogState, updateToken, removeToken, setFogState,
    selectedTool, pings, fogBrushSize, snapToGrid,
  } = useMapStore()

  const containerRef = useRef<HTMLDivElement>(null)
  const { w: ctW, h: ctH } = useContainerSize(containerRef)

  // CSS scale: fit logical space into container
  const scale = Math.min(ctW / LOGICAL_W, ctH / LOGICAL_H)
  const scaleRef = useRef(scale)
  useEffect(() => { scaleRef.current = scale }, [scale])

  // Viewport: zoom level and pan offset (in stage canvas coords)
  const [viewport, setViewport] = useState({ zoom: 1, panX: 0, panY: 0 })
  const viewportRef = useRef(viewport)
  useEffect(() => { viewportRef.current = viewport }, [viewport])

  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)
  const [videoCanvas, setVideoCanvas] = useState<HTMLCanvasElement | null>(null)
  const [tokenPopup, setTokenPopup] = useState<TokenPopup | null>(null)
  const [popupEdit, setPopupEdit] = useState<PopupEdit>({ label: '', hpCurrent: '', hpMax: '' })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animRef = useRef<number>(0)
  const stageRef = useRef<import('konva/lib/Stage').Stage>(null)
  const fogCanvasRef = useRef<HTMLCanvasElement>(null)
  const isPainting = useRef(false)
  const isPanning = useRef(false)
  const lastPanPos = useRef({ x: 0, y: 0 })
  const lastDragBroadcast = useRef(0)
  const DRAG_BROADCAST_MS = 50 // ~20 fps

  // Sync popup edit fields when popup opens
  useEffect(() => {
    if (!tokenPopup) return
    const t = tokens.find(t => t.id === tokenPopup.tokenId)
    if (t) setPopupEdit({
      label: t.label,
      hpCurrent: t.hp_current != null ? String(t.hp_current) : '',
      hpMax: t.hp_max != null ? String(t.hp_max) : '',
    })
  }, [tokenPopup?.tokenId])

  // Background map loading
  useEffect(() => {
    setBgImage(null)
    setVideoCanvas(null)
    cancelAnimationFrame(animRef.current)
    videoRef.current?.pause()
    if (!mapState?.map_url) return

    if (mapState.map_type === 'image' || mapState.map_type === 'gif') {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = mapState.map_url
      img.onload = () => setBgImage(img)
    } else if (mapState.map_type === 'video') {
      const video = document.createElement('video')
      video.src = mapState.map_url
      video.loop = true; video.muted = true; video.playsInline = true; video.crossOrigin = 'anonymous'
      videoRef.current = video
      const canvas = document.createElement('canvas')
      canvas.width = LOGICAL_W; canvas.height = LOGICAL_H
      setVideoCanvas(canvas)
      const tick = () => {
        canvas.getContext('2d')?.drawImage(video, 0, 0, LOGICAL_W, LOGICAL_H)
        stageRef.current?.batchDraw()
        animRef.current = requestAnimationFrame(tick)
      }
      video.oncanplay = () => { video.play(); animRef.current = requestAnimationFrame(tick) }
    }
    return () => { cancelAnimationFrame(animRef.current); videoRef.current?.pause() }
  }, [mapState?.map_url, mapState?.map_type])

  // Wheel zoom (non-passive to allow preventDefault)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      // cursor in stage canvas coords
      const cx = (e.clientX - rect.left) / scaleRef.current
      const cy = (e.clientY - rect.top) / scaleRef.current
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setViewport(prev => {
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev.zoom * factor))
        const lx = (cx - prev.panX) / prev.zoom
        const ly = (cy - prev.panY) / prev.zoom
        return { zoom: newZoom, panX: cx - lx * newZoom, panY: cy - ly * newZoom }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Middle-mouse pan
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      e.preventDefault()
      isPanning.current = true
      lastPanPos.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return
      const dx = (e.clientX - lastPanPos.current.x) / scaleRef.current
      const dy = (e.clientY - lastPanPos.current.y) / scaleRef.current
      lastPanPos.current = { x: e.clientX, y: e.clientY }
      setViewport(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }))
    }
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) isPanning.current = false
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function resetViewport() {
    setViewport({ zoom: 1, panX: 0, panY: 0 })
  }

  // Grid (logical coordinates)
  const gridLines: React.ReactNode[] = []
  if (mapState?.grid_type !== 'none') {
    const size = mapState?.grid_size ?? 50
    const color = mapState?.grid_color ?? '#ffffff18'
    const sw = mapState?.grid_stroke_width ?? 1
    for (let x = 0; x <= LOGICAL_W; x += size)
      gridLines.push(<Line key={`v${x}`} points={[x, 0, x, LOGICAL_H]} stroke={color} strokeWidth={sw} />)
    for (let y = 0; y <= LOGICAL_H; y += size)
      gridLines.push(<Line key={`h${y}`} points={[0, y, LOGICAL_W, y]} stroke={color} strokeWidth={sw} />)
  }

  function canDragToken(token: MapToken) {
    return isMaster || (token.owner_type === 'player' && !!token.owner_id)
  }

  function snapPosition(x: number, y: number): { x: number; y: number } {
    if (!snapToGrid || mapState?.grid_type === 'none') return { x, y }
    const gs = mapState?.grid_size ?? 50
    return {
      x: Math.round((x - gs / 2) / gs) * gs + gs / 2,
      y: Math.round((y - gs / 2) / gs) * gs + gs / 2,
    }
  }

  function handleDragMove(e: KonvaEventObject<DragEvent>, token: MapToken) {
    const now = Date.now()
    if (now - lastDragBroadcast.current < DRAG_BROADCAST_MS) return
    lastDragBroadcast.current = now
    const { x, y } = e.target.position()
    broadcastTokenMove(token.id, x, y)
  }

  function handleDragEnd(e: KonvaEventObject<DragEvent>, token: MapToken) {
    let { x, y } = e.target.position()
    const snapped = snapPosition(x, y)
    x = snapped.x; y = snapped.y
    e.target.position({ x, y })
    updateToken(token.id, { x, y })
    broadcastTokenMove(token.id, x, y)
    fetch(`/api/sessions/${sessionId}/tokens/${token.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y }),
    })
  }

  // Convert stage canvas coords → logical coords (accounts for zoom/pan)
  function getLogicalPos(e: KonvaEventObject<MouseEvent>): { x: number; y: number } | null {
    const raw = e.target.getStage()?.getPointerPosition()
    if (!raw) return null
    const { zoom, panX, panY } = viewportRef.current
    return { x: (raw.x - panX) / zoom, y: (raw.y - panY) / zoom }
  }

  function handleTokenClick(e: KonvaEventObject<MouseEvent>, token: MapToken) {
    if (!isMaster || selectedTool !== 'select') return
    e.cancelBubble = true
    const pos = getLogicalPos(e)
    if (pos) setTokenPopup({ tokenId: token.id, x: pos.x, y: pos.y })
  }

  async function resizeToken(tokenId: string, delta: number) {
    const token = tokens.find(t => t.id === tokenId)
    if (!token) return
    const newSize = Math.max(20, Math.min(200, (token.width ?? 50) + delta))
    updateToken(tokenId, { width: newSize, height: newSize })
    broadcast?.('token:patched', { id: tokenId, width: newSize, height: newSize })
    await fetch(`/api/sessions/${sessionId}/tokens/${tokenId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ width: newSize, height: newSize }),
    })
  }

  async function saveTokenEdit(tokenId: string) {
    const changes: Partial<MapToken> = {}
    if (popupEdit.label.trim()) changes.label = popupEdit.label.trim()
    if (popupEdit.hpMax !== '') {
      const max = Math.max(1, Number(popupEdit.hpMax) || 1)
      const cur = Math.min(Math.max(0, Number(popupEdit.hpCurrent) || 0), max)
      changes.hp_max = max
      changes.hp_current = cur
      changes.show_hp = true
    }
    if (Object.keys(changes).length === 0) return
    updateToken(tokenId, changes)
    broadcast?.('token:patched', { id: tokenId, ...changes })
    await fetch(`/api/sessions/${sessionId}/tokens/${tokenId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
  }

  async function deleteToken(tokenId: string) {
    removeToken(tokenId); setTokenPopup(null)
    broadcast?.('token:deleted', { id: tokenId })
    await fetch(`/api/sessions/${sessionId}/tokens/${tokenId}`, { method: 'DELETE' })
  }

  async function toggleTokenVisibility(tokenId: string) {
    const token = tokens.find(t => t.id === tokenId)
    if (!token) return
    const newVal = !token.visible_to_players
    updateToken(tokenId, { visible_to_players: newVal })
    broadcast?.('token:patched', { id: tokenId, visible_to_players: newVal })
    await fetch(`/api/sessions/${sessionId}/tokens/${tokenId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_players: newVal }),
    })
  }

  // Fog painting (all in logical coordinates)
  const paintFog = useCallback((x: number, y: number) => {
    if (!fogState) return
    if (selectedTool === 'fog-reveal') {
      setFogState({ ...fogState, revealed_zones: [...(fogState.revealed_zones ?? []), { x, y, radius: fogBrushSize } as FogZone] })
    } else if (selectedTool === 'fog-hide') {
      const updated = (fogState.revealed_zones ?? []).filter(z => Math.hypot(z.x - x, z.y - y) > fogBrushSize)
      setFogState({ ...fogState, revealed_zones: updated })
    }
  }, [fogState, selectedTool, setFogState, fogBrushSize])

  const handleStageMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (selectedTool === 'select') { setTokenPopup(null); return }
    if (selectedTool === 'ping') {
      const pos = getLogicalPos(e)
      if (pos) broadcastPing?.(pos.x, pos.y, pingLabel ?? '?')
      return
    }
    if (selectedTool !== 'fog-reveal' && selectedTool !== 'fog-hide') return
    isPainting.current = true
    const pos = getLogicalPos(e)
    if (pos) paintFog(pos.x, pos.y)
  }, [selectedTool, paintFog, broadcastPing, pingLabel])

  const handleStageMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isPainting.current) return
    const pos = getLogicalPos(e)
    if (pos) paintFog(pos.x, pos.y)
  }, [paintFog])

  const handleStageMouseUp = useCallback(async () => {
    if (!isPainting.current || !fogState) return
    isPainting.current = false
    const newFogState = { ...fogState }
    broadcast?.('fog:updated', newFogState)
    await fetch(`/api/sessions/${sessionId}/fog`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revealed_zones: fogState.revealed_zones }),
    })
  }, [fogState, sessionId, broadcast])

  // Draw fog on HTML canvas in logical coords
  const visibleTokens = tokens.filter(t => isMaster || t.visible_to_players)
  const fogEnabled = fogState?.fog_enabled ?? false
  const revealedZones = fogState?.revealed_zones ?? []

  useEffect(() => {
    if (!fogEnabled) return
    const canvas = fogCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = LOGICAL_W
    canvas.height = LOGICAL_H
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H)
    ctx.globalCompositeOperation = 'destination-out'

    for (const zone of revealedZones) {
      ctx.beginPath()
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.fill()
    }

    for (const token of visibleTokens) {
      const r = (token.width ?? 50) * 3
      const grad = ctx.createRadialGradient(token.x, token.y, 0, token.x, token.y, r)
      grad.addColorStop(0, 'rgba(0,0,0,1)')
      grad.addColorStop(0.55, 'rgba(0,0,0,0.85)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(token.x, token.y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
  }, [fogEnabled, revealedZones, visibleTokens])

  const { zoom, panX, panY } = viewport

  // Cursor style
  const cursorStyle = isPanning.current
    ? 'grabbing'
    : selectedTool === 'fog-reveal' ? 'crosshair'
    : selectedTool === 'fog-hide' ? 'cell'
    : selectedTool === 'ping' ? 'pointer'
    : 'default'

  // Token popup visual position (accounts for zoom/pan and CSS scale)
  const popupToken = tokenPopup ? tokens.find(t => t.id === tokenPopup.tokenId) : null
  const popupVisualX = tokenPopup ? (tokenPopup.x * zoom + panX) * scale : 0
  const popupVisualY = tokenPopup ? (tokenPopup.y * zoom + panY) * scale : 0

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#000', position: 'relative', overflow: 'hidden', cursor: cursorStyle }}>

      {/* Inner div — LOGICAL_W × LOGICAL_H, CSS-scaled to fit container */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: LOGICAL_W, height: LOGICAL_H,
        transformOrigin: 'top left',
        transform: `scale(${scale})`,
      }}>
        <Stage
          ref={stageRef}
          width={LOGICAL_W}
          height={LOGICAL_H}
          scaleX={zoom} scaleY={zoom}
          x={panX} y={panY}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          onMouseLeave={handleStageMouseUp}
        >
          <Layer>
            <Rect width={LOGICAL_W} height={LOGICAL_H} fill="#1a1a2e" />
            {bgImage && <KonvaImage image={bgImage} width={LOGICAL_W} height={LOGICAL_H} />}
            {videoCanvas && <KonvaImage image={videoCanvas} width={LOGICAL_W} height={LOGICAL_H} />}
          </Layer>

          <Layer listening={false}>{gridLines}</Layer>

          <Layer>
            {visibleTokens.map(token => (
              <TokenNode key={token.id} token={token}
                draggable={canDragToken(token)}
                onDragMove={(e) => handleDragMove(e, token)}
                onDragEnd={(e) => handleDragEnd(e, token)}
                onClick={(e) => handleTokenClick(e, token)}
                selected={tokenPopup?.tokenId === token.id}
              />
            ))}
          </Layer>

          <Layer listening={false}>
            {pings.map(ping => (
              <React.Fragment key={ping.id}>
                <Circle x={ping.x} y={ping.y} radius={20} fill="rgba(255,200,0,0.4)" stroke="#ffd700" strokeWidth={3} />
                <Text x={ping.x - 30} y={ping.y - 35} text={ping.label} fontSize={12} fill="#ffd700" width={60} align="center" />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>

        {/* Fog canvas — mirrors stage transform */}
        {fogEnabled && (
          <canvas
            ref={fogCanvasRef}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: LOGICAL_W, height: LOGICAL_H,
              pointerEvents: 'none',
              opacity: isMaster ? 0.65 : 1,
              transformOrigin: '0 0',
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            }}
          />
        )}
      </div>

      {/* Zoom controls overlay (visual coords) */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20">
        <button
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(ZOOM_MAX, prev.zoom * 1.25) }))}
          className="w-7 h-7 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded text-white text-sm flex items-center justify-center"
          title="Приблизить"
        >+</button>
        <button
          onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(ZOOM_MIN, prev.zoom / 1.25) }))}
          className="w-7 h-7 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded text-white text-sm flex items-center justify-center"
          title="Отдалить"
        >−</button>
        <button
          onClick={resetViewport}
          className="w-7 h-7 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded text-white text-xs flex items-center justify-center"
          title="Сбросить вид"
        >⌂</button>
      </div>

      {/* Zoom level badge */}
      {zoom !== 1 && (
        <div className="absolute bottom-3 left-3 z-20 bg-gray-800/70 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-gray-300">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Token popup — positioned in visual coords */}
      {isMaster && popupToken && tokenPopup && (
        <div
          className="absolute z-30 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 text-xs"
          style={{
            left: Math.min(popupVisualX + 10, ctW - 190),
            top: Math.max(popupVisualY - 10, 4),
            width: 180,
          }}
        >
          {/* Name edit */}
          <input
            value={popupEdit.label}
            onChange={e => setPopupEdit(prev => ({ ...prev, label: e.target.value }))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-1.5 py-1 text-white text-xs mb-2 focus:outline-none focus:border-purple-500"
            placeholder="Имя токена"
          />

          {/* HP edit */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-gray-400 text-xs w-5">HP</span>
            <input
              type="number" min={0}
              value={popupEdit.hpCurrent}
              onChange={e => setPopupEdit(prev => ({ ...prev, hpCurrent: e.target.value }))}
              className="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white text-xs text-center focus:outline-none focus:border-purple-500"
              placeholder="тек"
            />
            <span className="text-gray-500">/</span>
            <input
              type="number" min={1}
              value={popupEdit.hpMax}
              onChange={e => setPopupEdit(prev => ({ ...prev, hpMax: e.target.value }))}
              className="w-14 bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-white text-xs text-center focus:outline-none focus:border-purple-500"
              placeholder="макс"
            />
          </div>

          {/* Save */}
          <button
            onClick={() => saveTokenEdit(popupToken.id)}
            className="w-full py-1 bg-purple-700 hover:bg-purple-600 text-white rounded mb-2 transition-colors"
          >
            Сохранить
          </button>

          {/* Resize */}
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-gray-400 w-12">Размер</span>
            <button onClick={() => resizeToken(popupToken.id, -10)}
              className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-white flex items-center justify-center">−</button>
            <span className="text-white w-8 text-center">{popupToken.width ?? 50}</span>
            <button onClick={() => resizeToken(popupToken.id, 10)}
              className="w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded text-white flex items-center justify-center">+</button>
          </div>

          {/* Visibility */}
          <button onClick={() => toggleTokenVisibility(popupToken.id)}
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded hover:bg-gray-700 text-gray-300 mb-1">
            <span>{popupToken.visible_to_players ? '👁' : '🙈'}</span>
            <span>{popupToken.visible_to_players ? 'Видим игрокам' : 'Скрыт'}</span>
          </button>

          {/* Delete */}
          <button onClick={() => deleteToken(popupToken.id)}
            className="w-full flex items-center gap-1.5 py-1 px-2 rounded hover:bg-red-900 text-red-400">
            <span>🗑</span><span>Удалить</span>
          </button>
        </div>
      )}
    </div>
  )
}

function TokenNode({ token, draggable, onDragMove, onDragEnd, onClick, selected }: {
  token: MapToken; draggable: boolean; selected: boolean
  onDragMove: (e: KonvaEventObject<DragEvent>) => void
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void
  onClick: (e: KonvaEventObject<MouseEvent>) => void
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const size = token.width ?? 50
  const r = size / 2
  const isPlayer = token.owner_type === 'player'

  useEffect(() => {
    if (!token.image_url) { setImg(null); return }
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.src = token.image_url
    image.onload = () => setImg(image)
  }, [token.image_url])

  return (
    <>
      {selected && (
        <Circle x={token.x} y={token.y} radius={r + 6}
          stroke="#facc15" strokeWidth={2} dash={[6, 3]} fill="transparent" listening={false} />
      )}
      <Circle x={token.x} y={token.y} radius={r + 3}
        fill="transparent"
        shadowColor={isPlayer ? '#60a5fa' : '#f87171'}
        shadowBlur={20} shadowOpacity={0.8} listening={false}
      />
      {img ? (
        <Group x={token.x - r} y={token.y - r}
          clipFunc={(ctx) => { ctx.arc(r, r, r, 0, Math.PI * 2) }}
          draggable={draggable} onDragMove={onDragMove} onDragEnd={onDragEnd} onClick={onClick}>
          <KonvaImage image={img} width={size} height={size} />
        </Group>
      ) : (
        <Circle x={token.x} y={token.y} radius={r}
          fill={isPlayer ? '#1d4ed8' : '#7c3aed'}
          stroke={isPlayer ? '#93c5fd' : '#c4b5fd'} strokeWidth={2}
          draggable={draggable} onDragMove={onDragMove} onDragEnd={onDragEnd} onClick={onClick}
        />
      )}
      <Text x={token.x - r} y={token.y + r + 3} width={size}
        text={token.label} fontSize={10} fill="white" align="center" listening={false} />
      {token.show_hp && token.hp_max && (
        <>
          <Rect x={token.x - r} y={token.y - r - 7} width={size} height={4}
            fill="#1f2937" cornerRadius={2} listening={false} />
          <Rect x={token.x - r} y={token.y - r - 7}
            width={Math.max(0, size * ((token.hp_current ?? 0) / token.hp_max))} height={4}
            fill={((token.hp_current ?? 0) / token.hp_max) > 0.5 ? '#22c55e' : ((token.hp_current ?? 0) / token.hp_max) > 0.25 ? '#eab308' : '#ef4444'}
            cornerRadius={2} listening={false} />
        </>
      )}
    </>
  )
}
