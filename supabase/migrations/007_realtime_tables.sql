-- Migration 007: Enable Realtime on map tables
-- Supabase Realtime postgres_changes requires tables to be in the realtime publication

ALTER PUBLICATION supabase_realtime ADD TABLE map_tokens;
ALTER PUBLICATION supabase_realtime ADD TABLE map_state;
ALTER PUBLICATION supabase_realtime ADD TABLE fog_state;
ALTER PUBLICATION supabase_realtime ADD TABLE combat_state;
ALTER PUBLICATION supabase_realtime ADD TABLE combat_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE music_state;
ALTER PUBLICATION supabase_realtime ADD TABLE session_players;
