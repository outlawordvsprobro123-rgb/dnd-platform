-- ============================================================
-- DnD Companion Platform — Initial Schema
-- ============================================================

-- PROFILES
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    text UNIQUE NOT NULL,
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "public_read" ON profiles FOR SELECT USING (true);

-- SESSIONS
CREATE TABLE sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,
  master_id   uuid REFERENCES auth.users(id),
  name        text NOT NULL,
  status      text DEFAULT 'waiting' CHECK (status IN ('waiting','active','paused','ended')),
  settings    jsonb DEFAULT '{"allowPlayerTokenMove":true,"fogEnabled":true}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_owns" ON sessions FOR ALL USING (master_id = auth.uid());
-- player_reads добавляется после создания session_players (см. ниже)

-- SESSION_PLAYERS
CREATE TABLE session_players (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid REFERENCES sessions(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id),
  character_id uuid,
  status       text DEFAULT 'online' CHECK (status IN ('online','offline','kicked')),
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "master_manages" ON session_players FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_reads_own" ON session_players FOR SELECT USING (user_id = auth.uid());

-- Политика sessions, зависящая от session_players
CREATE POLICY "player_reads" ON sessions FOR SELECT
  USING (id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid()));

-- CHARACTERS
CREATE TABLE characters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES auth.users(id),
  name              text NOT NULL,
  race              text NOT NULL,
  class             text NOT NULL,
  subclass          text,
  level             int DEFAULT 1 CHECK (level BETWEEN 1 AND 20),
  experience        int DEFAULT 0,
  alignment         text,
  background        text,
  stats             jsonb NOT NULL DEFAULT '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}',
  hp_max            int NOT NULL DEFAULT 10,
  hp_current        int NOT NULL DEFAULT 10 CHECK (hp_current >= 0),
  hp_temp           int DEFAULT 0 CHECK (hp_temp >= 0),
  armor_class       int DEFAULT 10,
  initiative        int,
  speed             int DEFAULT 30,
  hit_dice          text DEFAULT '1d8',
  death_saves       jsonb DEFAULT '{"successes":0,"failures":0}',
  proficiency_bonus int DEFAULT 2,
  saving_throws     jsonb DEFAULT '{}',
  skills            jsonb DEFAULT '{}',
  features          jsonb DEFAULT '[]',
  traits            jsonb DEFAULT '{}',
  notes             text,
  avatar_url        text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON characters FOR ALL USING (user_id = auth.uid());
CREATE POLICY "master_reads" ON characters FOR SELECT
  USING (id IN (
    SELECT sp.character_id FROM session_players sp
    JOIN sessions s ON s.id = sp.session_id
    WHERE s.master_id = auth.uid() AND sp.character_id IS NOT NULL
  ));
CREATE POLICY "session_players_read" ON characters FOR SELECT
  USING (id IN (
    SELECT sp2.character_id FROM session_players sp2
    WHERE sp2.session_id IN (SELECT session_id FROM session_players WHERE user_id = auth.uid())
    AND sp2.character_id IS NOT NULL
  ));

-- CHARACTER_INVENTORY
CREATE TABLE character_inventory (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  item_id      uuid,
  name         text NOT NULL,
  quantity     int DEFAULT 1 CHECK (quantity > 0),
  weight       numeric(5,2) DEFAULT 0,
  equipped     bool DEFAULT false,
  description  text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE character_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manages" ON character_inventory FOR ALL
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

-- CHARACTER_SPELLS
CREATE TABLE character_spells (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  spell_id     uuid,
  name         text NOT NULL,
  spell_level  int DEFAULT 0 CHECK (spell_level BETWEEN 0 AND 9),
  prepared     bool DEFAULT true,
  notes        text
);
ALTER TABLE character_spells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manages" ON character_spells FOR ALL
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

-- SPELL_SLOTS
CREATE TABLE spell_slots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  level        int NOT NULL CHECK (level BETWEEN 1 AND 9),
  total        int NOT NULL DEFAULT 0,
  used         int NOT NULL DEFAULT 0
);
ALTER TABLE spell_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manages" ON spell_slots FOR ALL
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

