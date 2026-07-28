/**
 * O contrato entre o site e a suíte.
 *
 * Só existe uma regra: se um elemento importa para um teste, ele aparece aqui.
 * Os testes referenciam os ids por este objeto, então apagar uma entrada quebra
 * a compilação em vez de virar um `getByTestId` que não casa com nada e falha
 * com "timeout" trinta segundos depois.
 *
 * `dynamic: true` marca id montado em runtime (template literal), que o
 * scanner estático de `audit-testids.ts` não consegue enxergar no código —
 * quem cobre esses é o teste de cobertura em `testids.spec.ts`.
 */
export type TestIdSpec = {
  /** O que o elemento é, em uma linha. Vai para o relatório da IA. */
  role: string;
  /** Arquivo que deve carregar o atributo. */
  source: string;
  /** Rotas onde o elemento deve existir no DOM. */
  routes: string[];
  dynamic?: boolean;
  /** Só existe no viewport mobile (ou só no desktop). */
  viewport?: "mobile" | "desktop";
};

export const TESTID_REGISTRY = {
  // --- Header (presente na landing) ---
  header: {
    role: "Cabeçalho fixo",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
  },
  "header-logo": {
    role: "Wordmark LevAí, volta para /",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
  },
  "header-nav-como": {
    role: "Nav desktop: rola até o estágio 'Como funciona'",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-nav-comunicacao": {
    role: "Nav desktop: rola até o estágio de comunicação",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-nav-paraQuem": {
    role: "Nav desktop: rola até o estágio de personas",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-nav-viagens": {
    role: "Nav desktop: link para /trips",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-nav-pedidos": {
    role: "Nav desktop: link para /orders/new",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-nav-suporte": {
    role: "Nav desktop: WhatsApp de suporte (externo)",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    dynamic: true,
    viewport: "desktop",
  },
  "header-lang-toggle": {
    role: "Alterna PT/EN",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "desktop",
  },
  "header-lang-value": {
    role: "Idioma ativo, em texto",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "desktop",
  },
  "header-theme-toggle": {
    role: "Alterna tema claro/escuro",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "desktop",
  },
  "header-login": {
    role: "Link Entrar do header",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "desktop",
  },
  "header-signup": {
    role: "Link Criar conta do header",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "desktop",
  },
  "header-menu-toggle": {
    role: "Botão hambúrguer (só mobile)",
    source: "src/components/ui/header.tsx",
    routes: ["/landing"],
    viewport: "mobile",
  },
  "mobile-menu": {
    role: "Drawer mobile, renderizado em portal no body",
    source: "src/components/ui/header.tsx",
    routes: [],
  },
  "mobile-signup": {
    role: "Criar conta dentro do drawer",
    source: "src/components/ui/header.tsx",
    routes: [],
  },
  "mobile-login": {
    role: "Já tenho conta dentro do drawer",
    source: "src/components/ui/header.tsx",
    routes: [],
  },

  // --- Landing (scrollytelling de 600vh) ---
  "section-hero": {
    role: "Estágio 1: hero + CTAs",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "section-problema": {
    role: "Estágio 2: o problema",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "section-como": {
    role: "Estágio 3: como funciona (4 passos)",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "section-comunicacao": {
    role: "Estágio 4: comunicação + mockup de chat",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "section-personas": {
    role: "Estágio 5: para quem é",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "section-cta": {
    role: "Estágio 6: CTA final",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "hero-cta-pedido": {
    role: "CTA do hero para /orders/new",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "hero-cta-viagem": {
    role: "CTA do hero para /trips/new",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "cta-signup": {
    role: "CTA final para /signup",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "whatsapp-fab": {
    role: "Botão flutuante do WhatsApp",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },
  "chat-mockup": {
    role: "Mockup de celular do estágio de comunicação",
    source: "src/app/landing/page.tsx",
    routes: ["/landing"],
  },

  // --- Auth ---
  "auth-shell": {
    role: "Cartão que embrulha login e signup",
    source: "src/components/auth-shell.tsx",
    routes: ["/login", "/signup"],
  },
  "login-form": {
    role: "Formulário de login",
    source: "src/app/login/page.tsx",
    routes: ["/login"],
  },
  "login-email": {
    role: "Campo e-mail do login",
    source: "src/app/login/page.tsx",
    routes: ["/login"],
  },
  "login-password": {
    role: "Campo senha do login",
    source: "src/app/login/page.tsx",
    routes: ["/login"],
  },
  "login-submit": {
    role: "Botão Entrar",
    source: "src/app/login/page.tsx",
    routes: ["/login"],
  },
  "login-error": {
    role: "Banner de erro do login (só com ?error=)",
    source: "src/app/login/page.tsx",
    routes: [],
  },
  "login-notice": {
    role: "Banner de aviso do login (só com ?aviso=)",
    source: "src/app/login/page.tsx",
    routes: [],
  },
  "login-next": {
    role: "Input escondido com o destino pós-login (só quando ?next= é seguro)",
    source: "src/app/login/page.tsx",
    routes: [],
  },
  "login-signup-link": {
    role: "Link Criar conta a partir do login",
    source: "src/app/login/page.tsx",
    routes: ["/login"],
  },
  "signup-form": {
    role: "Formulário de cadastro",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-name": {
    role: "Campo nome completo",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-phone": {
    role: "Campo telefone (opcional)",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-email": {
    role: "Campo e-mail do cadastro",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-password": {
    role: "Campo senha do cadastro (minLength 8)",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-terms": {
    role: "Checkbox de consentimento LGPD, obrigatório",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-submit": {
    role: "Botão Criar conta",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-error": {
    role: "Banner de erro do cadastro (só com ?error=)",
    source: "src/app/signup/page.tsx",
    routes: [],
  },
  "signup-terms-link": {
    role: "Link para /termos",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-privacy-link": {
    role: "Link para /privacidade",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
  "signup-login-link": {
    role: "Link Entrar a partir do cadastro",
    source: "src/app/signup/page.tsx",
    routes: ["/signup"],
  },
} as const satisfies Record<string, TestIdSpec>;

export type TestId = keyof typeof TESTID_REGISTRY;

export const ALL_TEST_IDS = Object.keys(TESTID_REGISTRY) as TestId[];

/** Ids que devem existir no DOM da rota, no viewport informado. */
export function expectedOn(route: string, viewport: "mobile" | "desktop"): TestId[] {
  return ALL_TEST_IDS.filter((id) => {
    const spec: TestIdSpec = TESTID_REGISTRY[id];
    if (!spec.routes.includes(route)) return false;
    return !spec.viewport || spec.viewport === viewport;
  });
}
