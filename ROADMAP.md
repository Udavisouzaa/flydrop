# LevAí — Roadmap até o lançamento

**Alvo: domingo, 27 de setembro de 2026.** 61 dias a partir de 28/07.

Decisões que definem este plano (28/07):

| | |
|---|---|
| Asaas | cadastro de produção **enviado, em análise** |
| Figura jurídica | **CPF** (pessoa física) |
| Tipo de lançamento | **público aberto** |
| Domínio `levai.app` | **não comprado ainda** |

Marcação de responsável: **[VOCÊ]** = precisa de você (compra, conta, decisão, terceiro).
Sem marcação = código, faço eu.

---

## Como ler o progresso

Seis marcos. Cada um tem uma pergunta de saída — se a resposta não for "sim", o marco
não fechou, mesmo que as tarefas estejam riscadas. É isso que evita chegar em 20/09
com tudo marcado como pronto e nada funcionando.

| Marco | Prazo | Pergunta de saída |
|---|---|---|
| M1 Fundação | 03/08 | O que já foi construído está no ar e uma pessoa real usou? |
| M2 Dinheiro | 17/08 | Alguém pagou a taxa e o contato desbloqueou sozinho? |
| M3 Confiança | 31/08 | Se quebrar às 3h da manhã, eu fico sabendo? |
| M4 Produto | 14/09 | Um estranho entende o app em 30 segundos? |
| M5 Ensaio | 21/09 | 20 pessoas de verdade usaram sem eu explicar nada? |
| M6 Lançar | 27/09 | — |

---

## Fase 0 — concluído (15–28/07)

Registro do que já existe, para o roadmap não parecer que começa do zero.

Redesign glassmorphism completo e paleta amarelo/preto/verde-neon · landing arquivada e
app puro em `/` · aba Levar construída · login simplificado · botão de ajuda no WhatsApp ·
fonte Geist corrigida · rate limiting em login/signup/checkout/webhook/escritas ·
headers de segurança e proteção de rotas no proxy · webhook do Asaas endurecido
(token em tempo constante, releitura da cobrança) · LGPD: política, termos, consentimento
no cadastro, exportação de dados e exclusão de conta · migrations 0008–0011 escritas ·
correção da foto descartada em `/orders/new` e do QR do Pix que sumia no segundo clique ·
CSRF no signout.

⚠️ Nada disso está commitado, e as migrations 0008–0011 **não foram aplicadas**. É a
primeira coisa do M1.

---

## M1 — Fundação estável · até 03/08

> **Saída:** o que já foi construído está commitado, aplicado, no ar, e você percorreu
> o app logado com seus próprios olhos.

Hoje o trabalho de duas semanas existe como ~6.500 linhas não commitadas num único
working tree, e as correções de segurança do banco são arquivos que ninguém aplicou.
Enquanto isso for verdade, todo o resto do roadmap está construído sobre areia.

- [ ] Commitar as ~6.500 linhas em commits temáticos (não um commit gigante)
- [ ] Aplicar migrations na ordem **0008 → 0009 → 0010 → 0011**
- [ ] Provisionar Upstash Redis e preencher as env vars na Vercel
- [ ] Preencher `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL` na Vercel
- [ ] Deploy + **primeiro smoke test manual autenticado** (nunca foi feito)
- [ ] Ligar *leaked password protection* no Supabase Auth
- [ ] **[VOCÊ]** Comprar `levai.app` — destrava DPO, SMTP e URL de produção
- [ ] **[VOCÊ]** Conversar com contador sobre CPF vs MEI **antes** do lançamento público

---

## M2 — Dinheiro funcionando · 04/08 → 17/08

> **Saída:** uma pessoa que não é você pagou a taxa de conexão e o contato desbloqueou
> sozinho, sem ninguém mexer no banco.

A taxa de conexão é a única receita do app e nunca foi executada uma vez. `ASAAS_API_KEY`
está vazia; a correção do QR que fiz ontem jamais rodou.

- [ ] Configurar chaves de produção do Asaas assim que aprovar
- [ ] Pix ponta a ponta em **sandbox**: gerar, pagar, desbloquear
- [ ] Pix ponta a ponta em **produção** com valor mínimo real
- [ ] Verificar idempotência do webhook (Asaas reenvia; não pode desbloquear duas vezes)
- [ ] Tratar o webhook que **nunca chega** — reconciliação por polling ou botão manual
- [ ] **[VOCÊ]** Criar `privacidade@` e `suporte@` no domínio
- [ ] SMTP customizado (Resend) para os e-mails de auth do Supabase
- [ ] **[VOCÊ]** Plano B de PSP caso o Asaas negue ou limite PF

---

