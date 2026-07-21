"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const signUpSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter no mínimo 2 caracteres." }),
  phone: z.string().min(10, { message: "Informe um telefone válido." }),
  email: z.string().email({ message: "Informe um e-mail válido." }),
  password: z.string().min(8, { message: "A senha deve ter no mínimo 8 caracteres." }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

interface SignUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignUpModal({ open, onOpenChange }: SignUpModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: SignUpFormValues) {
    setIsLoading(true);
    // Simula uma requisição de rede (por exemplo, chamando uma API de autenticação)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Account created:", data);
    setIsLoading(false);
    onOpenChange(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-2xl p-6 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-black tracking-tight">Crie sua conta</DialogTitle>
          <DialogDescription className="text-neutral-500">
            Junte-se ao flydrop hoje.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">Nome completo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="João da Silva" 
                      className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">Telefone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+55 (XX) XXXXX-XXXX" 
                      className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">E-mail</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="seu@email.com" 
                      type="email" 
                      className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black dark:text-white">Senha</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="••••••••" 
                      type="password" 
                      className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
