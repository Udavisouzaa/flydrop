import { z } from "zod";

export const createReviewSchema = z.object({
  match_id: z.string().uuid(),
  reviewed_user_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  communication_rating: z.coerce.number().int().min(1).max(5).optional(),
  reliability_rating: z.coerce.number().int().min(1).max(5).optional(),
  care_of_item_rating: z.coerce.number().int().min(1).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
