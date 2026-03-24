import type { MapToken, CombatParticipant, MusicState, SessionPlayer } from '@/lib/supabase/types'

export type RealtimeEvent =
  // Session
  | { type: 'player:joined'; payload: { user_id: string; character_id: string | null; username: string } }
  | { type: 'player:left'; payload: { user_id: string } }
  | { type: 'player:kicked'; payload: { user_id: string } }
  | { type: 'session:status'; payload: { status: string } }
  // Map - broadcast (высокочастотные)
  | { type: 'token:moved'; payload: { token_id: string; x: number; y: number } }
  // Map - postgres changes
  | { type: 'token:updated'; payload: Partial<MapToken> & { id: string } }
  | { type: 'token:created'; payload: MapToken }
  | { type: 'token:deleted'; payload: { token_id: string } }
  | { type: 'map:changed'; payload: { map_url: string | null; map_type: string; grid_type: string; grid_size: number } }
  | { type: 'fog:updated'; payload: { revealed_zones: unknown[]; fog_enabled: boolean } }
  // Combat
  | { type: 'combat:started'; payload: { participants: CombatParticipant[]; round: number } }
  | { type: 'combat:turn'; payload: { current_turn: number; participant_id: string; round: number } }
  | { type: 'combat:hp_changed'; payload: { participant_id: string; hp_current: number; delta: number } }
  | { type: 'combat:condition'; payload: { participant_id: string; conditions: string[] } }
  | { type: 'combat:ended'; payload: Record<string, never> }
  // Music
  | { type: 'music:play'; payload: { scene_id: string; scene_name: string } }
  | { type: 'music:pause'; payload: Record<string, never> }
  | { type: 'music:stop'; payload: Record<string, never> }
