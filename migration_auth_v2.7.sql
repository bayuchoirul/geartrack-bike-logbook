-- ============================================================================
-- GEARTRACK / BIKE LOGBOOK TELEMETRY v2.7 - AUTH & USER OWNERSHIP MIGRATION
-- Jalankan script ini di Supabase SQL Editor untuk mengaktifkan kepemilikan akun
-- tanpa menghapus data sepeda/komponen yang sudah ada sebelumnya.
-- ============================================================================

ALTER TABLE public.bikes
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

DROP POLICY IF EXISTS "Allow all access bikes" ON public.bikes;
CREATE POLICY "Authenticated users manage own or legacy bikes"
ON public.bikes FOR ALL
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
