import { writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
} from "@playwright/test/reporter";

import { TESTID_REGISTRY } from "../support/testids";

type Options = { outputFile?: string };

type Failure = {
  index: number;
  title: string;
  project: string;
  specLocation: string;
  status: string;
  retry: number;
  durationMs: number;
  error: TestError | undefined;
  attachments: Map<string, string>;
};

/**
 * Escreve `ai-bug-report.md`: um despejo do que quebrou, formatado para ser
 * colado de volta num agente, não para ser lido no café.
 *
 * Duas decisões que moldam o formato:
 *
 * - O arquivo é sempre reescrito, inclusive quando tudo passa. Relatório velho
 *   é pior que relatório nenhum: a IA lê a falha de ontem, "conserta" um bug
 *   que já não existe e quebra o que estava de pé.
 * - Cada falha é autocontida — erro, URL, arquivo provável, console, DOM e o
 *   comando exato para reproduzir. O agente não deveria precisar rodar nada
 *   para saber por onde começar.
 */
export default class AIReporter implements Reporter {
  private readonly outputFile: string;
  private failures: Failure[] = [];
  private counts = { passed: 0, failed: 0, flaky: 0, skipped: 0 };
  private baseURL = "(desconhecida)";
  private rootDir = process.cwd();
  private startedAt = new Date();

  constructor(options: Options = {}) {
    this.outputFile = options.outputFile ?? "ai-bug-report.md";
  }

  onBegin(config: FullConfig, _suite: Suite) {
    // `config.rootDir` é a raiz comum dos testDir (aqui, `tests/e2e`), não a do
    // projeto — o relatório acabava enterrado junto dos specs. O diretório do
    // arquivo de config é o lugar onde alguém, ou uma IA, espera achá-lo.
    this.rootDir = config.configFile
      ? path.dirname(config.configFile)
      : config.rootDir;
    this.startedAt = new Date();
    const withBase = config.projects.find((p) => p.use?.baseURL);
    if (withBase?.use?.baseURL) this.baseURL = String(withBase.use.baseURL);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const outcome = test.outcome();
    if (result.status === "skipped") {
      this.counts.skipped += 1;
      return;
    }
    if (outcome === "flaky" && result.status === "passed") this.counts.flaky += 1;
    if (result.status === "passed") {
      this.counts.passed += 1;
      return;
    }

    this.counts.failed += 1;
    this.failures.push({
      index: this.failures.length + 1,
      title: fullTitle(test),
      project: test.parent.project()?.name ?? "(sem projeto)",
      specLocation: `${this.rel(test.location.file)}:${test.location.line}`,
      status: result.status,
      retry: result.retry,
      durationMs: result.duration,
      error: result.errors[0],
      attachments: collectAttachments(result),
    });
  }

  async onEnd(result: FullResult) {
    const report = this.failures.length
      ? this.renderFailures(result)
      : this.renderGreen(result);

    await writeFile(path.join(this.rootDir, this.outputFile), report, "utf8");
    // eslint-disable-next-line no-console
    console.log(`\n[ai-reporter] ${this.outputFile} atualizado (${this.failures.length} falha(s))`);
  }

  private renderGreen(result: FullResult): string {
    return [
      "# ai-bug-report",
      "",
      "STATUS: PASSED",
      `RUN: ${this.startedAt.toISOString()}`,
      `RESULTADO_GERAL: ${result.status}`,
      `BASE_URL: ${this.baseURL}`,
      `PASSARAM: ${this.counts.passed} | FALHARAM: 0 | FLAKY: ${this.counts.flaky} | PULADOS: ${this.counts.skipped}`,
      "",
      "Nenhuma falha nesta execução. Não há nada a corrigir a partir deste arquivo.",
      "",
      `<!-- gerado por tests/tooling/ai-reporter.ts em ${new Date().toISOString()} -->`,
      "",
    ].join("\n");
  }

