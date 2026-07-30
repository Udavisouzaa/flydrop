import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import NewTripWizard from "./wizard";

/**
 * Server shell for the publish-a-trip wizard.
 *
 * The wizard itself is a client component (four animated steps, local state),
 * but the auth check and the `?error=` read belong here: `createTrip` redirects
 * back to this URL with a message when validation fails, and reading it on the
 * server avoids pulling `useSearchParams` — and its Suspense boundary — into
 * the client tree.
 *
 * proxy.ts already keeps anonymous visitors out of /trips/new. This second
 * check is not redundant: the proxy is a convenience redirect, and a page that
 * posts to an authenticated action should not depend on it.
 */
export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trips/new");

  const { error } = await searchParams;

  return (
    <div className="text-foreground flex min-h-screen flex-col">
      <header className="glass-strong sticky top-0 z-50 flex items-center justify-between rounded-none border-x-0 border-t-0 px-6 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <span className="glass-weak rounded-full p-2 transition-colors">
            <ArrowLeft aria-hidden className="size-4" />
          </span>
          <span className="text-sm font-semibold">Voltar ao início</span>
        </Link>
        <div className="flex items-center gap-2">
          <span aria-hidden className="bg-brand size-6 rounded-full" />
          <span className="font-bold tracking-tight">Malotex</span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6 pb-28">
        <NewTripWizard error={error} />
      </main>
    </div>
  );
}