-- MAP_STATE
CREATE TABLE map_state (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  map_url     text,
  map_type    text DEFAULT 'image' CHECK (map_type IN ('image','video','gif')),
  grid_type   text DEFAULT 'square' CHECK (grid_type IN ('square','hex','none')),
  grid_size   int DEFAULT 50,
  grid_color  text DEFAULT '#ffffff20',
  width       int DEFAULT 1920,
  height      int DEFAULT 1080,
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE map_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_members_read" ON map_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON map_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));

-- MAP_TOKENS
CREATE TABLE map_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid REFERENCES sessions(id) ON DELETE CASCADE,
  owner_type          text NOT NULL CHECK (owner_type IN ('player','npc','object')),
  owner_id            uuid,
  label               text NOT NULL,
  image_url           text,
  x                   numeric(10,2) DEFAULT 0,
  y                   numeric(10,2) DEFAULT 0,
  width               int DEFAULT 50,
  height              int DEFAULT 50,
  hp_current          int,
  hp_max              int,
  show_hp             bool DEFAULT true,
  conditions          jsonb DEFAULT '[]',
  visible_to_players  bool DEFAULT true,
  layer               int DEFAULT 1,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE map_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_members_read" ON map_tokens FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_manages_all" ON map_tokens FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_moves_own" ON map_tokens FOR UPDATE
  USING (owner_type = 'player' AND owner_id IN (
    SELECT character_id FROM session_players WHERE user_id = auth.uid()
  ));

-- FOG_STATE
CREATE TABLE fog_state (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  fog_enabled    bool DEFAULT true,
  revealed_zones jsonb DEFAULT '[]'
);
ALTER TABLE fog_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_members_read" ON fog_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON fog_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));

-- COMBAT_STATE
CREATE TABLE combat_state (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  is_active    bool DEFAULT false,
  round        int DEFAULT 1,
  current_turn int DEFAULT 0,
  updated_at   timestamptz DEFAULT now()
);
ALTER TABLE combat_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_read" ON combat_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON combat_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));

-- COMBAT_PARTICIPANTS
CREATE TABLE combat_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid REFERENCES sessions(id) ON DELETE CASCADE,
  token_id     uuid REFERENCES map_tokens(id) ON DELETE CASCADE,
  name         text NOT NULL,
  initiative   int NOT NULL DEFAULT 0,
  hp_current   int NOT NULL DEFAULT 0 CHECK (hp_current >= 0),
  hp_max       int NOT NULL DEFAULT 0,
  ac           int DEFAULT 10,
  is_player    bool DEFAULT false,
  conditions   jsonb DEFAULT '[]',
  is_defeated  bool DEFAULT false,
  sort_order   int DEFAULT 0
);
ALTER TABLE combat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_read" ON combat_participants FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON combat_participants FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));
CREATE POLICY "player_update_own" ON combat_participants FOR UPDATE
  USING (is_player = true AND token_id IN (
    SELECT id FROM map_tokens WHERE owner_id IN (
      SELECT character_id FROM session_players WHERE user_id = auth.uid()
    )
  ));

-- MUSIC_SCENES
CREATE TABLE music_scenes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  description text,
  icon        text,
  color       text DEFAULT '#6366f1',
  tracks      jsonb NOT NULL DEFAULT '[]'
);
ALTER TABLE music_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read" ON music_scenes FOR SELECT USING (true);

-- MUSIC_STATE
CREATE TABLE music_state (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid REFERENCES sessions(id) ON DELETE CASCADE UNIQUE,
  scene_id      uuid REFERENCES music_scenes(id),
  status        text DEFAULT 'stopped' CHECK (status IN ('playing','paused','stopped')),
  current_track int DEFAULT 0,
  updated_at    timestamptz DEFAULT now()
);
ALTER TABLE music_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_read" ON music_state FOR SELECT
  USING (session_id IN (
    SELECT session_id FROM session_players WHERE user_id = auth.uid()
    UNION SELECT id FROM sessions WHERE master_id = auth.uid()
  ));
CREATE POLICY "master_write" ON music_state FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE master_id = auth.uid()));

