import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import type { Order } from "@/types/database";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ origin?: string; destination?: string }>;
}) {
  const { origin, destination } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (origin) query = query.ilike("origin_city", `%${origin}%`);
  if (destination) query = query.ilike("destination_city", `%${destination}%`);

  const { data } = await query;
  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pedidos em aberto</h1>
        <Link
          href="/orders/new"
          className="rounded-full bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          + Cadastrar pedido
        </Link>
      </div>

      <form className="mt-6 flex flex-wrap gap-4">
        <input
          name="origin"
          defaultValue={origin}
          placeholder="Cidade de origem"
          className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-white/20"
        />
        <input
          name="destination"
          defaultValue={destination}
          placeholder="Cidade de destino"
          className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-orange-500 dark:border-white/20"
        />
        <button
          type="submit"
          className="rounded-lg border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
        >
          Buscar
        </button>
      </form>

      {orders.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          Nenhum pedido encontrado para essa rota.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
          {orders.map((o) => (
            <li key={o.id} className="py-4">
              <Link
                href={`/orders/${o.id}`}
                className="font-medium hover:text-orange-500"
              >
                {o.title}
              </Link>
              <p className="text-sm text-neutral-500">
                {o.origin_city} → {o.destination_city}
                {o.budget ? ` · orçamento R$ ${o.budget}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
