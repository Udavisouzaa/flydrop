import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 *
 * Only use this from trusted server-only contexts with no user session to
 * scope to, such as the Stripe webhook handler (src/app/api/webhooks/stripe/route.ts)
 * where writes must happen regardless of which user triggered the event.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (not yet set in .env.local — get it
 * from Supabase project settings > API > service_role key. NEVER expose
 * this key to the client / NEXT_PUBLIC_*).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária para operações admin (ex: webhooks)."
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
