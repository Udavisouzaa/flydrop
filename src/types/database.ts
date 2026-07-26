export type TripStatus = "active" | "completed" | "cancelled";
export type OrderStatus = "open" | "matched" | "completed" | "cancelled";
export type MatchStatus = "pending" | "accepted" | "declined" | "completed";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  kyc_verified: boolean | null;
  kyc_verification_date: string | null;
  trips_completed: number | null;
  orders_completed: number | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Public-safe projection of `profiles`, backed by the `profiles_public` view
 * (migration applied 2026-07). Excludes `phone` and any other PII — use this
 * whenever looking up another user's profile (not your own row), since RLS
 * on the base `profiles` table now only allows selecting your own row.
 */
export interface ProfilePublic {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  kyc_verified: boolean | null;
  trips_completed: number | null;
  orders_completed: number | null;
  created_at: string;
}

export interface Trip {
  id: string;
  traveler_id: string;
  origin_city: string;
  origin_state: string | null;
  destination_city: string;
  destination_state: string | null;
  departure_date: string;
  available_space_kg: number | null;
  notes: string | null;
  status: TripStatus;
  created_at: string;
}

export interface Order {
  id: string;
  requester_id: string;
  title: string;
  product_link: string | null;
  description: string | null;
  size: string | null;
  weight_kg: number | null;
  origin_city: string;
  destination_city: string;
  needed_by_date: string | null;
  budget: number | null;
  status: OrderStatus;
  created_at: string;
}

export interface Match {
  id: string;
  trip_id: string;
  order_id: string;
  status: MatchStatus;
  agreed_price: number | null;
  created_by: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  declined_reason: string | null;
  pickup_location: string | null;
  pickup_instructions: string | null;
  dropoff_location: string | null;
  dropoff_instructions: string | null;
  traveler_confirmed_pickup: boolean | null;
  traveler_confirmed_pickup_at: string | null;
  requester_confirmed_dropoff: boolean | null;
  requester_confirmed_dropoff_at: string | null;
  updated_at: string | null;
  /** Connection-fee model (migration applied 2026-07): fee to unlock contact info. */
  connection_fee: number | null;
  unlocked_at: string | null;
  unlocked_by: string | null;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}
