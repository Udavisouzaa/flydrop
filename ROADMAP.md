# LevAí — Roadmap até o lançamento

**Alvo: domingo, 27 de setembro de 2026.** 61 dias a partir de 28/07.

Decisões que definem este plano (28/07):

| | |
|---|---|
| Asaas | cadastro de produção **enviado, em análise** |
| Figura jurídica | **CPF** (pessoa física) |
| Tipo de lançamento | **público aberto** |
| Domínio `levai.app` | **não comprado ainda** |

**[VOCÊ]** = depende de você (compra, conta, decisão, terceiro). Sem marcação = código, faço eu.

---

## Estado atual, medido

Base para tudo abaixo. Nada aqui é estimativa.

**Banco:** 9 tabelas — `profiles`, `payment_accounts`, `trips`, `orders`, `matches`,
`messages`, `reviews`, `payments`, `notifications`. RLS em todas.

**Ciclo de vida do match, como está implementado:**

```
pending ──aceita──► accepted ──paga taxa──► unlocked_at
                        │                        │
                     declined              contato + chat liberados
                                                 │
                              traveler_confirmed_pickup
                                                 │
                              requester_confirmed_dropoff
                                                 │
                                            completed ──► reviews
```

**Rotas:** 23. **Cobertura e2e:** só caminhos deslogados, e a suíte não executa nesta
máquina (navegadores do Playwright não instalados).

**O que não existe hoje** — e é isto que define M2 e M4:

| Lacuna | Consequência |
|---|---|
| Nenhum envio de e-mail próprio | Só o SMTP padrão do Supabase: 3/hora e cai em spam |
| Nenhuma notificação fora do app | Recebeu proposta e não abriu o app? Nunca fica sabendo |
| Nenhum fluxo de reembolso | Pagou a taxa e a entrega não aconteceu: não há saída |
| Nenhuma mediação de disputa | As partes confirmam coleta/entrega; se discordarem, trava |
| Nenhum canal de denúncia ou bloqueio | Lançamento público sem isso é risco legal e de segurança |
| Nenhum monitoramento de erro | Quebra em produção é invisível |

---

## Como ler o progresso

Cada marco tem uma **pergunta de saída**. Se a resposta não for "sim", o marco não
fechou, mesmo com tudo riscado. É o que evita chegar em 20/09 com a lista completa e
nada funcionando.

| Marco | Prazo | Pergunta de saída |
|---|---|---|
| M1 Fundação | 03/08 | O que já foi construído está no ar e uma pessoa real usou? |
| M2 Dinheiro | 17/08 | Alguém pagou a taxa e o contato desbloqueou sozinho? |
| M3 Confiança | 31/08 | Se quebrar às 3h da manhã, eu fico sabendo? |
| M4 Produto | 14/09 | Um estranho entende o app em 30 segundos? |
| M5 Ensaio | 21/09 | 20 pessoas reais usaram sem eu explicar nada? |
| M6 Lançar | 27/09 | — |

---

# M1 — Fundação estável · até 03/08

> **Objetivo:** parar de construir sobre areia. O trabalho já feito está aplicado, no ar,
> e verificado por olhos humanos.
>
> **Saída:** você percorreu o app logado, do cadastro à exclusão de conta, sem travar.

### 1.1 Aplicar as migrations pendentes — ✅ **FEITO em 29/07 09:07 UTC**

| Migration | O que fechou | Severidade |
|---|---|---|
| `0008_derive_completion_stats` | `kyc_verified` e contadores de reputação forjáveis por PATCH direto no PostgREST | Alta |
| `0009_harden_match_lifecycle` | `connection_fee`, `status` e as confirmações de coleta/entrega graváveis pelo cliente | Alta |
| `0010_harden_notifications_rls` | Injeção de notificação: qualquer conta logada escrevia título/mensagem na caixa de outra pessoa | **Estava viva** |
| `0011_revoke_guard_unlock_fields` | `REVOKE` que não revogava (PUBLIC ainda com EXECUTE) | Baixa |

Verificado depois de aplicar, lendo o catálogo do Postgres:

- `authenticated` só escreve `full_name, phone, avatar_url, bio` em `profiles`; `anon`
  não escreve nada.
- `guard_unlock_fields()` perdeu a entrada de PUBLIC no `proacl`.
- Os seis triggers existem (`trg_guard_match_insert`, `trg_guard_match_update`,
  `trg_guard_profile_reputation_fields`, `trg_guard_notification_update`,
  `trg_guard_unlock_fields`, `on_match_completed`).
