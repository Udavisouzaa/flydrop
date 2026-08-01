/**
 * Constants shared by the legal pages, the signup consent checkbox and the
 * LGPD data-subject flows.
 *
 * Kept out of the `"use server"` action files on purpose: a module with the
 * "use server" directive may only export async functions, so a plain string
 * const cannot live there.
 */

/**
 * Bump whenever the terms or the privacy policy change materially.
 *
 * Stored on the auth user at signup, so it is always possible to answer "which
 * version did this person agree to, and when" — which is what LGPD Art. 8 §1
 * requires of the controller.
 */
export const TERMS_VERSION = "2026-07-31";

/** Last substantive edit to /privacidade and /termos. */
export const LEGAL_UPDATED_AT = "31 de julho de 2026";

/**
 * Contato do controlador para pedidos do titular (LGPD Art. 41 §1).
 *
 * ⚠️ ANTES DE ABRIR AO PÚBLICO: esta caixa precisa existir e ser lida. O
 * art. 41 §1 obriga a divulgar um contato do encarregado, e o art. 18 dá ao
 * titular prazo de resposta — um endereço que não recebe transforma o canal de
 * direitos numa parede. O domínio malotex.com.br já foi comprado (30/07), mas
 * a caixa ainda não foi criada.
 *
 * Enquanto isso, todo lugar que mostra este e-mail também mostra o WhatsApp de
 * suporte, que funciona de verdade — o canal nunca fica sem saída.
 */
export const DPO_EMAIL = "privacidade@malotex.com.br";

/** Support channel shown across the app. */
export const SUPPORT_WHATSAPP = "5548992084726";
export const SUPPORT_WHATSAPP_DISPLAY = "(48) 99208-4726";
