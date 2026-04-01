-- Add UNIQUE constraint to map_state.session_id so upsert works
ALTER TABLE map_state ADD CONSTRAINT map_state_session_id_unique UNIQUE (session_id);

-- Add grid_stroke_width if not already added
ALTER TABLE map_state ADD COLUMN IF NOT EXISTS grid_stroke_width numeric DEFAULT 1;