- As policies de INSERT/UPDATE de `notifications` e `matches` têm `WITH CHECK`.

Os arquivos foram renomeados para o timestamp que o ledger registrou
(`20260729090730`…`20260729090853`), para `supabase db push` não tentar reaplicar.

**Pendente daqui:** o app ainda chama `increment_completion_stats` em
`src/app/matches/actions.ts:403`. A RPC agora é idempotente, então não é urgente, mas
enquanto a chamada existir a função precisa continuar exposta a `authenticated` — é o
que sobra de WARN no advisor. Remover a chamada e derrubar a RPC numa 0012 fecha isso.

### 1.2 Rate limiting que realmente segura

Hoje `rateLimit()` cai no `Map` em processo, porque `UPSTASH_REDIS_REST_URL` e
`UPSTASH_REDIS_REST_TOKEN` não existem. Na Vercel isso é um contador por instância de
lambda, zerado a cada cold start: o limite de login (5/15min) vira 5 × instâncias
quentes. Não segura credential stuffing.

Provisionar Upstash e preencher as duas vars. O código já escolhe o backend em runtime —
não precisa de mudança.

**Aceite:** seis tentativas de login com senha errada no mesmo e-mail, a partir de duas
abas diferentes, bloqueiam na sexta.

### 1.3 Completar env vars na Vercel

Faltam `SUPABASE_SERVICE_ROLE_KEY` e `DATABASE_URL`. Sem a primeira, a exclusão de conta
(LGPD Art. 18, VI) não funciona — falha com mensagem apontando o DPO, mas não exclui.

### 1.4 Primeiro smoke test manual autenticado — **[VOCÊ]**

Nunca foi feito. Roteiro mínimo, nesta ordem, com duas contas:

1. Cadastro com aceite dos termos → confirmar e-mail → login
2. Publicar uma viagem · publicar um pedido (contas diferentes)
3. Propor match → aceitar do outro lado
4. Pagar a taxa (sandbox) → conferir que o contato desbloqueia
5. Trocar mensagem no chat
6. Confirmar coleta → confirmar entrega → avaliar
7. Exportar seus dados (JSON baixa?) → excluir a conta

**Aceite:** os 7 passos sem erro de console e sem tela em branco.

### 1.5 Ligar leaked password protection no Supabase

Compara a senha contra o HaveIBeenPwned no cadastro. Painel do Supabase, Auth → Password.

### 1.6 Comprar `levai.app` — **[VOCÊ]**

Trava três frentes: caixa `privacidade@` (Art. 41 §1 — o e-mail do encarregado está
publicado e não existe), SMTP dos e-mails de auth, e URL de produção coerente com os
termos. Se o domínio final for outro, me avise para corrigir `DPO_EMAIL` em
`src/lib/legal.ts`.

### 1.7 Decidir CPF vs MEI com contador — **[VOCÊ]**

Precisa sair em julho porque muda os termos, e os termos vão para revisão jurídica no M3.
Detalhes em Riscos.

---

# M2 — Dinheiro e comunicação · 04/08 → 17/08

> **Objetivo:** a única receita do app funciona ponta a ponta, e as pessoas ficam sabendo
> das coisas sem precisar abrir o app.
>
> **Saída:** alguém que não é você pagou a taxa e o contato desbloqueou sozinho, sem
> ninguém tocar no banco.

### 2.1 Pix ponta a ponta

`ASAAS_API_KEY` está vazia; a taxa de conexão nunca foi cobrada uma vez. A correção do QR
que fiz em 28/07 jamais executou.

- Chaves de produção quando o cadastro aprovar
- Sandbox primeiro: gerar cobrança → pagar → webhook → `unlocked_at` preenchido
- Produção depois, com valor mínimo real, do seu próprio bolso

**Aceite:** `matches.unlocked_at` preenchido pelo webhook, sem intervenção manual.

### 2.2 Idempotência do webhook

O Asaas reenvia entrega até receber 200. Hoje, um reenvio de `PAYMENT_RECEIVED` roda o
handler de novo. Precisa ser seguro: desbloquear duas vezes não pode gerar duas
notificações nem duas linhas em `payments`.

**Onde:** `src/app/api/webhooks/asaas/route.ts`. O índice único
`idx_payments_psp_charge` já existe e ajuda; falta o handler tratar a violação como
sucesso, não como erro.

