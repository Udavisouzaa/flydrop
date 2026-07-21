import { z } from "zod";

export const expressInterestSchema = z.object({
  trip_id: z.string().uuid("trip_id inválido"),
  order_id: z.string().uuid("order_id inválido"),
});

export const respondToMatchSchema = z.object({
  match_id: z.string().uuid("match_id inválido"),
  decision: z.enum(["accepted", "declined"]),
  declined_reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const setAgreedPriceSchema = z.object({
  match_id: z.string().uuid(),
  agreed_price: z.coerce.number().positive("Preço deve ser maior que zero"),
});

export const confirmPickupSchema = z.object({
  match_id: z.string().uuid(),
});

export const confirmDropoffSchema = z.object({
  match_id: z.string().uuid(),
});

export type ExpressInterestInput = z.infer<typeof expressInterestSchema>;
export type RespondToMatchInput = z.infer<typeof respondToMatchSchema>;
export type SetAgreedPriceInput = z.infer<typeof setAgreedPriceSchema>;
