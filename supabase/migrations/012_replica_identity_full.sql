-- Migration 012: Set REPLICA IDENTITY FULL for realtime filter support
-- Without FULL, postgres_changes with session_id filters silently drops UPDATE events
-- because session_id is not part of the primary key

ALTER TABLE map_tokens   REPLICA IDENTITY FULL;
ALTER TABLE map_state    REPLICA IDENTITY FULL;
ALTER TABLE fog_state    REPLICA IDENTITY FULL;
ALTER TABLE world_state  REPLICA IDENTITY FULL;
ALTER TABLE combat_state REPLICA IDENTITY FULL;
ALTER TABLE combat_participants REPLICA IDENTITY FULL;
ALTER TABLE music_state  REPLICA IDENTITY FULL;
