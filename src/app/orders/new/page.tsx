import { redirect } from "next/navigation";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import { createOrder } from "../actions";
import { MotionForm, MotionItem, MotionButton, MotionBanner } from "@/components/motion";
import { Package, MapPin, Handshake, UploadCloud } from "lucide-react";
import Link from "next/link";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* PAINEL ESQUERDO (Sticky / Fixo) */}
      <div className="relative flex w-full flex-col justify-between bg-neutral-950 px-8 py-12 text-white lg:sticky lg:top-0 lg:h-screen lg:w-[40%] lg:px-16 lg:py-20">
        <div>
          <Link href="/" className="mb-12 inline-block font-black text-xl tracking-tighter">
            flydrop.
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
            <Package className="h-12 w-12 text-orange-500" />
          </div>
        </div>
      </div>

      {/* FORMULÁRIO (Rolável) */}
      <div className="w-full bg-neutral-50 px-6 py-12 dark:bg-neutral-900 lg:w-[60%] lg:px-24 lg:py-20">
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
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-500">
                  <Package className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">O Produto</h2>
              </div>
              
              <div className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black">
                <MotionItem>
                  <TextField label="O que você precisa?" name="title" placeholder="Ex: iPhone 15 Pro, Tênis Nike, etc." required />
                </MotionItem>

                <MotionItem>
                  <label className="block text-sm">
                    <span className="mb-2 block font-medium text-neutral-700 dark:text-neutral-300">Descrição detalhada</span>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Cor, modelo específico, link da loja..."
                      className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-black"
                    />
                  </label>
                </MotionItem>

                <MotionItem className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <TextField label="Tamanho (Opcional)" name="size" placeholder="P, M, G ou dimensões" />
                  <TextField label="Peso estimado (kg)" name="weight_kg" type="number" placeholder="Ex: 1.5" step="0.1" />
                </MotionItem>

                <MotionItem>
                  <label className="block text-sm">
                    <span className="mb-2 block font-medium text-neutral-700 dark:text-neutral-300">Foto de Referência</span>
                    <div className="group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-8 transition-colors hover:border-orange-500 hover:bg-orange-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-orange-500 dark:hover:bg-orange-950/20">
                      <UploadCloud className="mb-3 h-8 w-8 text-neutral-400 group-hover:text-orange-500" />
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Clique para enviar uma foto</p>
                      <p className="mt-1 text-xs text-neutral-500">JPG, PNG até 5MB</p>
                      <input type="file" name="product_image" accept="image/*" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </div>
                  </label>
                </MotionItem>
              </div>
            </section>

            {/* SESSÃO 2: A ROTA */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">A Rota</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black sm:grid-cols-2">
                <MotionItem>
                  <TextField label="Cidade de origem" name="origin_city" placeholder="Onde o viajante vai comprar?" required />
                </MotionItem>
                <MotionItem>
                  <TextField label="Cidade de destino" name="destination_city" placeholder="Para onde deve ir?" required />
                </MotionItem>
              </div>
            </section>

            {/* SESSÃO 3: O ACORDO */}
            <section>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-500">
                  <Handshake className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold">O Acordo</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-black sm:grid-cols-2">
                <MotionItem>
                  <TextField label="Preciso do item até" name="needed_by_date" type="date" required />
                </MotionItem>
                
                <MotionItem className="flex flex-col justify-center">
                  <TextField label="Orçamento (R$)" name="budget" type="number" placeholder="Ex: 500" />
                  <label className="mt-4 flex cursor-pointer items-center gap-3">
                    <div className="relative flex items-center">
                      <input type="checkbox" name="no_minimum_budget" value="true" className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-neutral-300 transition-all checked:border-orange-500 checked:bg-orange-500 dark:border-neutral-700" />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
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
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  step?: string;
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
        className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm outline-none transition-all placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 dark:border-neutral-800 dark:bg-neutral-900 dark:focus:bg-black"
      />
    </label>
  );
}
