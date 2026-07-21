import { z } from "zod";

export const initializePaymentSchema = z.object({
  match_id: z.string().uuid(),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
});

export const stripeOnboardingSchema = z.object({
  return_url: z.string().url(),
  refresh_url: z.string().url(),
});

export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
