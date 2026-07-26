-- Migration 0003: Reviews (post-delivery rating system)
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,

  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,

  communication_rating INT CHECK (communication_rating BETWEEN 1 AND 5),
  reliability_rating INT CHECK (reliability_rating BETWEEN 1 AND 5),
  care_of_item_rating INT CHECK (care_of_item_rating BETWEEN 1 AND 5),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_match_id ON public.reviews(match_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_user_id ON public.reviews(reviewed_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_per_match ON public.reviews(match_id, reviewer_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are publicly readable"
  ON public.reviews FOR SELECT
  USING (true);

-- Only participants of a completed match may leave a review, and only about the other party
CREATE POLICY "Match participants can create reviews for completed matches"
  ON public.reviews FOR INSERT
  WITH CHECK (
    (select auth.uid()) = reviewer_id
    AND reviewer_id <> reviewed_user_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.trips t ON t.id = m.trip_id
      JOIN public.orders o ON o.id = m.order_id
      WHERE m.id = reviews.match_id
        AND m.status = 'completed'
        AND (
          ((select auth.uid()) = t.traveler_id AND reviewed_user_id = o.requester_id)
          OR
          ((select auth.uid()) = o.requester_id AND reviewed_user_id = t.traveler_id)
        )
    )
  );

-- Trigger: keep profiles.avg_rating / total_reviews in sync
CREATE OR REPLACE FUNCTION public.handle_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_reviews = total_reviews + 1,
    avg_rating = (
      SELECT AVG(rating)::numeric(3,2)
      FROM public.reviews
      WHERE reviewed_user_id = NEW.reviewed_user_id
    )
  WHERE id = NEW.reviewed_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_review();
