import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  full_name: z.string().trim().min(2, "Nome muito curto").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[\d\s()+-]{8,20}$/u, "Telefone inválido")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
