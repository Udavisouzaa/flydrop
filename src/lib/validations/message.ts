import { z } from "zod";

export const sendMessageSchema = z.object({
  match_id: z.string().uuid("match_id inválido"),
  content: z
    .string()
    .trim()
    .min(1, "Mensagem não pode ser vazia")
    .max(2000, "Mensagem muito longa"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
