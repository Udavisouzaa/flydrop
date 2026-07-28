import { test, expect, problems } from "../support/fixtures";

/**
 * Nenhum teste aqui cria conta de verdade.
 *
 * O `.env.local` aponta para o Supabase de produção, e uma suíte que roda a
 * cada salvamento encheria a tabela de usuários com lixo — em produção, sem
 * volta. O que dá para verificar sem escrever nada é justamente o que costuma
 * quebrar: validação do formulário, banner de erro, links e o caminho de
 * credencial inválida (que só lê).
 *
 * Se um dia a suíte precisar do caminho autenticado, o jeito certo é um projeto
 * Supabase separado para teste — não um usuário descartável em produção.
 */

/** Nunca vai existir, e o e-mail muda a cada execução para não colar em cache. */
const invalidEmail = () => `e2e-${Date.now()}@exemplo-invalido.test`;

test.describe("login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renderiza o formulário", async ({ byTestId }) => {
    await expect(byTestId("auth-shell")).toBeVisible();
    await expect(byTestId("login-form")).toBeVisible();
    await expect(byTestId("login-email")).toBeVisible();
    await expect(byTestId("login-password")).toBeVisible();
    await expect(byTestId("login-submit")).toBeVisible();
  });

  test("não envia com campos vazios", async ({ page, byTestId }) => {
    await byTestId("login-submit").click();

    // A validação do navegador barra antes da Server Action: a URL não muda e
    // o campo fica em estado inválido.
    await expect(page).toHaveURL(/\/login$/);
    const missing = await byTestId("login-email").evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing
    );
    expect(missing).toBe(true);
  });

  test("rejeita e-mail malformado sem chamar o servidor", async ({ page, byTestId }) => {
    await byTestId("login-email").fill("nao-e-um-email");
    await byTestId("login-password").fill("senha-qualquer");
    await byTestId("login-submit").click();

    await expect(page).toHaveURL(/\/login$/);
    const typeMismatch = await byTestId("login-email").evaluate(
      (el: HTMLInputElement) => el.validity.typeMismatch
    );
    expect(typeMismatch).toBe(true);
  });

  test("credencial inválida mostra o banner de erro", async ({ page, byTestId }) => {
    await byTestId("login-email").fill(invalidEmail());
    await byTestId("login-password").fill("senha-que-nao-existe-123");
    await byTestId("login-submit").click();

    await expect(page).toHaveURL(/\/login\?error=/);
    await expect(byTestId("login-error")).toBeVisible();

    // A mensagem é genérica de propósito: distinguir "senha errada" de "e-mail
    // não cadastrado" transforma o login num oráculo de quem tem conta aqui.
    await expect(byTestId("login-error")).toHaveText(/incorretos/i);
    await expect(byTestId("login-error")).not.toHaveText(/Invalid login credentials/i);
  });

  test("o fluxo de login não gera erro de console nem 5xx", async ({
    page,
    byTestId,
    diagnostics,
  }) => {
    await byTestId("login-email").fill(invalidEmail());
    await byTestId("login-password").fill("senha-que-nao-existe-123");
    await byTestId("login-submit").click();
    await expect(byTestId("login-error")).toBeVisible();

    expect(problems(diagnostics), problems(diagnostics).join("\n")).toEqual([]);
  });

  test("link leva ao cadastro", async ({ page, byTestId }) => {
    await byTestId("login-signup-link").click();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test.describe("avisos vindos da URL", () => {
    test("mostra apenas avisos de um código conhecido", async ({ page, byTestId }) => {
      await page.goto("/login?aviso=confirme");
      await expect(byTestId("login-notice")).toBeVisible();
    });

    test("ignora texto arbitrário na query", async ({ page, byTestId }) => {
      // A página resolve `aviso` por tabela em vez de imprimir o parâmetro. Se
      // este teste falhar, virou possível hospedar phishing convincente no
      // próprio domínio: `?aviso=Sua sessão expirou, confirme sua senha`.
      await page.goto("/login?aviso=Sua+sessao+expirou+confirme+a+senha");
      await expect(byTestId("login-notice")).toHaveCount(0);
    });

    test("descarta next que aponta para fora do site", async ({ page, byTestId }) => {
      // `//evil.example.com` é URL protocolo-relativa: passa num teste de
      // "começa com barra" e vira redirect aberto. O campo não deve existir.
      await page.goto("/login?next=//evil.example.com");
      await expect(byTestId("login-next")).toHaveCount(0);
    });

    test("mantém next quando é um caminho do próprio site", async ({ page, byTestId }) => {
      await page.goto("/login?next=%2Fwallet");
      await expect(byTestId("login-next")).toHaveAttribute("value", "/wallet");
    });
  });
});

test.describe("cadastro", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("renderiza todos os campos", async ({ byTestId }) => {
    await expect(byTestId("signup-form")).toBeVisible();
    await expect(byTestId("signup-name")).toBeVisible();
    await expect(byTestId("signup-phone")).toBeVisible();
    await expect(byTestId("signup-email")).toBeVisible();
    await expect(byTestId("signup-password")).toBeVisible();
    await expect(byTestId("signup-terms")).toBeVisible();
    await expect(byTestId("signup-submit")).toBeVisible();
  });

  test("exige senha de pelo menos 8 caracteres", async ({ page, byTestId }) => {
    await byTestId("signup-name").fill("Teste E2E");
    await byTestId("signup-email").fill(invalidEmail());
    await byTestId("signup-password").fill("1234567");
    await byTestId("signup-terms").check();
    await byTestId("signup-submit").click();

    await expect(page).toHaveURL(/\/signup$/);
    const tooShort = await byTestId("signup-password").evaluate(
      (el: HTMLInputElement) => el.validity.tooShort
    );
    // O minLength do input tem que bater com o signupSchema (min 8). Quando não
    // batia, o navegador deixava passar 7 caracteres só para o servidor recusar.
    expect(tooShort).toBe(true);
  });

  test("exige o aceite dos termos (LGPD Art. 8)", async ({ page, byTestId }) => {
    await byTestId("signup-name").fill("Teste E2E");
    await byTestId("signup-email").fill(invalidEmail());
    await byTestId("signup-password").fill("senha-bem-longa-123");
    await byTestId("signup-submit").click();

    await expect(page).toHaveURL(/\/signup$/);
    const missing = await byTestId("signup-terms").evaluate(
      (el: HTMLInputElement) => el.validity.valueMissing
    );
    expect(missing).toBe(true);
  });

  test("o checkbox começa desmarcado", async ({ byTestId }) => {
    // Consentimento pré-marcado não é ato afirmativo — é o tipo de detalhe que
    // some numa reescrita de componente e ninguém percebe.
    await expect(byTestId("signup-terms")).not.toBeChecked();
  });

  test("links legais abrem em aba nova", async ({ byTestId }) => {
    await expect(byTestId("signup-terms-link")).toHaveAttribute("href", "/termos");
    await expect(byTestId("signup-terms-link")).toHaveAttribute("target", "_blank");
    await expect(byTestId("signup-privacy-link")).toHaveAttribute("href", "/privacidade");
  });

  test("link leva ao login", async ({ page, byTestId }) => {
    await byTestId("signup-login-link").click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a tela de cadastro não gera erro de console", async ({ diagnostics }) => {
    expect(problems(diagnostics), problems(diagnostics).join("\n")).toEqual([]);
  });
});
