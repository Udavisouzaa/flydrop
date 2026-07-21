import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{8,20}$/u, "Telefone inválido")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
