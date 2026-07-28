import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import { TESTID_REGISTRY, type TestId } from "./testids";

/**
 * Ruído que o `next dev` produz sozinho e que não é bug do site. Filtrar aqui,
 * e não no teste, porque um relatório com trinta linhas de aviso do React
 * Refresh é um relatório que ninguém — nem a IA — lê até o fim.
 */
const CONSOLE_NOISE = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /React Router Future Flag/i,
  /Warning: Extra attributes from the server/i,
];

const NETWORK_NOISE = [
  /\/favicon\.ico$/,
  /\.map(\?.*)?$/,
  /\/_next\/static\/webpack\/.*\.hot-update\./,
  /__nextjs_original-stack-frame/,
];

export type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  badResponses: string[];
};

/** Tudo que o navegador reclamou até agora, achatado em uma lista. */
export function problems(d: Diagnostics): string[] {
  return [
    ...d.pageErrors.map((e) => `[pageerror] ${e}`),
    ...d.consoleErrors.map((e) => `[console] ${e}`),
    ...d.failedRequests.map((e) => `[request-failed] ${e}`),
    ...d.badResponses.map((e) => `[http] ${e}`),
  ];
}

type Fixtures = {
  diagnostics: Diagnostics;
  /** `getByTestId` com o id validado em tempo de compilação pelo registro. */
  byTestId: (id: TestId) => ReturnType<Page["getByTestId"]>;
};

export const test = base.extend<Fixtures>({
  diagnostics: [
    async ({ page }, use, testInfo) => {
      const d: Diagnostics = {
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        badResponses: [],
      };

      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (CONSOLE_NOISE.some((re) => re.test(text))) return;
        const loc = msg.location();
        d.consoleErrors.push(
          loc.url ? `${text}  (${loc.url}:${loc.lineNumber})` : text
        );
      });

      page.on("pageerror", (err) => {
        d.pageErrors.push(
          `${err.name}: ${err.message}${err.stack ? `\n${err.stack.split("\n").slice(1, 4).join("\n")}` : ""}`
        );
      });

      page.on("requestfailed", (req) => {
        if (NETWORK_NOISE.some((re) => re.test(req.url()))) return;
        // Navegação abortada por redirect/cancelamento não é falha de rede.
        const reason = req.failure()?.errorText ?? "unknown";
        if (reason === "net::ERR_ABORTED") return;
        d.failedRequests.push(`${req.method()} ${req.url()} — ${reason}`);
      });

      page.on("response", (res) => {
        if (res.status() < 400) return;
        if (NETWORK_NOISE.some((re) => re.test(res.url()))) return;
        d.badResponses.push(
          `${res.status()} ${res.request().method()} ${res.url()}`
        );
      });

      await use(d);

      if (testInfo.status !== testInfo.expectedStatus) {
        await captureFailureContext(page, testInfo, d);
      }
    },
    { auto: true },
  ],

  byTestId: async ({ page }, use) => {
    await use((id: TestId) => page.getByTestId(id));
  },
});

export { expect };

const MAX_DOM_CHARS = 8_000;
const MAX_ARIA_CHARS = 4_000;

/**
 * Anexa ao teste o que a IA precisa para consertar sem abrir o navegador.
 *
 * O `ai-reporter` só lê estes anexos — a divisão é de propósito: quem sabe o
 * que aconteceu é a página (aqui), quem sabe formatar é o reporter.
 */
async function captureFailureContext(
  page: Page,
  testInfo: TestInfo,
  d: Diagnostics
) {
  const attach = async (name: string, body: string) => {
    await testInfo.attach(name, { body, contentType: "text/plain" });
  };

  try {
    await attach("ai:url", page.url());
  } catch {
    // Página fechada ou crashada: o resto do contexto ainda vale.
  }

  const console_ = problems(d);
  if (console_.length) await attach("ai:diagnostics", console_.join("\n"));

  try {
    const present = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid]"))
        .map((el) => el.getAttribute("data-testid"))
        .filter((v): v is string => !!v)
        .sort()
    );
    await attach(
      "ai:testids-presentes",
      present.length ? present.join("\n") : "(nenhum data-testid no DOM)"
    );

    const expectedButMissing = Object.keys(TESTID_REGISTRY).filter(
      (id) => !present.includes(id)
    );
    if (expectedButMissing.length) {
      await attach("ai:testids-ausentes", expectedButMissing.join("\n"));
    }
  } catch {
    // idem
  }

  try {
    const aria = await page.locator("body").ariaSnapshot();
    await attach("ai:aria", truncate(aria, MAX_ARIA_CHARS));
  } catch {
    // idem
  }

  try {
    // `page.content()` traz o payload RSC inteiro do Next em dev — dezenas de
    // milhares de tokens de script inline. O que importa para consertar um
    // seletor é a estrutura, então o clone vai sem script/style/svg.
    const dom = await page.evaluate(() => {
      const clone = document.body.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll("script, style, noscript, svg, template, link")
        .forEach((n) => n.remove());
      return clone.innerHTML.replace(/\n\s*\n/g, "\n");
    });
    await attach("ai:dom", truncate(dom, MAX_DOM_CHARS));
  } catch {
    // idem
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n… [truncado: ${value.length - max} caracteres a mais]`;
}
