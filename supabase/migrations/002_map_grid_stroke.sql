-- Add grid stroke width to map_state
ALTER TABLE map_state ADD COLUMN IF NOT EXISTS grid_stroke_width numeric DEFAULT 1;
