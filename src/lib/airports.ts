/**
 * Aeroportos atendidos pela Malotex.
 *
 * Fonte única da verdade para o cliente. O banco tem a tabela `airports` com os
 * mesmos códigos (migration 0014) para poder usar chave estrangeira e filtrar
 * rota em SQL; esta lista existe para renderizar seletores sem uma ida ao
 * servidor. Os dois lados precisam ser alterados juntos.
 *
 * A operação começa em Florianópolis, então a lista é FLN mais os destinos com
 * voo direto a partir dela. Acrescentar um aeroporto aqui sem inserir a linha
 * correspondente na tabela faz o insert falhar na FK — que é o comportamento
 * desejado: melhor recusar do que gravar uma rota que a operação não atende.
 */

export type Airport = {
  code: string;
  /** Nome do aeroporto, sem a palavra "Aeroporto" — a UI já dá o contexto. */
  name: string;
  city: string;
  state: string;
};

export const AIRPORTS: readonly Airport[] = [
  { code: "FLN", name: "Hercílio Luz", city: "Florianópolis", state: "SC" },
  { code: "GRU", name: "Guarulhos", city: "São Paulo", state: "SP" },
  { code: "CGH", name: "Congonhas", city: "São Paulo", state: "SP" },
  { code: "SDU", name: "Santos Dumont", city: "Rio de Janeiro", state: "RJ" },
  { code: "GIG", name: "Galeão", city: "Rio de Janeiro", state: "RJ" },
  { code: "BSB", name: "Brasília", city: "Brasília", state: "DF" },
  { code: "CNF", name: "Confins", city: "Belo Horizonte", state: "MG" },
  { code: "POA", name: "Salgado Filho", city: "Porto Alegre", state: "RS" },
  { code: "CWB", name: "Afonso Pena", city: "Curitiba", state: "PR" },
] as const;

export const AIRPORT_CODES = AIRPORTS.map((a) => a.code);

const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));

export function getAirport(code: string | null | undefined): Airport | null {
  if (!code) return null;
  return BY_CODE.get(code.toUpperCase()) ?? null;
}

export function isActiveAirport(code: string | null | undefined): boolean {
  return getAirport(code) !== null;
}

/**
 * Rótulo completo para o seletor: "FLN — Hercílio Luz, Florianópolis".
 *
 * São Paulo e Rio têm dois aeroportos cada, então o nome do aeroporto não é
 * decorativo: é o que distingue GRU de CGH numa lista ordenada por cidade.
 */
export function airportLabel(code: string | null | undefined): string {
  const a = getAirport(code);
  return a ? `${a.code} — ${a.name}, ${a.city}` : "";
}

/** Forma curta para cards e listas, onde a largura é apertada: "FLN · Florianópolis". */
export function airportShort(code: string | null | undefined): string {
  const a = getAirport(code);
  return a ? `${a.code} · ${a.city}` : "—";
}