**Aceite:** disparar o mesmo evento três vezes deixa o banco idêntico ao de uma vez.

### 2.3 O webhook que nunca chega

Cenário real: a pessoa paga, o Asaas tenta entregar, a Vercel está fria ou fora do ar, e
o webhook desiste. A pessoa pagou e o contato não abriu. Hoje não há saída nenhuma.

Duas peças:
- **Reconciliação**: rota que relê a cobrança no Asaas por `psp_charge_id` e concilia
  `payments.status`. `fetchCharge()` em `src/lib/asaas.ts` já existe para isso.
- **Botão "já paguei"** no paywall, com rate limit, que dispara essa reconciliação.

**Aceite:** com o webhook bloqueado de propósito, o botão desbloqueia o match.

### 2.4 Política e mecanismo de reembolso

Lacuna que ninguém tinha nomeado. Pagou a taxa, a outra parte sumiu, a entrega não
aconteceu — e não há fluxo. Num lançamento público isso vira reclamação no Procon.

Definir e implementar:
- Em que casos cabe reembolso (contraparte não responde em N dias; match cancelado após
  pagamento; entrega não realizada)
- CDC art. 49 (arrependimento em 7 dias) se aplica à taxa — **confirmar com advogado no M3**
- Mecanismo: estorno via API do Asaas + `payments.status = 'refunded'` + reverter
  `unlocked_at`
- Onde a pessoa pede: tela ou WhatsApp com registro

**Aceite:** um reembolso executado de ponta a ponta em sandbox.

### 2.5 E-mail transacional próprio

O app **não envia nenhum e-mail**. Os únicos que saem são os do Supabase Auth pelo SMTP
padrão: **3 por hora** e reputação de domínio compartilhada, ou seja, spam. Num
lançamento público isso sozinho derruba o cadastro.

- Conta no Resend, domínio verificado (DKIM/SPF) — depende de 1.6
- Apontar o SMTP customizado no Supabase Auth
- Templates em português: confirmação de cadastro, recuperação de senha

**Aceite:** cadastro novo recebe o e-mail em menos de 30s, na caixa de entrada, não no spam.

### 2.6 Notificação fora do app

Hoje só existe o sino no dashboard. Num marketplace de dois lados isso mata a conversão:
alguém propõe match, o outro só descobre se abrir o app por acaso.

Escopo mínimo para o lançamento: **e-mail** nos três eventos que têm dono esperando —
proposta recebida, match aceito, pagamento confirmado. Push fica para depois do
lançamento.

**Onde:** ponto único onde `notifications` são inseridas, para o e-mail sair junto.

**Aceite:** receber proposta com o app fechado gera e-mail em até 1 minuto.

### 2.7 Plano B de PSP — **[VOCÊ]**

Se o Asaas negar ou limitar PF, não existe receita e o modelo para. Sem resposta até
**10/08**, abrir cadastro paralelo em Mercado Pago ou PagSeguro.

---

# M3 — Confiança · 18/08 → 31/08

> **Objetivo:** o app avisa quando quebra, e um humano com OAB leu o que você está
> publicando.
>
> **Saída:** um erro em produção chega até você sem um usuário precisar reclamar.

### 3.1 Fazer a suíte e2e existir de verdade

Estado: `tests/` versionado, mas os navegadores não estão instalados — todo teste morre
em `browserType.launch`. E a cobertura é só deslogada.

- `npx playwright install` e confirmar o que passa
- Fixture de sessão autenticada (o buraco real: nenhum teste entra em tela logada)
- Cobrir os caminhos que envolvem dinheiro e dados: propor → aceitar → pagar → desbloquear;
  exportar dados; excluir conta com match ativo (deve recusar)

**Aceite:** `npm run e2e` verde numa máquina limpa depois do `install`, cobrindo o fluxo
de pagamento.

### 3.2 Monitoramento de erro

Não existe. Um 500 em produção hoje só aparece se alguém contar.

- Sentry no cliente e no servidor, com source maps
- Alerta no seu celular para erro novo
- Scrubbing de PII: telefone e e-mail não podem vazar para o painel do Sentry

**Aceite:** um erro proposital em produção chega no celular em menos de 5 minutos.

### 3.3 Revisão jurídica — **[VOCÊ]**