## M3 — Confiança · 18/08 → 31/08

> **Saída:** o app avisa quando quebra, e um advogado leu os termos.

- [ ] Consertar e ampliar a suíte e2e (existe Playwright; cobertura dos fluxos logados é zero)
- [ ] Instalar Sentry — hoje um erro em produção é invisível
- [ ] **[VOCÊ]** Revisão jurídica de termos e política por advogado
- [ ] Resolver identificação do fornecedor nos termos (CDC art. 31)
- [ ] Auditoria final de RLS, tabela por tabela
- [ ] Teste em device real: Android, iPhone, 3G lento
- [ ] Acessibilidade: contraste do glassmorphism, foco de teclado, leitor de tela

---

## M4 — Produto pronto para estranho · 01/09 → 14/09

> **Saída:** alguém que nunca ouviu falar do LevAí entende o que fazer em 30 segundos.

- [ ] Onboarding e estados vazios (hoje tela vazia parece app quebrado)
- [ ] **Estratégia para o marketplace vazio** — ver Riscos
- [ ] Revisão de copy do app inteiro
- [ ] Analytics de funil: cadastro → publicar → match → pagar
- [ ] Fluxo de suporte que escala além do seu WhatsApp pessoal
- [ ] Política de moderação e canal de denúncia

---

## M5 — Ensaio geral · 15/09 → 21/09

> **Saída:** 20 pessoas reais usaram sem você explicar nada por cima do ombro.

- [ ] Beta fechado com 20–30 pessoas — **mesmo lançando aberto depois**
- [ ] Corrigir o que o beta revelar (reserve a semana inteira para isso)
- [ ] Teste de carga: 100 pessoas simultâneas
- [ ] Runbook de incidente e plano de rollback

---

## M6 — Lançamento · 22/09 → 27/09

- [ ] **Congelar features em 22/09.** Nada novo entra, só correção.
- [ ] Checklist final: env vars, backups, monitoramento, suporte de plantão
- [ ] Lançar 27/09

---

## Riscos que podem furar a data

Nenhum destes é problema de código, e por isso nenhum se resolve trabalhando mais horas.

**1. CPF + lançamento público aberto.** É a tensão mais séria do plano. Cobrar taxa do
público como pessoa física traz três consequências que valem conversar com um contador
esta semana, não em setembro: os termos precisam identificar o fornecedor (CDC), o que
para PF significa expor seu nome completo e CPF no site; nota fiscal como PF é
impraticável; e o Asaas costuma aprovar PF com limite menor. MEI abre online, custa
pouco e resolve os três — mas quem decide isso é contador, não eu.

**2. O Asaas pode negar ou limitar.** Se negar, não existe mecanismo de receita e o
modelo de negócio inteiro para. Você não pode descobrir isso em setembro. Se não houver
resposta até ~10/08, abra cadastro paralelo em outro PSP.

**3. Marketplace vazio — o maior risco de produto.** No dia 27/09 alguém entra, não vê
nenhuma viagem publicada, e vai embora para não voltar. Num beta fechado dá para
contornar na conversa; num lançamento público você só tem uma primeira impressão por
pessoa. Precisa haver viagens reais no ar **antes** de abrir. Isso é trabalho de
recrutamento, começa em agosto, e não é código.

**4. Zero telas autenticadas testadas por humano.** Dashboard, matches, paywall, chat,
perfil, carteira e os fluxos LGPD passaram por `tsc`, `eslint` e `next build` — o que
prova que compilam, não que funcionam.

**5. Termos escritos por IA, nunca lidos por advogado.** Num lançamento público, com
LGPD valendo e você como controlador pessoa física, essa revisão não é opcional.

**6. 27/09 é domingo.** Bom para tráfego de consumidor, ruim para suporte e para acionar
qualquer terceiro se algo der errado. Considere 24/09 (quinta) com o domingo livre para
acompanhar.

---

## Sequência crítica

O que trava mais coisa, em ordem. Comece por cima.

```
Comprar levai.app ──┬─► caixa privacidade@ ──► LGPD art. 41 §1 resolvido
                    ├─► SMTP (Resend) ──────► e-mails de auth confiáveis
                    └─► URL de produção ────► termos e suporte coerentes

Aprovação Asaas ────► chaves em produção ──► Pix ponta a ponta ──► M2 fecha

Commits + migrations ──► deploy ──► smoke test ──► base para todo o resto

Decisão CPF/MEI ────► identificação nos termos ──► revisão jurídica ──► M3 fecha
```

Os três primeiros ramos correm em paralelo e todos dependem de algo que **só você**
pode fazer. É por isso que 28/07 e 29/07 são os dias mais importantes do cronograma.
