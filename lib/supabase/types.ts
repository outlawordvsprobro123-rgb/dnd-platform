export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended'
export type PlayerStatus = 'online' | 'offline' | 'kicked'
export type MapType = 'image' | 'video' | 'gif'
export type GridType = 'square' | 'hex' | 'none'
export type TokenOwnerType = 'player' | 'npc' | 'object'
export type MusicStatus = 'playing' | 'paused' | 'stopped'
export type ItemType = 'weapon' | 'armor' | 'potion' | 'ring' | 'wondrous' | 'tool' | 'misc'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact'
export type SpellSchool = 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation'
export type CreatureSize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'

export type Stats = {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export type DeathSaves = {
  successes: number
  failures: number
}

export type SpeedData = {
  walk?: number
  fly?: number
  swim?: number
  climb?: number
  burrow?: number
}

export type SpellComponents = {
  v: boolean
  s: boolean
  m: string | null
}

export type TraitData = {
  name: string
  description: string
}

export type ActionData = {
  name: string
  description: string
  attack_bonus?: number
  damage?: string
}

export type MusicTrack = {
  title: string
  url: string
  duration?: number
}

export type FogZone = {
  x: number
  y: number
  radius: number
}

export type SessionSettings = {
  allowPlayerTokenMove: boolean
  fogEnabled: boolean
}

// ============================================================
// Таблицы
// ============================================================

export type Profile = {
  id: string
  username: string
  avatar_url: string | null
  created_at: string
}

export type Session = {
  id: string
  code: string
  master_id: string | null
  name: string
  status: SessionStatus
  settings: SessionSettings
  created_at: string
  updated_at: string
}

export type SessionPlayer = {
  id: string
  session_id: string
  user_id: string
  character_id: string | null
  status: PlayerStatus
  joined_at: string
}

export type Character = {
  id: string
  user_id: string
  name: string
  race: string
  class: string
  subclass: string | null
  level: number
  experience: number
  alignment: string | null
  background: string | null
  stats: Stats
  hp_max: number
  hp_current: number
  hp_temp: number
  armor_class: number
  initiative: number | null
  speed: number
  hit_dice: string
  death_saves: DeathSaves
  proficiency_bonus: number
  saving_throws: Record<string, boolean>
  skills: Record<string, boolean>
  features: TraitData[]
  traits: Record<string, string>
  notes: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export type InventoryItem = {
  id: string
  character_id: string
  item_id: string | null
  name: string
  quantity: number
  weight: number
  equipped: boolean
  description: string | null
  created_at: string
}

export type CharacterSpell = {
  id: string
  character_id: string
  spell_id: string | null
  name: string
  spell_level: number
  prepared: boolean
  notes: string | null
}

export type SpellSlot = {
  id: string
  character_id: string
  level: number
  total: number
  used: number
}

export type MapState = {
  id: string
  session_id: string
  map_url: string | null
  map_type: MapType
  grid_type: GridType
  grid_size: number
  grid_color: string
  width: number
  height: number
  updated_at: string
}

export type MapToken = {
  id: string
  session_id: string
  owner_type: TokenOwnerType
  owner_id: string | null
  label: string
  image_url: string | null
  x: number
  y: number
  width: number
  height: number
  hp_current: number | null
  hp_max: number | null
  show_hp: boolean
  conditions: string[]
  visible_to_players: boolean
  layer: number
  created_at: string
}

export type FogState = {
  id: string
  session_id: string
  fog_enabled: boolean
  revealed_zones: FogZone[]
}

export type CombatState = {
  id: string
  session_id: string
  is_active: boolean
  round: number
  current_turn: number
  updated_at: string
}

export type CombatParticipant = {
  id: string
  session_id: string
  token_id: string
  name: string
  initiative: number
  hp_current: number
  hp_max: number
  ac: number
  is_player: boolean
  conditions: string[]
  is_defeated: boolean
  sort_order: number
}

export type MusicScene = {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string
  tracks: MusicTrack[]
}

export type MusicState = {
  id: string
  session_id: string
  scene_id: string | null
  status: MusicStatus
  current_track: number
  updated_at: string
}

export type BestiaryCreature = {
  id: string
  name: string
  size: CreatureSize
  type: string
  alignment: string | null
  cr: number
  xp: number | null
  image_url: string | null
  ac: number
  ac_type: string | null
  hp: number
  hp_formula: string | null
  speed: SpeedData
  stats: Stats
  saving_throws: Record<string, number>
  skills: Record<string, number>
  damage_resist: string[]
  damage_immune: string[]
  condition_immune: string[]
  senses: Record<string, number | string>
  languages: string[]
  traits: TraitData[]
  actions: ActionData[]
  bonus_actions: ActionData[]
  reactions: ActionData[]
  legendary: ActionData[]
  is_homebrew: boolean
  created_by: string | null
  created_at: string
}

export type LootItem = {
  id: string
  name: string
  type: ItemType
  rarity: Rarity
  requires_attunement: boolean
  weight: number
  cost_gp: number
  description: string
  properties: string[]
  image_url: string | null
  is_homebrew: boolean
  created_by: string | null
  created_at: string
}

export type Spell = {
  id: string
  name: string
  level: number
  school: SpellSchool
  casting_time: string
  range: string
  components: SpellComponents
  duration: string
  concentration: boolean
  ritual: boolean
  description: string
  higher_levels: string | null
  classes: string[]
  is_homebrew: boolean
  created_by: string | null
}

// Database type для Supabase client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      sessions: { Row: Session; Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Session> }
      session_players: { Row: SessionPlayer; Insert: Omit<SessionPlayer, 'id' | 'joined_at'>; Update: Partial<SessionPlayer> }
      characters: { Row: Character; Insert: Omit<Character, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Character> }
      character_inventory: { Row: InventoryItem; Insert: Omit<InventoryItem, 'id' | 'created_at'>; Update: Partial<InventoryItem> }
      character_spells: { Row: CharacterSpell; Insert: Omit<CharacterSpell, 'id'>; Update: Partial<CharacterSpell> }
      spell_slots: { Row: SpellSlot; Insert: Omit<SpellSlot, 'id'>; Update: Partial<SpellSlot> }
      map_state: { Row: MapState; Insert: Omit<MapState, 'id' | 'updated_at'>; Update: Partial<MapState> }
      map_tokens: { Row: MapToken; Insert: Omit<MapToken, 'id' | 'created_at'>; Update: Partial<MapToken> }
      fog_state: { Row: FogState; Insert: Omit<FogState, 'id'>; Update: Partial<FogState> }
      combat_state: { Row: CombatState; Insert: Omit<CombatState, 'id' | 'updated_at'>; Update: Partial<CombatState> }
      combat_participants: { Row: CombatParticipant; Insert: Omit<CombatParticipant, 'id'>; Update: Partial<CombatParticipant> }
      music_scenes: { Row: MusicScene; Insert: Omit<MusicScene, 'id'>; Update: Partial<MusicScene> }
      music_state: { Row: MusicState; Insert: Omit<MusicState, 'id' | 'updated_at'>; Update: Partial<MusicState> }
      bestiary: { Row: BestiaryCreature; Insert: Omit<BestiaryCreature, 'id' | 'created_at'>; Update: Partial<BestiaryCreature> }
      loot_items: { Row: LootItem; Insert: Omit<LootItem, 'id' | 'created_at'>; Update: Partial<LootItem> }
      spells: { Row: Spell; Insert: Omit<Spell, 'id'>; Update: Partial<Spell> }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
