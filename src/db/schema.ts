/**
 * Drizzle ORM schema for Malotex.
 *
 * Mirrors the PostgreSQL schema managed via Supabase migrations
 * (see /supabase/migrations). This file is the TypeScript source of
 * truth for type-safe queries; the SQL migrations are the source of
 * truth for what's actually applied to the database.
 *
 * NOTE: Tables/columns marked "PENDING" only exist once migrations
 * 0001-0005 are applied to the Supabase project. Until then, only the
 * base columns (matching the live schema) should be relied upon.
 */
import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // references auth.users(id)
  fullName: text("full_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),

  // PENDING (migration 0001)
  avgRating: numeric("avg_rating").default("5.0"),
  totalReviews: integer("total_reviews").default(0),
  kycVerified: boolean("kyc_verified").default(false),
  kycVerificationDate: timestamp("kyc_verification_date", { withTimezone: true }),
  tripsCompleted: integer("trips_completed").default(0),
  ordersCompleted: integer("orders_completed").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ---------------------------------------------------------------------------
// payment_accounts — DEPRECATED
//
// Belongs to the abandoned Stripe Connect escrow model. Under the connection-
// fee model no traveler payout account exists, so nothing writes here. The
// table is still in the DB (empty) pending a drop migration.
// ---------------------------------------------------------------------------
export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stripeAccountId: text("stripe_account_id").notNull().unique(),
    stripeConnectStatus: text("stripe_connect_status", {
      enum: ["pending", "active", "restricted"],
    }).default("pending"),
    bankAccountLast4: text("bank_account_last4"),
    bankCountry: text("bank_country"),
    commissionPercentage: numeric("commission_percentage").default("0.1"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("payment_accounts_user_id_unique").on(table.userId)]
);

// ---------------------------------------------------------------------------
// trips
// ---------------------------------------------------------------------------
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    travelerId: uuid("traveler_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    originCity: text("origin_city").notNull(),
    originState: text("origin_state"),
    destinationCity: text("destination_city").notNull(),
    destinationState: text("destination_state"),

    departureDate: date("departure_date").notNull(),
    // PENDING (migration 0002)
    arrivalDate: date("arrival_date"),

    availableSpaceKg: numeric("available_space_kg"),
    // PENDING (migration 0002)
    availableSpaceUnits: integer("available_space_units"),
    allowFragile: boolean("allow_fragile").default(true),
    allowElectronics: boolean("allow_electronics").default(true),
    allowValuable: boolean("allow_valuable").default(false),

    notes: text("notes"),
    status: text("status", {
      enum: ["active", "completed", "cancelled"],
    })
      .notNull()
      .default("active"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_trips_traveler_id").on(table.travelerId),
    index("idx_trips_status").on(table.status),
    index("idx_trips_route").on(
      table.originCity,
      table.destinationCity,
      table.departureDate
    ),
  ]
);

// ---------------------------------------------------------------------------
// orders
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    productLink: text("product_link"),
    description: text("description"),
    // PENDING (migration 0002)
    category: text("category", {
      enum: ["electronics", "documents", "clothing", "other"],
    }),

    size: text("size"),
    weightKg: numeric("weight_kg"),
    heightCm: numeric("height_cm"),
    widthCm: numeric("width_cm"),
    depthCm: numeric("depth_cm"),

    originCity: text("origin_city").notNull(),
    destinationCity: text("destination_city").notNull(),
    neededByDate: date("needed_by_date"),

    budget: numeric("budget"),
    budgetMin: numeric("budget_min"),
    budgetMax: numeric("budget_max"),

    requiresSignature: boolean("requires_signature").default(false),
    requiresInsurance: boolean("requires_insurance").default(false),
    fragile: boolean("fragile").default(false),

    status: text("status", {
      enum: ["open", "matched", "completed", "cancelled"],
    })
      .notNull()
      .default("open"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_orders_requester_id").on(table.requesterId),
    index("idx_orders_status").on(table.status),
    index("idx_orders_route").on(
      table.originCity,
      table.destinationCity,
      table.neededByDate
    ),
  ]
);

