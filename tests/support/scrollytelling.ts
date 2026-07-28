import { type Page } from "@playwright/test";

/**
 * A landing não tem seções empilhadas: é um container de 600vh com um bloco
 * `sticky`, e os seis estágios são overlays absolutos que aparecem e somem por
 * `opacity` conforme a fração de scroll. Duas consequências para o teste:
 *
 * 1. Nenhum estágio "entra na viewport" — todos estão sempre lá, sobrepostos.
 * 2. `toBeVisible()` passa mesmo com `opacity: 0`, porque a definição de
 *    visível do Playwright é bounding box não-vazia + sem `display:none` /
 *    `visibility:hidden`. Um teste que só chama `toBeVisible()` nesta página
 *    passa com a tela em branco. É verde falso.
 *
 * Por isso a asserção real é sobre a opacidade computada, depois de rolar até
 * a fração onde o estágio deveria estar cheio.
 *
 * Os valores abaixo espelham `STAGES` em `src/app/landing/page.tsx` (o ponto
 * médio de cada faixa). Se aquele objeto mudar, este muda junto — os testes de
 * `landing.spec.ts` quebram alto quando isso for esquecido.
 */
export const STAGE_PROGRESS = {
  "section-hero": 0.06,
  "section-problema": 0.27,
  "section-como": 0.49,
  "section-comunicacao": 0.71,
  "section-personas": 0.91,
  "section-cta": 0.99,
} as const;

export type StageId = keyof typeof STAGE_PROGRESS;

export const STAGE_IDS = Object.keys(STAGE_PROGRESS) as StageId[];

/** Fração do scroll total, de 0 a 1. */
export async function scrollToProgress(page: Page, progress: number) {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, p * max);
  }, progress);
}

/**
 * Rola até o estágio e espera o `useSpring` do motion assentar.
 *
 * Espera ativa em vez de `waitForTimeout`: a mola tem stiffness 100 / damping
 * 30, o tempo de acomodação depende da distância rolada, e um sleep fixo ou
 * flaka ou desperdiça segundos em cada um dos seis estágios.
 */
export async function showStage(page: Page, stage: StageId, minOpacity = 0.9) {
  await scrollToProgress(page, STAGE_PROGRESS[stage]);
  await page.waitForFunction(
    ({ id, min }) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) return false;
      return Number(getComputedStyle(el).opacity) >= min;
    },
    { id: stage, min: minOpacity },
    { timeout: 15_000 }
  );
}

export async function stageOpacity(page: Page, stage: StageId): Promise<number> {
  return page.evaluate((id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return -1;
    return Number(getComputedStyle(el).opacity);
  }, stage);
}