  private renderFailures(result: FullResult): string {
    const out: string[] = [];

    out.push("# ai-bug-report");
    out.push("");
    out.push("STATUS: FAILED");
    out.push(`RUN: ${this.startedAt.toISOString()}`);
    out.push(`RESULTADO_GERAL: ${result.status}`);
    out.push(`BASE_URL: ${this.baseURL}`);
    out.push(
      `PASSARAM: ${this.counts.passed} | FALHARAM: ${this.counts.failed} | FLAKY: ${this.counts.flaky} | PULADOS: ${this.counts.skipped}`
    );
    out.push("");
    out.push("## Instruções");
    out.push("");
    out.push(
      [
        "Cada bloco `## FALHA n/N` é um bug independente. Para cada um: leia ERRO,",
        "abra ARQUIVO_PROVAVEL, corrija a causa no código do site — não no teste —",
        "e revalide com o comando em REPRODUZIR.",
        "",
        "Ajuste o teste apenas se ARQUIVO_PROVAVEL for um `.spec.ts` ou se o",
        "comportamento esperado tiver mudado de propósito. Seletor por classe CSS ou",
        "por texto é proibido nesta suíte: o contrato é `data-testid`, registrado em",
        "`tests/support/testids.ts`.",
      ].join("\n")
    );
    out.push("");
    out.push("## Índice");
    out.push("");
    for (const f of this.failures) {
      out.push(`- FALHA ${f.index}: ${f.title} [${f.project}] — ${f.specLocation}`);
    }
    out.push("");

    for (const f of this.failures) {
      out.push(...this.renderFailure(f));
    }

    out.push(`<!-- gerado por tests/tooling/ai-reporter.ts em ${new Date().toISOString()} -->`);
    out.push("");
    return out.join("\n");
  }

  private renderFailure(f: Failure): string[] {
    const out: string[] = [];
    const message = clean(f.error?.message ?? "(sem mensagem de erro)");
    const url = f.attachments.get("ai:url");
    const diagnostics = f.attachments.get("ai:diagnostics");
    const present = f.attachments.get("ai:testids-presentes");
    const missing = f.attachments.get("ai:testids-ausentes");
    const aria = f.attachments.get("ai:aria");
    const dom = f.attachments.get("ai:dom");

    out.push("---");
    out.push("");
    out.push(`## FALHA ${f.index}/${this.failures.length} — ${f.title}`);
    out.push("");
    out.push(`PROJETO: ${f.project}`);
    out.push(`TESTE: ${f.specLocation}`);
    out.push(`STATUS: ${f.status}${f.retry ? ` (retry ${f.retry})` : ""}`);
    out.push(`DURACAO_MS: ${f.durationMs}`);
    if (url) out.push(`URL: ${url}`);

    const suspect = this.suspectSource(message, f);
    if (suspect) out.push(`ARQUIVO_PROVAVEL: ${suspect}`);

    const hint = classify(message, { missing, diagnostics });
    if (hint) out.push(`HIPOTESE: ${hint}`);

    out.push(
      `REPRODUZIR: npx playwright test ${f.specLocation} --project=${f.project}`
    );
    out.push("");

    out.push("### ERRO");
    out.push("```");
    out.push(message.trim());
    out.push("```");
    out.push("");

    if (f.error?.snippet) {
      out.push("### CODIGO_DO_TESTE");
      out.push("```");
      out.push(clean(f.error.snippet).trim());
      out.push("```");
      out.push("");
    }

    if (diagnostics) {
      out.push("### CONSOLE_E_REDE");
      out.push("```");
      out.push(diagnostics.trim());
      out.push("```");
      out.push("");
    }

    if (missing) {
      out.push("### TESTIDS_ESPERADOS_AUSENTES_NO_DOM");
      out.push(
        "Registrados em `tests/support/testids.ts` e não encontrados nesta página."
      );
      out.push("Nem todos valem para esta rota — cruze com o arquivo de origem.");
      out.push("```");
      out.push(missing.trim());
      out.push("```");
      out.push("");
    }

    if (present) {
      out.push("### TESTIDS_PRESENTES_NO_DOM");
      out.push("```");
      out.push(present.trim());
      out.push("```");
      out.push("");
    }

    if (aria) {
      out.push("### SNAPSHOT_ARIA");
      out.push("```yaml");
      out.push(aria.trim());
      out.push("```");
      out.push("");
    }

    if (dom) {
      out.push("### SNAPSHOT_DOM");
      out.push("Corpo da página no instante da falha, sem script/style/svg.");
      out.push("```html");
      out.push(dom.trim());
      out.push("```");
      out.push("");
    }

    const stack = f.error?.stack ? clean(f.error.stack) : "";
    if (stack && stack !== message) {
      out.push("### STACK");
      out.push("```");
      out.push(stack.split("\n").slice(0, 12).join("\n"));
      out.push("```");
      out.push("");
    }

    return out;
  }

