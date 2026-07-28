import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * `script-src` carries 'unsafe-inline', and that is a deliberate choice rather
 * than an oversight. The strict alternative is a per-request nonce generated in
 * proxy.ts, which Next.js supports — but it forces *every* page into dynamic
 * rendering (see node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md, "Static vs Dynamic Rendering with CSP"). That
 * turns off static optimization and CDN caching app-wide, and it is not a
 * change to make without being able to exercise the authenticated screens.
 *
 * Two things need inline scripts today: Next.js's own flight-data bootstrap
 * (`self.__next_f.push(...)`, different on every page, so unhashable) and the
 * theme-init script in app/layout.tsx that prevents the dark-mode flash.
 *
 * What still holds without a nonce: no external script origin is allowed, so an
 * injected `<script src="//evil.com">` is blocked; the page cannot be framed;
 * forms cannot post off-site; `<base>` cannot be rewritten. React escapes all
 * interpolated content and the app renders no user-supplied HTML, so the inline
 * vector this leaves open needs an injection hole elsewhere to be reachable.
 *
 * To tighten later: generate a nonce in proxy.ts, keep 'unsafe-inline' in
 * style-src (a nonce does not cover inline style *attributes*, which is how
 * framer-motion animates), and accept dynamic rendering.
 */
const csp = [
  "default-src 'self'",
  // 'unsafe-eval' is only needed in dev, where React uses eval to rebuild
  // server stack traces in the browser.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  // framer-motion animates by writing inline style attributes, which no nonce
  // or hash can whitelist — only 'unsafe-inline' allows them.
  "style-src 'self' 'unsafe-inline'",
  // Avatars can point anywhere; blob:/data: cover locally generated previews.
  "img-src 'self' blob: data: https:",
  // next/font/google self-hosts at build time, so no external font origin.
  "font-src 'self'",
  // Supabase REST + Auth over https, Realtime over websocket.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for older ones.
  { key: "X-Frame-Options", value: "DENY" },
  // Stops a browser from second-guessing a Content-Type — the classic way an
  // uploaded file gets executed as script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the full URL only within LevAí. Match and order ids live in paths, so
  // a laxer policy would hand them to any outbound link — including the
  // WhatsApp support link in the floating help button.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs these, and denying them by default means an injected
  // iframe cannot ask for them either.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "display-capture=()",
      "encrypted-media=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()",
    ].join(", "),
  },
  // Cross-origin isolation of this document and its resources.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework version in every response.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // HSTS only in production: on localhost this would pin http:// to
          // https:// in the browser and break local development for every
          // other project served from the same host.
          ...(isDev
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
      {
        // API responses are per-user and must never land in a shared cache.
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
