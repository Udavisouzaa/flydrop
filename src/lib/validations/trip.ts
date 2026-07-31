import { z } from "zod";
import { AIRPORT_CODES } from "@/lib/airports";

/** Ver a nota em validations/order.ts — mesma regra, mesmo motivo. */
const airportCode = z
  .string()
  .trim()
  .toUpperCase()
  .refine((c) => AIRPORT_CODES.includes(c), "Selecione um aeroporto da lista");

export const createTripSchema = z
  .object({
    origin_airport: airportCode,
    destination_airport: airportCode,
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
  .refine((data) => data.origin_airport !== data.destination_airport, {
    message: "Origem e destino não podem ser o mesmo aeroporto",
    path: ["destination_airport"],
  })
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