  /**
   * Melhor palpite de qual arquivo do site editar.
   *
   * O `location` do erro aponta para o `.spec.ts` — o lugar onde a asserção
   * quebrou, não o lugar onde o bug mora. Quando a mensagem cita um testid, o
   * registro sabe o arquivo de origem dele, e essa é a resposta útil.
   */
  private suspectSource(message: string, f: Failure): string | null {
    const match = message.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
    const id = match?.[1];
    if (id && id in TESTID_REGISTRY) {
      const spec = TESTID_REGISTRY[id as keyof typeof TESTID_REGISTRY];
      return `${spec.source}  (data-testid="${id}" — ${spec.role})`;
    }
    if (f.error?.location) {
      return `${this.rel(f.error.location.file)}:${f.error.location.line}`;
    }
    return null;
  }

  private rel(file: string): string {
    return path.relative(this.rootDir, file) || file;
  }
}

function collectAttachments(result: TestResult): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of result.attachments) {
    if (!a.name.startsWith("ai:")) continue;
    if (a.body) map.set(a.name, a.body.toString("utf8"));
  }
  return map;
}

/** Playwright colore as mensagens; ANSI cru no markdown atrapalha o parse. */
function clean(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

/**
 * Título com os `describe` que embrulham o teste, sem o caminho do arquivo
 * (que já vai no campo TESTE). Sobe pelos pais em vez de fatiar `titlePath()`
 * por índice: a posição do projeto e do arquivo nesse array já mudou entre
 * versões do Playwright.
 */
function fullTitle(test: TestCase): string {
  const parts: string[] = [];
  let suite: Suite | undefined = test.parent;
  while (suite) {
    if (suite.type === "describe" && suite.title) parts.unshift(suite.title);
    suite = suite.parent;
  }
  parts.push(test.title);
  return parts.join(" › ");
}

/**
 * Traduz o erro do Playwright na causa mais provável.
 *
 * "Timeout 10000ms exceeded" não diz nada sozinho; a diferença entre "o
 * atributo não foi renderizado" e "o atributo está em dois nós" é o que decide
 * qual arquivo abrir.
 */
function classify(
  message: string,
  ctx: { missing?: string; diagnostics?: string }
): string | null {
  if (/strict mode violation/i.test(message)) {
    return "O mesmo data-testid aparece em mais de um nó. Dê um escopo a um deles (ex.: prefixo header-/mobile-) ou restrinja a busca a um container.";
  }

  const idMatch = message.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
  if (idMatch && /Timeout|not visible|toBeVisible|waiting for/i.test(message)) {
    const id = idMatch[1];
    const wasMissing = ctx.missing?.split("\n").includes(id);
    return wasMissing
      ? `O elemento com data-testid="${id}" não existe no DOM. Ou o atributo sumiu numa reescrita do componente, ou o componente não chegou a renderizar (erro acima em CONSOLE_E_REDE, condição de render, ou redirect antes da hora).`
      : `O elemento com data-testid="${id}" existe no DOM mas não satisfez a asserção — provavelmente opacity/pointer-events (a landing anima os estágios) ou está fora da viewport.`;
  }

  if (/toHaveURL|expected URL/i.test(message)) {
    return "A navegação não terminou onde deveria. Confira o href do elemento, um redirect no proxy (src/proxy.ts) ou uma Server Action redirecionando para outro lugar.";
  }

  if (/net::ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(message)) {
    return "O servidor de dev não estava de pé. Isso não é bug do site: rode de novo, ou verifique se a porta E2E_PORT está livre.";
  }

  if (ctx.diagnostics?.includes("[pageerror]")) {
    return "Houve exceção não tratada em runtime no navegador (ver CONSOLE_E_REDE). Corrija primeiro esse erro — a asserção provavelmente é só a consequência.";
  }

  if (ctx.diagnostics?.includes("[http] 5")) {
    return "Alguma requisição respondeu 5xx (ver CONSOLE_E_REDE). O problema é do servidor/Server Action, não do componente.";
  }

  return null;
}
