/**
 * Fixed-window rate limiting for the handful of endpoints where an unlimited
 * request rate costs real money or leaks real information.
 *
 * Two backends, chosen at runtime:
 *
 *   Upstash Redis (shared)  — used when UPSTASH_REDIS_REST_URL and
 *                             UPSTASH_REDIS_REST_TOKEN are both set. This is
 *                             the only backend that actually holds on Vercel,
 *                             because the count is shared across instances.
 *
 *   In-process Map (local)  — the fallback. Serverless means N instances with N
 *                             independent counters, and a cold start resets
 *                             them, so the effective limit is some multiple of
 *                             what is configured here. That is still far better
 *                             than nothing for the two things that matter most
 *                             — password guessing and Pix charge spam — but it
 *                             is not a guarantee. Provision Upstash for that.
 *
 * Deliberately dependency-free: Upstash's REST API is plain HTTP, and pulling
 * in @upstash/ratelimit would add a package for something this small.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Requests still allowed in the current window. */
  remaining: number;
  /** Seconds the caller should wait before retrying. 0 when ok. */
  retryAfter: number;
};

type Rule = {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/**
 * Every limit in one place, so the numbers can be reasoned about together
 * rather than being scattered as literals across route handlers.
 */
export const RATE_LIMITS = {
  /** Password attempts per e-mail. Tight: this is the credential-stuffing path. */
  loginByEmail: { limit: 5, windowSeconds: 15 * 60 },
  /** Password attempts per IP, for someone spraying many accounts at once. */
  loginByIp: { limit: 20, windowSeconds: 15 * 60 },
  /** Account creation per IP. */
  signupByIp: { limit: 5, windowSeconds: 60 * 60 },
  /** Pix charge creation per user. Each miss can hit the Asaas API for real. */
  checkoutByUser: { limit: 8, windowSeconds: 10 * 60 },
  /** Same, per IP, so one person with many accounts is still bounded. */
  checkoutByIp: { limit: 20, windowSeconds: 10 * 60 },
  /** Webhook deliveries per IP. Generous — Asaas retries — but not unbounded,
   *  so the shared token cannot be brute-forced at speed. */
  webhookByIp: { limit: 120, windowSeconds: 60 },
  /** Trips, orders and proposals created per user. */
  writeByUser: { limit: 30, windowSeconds: 10 * 60 },
  /** Chat messages per user. Higher: a real conversation is bursty. */
  messageByUser: { limit: 60, windowSeconds: 5 * 60 },
  /** Data export requests per user (LGPD Art. 18). Expensive to serve. */
  exportByUser: { limit: 3, windowSeconds: 60 * 60 },
} as const satisfies Record<string, Rule>;

export type RateLimitName = keyof typeof RATE_LIMITS;

// ---------------------------------------------------------------------------
// In-process backend
// ---------------------------------------------------------------------------

type Bucket = { count: number; expiresAt: number };

/**
 * Hung off globalThis so Next.js's dev-mode module reloading doesn't hand out
 * a fresh empty map on every edit — which would make the limit untestable
 * locally.
 */
const buckets: Map<string, Bucket> = (
  globalThis as unknown as { __levaiRateLimitBuckets?: Map<string, Bucket> }
).__levaiRateLimitBuckets ??
  ((
    globalThis as unknown as { __levaiRateLimitBuckets?: Map<string, Bucket> }
  ).__levaiRateLimitBuckets = new Map());

/** Bound the map so a flood of distinct keys can't grow it without limit. */
const MAX_BUCKETS = 10_000;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.expiresAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping the expired ones: evict oldest-first.
  if (buckets.size > MAX_BUCKETS) {
    const overflow = buckets.size - MAX_BUCKETS;
    let dropped = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++dropped >= overflow) break;
    }
  }
}

function checkInProcess(key: string, rule: Rule): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 64) sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + rule.windowSeconds * 1000 });
    return { ok: true, remaining: rule.limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > rule.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.expiresAt - now) / 1000)),
    };
  }
  return {
    ok: true,
    remaining: rule.limit - existing.count,
    retryAfter: 0,
  };
}

// ---------------------------------------------------------------------------
// Upstash backend
// ---------------------------------------------------------------------------

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

async function checkUpstash(
  key: string,
  rule: Rule,
  config: { url: string; token: string }
): Promise<RateLimitResult> {
  // INCR then EXPIRE ... NX: the TTL is set only on the first hit, so the
  // window is fixed from the first request rather than sliding forward on
  // every subsequent one (which would let a steady stream never reset).
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(rule.windowSeconds), "NX"],
      ["TTL", key],
    ]),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`upstash responded ${response.status}`);

  const body = (await response.json()) as Array<{ result?: number }>;
  const count = Number(body[0]?.result ?? 0);
  const ttl = Number(body[2]?.result ?? rule.windowSeconds);

  if (count > rule.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: ttl > 0 ? ttl : rule.windowSeconds,
    };
  }
  return { ok: true, remaining: rule.limit - count, retryAfter: 0 };
}

// ---------------------------------------------------------------------------

/**
 * Consume one unit from `identifier`'s budget for `name`.
 *
 * Fails open. A rate limiter that takes the site down when its own backend
 * hiccups is a worse outcome than the abuse it prevents — every caller of this
 * function is also behind an authorization check that does not depend on it.
 */
export async function rateLimit(
  name: RateLimitName,
  identifier: string
): Promise<RateLimitResult> {
  const rule = RATE_LIMITS[name];
  const key = `levai:rl:${name}:${identifier}`;

  const config = upstashConfig();
  if (config) {
    try {
      return await checkUpstash(key, rule, config);
    } catch (err) {
      console.error("[rate-limit] upstash unavailable, using in-process", err);
    }
  }

  return checkInProcess(key, rule);
}

/**
 * Best-effort client IP.
 *
 * On Vercel `x-forwarded-for` is set by the edge and the leftmost entry is the
 * real client. Behind a different proxy this header is attacker-controlled, so
 * treat IP limits as a speed bump and keep the per-account limits as the real
 * defense.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
