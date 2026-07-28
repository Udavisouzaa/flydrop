import { test, expect, problems } from "../support/fixtures";

/**
 * O contrato de rotas de `src/utils/supabase/middleware.ts`, verificado de fora.
 *
 * O comentário lá diz que deixar uma rota fora de PROTECTED_PATHS entrega ao
 * visitante anônimo um shell autenticado quebrado em vez da tela de login —
 * foi o que aconteceu com /tracking e /wallet. Um teste é mais barato que
 * descobrir isso de novo.
 */

const PROTEGIDAS = [
  "/dashboard",
  "/profile",
  "/wallet",
  "/tracking",
  "/orders/new",
  "/trips/new",
  "/privacidade/meus-dados",
];

const PUBLICAS = ["/login", "/signup", "/termos", "/privacidade", "/landing"];

test.describe("rotas protegidas", () => {
  for (const route of PROTEGIDAS) {
    test(`${route} manda para o login guardando o retorno`, async ({ page, byTestId }) => {
      await page.goto(route);

      await expect(page).toHaveURL(
        new RegExp(`/login\\?next=${encodeURIComponent(route).replace(/\//g, "%2F")}$`)
      );
      await expect(byTestId("login-form")).toBeVisible();
    });
  }
});

test.describe("rotas públicas", () => {
  for (const route of PUBLICAS) {
    test(`${route} responde 200 e sem erro de console`, async ({ page, diagnostics }) => {
      const response = await page.goto(route);

      expect(response?.status(), `${route} respondeu ${response?.status()}`).toBe(200);
      expect(problems(diagnostics), problems(diagnostics).join("\n")).toEqual([]);
    });
  }
});

test.describe("raiz e 404", () => {
  test("/ manda o visitante deslogado para o login", async ({ page, byTestId }) => {
    // A raiz não tem tela: é um redirect condicionado à sessão.
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(byTestId("login-form")).toBeVisible();
  });

  test("rota inexistente responde 404", async ({ page }) => {
    const response = await page.goto("/rota-que-nao-existe-e2e");
    expect(response?.status()).toBe(404);
  });
});