// ---------------------------------------------------------------------------
// matches
// ---------------------------------------------------------------------------
export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => profiles.id),

    status: text("status", {
      enum: ["pending", "accepted", "declined", "completed"],
    })
      .notNull()
      .default("pending"),
    agreedPrice: numeric("agreed_price"),

    // PENDING (migration 0002)
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    declinedReason: text("declined_reason"),

    pickupLocation: text("pickup_location"),
    pickupInstructions: text("pickup_instructions"),
    dropoffLocation: text("dropoff_location"),
    dropoffInstructions: text("dropoff_instructions"),

    travelerConfirmedPickup: boolean("traveler_confirmed_pickup").default(false),
    travelerConfirmedPickupAt: timestamp("traveler_confirmed_pickup_at", {
      withTimezone: true,
    }),
    requesterConfirmedDropoff: boolean("requester_confirmed_dropoff").default(
      false
    ),
    requesterConfirmedDropoffAt: timestamp("requester_confirmed_dropoff_at", {
      withTimezone: true,
    }),

    // Connection-fee model: the fee is fixed when the match is created, and
    // only the Asaas webhook (service_role) may set the unlock fields — the
    // guard_unlock_fields trigger rejects anyone else.
    connectionFee: numeric("connection_fee"),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }),
    unlockedBy: uuid("unlocked_by").references(() => profiles.id),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_matches_trip_id").on(table.tripId),
    index("idx_matches_order_id").on(table.orderId),
    index("idx_matches_status").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// messages
// ---------------------------------------------------------------------------
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_messages_match_id").on(table.matchId),
    index("idx_messages_created_at").on(table.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// reviews (PENDING - migration 0003)
// ---------------------------------------------------------------------------
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    reviewedUserId: uuid("reviewed_user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    rating: integer("rating").notNull(),
    title: text("title"),
    comment: text("comment"),

    communicationRating: integer("communication_rating"),
    reliabilityRating: integer("reliability_rating"),
    careOfItemRating: integer("care_of_item_rating"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_reviews_match_id").on(table.matchId),
    index("idx_reviews_reviewed_user_id").on(table.reviewedUserId),
    uniqueIndex("idx_reviews_unique_per_match").on(
      table.matchId,
      table.reviewerId
    ),
  ]
);

// ---------------------------------------------------------------------------
// payments (PENDING - migration 0004)
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    payerId: uuid("payer_id")
      .notNull()
      .references(() => profiles.id),
    // Null for connection fees: nobody is being paid out, the platform just
    // keeps the fee.
    payeeId: uuid("payee_id").references(() => profiles.id),

    kind: text("kind", { enum: ["connection_fee", "delivery_escrow"] })
      .notNull()
      .default("connection_fee"),

    // PSP-agnostic fields (Asaas today; "delivery_escrow" is legacy/unused).
    psp: text("psp"),
    pspChargeId: text("psp_charge_id"),
    pixQrPayload: text("pix_qr_payload"),
    pixExpiresAt: timestamp("pix_expires_at", { withTimezone: true }),

    // Legacy Stripe-escrow columns, kept because the table still has them.
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    stripeTransferId: text("stripe_transfer_id"),

    amountTotal: numeric("amount_total").notNull(),
    amountToTraveler: numeric("amount_to_traveler"),
    amountCommission: numeric("amount_commission").notNull(),

    status: text("status", {
      enum: ["pending", "succeeded", "failed", "refunded"],
    }).default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_payments_match_id").on(table.matchId),
    index("idx_payments_status").on(table.status),
  ]
);

// ---------------------------------------------------------------------------
// notifications (PENDING - migration 0005)
// ---------------------------------------------------------------------------
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message"),

    relatedMatchId: uuid("related_match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    relatedOrderId: uuid("related_order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),
    relatedTripId: uuid("related_trip_id").references(() => trips.id, {
      onDelete: "cascade",
    }),

    read: boolean("read").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_read").on(table.read),
  ]
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const profilesRelations = relations(profiles, ({ many, one }) => ({
  trips: many(trips),
  orders: many(orders),
  paymentAccount: one(paymentAccounts, {
    fields: [profiles.id],
    references: [paymentAccounts.userId],
  }),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  traveler: one(profiles, {
    fields: [trips.travelerId],
    references: [profiles.id],
  }),
  matches: many(matches),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  requester: one(profiles, {
    fields: [orders.requesterId],
    references: [profiles.id],
  }),
  matches: many(matches),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  trip: one(trips, { fields: [matches.tripId], references: [trips.id] }),
  order: one(orders, { fields: [matches.orderId], references: [orders.id] }),
  createdByProfile: one(profiles, {
    fields: [matches.createdBy],
    references: [profiles.id],
  }),
  messages: many(messages),
  reviews: many(reviews),
  payments: many(payments),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  match: one(matches, {
    fields: [messages.matchId],
    references: [matches.id],
  }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  match: one(matches, { fields: [reviews.matchId], references: [matches.id] }),
  reviewer: one(profiles, {
    fields: [reviews.reviewerId],
    references: [profiles.id],
  }),
  reviewedUser: one(profiles, {
    fields: [reviews.reviewedUserId],
    references: [profiles.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  match: one(matches, {
    fields: [payments.matchId],
    references: [matches.id],
  }),
  payer: one(profiles, { fields: [payments.payerId], references: [profiles.id] }),
  payee: one(profiles, { fields: [payments.payeeId], references: [profiles.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, {
    fields: [notifications.userId],
    references: [profiles.id],
  }),
}));
