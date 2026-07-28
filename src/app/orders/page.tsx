import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Package, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUserWithProfile } from "@/utils/supabase/queries";
import type { Order } from "@/types/database";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const statusLabel: Record<Order["status"], string> = {
  open: "Buscando viajante",
  matched: "Combinado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export default async function MeusPedidosPage() {
  const { user } = await getCurrentUserWithProfile();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const pedidos = (data ?? []) as Order[];

  return (
    <div className="mx-auto max-w-lg px-4 pt-4 pb-2">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Meus pedidos</h1>
          <p className="text-muted-foreground text-sm">
            {pedidos.length} pedido(s) publicado(s)
          </p>
        </div>
        {pedidos.length > 0 && (
          <Link
            href="/orders/new"
            aria-label="Criar pedido"
            className="bg-brand text-brand-foreground flex size-11 shrink-0 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
          >
            <Plus aria-hidden className="size-5" />
          </Link>
        )}
      </header>

      {pedidos.length === 0 ? (
        <div className="mt-10 flex flex-col items-center px-6 text-center">
          <span className="glass flex size-20 items-center justify-center rounded-3xl">
            <Package aria-hidden className="text-brand-ink size-8" />
          </span>
          <h2 className="mt-5 text-lg font-bold">Você ainda não publicou</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Criar um pedido é grátis. A taxa só é cobrada quando houver conexão.
          </p>
          <Link
            href="/orders/new"
            className="bg-brand text-brand-foreground mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold transition-transform active:scale-[0.99]"
          >
            <Plus aria-hidden className="size-5" />
            Criar primeiro pedido
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pedidos.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="glass block rounded-3xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="truncate text-base leading-tight font-bold">
                    {o.title}
                  </h2>
                  {o.budget != null && (
                    <span className="shrink-0 text-base font-black">
                      {brl.format(o.budget)}
                    </span>
                  )}
                </div>

                <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium">
                  <span className="bg-brand size-2 shrink-0 rounded-full" />
                  <span className="truncate">{o.origin_city}</span>
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span className="bg-accent-neon size-2 shrink-0 rounded-full" />
                  <span className="truncate">{o.destination_city}</span>
                </p>

                <div className="text-muted-foreground mt-3 flex items-center justify-between gap-2 text-[11px]">
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-1 font-semibold">
                    {statusLabel[o.status]}
                  </span>
                  <span className="flex items-center gap-1">
                    {o.needed_by_date && (
                      <>
                        até{" "}
                        {new Date(o.needed_by_date).toLocaleDateString("pt-BR")}
                      </>
                    )}
                    <ChevronRight aria-hidden className="size-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
