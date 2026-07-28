import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes that require a session.
 *
 * Matched with startsWith, so '/matches' covers '/matches/[id]'. Everything not
 * listed here is reachable logged-out: '/', '/login', '/signup', the legal
 * pages, and the public browse views ('/trips', '/orders') whose row-level
 * visibility is already handled by RLS.
 *
 * This is a redirect for the user's benefit, not the security boundary — that
 * is RLS on every table. But leaving a route off this list means an anonymous
 * visitor gets a broken authenticated shell instead of the login page, which is
 * how '/tracking' and '/wallet' were behaving.
 */
const PROTECTED_PATHS = [
  '/dashboard',
  '/matches',
  '/orders/new',
  '/privacidade/meus-dados',
  '/profile',
  '/tracking',
  '/trips/new',
  '/wallet',
]

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PATHS.some((path) => pathname.startsWith(path))

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Come back here after signing in, instead of dumping everyone on the
    // dashboard. Only ever a path from this same request, never a caller-
    // supplied URL, so it can't be turned into an open redirect.
    url.search = ''
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already signed in and looking at the door: send them inside.
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