Os termos e a política foram escritos por IA e nunca lidos por advogado. Num lançamento
público, com você como controlador pessoa física, isso não é opcional.

Levar ao advogado, especificamente:
- Identificação do fornecedor (CDC art. 31) — muda conforme CPF ou MEI
- Se o CDC art. 49 (7 dias) se aplica à taxa de conexão
- Limite de responsabilidade: o LevAí conecta, não transporta nem garante a entrega
- Se conectar pessoas para transportar bens de terceiros tem exigência regulatória
- Política de privacidade contra a LGPD real, não contra o meu resumo dela

### 3.4 Auditoria final de RLS

Tabela por tabela, policy por policy, com as migrations já aplicadas. Para cada uma:
quem lê, quem escreve, e o que acontece num PATCH direto no PostgREST ignorando o app.

**Aceite:** planilha com as 9 tabelas × 4 operações e o resultado do teste manual.

### 3.5 Device real e rede ruim

Só houve teste em viewport simulado. Falta: Android e iPhone físicos, 3G lento, tela
pequena de verdade, teclado virtual cobrindo campo.

O glassmorphism é o suspeito número um aqui — `backdrop-filter` é caro e derruba
frame rate em aparelho de entrada, que é exatamente o público.

### 3.6 Acessibilidade

Contraste do vidro (amarelo sobre translúcido tende a reprovar no WCAG AA), foco visível
no teclado, `aria-label` nos botões só de ícone, leitor de tela no fluxo de cadastro.

---

# M4 — Produto pronto para estranho · 01/09 → 14/09

> **Objetivo:** parar de otimizar para quem já sabe usar.
>
> **Saída:** alguém que nunca ouviu falar do LevAí entende o que fazer em 30 segundos.

### 4.1 O marketplace vazio — **[VOCÊ]**, e é o maior risco de produto

Em 27/09 alguém entra, não vê nenhuma viagem publicada, e vai embora para não voltar.
Num beta fechado dá para contornar conversando; num lançamento público você tem **uma**
primeira impressão por pessoa.

Precisa haver viagens reais no ar **antes** de abrir. Isso é recrutamento, começa em
agosto, e não é código. Decidir também: abre por cidade (Floripa primeiro, por exemplo)
ou nacional? Concentrar aumenta muito a chance de dois lados se encontrarem.

### 4.2 Onboarding e estados vazios

Tela vazia hoje parece app quebrado. Cada lista precisa de um estado que ensine o próximo
passo em vez de mostrar nada: `/trips`, `/orders`, `/tracking`, `/wallet`, o sino.

Primeiro acesso: três telas explicando o modelo — você leva, alguém pede, a taxa libera o
contato e o resto se resolve entre vocês.

### 4.3 Deixar o modelo de cobrança óbvio antes do pagamento

O risco de reclamação mais provável é alguém pagar achando que pagou a entrega. Precisa
estar explícito no paywall: **esta taxa libera o contato, o valor do produto e do frete
você combina direto com a pessoa, fora do app.**

### 4.4 Denúncia, bloqueio e moderação

Lançamento público sem isso é problema legal e de segurança. Escopo mínimo:
- Botão de denunciar em perfil, viagem, pedido e mensagem
- Bloquear usuário (some das buscas, não pode propor match)
- Fila de moderação, mesmo que seja só uma tabela e você olhando
- Termos descrevendo o que é proibido levar (ilícitos, perecíveis, valores)

### 4.5 Mediação de disputa

Hoje o traveler confirma a coleta e o requester confirma a entrega. **Se discordarem, o
match trava para sempre** e não há saída no produto.

Mínimo: estado de disputa, congelamento do match, canal para você mediar por WhatsApp com
registro, e uma resolução manual que desempata.

### 4.6 Analytics de funil

Sem isso você lança às cegas. Quatro passos: cadastro → publicar → match → pagar. Saber
onde as pessoas caem é o que permite corrigir na primeira semana.

Ferramenta com hospedagem na UE ou self-hosted é mais fácil de justificar na LGPD.

### 4.7 Suporte que escala além do seu WhatsApp pessoal

O `HelpFab` aponta para o seu número. Funciona com 20 pessoas, não com 2.000. Decidir:
horário de atendimento publicado, respostas prontas, e uma FAQ que resolve os 10 casos
mais comuns antes de virar mensagem.

---

# M5 — Ensaio geral · 15/09 → 21/09

