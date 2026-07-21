import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { Order, Trip } from "@/types/database";

const DEFAULT_SEARCH_WINDOW_DAYS = 14;

export interface ScoredTrip extends Trip {
  matchScore: number;
}

export interface ScoredOrder extends Order {
  matchScore: number;
}

function normalizeCity(city: string) {
  return city.trim().toLowerCase();
}

function daysBetween(a: Date, b: Date) {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Score how well a trip fits an order. Higher is better.
 *   - date alignment (closer departure to needed_by => higher score)
 *   - weight fit (trip has just enough space => higher score than way too much)
 *   - traveler rating (once profiles.avg_rating is populated)
 */
function scoreTripForOrder(
  trip: Trip,
  order: Order,
  travelerRating: number | null
): number {
  let score = 0;

  // Date alignment (0-40 points): closer to needed_by_date is better.
  if (order.needed_by_date) {
    const diffDays = daysBetween(
      new Date(trip.departure_date),
      new Date(order.needed_by_date)
    );
    score += Math.max(0, 40 - diffDays * 4);
  } else {
    score += 20; // no deadline specified, neutral score
  }

  // Weight fit (0-30 points): trip has enough space, but not excessively more.
  if (order.weight_kg && trip.available_space_kg) {
    if (trip.available_space_kg >= order.weight_kg) {
      const slack = trip.available_space_kg - order.weight_kg;
      score += Math.max(10, 30 - slack * 2);
    }
  } else {
    score += 15; // unspecified weight, neutral score
  }

  // Traveler rating (0-30 points)
  score += (travelerRating ?? 5) * 6;

  return Math.round(score * 100) / 100;
}

/**
 * Given a newly created (or existing) Order, find active Trips that match
 * origin/destination and fall within a reasonable date window, ranked by
 * matchScore (best fit first).
 */
export async function suggestTripsForOrder(
  orderId: string,
  opts: { limit?: number; windowDays?: number } = {}
): Promise<ScoredTrip[]> {
  const supabase = await createClient();
  const { limit = 10, windowDays = DEFAULT_SEARCH_WINDOW_DAYS } = opts;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) return [];

  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(
    windowEnd.getDate() +
      (order.needed_by_date
        ? daysBetween(today, new Date(order.needed_by_date)) + windowDays
        : windowDays)
  );

  let query = supabase
    .from("trips")
    .select("*, profiles!trips_traveler_id_fkey(avg_rating)")
    .eq("status", "active")
    .ilike("origin_city", order.origin_city)
    .ilike("destination_city", order.destination_city)
    .gte("departure_date", today.toISOString().slice(0, 10));

  if (order.needed_by_date) {
    query = query.lte("departure_date", order.needed_by_date);
  } else {
    query = query.lte("departure_date", windowEnd.toISOString().slice(0, 10));
  }

  const { data: trips, error: tripsError } = await query;
  if (tripsError || !trips) return [];

  const scored = (trips as unknown as (Trip & {
    profiles: { avg_rating: number | null } | null;
  })[])
    .filter(
      (t) =>
        !order.weight_kg ||
        !t.available_space_kg ||
        t.available_space_kg >= order.weight_kg
    )
    .map((t) => ({
      ...t,
      matchScore: scoreTripForOrder(t, order, t.profiles?.avg_rating ?? null),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
}

/**
 * Given a newly created (or existing) Trip, find open Orders that match
 * origin/destination, fit the available space, and are needed within the
 * trip's timeframe, ranked by matchScore.
 */
export async function suggestOrdersForTrip(
  tripId: string,
  opts: { limit?: number } = {}
): Promise<ScoredOrder[]> {
  const supabase = await createClient();
  const { limit = 10 } = opts;

  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) return [];

  const query = supabase
    .from("orders")
    .select("*")
    .eq("status", "open")
    .ilike("origin_city", trip.origin_city)
    .ilike("destination_city", trip.destination_city);

  const { data: orders, error: ordersError } = await query;
  if (ordersError || !orders) return [];

  const scored = (orders as Order[])
    .filter(
      (o) =>
        (!o.needed_by_date || o.needed_by_date >= trip.departure_date) &&
        (!o.weight_kg ||
          !trip.available_space_kg ||
          trip.available_space_kg >= o.weight_kg)
    )
    .map((o) => ({
      ...o,
      matchScore: scoreTripForOrder(trip, o, null),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
}

/**
 * Case-insensitive city comparison helper, exported for reuse in
 * server actions / search filters.
 */
export function citiesMatch(a: string, b: string) {
  return normalizeCity(a) === normalizeCity(b);
}
