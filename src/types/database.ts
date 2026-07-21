export type TripStatus = "active" | "completed" | "cancelled";
export type OrderStatus = "open" | "matched" | "completed" | "cancelled";
export type MatchStatus = "pending" | "accepted" | "declined" | "completed";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
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
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}
