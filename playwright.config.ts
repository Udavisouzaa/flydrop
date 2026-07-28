import { defineConfig, devices } from "@playwright/test";

/**
 * Porta 3000 de propósito, e não uma porta só do E2E.
 *
 * O `next dev` desta versão recusa uma segunda instância no mesmo diretório —
 * "Another next dev server is already running" — então subir a suíte numa porta
 * paralela falha sempre que alguém está com o dev aberto, que é o caso normal.
 * Reaproveitar o servidor que já está de pé é seguro aqui porque o Playwright
 * usa um navegador próprio, e nenhum teste desta suíte escreve dados.
 *
 * `E2E_BASE_URL` aponta a suíte para outro alvo (um preview da Vercel, por
 * exemplo) e desliga o gerenciamento de servidor por completo.
 */
const externalTarget = process.env.E2E_BASE_URL;
const PORT = Number(process.env.E2E_PORT ?? 3000);

/**
 * `localhost`, não `127.0.0.1`.
 *
 * O dev server escuta no wildcard IPv6, e por 127.0.0.1 o handshake do
 * WebSocket de HMR devolve ERR_INVALID_HTTP_RESPONSE. Sem esse socket o cliente
 * do Next não hidrata: a página fica no HTML do SSR, nada é interativo e todo
 * teste de comportamento falha por um motivo que não existe na aplicação.
 * Pior, a árvore congelada esconde erros de runtime que só aparecem depois de
 * hidratar — foi assim que o crash da landing passou despercebido na primeira
 * execução.
 */
const baseURL = externalTarget ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ["list"],
    ["./tests/tooling/ai-reporter.ts", { outputFile: "ai-bug-report.md" }],
  ],

  use: {
    baseURL,
    // Proíbe seletor por classe/texto por construção: `getByTestId` só enxerga
    // este atributo, e ele é o único contrato estável num código que a IA
    // reescreve toda hora.
    testIdAttribute: "data-testid",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  webServer: externalTarget
    ? undefined
    : {
        command: `npm run dev -- --port ${PORT}`,
        // `/` é um redirect condicionado à sessão do Supabase; `/login`
        // responde 200 sem depender de nada, então é o sinal honesto de
        // "servidor de pé".
        url: `${baseURL}/login`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
