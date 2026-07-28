import { access } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";

import { test, expect } from "../support/fixtures";
import { expectedOn, TESTID_REGISTRY, type TestId } from "../support/testids";

/**
 * O teste que protege todos os outros.
 *
 * Num código reescrito por IA o modo de falha mais comum não é o botão que para
 * de funcionar — é o `data-testid` que some numa refatoração. Quando isso
 * acontece, cada teste que dependia dele falha com "Timeout 10000ms exceeded",
 * trinta linhas de stack e nenhuma pista. Aqui a falha diz o que sumiu, em que
 * rota, e qual arquivo devolver o atributo.
 */

const ROUTES = ["/landing", "/login", "/signup"] as const;

async function testIdsInDom(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("[data-testid]"))
      .map((el) => el.getAttribute("data-testid"))
      .filter((v): v is string => !!v)
  );
}

test.describe("contrato de data-testid", () => {
  for (const route of ROUTES) {
    test(`${route} tem todos os testids registrados`, async ({ page, isMobile }) => {
      const viewport = isMobile ? "mobile" : "desktop";
      const expected = expectedOn(route, viewport);

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const present = await testIdsInDom(page);
      const missing = expected.filter((id) => !present.includes(id));

      expect(
        missing,
        `Sumiram data-testid em ${route} (${viewport}):\n` +
          missing
            .map((id) => `  ${id} → ${TESTID_REGISTRY[id].source} (${TESTID_REGISTRY[id].role})`)
            .join("\n")
      ).toEqual([]);
    });

    test(`${route} não tem testid duplicado`, async ({ page, isMobile }) => {
      const viewport = isMobile ? "mobile" : "desktop";
      const expected = expectedOn(route, viewport);

      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");

      const present = await testIdsInDom(page);
      const duplicated = expected.filter(
        (id) => present.filter((p) => p === id).length > 1
      );

      // Duplicata é pior que ausência: `getByTestId` estoura em strict mode, e
      // o erro fala de "resolved to 2 elements" sem dizer qual dos dois é o
      // certo. Foi por isso que a nav do header ganhou prefixo header-/mobile-.
      expect(
        duplicated,
        `data-testid repetido em ${route}: ${duplicated.join(", ")}`
      ).toEqual([]);
    });
  }

  test("todo id do registro aponta para um arquivo existente", async () => {
    const root = test.info().config.rootDir;

    const broken: string[] = [];
    for (const id of Object.keys(TESTID_REGISTRY) as TestId[]) {
      const spec = TESTID_REGISTRY[id];
      try {
        await access(path.join(root, spec.source));
      } catch {
        broken.push(`${id} → ${spec.source}`);
      }
    }

    expect(broken, `Registro aponta para arquivo que não existe:\n${broken.join("\n")}`).toEqual([]);
  });
});
