'use client'
import { useEffect } from 'react'
import type { Session, MapToken, MapState, FogState, WorldState } from '@/lib/supabase/types'
import { useMapStore } from '@/lib/stores/mapStore'
import { useWorldStore } from '@/lib/stores/worldStore'
import { useMapChannel } from '@/lib/realtime/useMapChannel'
import { MapMasterPanel } from '@/components/battlemap/MapMasterPanel'

interface BestiaryRow { id: string; name: string; size: string; type: string; cr: number; hp: number; ac: number; image_url: string | null }
interface CharacterRow { id: string; name: string; race: string; class: string; level: number; hp_current: number; hp_max: number; image_url: string | null }
interface SessionCharacter { id: string; name: string; image_url: string | null }
interface LootRow { id: string; name: string; type: string; rarity: string; description: string; weight: number }
interface SpellRow { id: string; name: string; level: number; school: string; classes: string[] }

interface Props {
  session: Session
  initialMapState: MapState | null
  initialFogState: FogState | null
  initialWorldState: WorldState | null
  initialTokens: MapToken[]
  bestiaryCreatures: BestiaryRow[]
  characters: CharacterRow[]
  sessionCharacters: SessionCharacter[]
  lootItems: LootRow[]
  spells: SpellRow[]
}

export default function MasterPanelView({
  session, initialMapState, initialFogState, initialWorldState, initialTokens,
  bestiaryCreatures, characters, sessionCharacters, lootItems, spells,
}: Props) {
  const { setMapState, setFogState, setTokens } = useMapStore()
  const { setWorldState } = useWorldStore()
  const { send } = useMapChannel(session.id)

  useEffect(() => {
    if (initialMapState) setMapState(initialMapState)
    if (initialFogState) setFogState(initialFogState)
    if (initialWorldState) setWorldState(initialWorldState)
    setTokens(initialTokens)
  }, [session.id])

  return (
    <div className="w-screen h-screen bg-gray-900 overflow-hidden">
      <div className="h-full max-w-sm mx-auto">
        <MapMasterPanel
          sessionId={session.id}
          bestiaryCreatures={bestiaryCreatures}
          characters={characters}
          sessionCharacters={sessionCharacters}
          lootItems={lootItems}
          spells={spells}
          onClose={() => window.close()}
          broadcast={send}
        />
      </div>
    </div>
  )
}
