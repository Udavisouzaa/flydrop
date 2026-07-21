import { z } from "zod";

export const createTripSchema = z
  .object({
    origin_city: z.string().trim().min(2, "Cidade de origem obrigatória"),
    origin_state: z.string().trim().max(2).optional().or(z.literal("")),
    destination_city: z.string().trim().min(2, "Cidade de destino obrigatória"),
    destination_state: z.string().trim().max(2).optional().or(z.literal("")),
    departure_date: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data de partida inválida"),
    arrival_date: z
      .string()
      .refine((v) => !Number.isNaN(Date.parse(v)), "Data de chegada inválida")
      .optional()
      .or(z.literal("")),
    available_space_kg: z.coerce
      .number()
      .positive("Espaço disponível deve ser maior que zero")
      .max(32, "Espaço acima do limite de bagagem")
      .optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    allow_fragile: z.coerce.boolean().optional(),
    allow_electronics: z.coerce.boolean().optional(),
    allow_valuable: z.coerce.boolean().optional(),
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
      !data.arrival_date ||
      new Date(data.arrival_date) >= new Date(data.departure_date),
    {
      message: "Data de chegada não pode ser antes da partida",
      path: ["arrival_date"],
    }
  );

export type CreateTripInput = z.infer<typeof createTripSchema>;
