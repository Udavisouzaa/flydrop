-- Migration 0001: Extend profiles with rating/KYC/stats + create payment_accounts
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)

-- Extend profiles with rating/kyc/stats
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS kyc_verification_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trips_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS orders_completed INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- payment_accounts: Stripe Connect account per user
CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  stripe_connect_status TEXT CHECK (stripe_connect_status IN ('pending', 'active', 'restricted')) DEFAULT 'pending',
  bank_account_last4 TEXT,
  bank_country TEXT,
  commission_percentage NUMERIC DEFAULT 0.1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT payment_accounts_user_id_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_accounts_user_id ON public.payment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_stripe_status ON public.payment_accounts(stripe_connect_status);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment account"
  ON public.payment_accounts FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own payment account"
  ON public.payment_accounts FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own payment account"
  ON public.payment_accounts FOR UPDATE
  USING ((select auth.uid()) = user_id);
