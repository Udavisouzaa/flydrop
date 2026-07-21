-- Migration 0004: Payments (Stripe Connect escrow transaction history)
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,

  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  payee_id UUID NOT NULL REFERENCES public.profiles(id),

  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT,

  amount_total NUMERIC NOT NULL,
  amount_to_traveler NUMERIC NOT NULL,
  amount_commission NUMERIC NOT NULL,

  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')) DEFAULT 'pending',

  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_match_id ON public.payments(match_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON public.payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee_id ON public.payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payment participants can view their payments"
  ON public.payments FOR SELECT
  USING ((select auth.uid()) = payer_id OR (select auth.uid()) = payee_id);

-- Inserts/updates to payments should only happen server-side via the service role
-- (Stripe webhook handler), so no INSERT/UPDATE policy is granted to `public` role here.
