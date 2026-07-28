/**
 * Varre `src/` e lista os elementos interativos que ainda não têm um
 * `data-testid` — ou seja, o que a suíte ainda não consegue alcançar sem apelar
 * para classe CSS ou texto.
 *
 * Uso:
 *   npm run e2e:audit
 *   node tests/tooling/audit-testids.mts --out testid-audit.md
 *   node tests/tooling/audit-testids.mts --strict    # sai 1 se houver pendência
 *
 * A extensão é `.mts` de propósito: o projeto é CommonJS por padrão e o script
 * usa `import` com await no topo — `.mts` é sempre ESM para o Node.
 *
 * É heurística, não compilador: lê a tag de abertura e procura o atributo. Erra
 * para o lado de reportar demais, porque um falso positivo custa um olhar e um
 * falso negativo custa um teste que ninguém escreveu.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "src";

/**
 * Tags que viram um alvo de teste. As maiúsculas são os wrappers do projeto:
 * todas repassam `testId` para o DOM, então valem pela tag nativa que embrulham.
 */
const INTERESTING = [
  "button",
  "form",
  "input",
  "select",
  "textarea",
  "a",
  "Link",
  "Button",
  "MotionButton",
  "MotionForm",
  "MotionBanner",
  "AuthField",
];

const TAG_RE = new RegExp(`<(${INTERESTING.join("|")})(?=[\\s/>])`, "g");

type Finding = {
  file: string;
  line: number;
  tag: string;
  snippet: string;
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      yield* walk(full);
    } else if (entry.name.endsWith(".tsx")) {
      yield full;
    }
  }
}

/**
 * Fim da tag de abertura a partir de `start`.
 *
 * Não dá para procurar o primeiro `>`: em JSX ele aparece dentro de
 * `onClick={() => ...}` e de strings de className o tempo todo. Então o scan
 * acompanha aspas e profundidade de chaves.
 */
function endOfOpeningTag(source: string, start: number): number {
  let depth = 0;
  let quote: string | null = null;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];

    if (quote) {
      if (ch === quote && source[i - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return i;
  }
  return -1;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

async function scan(root: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  for await (const file of walk(path.join(root, SRC))) {
    const source = await readFile(file, "utf8");

    for (const match of source.matchAll(TAG_RE)) {
      const start = match.index;
      const end = endOfOpeningTag(source, start);
      if (end === -1) continue;

      const tagText = source.slice(start, end + 1);
      if (/data-testid|testId/.test(tagText)) continue;

      findings.push({
        file: path.relative(root, file),
        line: lineOf(source, start),
        tag: match[1],
        snippet: tagText.replace(/\s+/g, " ").slice(0, 120),
      });
    }
  }

  return findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line
  );
}

async function collectExistingIds(root: string): Promise<string[]> {
  const ids = new Set<string>();

  for await (const file of walk(path.join(root, SRC))) {
    const source = await readFile(file, "utf8");
    for (const m of source.matchAll(/data-testid="([^"]+)"/g)) ids.add(m[1]);
    for (const m of source.matchAll(/testId="([^"]+)"/g)) ids.add(m[1]);
  }

  return [...ids].sort();
}

function render(findings: Finding[], existing: string[]): string {
  const out: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const list = byFile.get(f.file) ?? [];
    list.push(f);
    byFile.set(f.file, list);
  }

  out.push("# Auditoria de data-testid");
  out.push("");
  out.push(`GERADO: ${new Date().toISOString()}`);
  out.push(`JA_MARCADOS: ${existing.length}`);
  out.push(`SEM_TESTID: ${findings.length} em ${byFile.size} arquivo(s)`);
  out.push("");

  if (!findings.length) {
    out.push("Todo elemento interativo de `src/` já carrega um data-testid.");
    out.push("");
    return out.join("\n");
  }

  out.push("## O que fazer");
  out.push("");
  out.push(
    [
      "Cada linha abaixo é um elemento que nenhum teste consegue alcançar sem",
      "seletor por classe ou texto. Para os que importam:",
      "",
      "1. Adicione `data-testid=\"nome-em-kebab-case\"` no elemento (ou `testId=`",
      "   nos wrappers Motion*/AuthField, que repassam para o DOM).",
      "2. Registre o id em `tests/support/testids.ts` com role, source e routes.",
      "3. Escreva a asserção usando `byTestId(\"nome\")`.",
      "",
      "Elemento decorativo não precisa de id — a lista é um inventário, não uma",
      "lista de tarefas obrigatórias.",
    ].join("\n")
  );
  out.push("");

  for (const [file, list] of byFile) {
    out.push(`## ${file}`);
    out.push("");
    for (const f of list) {
      out.push(`- L${f.line} \`<${f.tag}>\` — \`${f.snippet}\``);
    }
    out.push("");
  }

  if (existing.length) {
    out.push("## Ids já presentes no código");
    out.push("");
    out.push("```");
    out.push(existing.join("\n"));
    out.push("```");
    out.push("");
  }

  return out.join("\n");
}

const args = process.argv.slice(2);
const outIndex = args.indexOf("--out");
const outFile = outIndex >= 0 ? args[outIndex + 1] : null;
const strict = args.includes("--strict");
const root = process.cwd();

const findings = await scan(root);
const existing = await collectExistingIds(root);
const report = render(findings, existing);

if (outFile) {
  await writeFile(path.join(root, outFile), report, "utf8");
  console.log(`Auditoria escrita em ${outFile} — ${findings.length} elemento(s) sem data-testid.`);
} else {
  console.log(report);
}

if (strict && findings.length) process.exit(1);