> **Objetivo:** descobrir com 20 pessoas o que você descobriria com 2.000, mas em
> condições que dá para consertar.
>
> **Saída:** 20 pessoas reais usaram sem você explicar nada por cima do ombro.

### 5.1 Beta fechado — mesmo lançando aberto depois

Não é redundante. É a única chance de ver gente de fora usando antes que a impressão seja
pública e permanente.

- 20–30 pessoas, metade de cada lado do marketplace
- Sem tutorial, sem você olhando: onde travarem é o bug
- Canal único para relato

### 5.2 A semana inteira reservada para o que o beta revelar

Não encha esta semana de features. Se o beta não gerar trabalho, ele foi mal feito.

### 5.3 Teste de carga

100 sessões simultâneas. O que importa: pool de conexão do Supabase (o limite do plano
free é baixo), cold start da Vercel, e se o rate limit por IP barra gente legítima atrás
do mesmo NAT.

### 5.4 Runbook de incidente

Uma página: como reverter um deploy, como desligar o cadastro sem derrubar o site, quem
avisar se o Asaas cair, onde ficam os backups e como restaurar. Escrito antes, porque
ninguém escreve isso às 3h da manhã.

### 5.5 Backup verificado

Confirmar que o Supabase está fazendo backup **e restaurar um** num projeto de teste.
Backup não testado não é backup.

---

# M6 — Lançamento · 22/09 → 27/09

### 6.1 Congelar features em 22/09

Nada novo entra. Só correção de bug. Feature que entra na véspera é a que quebra.

### 6.2 Checklist final

Env vars conferidas em produção · monitoramento recebendo eventos · backup testado ·
e-mail saindo da caixa de entrada · termos na versão revisada pelo advogado ·
`TERMS_VERSION` batendo · viagens reais publicadas · suporte de plantão combinado.

### 6.3 Lançar

Ver Riscos sobre a data cair num domingo.

---

## Riscos que podem furar a data

Nenhum é problema de código. Nenhum se resolve trabalhando mais horas.

**1. CPF + lançamento público aberto.** A tensão mais séria do plano. Cobrar taxa do
público como pessoa física traz três consequências: os termos precisam identificar o
fornecedor (CDC art. 31), o que para PF significa expor seu nome completo e CPF no site;
nota fiscal como PF é impraticável; e o Asaas costuma aprovar PF com limite menor. MEI
abre online, custa pouco e resolve os três — mas quem decide é contador, não eu. Precisa
sair em julho, porque muda os termos que vão ao advogado no M3.

**2. O Asaas pode negar ou limitar.** Sem PSP não há receita e o modelo inteiro para.
Não dá para descobrir em setembro. Prazo de decisão: 10/08.

**3. Marketplace vazio.** O maior risco de produto, detalhado em 4.1.

**4. Zero telas autenticadas testadas por humano.** Dashboard, matches, paywall, chat,
perfil, carteira e os fluxos LGPD passaram por `tsc`, `eslint` e `next build` — o que
prova que compilam, não que funcionam.

**5. Termos escritos por IA, nunca lidos por advogado.** Com LGPD valendo e você como
controlador pessoa física, essa revisão não é opcional num lançamento público.

**6. 27/09 é domingo.** Bom para tráfego de consumidor, ruim para suporte e para acionar
terceiro se algo der errado. Considere quinta 24/09, deixando o fim de semana para
acompanhar com folga.

---

## Sequência crítica

O que trava mais coisa, em ordem.

```
Comprar levai.app ──┬─► caixa privacidade@ ──► LGPD art. 41 §1 resolvido
                    ├─► domínio verificado ──► Resend ──► e-mail transacional (2.5)
                    │                                       └─► notificação por e-mail (2.6)
                    └─► URL de produção ────► termos coerentes

Aprovação Asaas ────► chaves em produção ──► Pix ponta a ponta (2.1)
                                              ├─► idempotência (2.2)
                                              ├─► reconciliação (2.3)
                                              └─► reembolso (2.4)

Migrations + Upstash + env ──► deploy ──► smoke test ──► base de todo o resto

Decisão CPF/MEI ──► identificação nos termos ──► revisão jurídica (3.3) ──► M3 fecha

Recrutar viajantes (4.1) ─────────────── começa em agosto, termina no dia do lançamento
```

Os três primeiros ramos correm em paralelo e todos começam em algo que **só você** pode
fazer. Por isso 28 e 29 de julho são os dias mais importantes do cronograma.
