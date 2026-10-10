import { z } from "zod";

/**
 * Connection-fee model: the only charge Malotex makes is the one-off fee to
 * unlock a match's contact info. The client sends nothing but the match id —
 * the amount always comes from `matches.connection_fee` server-side, so a
 * tampered request can't lower the price.
 */
export const connectionCheckoutSchema = z.object({
  match_id: z.string().uuid(),
});

export type ConnectionCheckoutInput = z.infer<typeof connectionCheckoutSchema>;

/**
 * A reconciliação ("já paguei") recebe o mesmo que o checkout: só o id do
 * match. Quais cobranças conferir sai do banco, não do pedido — senão o
 * cliente escolheria qual cobrança usa para destravar qual match.
 */
export const connectionReconcileSchema = connectionCheckoutSchema;

/** Shape of the Asaas webhook payload we actually depend on. */
export const asaasWebhookSchema = z.object({
  event: z.string(),
  payment: z.object({
    id: z.string(),
    status: z.string().optional(),
    value: z.number().optional(),
    externalReference: z.string().nullable().optional(),
  }),
});

export type AsaasWebhookInput = z.infer<typeof asaasWebhookSchema>;
