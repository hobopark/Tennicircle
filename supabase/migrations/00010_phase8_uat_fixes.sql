-- Phase 8 UAT fixes
-- Fix 3: Missing DELETE policy on join_requests (cancel request silently failed)
-- Fix 4: Global profile visibility for pending request display

-- Fix 3: Users can cancel their own pending join requests
CREATE POLICY "users_delete_own_pending_requests" ON public.join_requests
  FOR DELETE USING (user_id = auth.uid() AND status = 'pending');

-- Fix 4: Allow authenticated users to read global profiles (community_id IS NULL)
-- Needed for: pending request display (admin/coach viewing requester names),
-- future cross-community profile views
CREATE POLICY "authenticated_read_global_profiles" ON public.player_profiles
  FOR SELECT USING (community_id IS NULL AND auth.uid() IS NOT NULL);
