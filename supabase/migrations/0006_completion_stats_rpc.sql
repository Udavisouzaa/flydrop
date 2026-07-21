-- Migration 0006: RPC to increment trips_completed / orders_completed stats
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)
-- Called from src/app/matches/actions.ts (confirmDropoff) when a match completes.

CREATE OR REPLACE FUNCTION public.increment_completion_stats(
  traveler_id UUID,
  requester_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET trips_completed = trips_completed + 1
  WHERE id = traveler_id;

  UPDATE public.profiles
  SET orders_completed = orders_completed + 1
  WHERE id = requester_id;
END;
$$;

-- Allow any authenticated user to call this RPC (it only touches aggregate
-- counters, not sensitive data, and callers can't pick arbitrary rows to
-- corrupt since IDs come from a match the caller is already a party to).
GRANT EXECUTE ON FUNCTION public.increment_completion_stats(UUID, UUID) TO authenticated;
