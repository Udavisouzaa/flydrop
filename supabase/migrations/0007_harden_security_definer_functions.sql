-- Migration 0007: Harden SECURITY DEFINER functions flagged by Supabase advisors
-- Applied 2026-07-21, same session as 0001-0006.
--
-- Two issues found by get_advisors(security) after applying 0003/0006:
--
-- 1. Postgres grants EXECUTE on new functions to PUBLIC by default, which
--    was never revoked. That means `handle_new_review()` (a trigger-only
--    function, never meant to be called directly) and
--    `increment_completion_stats()` were both callable via PostgREST RPC
--    by the `anon` role (unauthenticated requests) as well as `authenticated`.
--
-- 2. `increment_completion_stats(traveler_id, requester_id)` took the two
--    profile IDs as trusted input with no check that the caller is
--    actually a party to a completed match between them — any
--    authenticated user could call the RPC with arbitrary UUIDs and
--    inflate/corrupt any other user's trips_completed/orders_completed
--    counters. Low severity (cosmetic stat, not money/PII) but easy to
--    close: require a completed match to exist that ties (traveler_id,
--    requester_id) together AND that auth.uid() is one of the two.

-- --- 1. handle_new_review: trigger-only, no direct caller should ever need it ---
REVOKE ALL ON FUNCTION public.handle_new_review() FROM PUBLIC, anon, authenticated;

-- --- 2. increment_completion_stats: revoke PUBLIC/anon, keep authenticated,
--        and add a same-match ownership check inside the function body ---
REVOKE ALL ON FUNCTION public.increment_completion_stats(UUID, UUID) FROM PUBLIC, anon;

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
  IF NOT EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.trips t ON t.id = m.trip_id
    JOIN public.orders o ON o.id = m.order_id
    WHERE m.status = 'completed'
      AND t.traveler_id = increment_completion_stats.traveler_id
      AND o.requester_id = increment_completion_stats.requester_id
      AND (select auth.uid()) IN (t.traveler_id, o.requester_id)
  ) THEN
    RAISE EXCEPTION 'No completed match found between these parties for the calling user';
  END IF;

  UPDATE public.profiles
  SET trips_completed = trips_completed + 1
  WHERE id = traveler_id;

  UPDATE public.profiles
  SET orders_completed = orders_completed + 1
  WHERE id = requester_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_completion_stats(UUID, UUID) TO authenticated;
