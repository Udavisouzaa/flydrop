import { test, expect, problems } from "../support/fixtures";
import {
  STAGE_IDS,
  showStage,
  scrollToProgress,
  stageOpacity,
} from "../support/scrollytelling";

test.describe("landing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/landing");
  });

  test.describe("seções", () => {
    for (const stage of STAGE_IDS) {
      test(`${stage} aparece na fração de scroll correspondente`, async ({
        page,
        byTestId,
      }) => {
        await showStage(page, stage);

        await expect(byTestId(stage)).toBeVisible();
        expect(await stageOpacity(page, stage)).toBeGreaterThan(0.9);
      });
    }

    test("seção fora da faixa fica transparente", async ({ page }) => {
      // O contraponto dos testes acima. Sem ele a suíte passaria com a landing
      // inteira em branco: os seis overlays existem no DOM o tempo todo, então
      // `toBeVisible()` é verde mesmo com `opacity: 0`. Se este teste falhar
      // com "esperado < 0.1", a animação de scroll parou de reagir.
      await showStage(page, "section-hero");

      expect(await stageOpacity(page, "section-personas")).toBeLessThan(0.1);
      expect(await stageOpacity(page, "section-cta")).toBeLessThan(0.1);
    });

    test("o mockup de chat vive na seção de comunicação", async ({ page, byTestId }) => {
      await showStage(page, "section-comunicacao");
      await expect(byTestId("chat-mockup")).toBeVisible();
    });
  });

  test.describe("botões e navegação", () => {
    test("CTA do hero leva ao fluxo de pedido", async ({ page, byTestId }) => {
      await showStage(page, "section-hero");
      await byTestId("hero-cta-pedido").click();

      // /orders/new é protegida (src/utils/supabase/middleware.ts), então
      // deslogado o destino correto é o login carregando o retorno.
      await expect(page).toHaveURL(/\/login\?next=%2Forders%2Fnew$/);
    });

    test("CTA do hero leva ao fluxo de viagem", async ({ page, byTestId }) => {
      await showStage(page, "section-hero");
      await byTestId("hero-cta-viagem").click();

      await expect(page).toHaveURL(/\/login\?next=%2Ftrips%2Fnew$/);
    });

    test("CTA final leva ao cadastro", async ({ page, byTestId }) => {
      await showStage(page, "section-cta");
      await byTestId("cta-signup").click();

      await expect(page).toHaveURL(/\/signup$/);
      await expect(byTestId("signup-form")).toBeVisible();
    });

    test("botão do WhatsApp aponta para o número de suporte", async ({ byTestId }) => {
      // Não clicamos: abre em aba nova para um domínio externo, e um teste que
      // depende do wa.me estar de pé passa a falhar por motivo alheio ao site.
      await expect(byTestId("whatsapp-fab")).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/\d+$/
      );
      await expect(byTestId("whatsapp-fab")).toHaveAttribute("target", "_blank");
      await expect(byTestId("whatsapp-fab")).toHaveAttribute("rel", /noopener/);
    });
  });

  test.describe("header (desktop)", () => {
    test.skip(({ isMobile }) => !!isMobile, "nav desktop fica atrás do hambúrguer no mobile");

    test("link Entrar vai para o login", async ({ page, byTestId }) => {
      await byTestId("header-login").click();
      await expect(page).toHaveURL(/\/login$/);
    });

    test("link Criar conta vai para o cadastro", async ({ page, byTestId }) => {
      await byTestId("header-signup").click();
      await expect(page).toHaveURL(/\/signup$/);
    });

    test("item da nav rola até o estágio certo", async ({ page, byTestId }) => {
      // A nav não usa âncora `#id` — os estágios são overlays absolutos. Ela
      // rola para uma fração do scroll, então o efeito observável é a seção
      // ficar opaca, não a URL mudar.
      await scrollToProgress(page, 0);
      await byTestId("header-nav-como").click();

      await expect
        .poll(() => stageOpacity(page, "section-como"), { timeout: 15_000 })
        .toBeGreaterThan(0.9);
    });

    test("alternar tema escreve a classe dark no html", async ({ page, byTestId }) => {
      const before = await page.evaluate(() =>
        document.documentElement.classList.contains("dark")
      );

      await byTestId("header-theme-toggle").click();

      await expect
        .poll(() =>
          page.evaluate(() => document.documentElement.classList.contains("dark"))
        )
        .toBe(!before);
    });

    test("alternar idioma troca o rótulo e o conteúdo", async ({ page, byTestId }) => {
      const before = await byTestId("header-lang-value").textContent();
      const heroBefore = await byTestId("section-hero").textContent();

      await byTestId("header-lang-toggle").click();

      await expect(byTestId("header-lang-value")).not.toHaveText(before ?? "");
      // Trocar o rótulo sem traduzir a página é uma falha que já aconteceu em
      // i18n: o botão alterna, o texto não.
      await expect(byTestId("section-hero")).not.toHaveText(heroBefore ?? "");
    });
  });

  test.describe("header (mobile)", () => {
    test.skip(({ isMobile }) => !isMobile, "o hambúrguer só existe abaixo do breakpoint md");

    test("hambúrguer abre o drawer e leva ao cadastro", async ({ page, byTestId }) => {
      await expect(byTestId("mobile-menu")).toHaveCount(0);

      await byTestId("header-menu-toggle").click();
      await expect(byTestId("mobile-menu")).toBeVisible();

      await byTestId("mobile-signup").click();
      await expect(page).toHaveURL(/\/signup$/);
    });

    test("drawer trava o scroll do body enquanto está aberto", async ({
      page,
      byTestId,
    }) => {
      await byTestId("header-menu-toggle").click();
      await expect(byTestId("mobile-menu")).toBeVisible();

      await expect
        .poll(() => page.evaluate(() => document.body.style.overflow))
        .toBe("hidden");
    });
  });

  test("percorrer a landing inteira não gera erro de console nem de rede", async ({
    page,
    diagnostics,
  }) => {
    for (const stage of STAGE_IDS) {
      await showStage(page, stage);
    }

    expect(problems(diagnostics), problems(diagnostics).join("\n")).toEqual([]);
  });
});
