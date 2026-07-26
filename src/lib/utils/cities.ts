/**
 * City normalization.
 *
 * Cities are free text in the DB, and real users don't type them consistently.
 * The live data already contains "florianopolis" and "floripa" as two different
 * trips, plus "congonhas" — an airport, not a city. With an exact `ilike` match
 * those never connect, so matching silently returns nothing for real users.
 *
 * This module reduces a typed city to a canonical key: accent-stripped,
 * lowercased, punctuation-free, with nicknames and airport codes folded into
 * the city they actually serve.
 *
 * TODO: once there is real volume, persist this as a generated column on
 * trips/orders so the filter can go back to the database instead of running in
 * memory.
 */

/** Nicknames, airport names and IATA codes → canonical city key. */
const CITY_ALIASES: Record<string, string> = {
  // São Paulo
  sampa: "sao paulo",
  sp: "sao paulo",
  gru: "sao paulo",
  guarulhos: "sao paulo",
  cgh: "sao paulo",
  congonhas: "sao paulo",
  "aeroporto de congonhas": "sao paulo",
  "aeroporto de guarulhos": "sao paulo",

  // Rio de Janeiro
  rio: "rio de janeiro",
  rj: "rio de janeiro",
  gig: "rio de janeiro",
  sdu: "rio de janeiro",
  galeao: "rio de janeiro",
  "santos dumont": "rio de janeiro",

  // Florianópolis
  floripa: "florianopolis",
  fln: "florianopolis",
  "ilha da magia": "florianopolis",

  // Belo Horizonte
  bh: "belo horizonte",
  cnf: "belo horizonte",
  confins: "belo horizonte",
  pampulha: "belo horizonte",

  // Outras capitais brasileiras
  bsb: "brasilia",
  ssa: "salvador",
  poa: "porto alegre",
  cwb: "curitiba",
  rec: "recife",
  for: "fortaleza",
  mao: "manaus",
  bel: "belem",
  nat: "natal",
  vix: "vitoria",
  gyn: "goiania",
  slz: "sao luis",
  cgb: "cuiaba",
  cgr: "campo grande",
  mcz: "maceio",
  aju: "aracaju",
  jpa: "joao pessoa",
  the: "teresina",
  pmw: "palmas",
  bvb: "boa vista",
  pvh: "porto velho",
  rbr: "rio branco",
  mcp: "macapa",

  // Rotas internacionais comuns
  nyc: "nova york",
  jfk: "nova york",
  ewr: "nova york",
  lga: "nova york",
  "new york": "nova york",
  mia: "miami",
  mco: "orlando",
  lax: "los angeles",
  bos: "boston",
  ord: "chicago",
  lis: "lisboa",
  lisbon: "lisboa",
  opo: "porto",
  mad: "madri",
  madrid: "madri",
  bcn: "barcelona",
  lhr: "londres",
  lgw: "londres",
  london: "londres",
  cdg: "paris",
  ory: "paris",
  eze: "buenos aires",
  aep: "buenos aires",
  scl: "santiago",
  mvd: "montevideu",
  nrt: "toquio",
  hnd: "toquio",
  tokyo: "toquio",
};

/** Unicode combining marks left behind by NFD decomposition. */
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/**
 * Strip accents, lowercase, collapse whitespace and drop punctuation.
 * "  São  Paulo/SP " → "sao paulo sp"
 */
function baseNormalize(city: string): string {
  return city
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Two-letter state suffixes people tack on: "sao paulo sp" → "sao paulo". */
const UF =
  /\s(ac|al|ap|am|ba|ce|df|es|go|ma|mt|ms|mg|pa|pb|pr|pe|pi|rj|rn|rs|ro|rr|sc|sp|se|to)$/;

/**
 * Canonical key for a city as typed by a user. Safe to compare with `===`.
 */
export function canonicalCity(city: string | null | undefined): string {
  if (!city) return "";
  let key = baseNormalize(city);
  if (!key) return "";

  // Exact alias hit first ("floripa", "congonhas", "santos dumont").
  if (CITY_ALIASES[key]) return CITY_ALIASES[key];

  // Then drop a trailing state code and retry ("floripa sc" → "floripa").
  const withoutUf = key.replace(UF, "").trim();
  if (withoutUf && withoutUf !== key) {
    if (CITY_ALIASES[withoutUf]) return CITY_ALIASES[withoutUf];
    key = withoutUf;
  }

  return key;
}

/**
 * Do two free-text city strings refer to the same place?
 */
export function citiesMatch(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const ca = canonicalCity(a);
  const cb = canonicalCity(b);
  return ca !== "" && ca === cb;
}

/**
 * Looser comparison for browse/search boxes: canonicalize both sides, then
 * accept a substring hit in either direction. "Floripa" finds a trip stored as
 * "Florianópolis", and typing "sao" still finds "sao paulo".
 */
export function cityMatchesSearch(
  cityInRow: string | null | undefined,
  searchTerm: string | null | undefined
): boolean {
  const term = canonicalCity(searchTerm);
  if (!term) return true; // empty filter matches everything
  const row = canonicalCity(cityInRow);
  if (!row) return false;
  return row.includes(term) || term.includes(row);
}

/**
 * Display form: "florianopolis" → "Florianopolis", "sao paulo" → "Sao Paulo".
 * Used when we want to show the canonical name rather than what was typed.
 */
export function titleCaseCity(city: string): string {
  return canonicalCity(city)
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
