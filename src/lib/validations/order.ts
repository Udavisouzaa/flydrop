import { z } from "zod";

export const orderCategoryEnum = z.enum([
  "electronics",
  "documents",
  "clothing",
  "other",
]);

export const createOrderSchema = z
  .object({
    title: z.string().trim().min(3, "Título deve ter ao menos 3 caracteres").max(120),
    product_link: z
      .string()
      .trim()
      .url("Link inválido")
      .optional()
      .or(z.literal("")),
    description: z.string().trim().max(2000).optional().or(z.literal("")),
    category: orderCategoryEnum.optional(),
    size: z.string().trim().max(50).optional().or(z.literal("")),
    weight_kg: z.coerce.number().positive().max(32).optional(),
    origin_city: z.string().trim().min(2, "Cidade de origem obrigatória"),
    destination_city: z.string().trim().min(2, "Cidade de destino obrigatória"),
    needed_by_date: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida")
      .optional()
      .or(z.literal("")),
    budget: z.coerce.number().nonnegative().optional(),
    budget_min: z.coerce.number().nonnegative().optional(),
    budget_max: z.coerce.number().nonnegative().optional(),
    no_minimum_budget: z.coerce.boolean().optional(),
    requires_signature: z.coerce.boolean().optional(),
    requires_insurance: z.coerce.boolean().optional(),
    fragile: z.coerce.boolean().optional(),
  })
  .refine(
    (data) => data.origin_city.toLowerCase() !== data.destination_city.toLowerCase(),
    {
      message: "Origem e destino não podem ser a mesma cidade",
      path: ["destination_city"],
    }
  )
  .refine(
    (data) =>
      data.budget_min === undefined ||
      data.budget_max === undefined ||
      data.budget_min <= data.budget_max,
    {
      message: "Orçamento mínimo não pode ser maior que o máximo",
      path: ["budget_max"],
    }
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
