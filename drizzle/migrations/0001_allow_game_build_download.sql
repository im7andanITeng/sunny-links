CREATE POLICY "Anyone can download the game build package"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'game-builds' AND name = 'sunny-links.zip');