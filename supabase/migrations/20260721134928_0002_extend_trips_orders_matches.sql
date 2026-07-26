-- Migration 0002: Extend trips, orders, matches with fields needed for matching/tracking/delivery flow
-- STATUS: PENDING APPROVAL - review before applying to production Supabase project (mmylufjhugbhunofqtzp)

-- Trips: allow-list flags + arrival date + units capacity
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS arrival_date DATE,
  ADD COLUMN IF NOT EXISTS available_space_units INT,
  ADD COLUMN IF NOT EXISTS allow_fragile BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_electronics BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_valuable BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_trips_route ON public.trips(origin_city, destination_city, departure_date);

-- Orders: category + dimensions + budget range + special requirements
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('electronics', 'documents', 'clothing', 'other')),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS depth_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS budget_min NUMERIC,
  ADD COLUMN IF NOT EXISTS budget_max NUMERIC,
  ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_insurance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fragile BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_route ON public.orders(origin_city, destination_city, needed_by_date);

-- Matches: delivery tracking + confirmation fields
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_reason TEXT,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS pickup_instructions TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_location TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_instructions TEXT,
  ADD COLUMN IF NOT EXISTS traveler_confirmed_pickup BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS traveler_confirmed_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requester_confirmed_dropoff BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requester_confirmed_dropoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Prevent duplicate active matches between the same trip/order pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_unique_active ON public.matches(trip_id, order_id)
  WHERE status IN ('pending', 'accepted');
