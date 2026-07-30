import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { createOrder } from "../actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";
import { Package, MapPin, Handshake, Link2 as LinkIcon } from "lucide-react";
import Link from "next/link";

export default async function NewOrderPage({
  searchParams,
}: {
  // title/origin_city/destination_city chegam pré-preenchidos pelos atalhos
  // da tela Início (src/components/home/ModeSwitcher.tsx).
  searchParams: Promise<{
    error?: string;
    title?: string;
    origin_city?: string;
    destination_city?: string;
  }>;
}) {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");
  const { error, title, origin_city, destination_city } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* PAINEL ESQUERDO (Sticky / Fixo) */}
      <div className="relative flex w-full flex-col justify-between bg-neutral-950 px-8 py-12 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[40%] lg:px-16 lg:py-20">
        <div>
          <Link href="/" className="mb-12 inline-block font-black text-xl tracking-tighter">
            Malotex
          </Link>
          <h1 className="mt-8 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            O que você quer que a gente traga?
          </h1>
          <p className="mt-6 text-lg text-neutral-400">
            Descreva o produto, de onde ele deve vir e quanto você quer pagar. Nós conectamos você com o viajante perfeito.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="hidden lg:block">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-neutral-900/50 backdrop-blur-xl">
            <Package className="h-12 w-12 text-brand" />
          </div>
        </div>
      </div>

      {/* FORMULÁRIO (Rolável) */}
      <div className="w-full px-6 py-12 lg:w-[60%] lg:px-24 lg:py-20">
        <div className="mx-auto max-w-2xl">
          <MotionBanner
            show={!!error}
            className="mb-8 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400"
          >
            {error}
          </MotionBanner>

          <MotionForm action={createOrder} className="space-y-12">
            
            {/* SESSÃO 1: O PRODUTO */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand-ink dark:bg-brand-soft">
                  <Package className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">O Produto</h2>
              </div>
              
              <div className="space-y-6 glass rounded-2xl p-6">
                <MotionItem>
                  <TextField label="O que você precisa?" name="title" placeholder="Ex: iPhone 15 Pro, Tênis Nike, etc." defaultValue={title} required />
                </MotionItem>

                <MotionItem>
                  <label className="block text-sm">
                    <span className="mb-2 block font-medium text-neutral-700 dark:text-neutral-300">Descrição detalhada</span>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Cor, modelo, voltagem, tamanho..."
                      className="glass-weak w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-brand-ink focus:ring-4 focus:ring-brand/10"
                    />
                  </label>
                </MotionItem>

                <MotionItem className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <TextField label="Tamanho (Opcional)" name="size" placeholder="P, M, G ou dimensões" />
                  <TextField label="Peso estimado (kg)" name="weight_kg" type="number" placeholder="Ex: 1.5" step="0.1" />
                </MotionItem>

                {/*
                  Era um seletor de arquivo ("Foto de Referência",
                  name="product_image"). Nada o recebia: `createOrder` lê
                  `product_link`, o projeto não tem bucket de Storage e `orders`
                  não tem coluna de imagem. A foto subia no corpo do POST e era
                  descartada em silêncio — o pior tipo de controle quebrado,
                  porque parece ter funcionado.

                  O link resolve melhor o problema real de qualquer forma: quem
                  viaja precisa saber exatamente qual produto comprar e onde.
                  E `product_link` já existe no schema e no Zod, validado como
                  URL.
                */}
                <MotionItem>
                  <TextField
                    label="Link do produto (Opcional)"
                    name="product_link"
                    type="url"
                    placeholder="https://loja.com/produto"
                  />
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-neutral-500">
                    <LinkIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    Cole o link para o viajante saber exatamente o que comprar.
                  </p>
                </MotionItem>
              </div>
            </section>

            {/* SESSÃO 2: A ROTA */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="bg-foreground/10 text-foreground flex h-10 w-10 items-center justify-center rounded-full">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">A Rota</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 glass rounded-2xl p-6 sm:grid-cols-2">
                <MotionItem>
                  <TextField label="Cidade de origem" name="origin_city" placeholder="Onde o viajante vai comprar?" defaultValue={origin_city} required />
                </MotionItem>
                <MotionItem>
                  <TextField label="Cidade de destino" name="destination_city" placeholder="Para onde deve ir?" defaultValue={destination_city} required />
                </MotionItem>
              </div>
            </section>

            {/* SESSÃO 3: O ACORDO */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="bg-accent-neon-soft text-accent-neon-foreground dark:text-accent-neon flex h-10 w-10 items-center justify-center rounded-full">
                  <Handshake className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">O Acordo</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 glass rounded-2xl p-6 sm:grid-cols-2">
                <MotionItem>
                  <TextField label="Preciso do item até" name="needed_by_date" type="date" required />
                </MotionItem>
                
                <MotionItem className="flex flex-col justify-center">
                  <TextField label="Orçamento (R$)" name="budget" type="number" placeholder="Ex: 500" />
                  <label className="mt-4 flex cursor-pointer items-center gap-3">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="no_minimum_budget" value="true" className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-neutral-300 transition-all checked:border-brand checked:bg-brand dark:border-neutral-700" />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-brand-foreground opacity-0 transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Não tenho limite de orçamento</span>
                  </label>
                </MotionItem>
              </div>
            </section>

            {/* BOTÃO FINAL */}
            <div className="pt-6">
              <MotionButton
                type="submit"
                className="w-full rounded-2xl bg-neutral-900 py-4 text-center font-bold text-white shadow-lg transition-all hover:bg-neutral-800 hover:shadow-xl dark:bg-white dark:text-black dark:hover:bg-neutral-200 sm:text-lg"
              >
                Publicar Pedido
              </MotionButton>
              <p className="mt-4 text-center text-xs text-neutral-500">
                Ao publicar, viajantes compatíveis com a sua rota serão notificados.
              </p>
            </div>

          </MotionForm>
        </div>
      </div>
    </div>
  );
}

function TextField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-2 block font-medium text-neutral-700 dark:text-neutral-300">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        step={step}
        defaultValue={defaultValue}
        className="glass-weak w-full rounded-xl px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-brand-ink focus:ring-4 focus:ring-brand/10"
      />
    </label>
  );
}
