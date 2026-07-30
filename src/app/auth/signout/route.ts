import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Rejects a POST that a third-party site made on the user's behalf.
 *
 * Server Actions get this check from Next.js for free; route handlers do not.
 * This one is reachable by any page on the internet with a
 * `<form action="https://malotex.com.br/auth/signout" method="post">` and an
 * autosubmit, which logs the visitor out of Malotex without their consent. Not a
 * breach — no data moves — but a site that can log you out at will can also
 * keep you logged out, and the fix is three lines.
 *
 * Two signals, both sent by the browser and neither settable from JS:
 *
 *   Sec-Fetch-Site  — 'same-origin' for our own form, 'cross-site' for theirs.
 *   Origin          — present on every POST; compared against the Host we were
 *                     actually reached on, so it doesn't depend on how the
 *                     platform reconstructs request.url behind its proxy.
 *
 * Missing headers are allowed through rather than blocked. A browser old enough
 * to omit both is a browser that predates the attack being interesting, and
 * failing closed here means "you can no longer log out" — the wrong trade for a
 * threat whose worst outcome is a nuisance.
 */
function isCrossSite(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return true;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  try {
    return new URL(origin).host !== host;
  } catch {
    // An Origin we can't parse isn't one we can vouch for.
    return true;
  }
}

export async function POST(request: Request) {
  if (isCrossSite(request)) {
    return new NextResponse(null, { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303: o padrão do NextResponse.redirect é 307, que preserva o método e faria
  // o navegador reenviar o POST para a página de destino.
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