-- BESTIARY
CREATE TABLE bestiary (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  size             text NOT NULL CHECK (size IN ('Tiny','Small','Medium','Large','Huge','Gargantuan')),
  type             text NOT NULL,
  alignment        text,
  cr               numeric(4,2) NOT NULL,
  xp               int,
  image_url        text,
  ac               int NOT NULL,
  ac_type          text,
  hp               int NOT NULL,
  hp_formula       text,
  speed            jsonb DEFAULT '{"walk":30}',
  stats            jsonb NOT NULL DEFAULT '{"str":10,"dex":10,"con":10,"int":10,"wis":10,"cha":10}',
  saving_throws    jsonb DEFAULT '{}',
  skills           jsonb DEFAULT '{}',
  damage_resist    jsonb DEFAULT '[]',
  damage_immune    jsonb DEFAULT '[]',
  condition_immune jsonb DEFAULT '[]',
  senses           jsonb DEFAULT '{}',
  languages        jsonb DEFAULT '[]',
  traits           jsonb DEFAULT '[]',
  actions          jsonb DEFAULT '[]',
  bonus_actions    jsonb DEFAULT '[]',
  reactions        jsonb DEFAULT '[]',
  legendary        jsonb DEFAULT '[]',
  is_homebrew      bool DEFAULT false,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz DEFAULT now(),
  search_vector    tsvector GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED
);
ALTER TABLE bestiary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_official" ON bestiary FOR SELECT USING (is_homebrew = false);
CREATE POLICY "creator_manages_homebrew" ON bestiary FOR ALL
  USING (is_homebrew = true AND created_by = auth.uid());
CREATE INDEX bestiary_search_idx ON bestiary USING GIN (search_vector);
CREATE INDEX bestiary_cr_idx ON bestiary (cr);
CREATE INDEX bestiary_type_idx ON bestiary (type);

-- LOOT_ITEMS
CREATE TABLE loot_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  type                text NOT NULL CHECK (type IN ('weapon','armor','potion','ring','wondrous','tool','misc')),
  rarity              text NOT NULL CHECK (rarity IN ('common','uncommon','rare','very_rare','legendary','artifact')),
  requires_attunement bool DEFAULT false,
  weight              numeric(5,2) DEFAULT 0,
  cost_gp             int DEFAULT 0,
  description         text NOT NULL,
  properties          jsonb DEFAULT '[]',
  image_url           text,
  is_homebrew         bool DEFAULT false,
  created_by          uuid REFERENCES auth.users(id),
  created_at          timestamptz DEFAULT now(),
  search_vector       tsvector GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || description)) STORED
);
ALTER TABLE loot_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_official" ON loot_items FOR SELECT USING (is_homebrew = false);
CREATE POLICY "creator_manages_homebrew" ON loot_items FOR ALL
  USING (is_homebrew = true AND created_by = auth.uid());
CREATE INDEX loot_search_idx ON loot_items USING GIN (search_vector);
CREATE INDEX loot_rarity_idx ON loot_items (rarity);
CREATE INDEX loot_type_idx ON loot_items (type);

-- SPELLS
CREATE TABLE spells (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  level         int NOT NULL CHECK (level BETWEEN 0 AND 9),
  school        text NOT NULL CHECK (school IN ('abjuration','conjuration','divination','enchantment','evocation','illusion','necromancy','transmutation')),
  casting_time  text NOT NULL,
  range         text NOT NULL,
  components    jsonb NOT NULL DEFAULT '{"v":false,"s":false,"m":null}',
  duration      text NOT NULL,
  concentration bool DEFAULT false,
  ritual        bool DEFAULT false,
  description   text NOT NULL,
  higher_levels text,
  classes       jsonb NOT NULL DEFAULT '[]',
  is_homebrew   bool DEFAULT false,
  created_by    uuid REFERENCES auth.users(id),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED
);
ALTER TABLE spells ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_read_official" ON spells FOR SELECT USING (is_homebrew = false);
CREATE POLICY "creator_manages_homebrew" ON spells FOR ALL
  USING (is_homebrew = true AND created_by = auth.uid());
CREATE INDEX spells_search_idx ON spells USING GIN (search_vector);
CREATE INDEX spells_level_idx ON spells (level);
CREATE INDEX spells_school_idx ON spells (school);

-- UPDATED_AT триггеры
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER characters_updated_at BEFORE UPDATE ON characters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER map_state_updated_at BEFORE UPDATE ON map_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER combat_state_updated_at BEFORE UPDATE ON combat_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER music_state_updated_at BEFORE UPDATE ON music_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
