-- Migration 011: Add world_state to realtime publication
-- Was missed in 007_realtime_tables.sql
ALTER PUBLICATION supabase_realtime ADD TABLE world_state;
