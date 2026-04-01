-- Migration 008: Character avatar storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('characters', 'characters', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "users_upload_avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'characters' AND (storage.foldername(name))[1] = 'avatars');

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'characters');

CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'characters' AND owner = auth.uid());

CREATE POLICY "users_delete_own_avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'characters' AND owner = auth.uid());
