-- Migration 0008: Derive completion stats + lock down reputation/KYC columns
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)
--
-- Verified against the live database on 2026-07-26 (read-only inspection).
--
-- PART A — increment_completion_stats is not idempotent.
--   0007 fixed *who* may call the RPC but not *how many times*. The live body
--   still does `trips_completed = trips_completed + 1`, so any user party to a
--   single completed match can replay the RPC and inflate their counters
--   without bound. Fix: recompute from `matches` instead of incrementing, and
--   drive the recompute from a trigger rather than a client call. This mirrors
--   the avg_rating pattern already used by handle_new_review (0003).
--
-- PART B — the same columns are directly writable anyway.
--   The RLS policy "Users can update their own profile" is USING (auth.uid() = id)
--   with no WITH CHECK and no column restriction, and `authenticated` holds
--   column-level UPDATE on every reputation column. So Part A alone is
--   insufficient: a user can skip the RPC entirely and PATCH /rest/v1/profiles
--   to set trips_completed, avg_rating, total_reviews — and kyc_verified, which
--   is a stronger trust signal than any counter. All six are exposed publicly
--   through the profiles_public view.
--
-- Deploy order (each intermediate state is correct):
--   1. this migration      — recompute + trigger + column lockdown; RPC kept working
--   2. app deploy          — drop the RPC call from confirmDropoff
--   3. follow-up migration — drop the now-unreferenced RPC

-- ===========================================================================
-- PART A — derived completion stats
-- ===========================================================================

-- Single source of truth. Not granted to any client role: only the trigger and
-- the RPC below call it. Owned by postgres, so it bypasses the Part B lockdown.
CREATE OR REPLACE FUNCTION public.recalc_completion_stats(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.profiles p
  SET
    trips_completed = (
      SELECT COUNT(*)
      FROM public.matches m
      JOIN public.trips t ON t.id = m.trip_id
      WHERE m.status = 'completed'
        AND t.traveler_id = p.id
    ),
    orders_completed = (
      SELECT COUNT(*)
      FROM public.matches m
      JOIN public.orders o ON o.id = m.order_id
      WHERE m.status = 'completed'
        AND o.requester_id = p.id
    )
  WHERE p.id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.recalc_completion_stats(UUID) FROM PUBLIC, anon, authenticated;

-- Drive the recompute from the match itself, not from a client call.
CREATE OR REPLACE FUNCTION public.handle_match_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_traveler_id UUID;
  v_requester_id UUID;
BEGIN
  SELECT t.traveler_id, o.requester_id
    INTO v_traveler_id, v_requester_id
  FROM public.trips t
  JOIN public.orders o ON o.id = NEW.order_id
  WHERE t.id = NEW.trip_id;

  PERFORM public.recalc_completion_stats(v_traveler_id);
  PERFORM public.recalc_completion_stats(v_requester_id);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_match_completed() FROM PUBLIC, anon, authenticated;

-- Distinct name from the existing trg_guard_unlock_fields (BEFORE) trigger.
DROP TRIGGER IF EXISTS on_match_completed ON public.matches;
CREATE TRIGGER on_match_completed
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.handle_match_completed();

-- Keep the RPC working until stage 2 ships, but make it idempotent.
-- Authorization check is unchanged from 0007.
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

  PERFORM public.recalc_completion_stats(increment_completion_stats.traveler_id);
  PERFORM public.recalc_completion_stats(increment_completion_stats.requester_id);
END;
$$;

-- Backfill. Live check on 2026-07-26 found all 3 profiles already at 0/0 with
-- no drift, so this is expected to be a no-op — it exists so the migration is
-- correct regardless of when it actually runs.
UPDATE public.profiles p
SET
  trips_completed = (
    SELECT COUNT(*) FROM public.matches m
    JOIN public.trips t ON t.id = m.trip_id
    WHERE m.status = 'completed' AND t.traveler_id = p.id
  ),
  orders_completed = (
    SELECT COUNT(*) FROM public.matches m
    JOIN public.orders o ON o.id = m.order_id
    WHERE m.status = 'completed' AND o.requester_id = p.id
  )
WHERE
  p.trips_completed IS DISTINCT FROM (
    SELECT COUNT(*) FROM public.matches m
    JOIN public.trips t ON t.id = m.trip_id
    WHERE m.status = 'completed' AND t.traveler_id = p.id
  )
  OR p.orders_completed IS DISTINCT FROM (
    SELECT COUNT(*) FROM public.matches m
    JOIN public.orders o ON o.id = m.order_id
    WHERE m.status = 'completed' AND o.requester_id = p.id
  );

-- ===========================================================================
-- PART B — reputation/KYC columns are server-maintained, never client-written
-- ===========================================================================

-- Surgical column-level revoke. The app only ever writes full_name, phone and
-- bio from a user session (src/app/profile/actions.ts), so nothing legitimate
-- loses access. Functions owned by postgres (recalc_completion_stats,
-- handle_new_review) are unaffected by column grants.
REVOKE UPDATE (
  trips_completed,
  orders_completed,
  avg_rating,
  total_reviews,
  kyc_verified,
  kyc_verification_date
) ON public.profiles FROM anon, authenticated;

-- Defense in depth: a blanket `GRANT ALL ON ALL TABLES ... TO authenticated`
-- (common in Supabase setup scripts and some migration tooling) would silently
-- undo the REVOKE above. The trigger keeps holding in that case. Same shape as
-- the existing trg_guard_unlock_fields on matches, but keyed on current_user:
-- a direct PostgREST write runs as `authenticated`/`anon`, while SECURITY
-- DEFINER functions run as their owner (postgres) and pass through.
CREATE OR REPLACE FUNCTION public.guard_profile_reputation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW.trips_completed       IS DISTINCT FROM OLD.trips_completed
    OR NEW.orders_completed      IS DISTINCT FROM OLD.orders_completed
    OR NEW.avg_rating            IS DISTINCT FROM OLD.avg_rating
    OR NEW.total_reviews         IS DISTINCT FROM OLD.total_reviews
    OR NEW.kyc_verified          IS DISTINCT FROM OLD.kyc_verified
    OR NEW.kyc_verification_date IS DISTINCT FROM OLD.kyc_verification_date THEN
      RAISE EXCEPTION 'campos de reputação/KYC não podem ser alterados diretamente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_reputation_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_profile_reputation_fields ON public.profiles;
CREATE TRIGGER trg_guard_profile_reputation_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_reputation_fields();
