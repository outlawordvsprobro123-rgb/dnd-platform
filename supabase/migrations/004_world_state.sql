CREATE TABLE IF NOT EXISTS world_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  weather text NOT NULL DEFAULT 'clear',
  time_of_day text NOT NULL DEFAULT 'day',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS world_state_session_id_unique ON world_state (session_id);

ALTER TABLE world_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session members can read world_state" ON world_state FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sessions s
    LEFT JOIN session_players sp ON sp.session_id = s.id
    WHERE s.id = world_state.session_id
      AND (s.master_id = auth.uid() OR sp.user_id = auth.uid())
  )
);

CREATE POLICY "Master can write world_state" ON world_state FOR ALL USING (
  EXISTS (SELECT 1 FROM sessions WHERE id = world_state.session_id AND master_id = auth.uid())
);
