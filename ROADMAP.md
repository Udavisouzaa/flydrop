# Malotex — registro de desenvolvimento

**Escopo fechado em 10 de outubro de 2026.**

Este documento era um cronograma até um lançamento marcado para 27/09/2026. O lançamento
não aconteceu, o desenvolvimento parou, e o documento foi convertido em registro: o que
foi construído, o que ficou faltando, e por que parou. Não sobrou nenhum prazo aqui —
prazo sem ninguém trabalhando é ficção, e deixar as datas antigas no texto só fazia o
projeto parecer esquecido em vez de encerrado.

A retrospectiva honesta está no fim, em **[Por que parou](#por-que-parou)**. É a parte
mais útil daqui.

## O que funciona

Autenticação por e-mail e por Google, publicação de viagens e de pedidos sobre uma rota
fechada de aeroportos, proposta e aceite de match, chat entre as partes, confirmação de
coleta e de entrega, avaliações, e os direitos de LGPD (exportar dados e excluir conta).
São 23 rotas, 9 tabelas com RLS em todas, 15 migrations. `tsc`, `eslint` e `next build`
passam limpos.

## O que nunca funcionou

**A receita.** A taxa de conexão de R$ 19,90 nunca foi cobrada uma única vez. A
`ASAAS_API_KEY` nunca existiu em produção, então o paywall responde 501 e `unlocked_at`
nunca foi preenchido por um pagamento de verdade. Todo o código de cobrança, webhook,
idempotência e reconciliação está escrito, revisado — e nunca executou contra o Asaas.

**A verificação por gente.** Nenhuma tela autenticada foi usada por um humano. O smoke
test (1.4) nunca foi rodado, nem nos quatro passos que não dependiam do Asaas.

**A validação da demanda.** O `VALIDACAO.md` registra **0 de 30** conversas. O produto foi
construído inteiro sem uma única conversa com cliente potencial.

## Decisões de produto que o código reflete

| | |
|---|---|
| Taxa de conexão | **R$ 19,90 fixos**, cobrados para liberar o contato (era 10% do orçamento) |
| Fluxo do dinheiro | só a taxa passa pela plataforma; a entrega as partes combinam fora |
| Rota | domínio **fechado** de aeroportos (FLN e destinos com voo direto), não texto livre |
| Figura jurídica | **CPF** — nunca revisto com contador |
| Nome | **Malotex** (foi LevAí, foi FlyDrop, começou como MALAH) |
| Domínio | `malotex.com.br`, no ar, com certificado |

O nome mudou em 30/07 e a infraestrutura **não** mudou junto, de propósito: a pasta, o
repositório no GitHub, o projeto na Vercel e o do Supabase continuam se chamando
`flydrop`. Renomear quebraria remotes, URLs de deploy e integrações por ganho puramente
cosmético.

**[VOCÊ]** marca o que dependia de conta, compra, decisão ou terceiro — não de código.

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

## Como ler os marcos

Cada marco tinha uma **pergunta de saída**: se a resposta não fosse "sim", o marco não
fechava, mesmo com todos os itens riscados. A ideia era evitar chegar no fim com a lista
completa e nada funcionando. Mantive as perguntas porque elas são o que o documento teve
de mais útil — e porque a resposta delas é o diagnóstico do projeto.

| Marco | Pergunta de saída | Resposta real |
|---|---|---|
| M1 Fundação | O que já foi construído está no ar e uma pessoa real usou? | está no ar; **ninguém usou** |
| M2 Dinheiro | Alguém pagou a taxa e o contato desbloqueou sozinho? | **não**, nunca foi cobrada |
| M3 Confiança | Se quebrar às 3h da manhã, eu fico sabendo? | **não**, nunca houve monitoramento |
| M4 Produto | Um estranho entende o app em 30 segundos? | nunca testado com estranho |
| M5 Ensaio | 20 pessoas reais usaram sem eu explicar nada? | **não** |
| M6 Lançar | — | não aconteceu |

Cinco das seis perguntas têm a mesma resposta, e ela não é sobre código: **o produto nunca
encontrou um usuário.**

---

# M1 — Fundação estável

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

**Fechado em 29/07 pela `0012`:** a chamada a `increment_completion_stats` saiu de
`src/app/matches/actions.ts` (commit `7b5a973`) e a RPC foi derrubada (`ad9ae0a`). O WARN
do advisor foi junto.

### 1.1b A 0009 trancou a criação de propostas — ✅ **CORRIGIDO em 30/07**

Efeito colateral que só apareceu quando alguém tentou usar o app: desde 29/07, **nenhuma
proposta podia ser criada em produção**. A 0009 revogou o `EXECUTE` de
`calc_connection_fee` de `authenticated`, mas `guard_match_insert()` — que é
`SECURITY INVOKER` de propósito — chama exatamente essa função. Todo INSERT em `matches`
morria com `42501 permission denied`, e a mensagem crua ficava escondida atrás de um
"Não foi possível criar a proposta.".

Corrigido pela migration `0013`, aplicada em produção em 30/07 (commit `f89aa21`). A
saída não foi devolver o GRANT — isso reabriria a função em
`/rest/v1/rpc/calc_connection_fee` para qualquer usuário logado, que é o que a 0009 quis
impedir.

**Lição para o resto do roadmap:** as migrations 0008–0011 foram verificadas lendo o
catálogo do Postgres, e mesmo assim uma delas quebrou um fluxo inteiro. Ler o catálogo
prova que a permissão está como você escreveu; só o 1.4 prova que o app funciona.

### 1.1c Domínio, e-mail e login — ✅ **FEITO em 30/07**

O maior desbloqueio do cronograma. O que entrou:

| | |
|---|---|
| `malotex.com.br` | comprado no Registro.br, nameservers delegados para a Vercel |
| Certificado | Let's Encrypt emitido para o apex e para `www` |
| Rebrand | commit `8576f29` — todo texto que o usuário lê diz **Malotex** |
| Login com Google | commit `abfd14e`, com a rota de callback que o projeto nunca teve |
| E-mail | Zoho configurado: verificação, 3 MX, SPF e DKIM validados no DNS |
| Supabase Auth | Redirect URLs liberando o domínio novo |

As chaves internas continuam com o nome antigo (`levai-theme`, `levai-lang`,
`levai:rl:`). Renomear apagaria a preferência de tema e idioma de quem já usou o app e
zeraria os contadores de rate limit. Ficam como estão.

**Ainda pendente daqui — [VOCÊ]:**

- Trocar a **Site URL** no Supabase para `https://malotex.com.br` (hoje ainda aponta para
  a URL da Vercel; é ela que os e-mails de auth usam como fallback)
- Terminar o alias `privacidade@malotex.com.br` no Zoho e mandar um e-mail de teste. Só
  quando a mensagem chegar é que o Art. 41 §1 está de fato resolvido — o aviso ⚠️ em
  `src/lib/legal.ts` fica até lá

### 1.2 Rate limiting que realmente segura — ✅ **PROVISIONADO em 29/07**

`UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` estão em Production na Vercel
(medido em 31/07 via `vercel env ls production`). O código escolhe o backend em runtime,
então o fallback do `Map` em processo — um contador por instância de lambda, zerado a cada
cold start — não vale mais em produção.

**Falta só o aceite**, que ninguém rodou: seis tentativas de login com senha errada no
mesmo e-mail, a partir de duas abas diferentes, bloqueiam na sexta. Cabe no smoke test
(1.4) como passo 0.

### 1.3 Completar env vars na Vercel — ✅ **FEITO em 29/07**

`SUPABASE_SERVICE_ROLE_KEY` está em Production. Era ela que a exclusão de conta (LGPD
Art. 18, VI), o checkout e o webhook precisavam.

`DATABASE_URL` **não é necessária**: `src/db/` (drizzle) não é importado por nenhum
arquivo fora dele mesmo. É código morto, não uma var faltando. Ou o `src/db/` ganha um
uso, ou sai do repo — mas não bloqueia nada.

### 1.3b As três vars do Asaas não existem em produção — **[VOCÊ]** · bloqueia o 1.4

Descoberto em 31/07 medindo `vercel env ls production`. Production tem cinco vars:
as duas do Upstash, a `SUPABASE_SERVICE_ROLE_KEY` e as duas do Supabase públicas.
**`ASAAS_API_KEY`, `ASAAS_ENV` e `ASAAS_WEBHOOK_TOKEN` não estão lá** — existem só no
`.env.local`.

Consequência exata, e é por isso que isto vem antes do 1.4:

- **Passo 4 do smoke test morre.** `POST /api/connection/checkout` testa
  `isAsaasConfigured()` na primeira linha e responde **501 "Pagamentos ainda não estão
  configurados neste ambiente"**. Nem chega a criar a cobrança.
- **O contato nunca desbloqueia.** `verifyWebhookToken()` retorna `false` quando
  `ASAAS_WEBHOOK_TOKEN` está ausente (falha fechada, correto), então todo webhook real do
  Asaas levaria 401. E `matches.unlocked_at` só pode ser escrito pelo `service_role` via
  webhook — o trigger `guard_unlock_fields` bloqueia qualquer outro caminho.

Sem isso o smoke test para no passo 4 de 7, e os passos 5 e 6 (chat, coleta, entrega)
ficam inalcançáveis porque dependem do contato liberado.

**Desfecho: nunca resolveu.** Em 01/08 a verificação do Asaas estava aprovada, a decisão
era estrear direto em produção sem sandbox, e a API estava com problema do lado deles, com
previsão de resolver até 06/08. A previsão não se cumpriu, ninguém voltou ao assunto, e as
três variáveis nunca chegaram à Vercel. `ASAAS_WEBHOOK_TOKEN` foi gerado localmente e é o
único dos três que ficou pronto. **Foi aqui que o projeto travou de fato** — e, como está
registrado em Por que parou, o travamento virou álibi para o 1.4, que não dependia disto.

Repare que isto **não é problema de permissão nem de código** — nenhuma autorização
destrava, porque a chave só passa a existir depois de gerada no painel do Asaas.

**O que fazer quando a API voltar:**

1. `asaas.com` → Integrações → Chave de API → Gerar chave (mostrada uma vez só)
2. Validar a chave contra `https://api.asaas.com/v3/customers?limit=1` antes de qualquer
   deploy — chave errada se manifesta como 401 genérico, e é melhor descobrir fora do ar
3. Webhook em Integrações → Webhooks: URL `https://malotex.com.br/api/webhooks/asaas`,
   token igual ao `ASAAS_WEBHOOK_TOKEN`, e exatamente os seis eventos que a rota trata —
   `PAYMENT_RECEIVED`, `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`,
   `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`
4. As três vars na Vercel em Production, com `ASAAS_ENV=production` — a string literal,
   porque `asaasFetch` faz `=== "production"` e qualquer outro valor cai em sandbox calado
5. `vercel --prod`, porque env var nova só vale em build novo

**Armadilha de ambiente cruzado:** o webhook relê a cobrança pela API (`fetchCharge`) antes
de destravar. Chave de produção com `ASAAS_ENV=sandbox` faz esse GET dar 404, e o cliente
paga sem receber o contato. Chave e `ASAAS_ENV` andam sempre juntos.

**Aceite:** `POST /api/connection/checkout` autenticado devolve um Pix, não 501.

### 1.4 Primeiro smoke test manual autenticado — **[VOCÊ]** · agora o item mais importante do M1

Nunca foi feito, e depois do 1.1b é o único item que prova que o app funciona. Rodar em
**produção** (`https://malotex.com.br`), não em `localhost` — é lá que estão as env vars,
o RLS real e o domínio dos e-mails.

Roteiro mínimo, nesta ordem, com duas contas:

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

### 1.6 Comprar o domínio — ✅ **FEITO em 30/07:** `malotex.com.br`

Era o item que travava três frentes de uma vez. Ver 1.1c. O que ele desbloqueou:
`privacidade@` (Art. 41 §1), domínio verificável para o Resend (2.5) e URL de produção
coerente com os termos. `DPO_EMAIL` em `src/lib/legal.ts` já aponta para
`privacidade@malotex.com.br`.

### 1.8 Identidade visual mínima — ✅ **FEITO em 30/07**

Favicon de mala nas cores da marca, substituindo o ícone padrão do Next.js:
`src/app/icon.svg` (o que aparece na aba), `favicon.ico` para navegador antigo,
`apple-icon.png` 180px, e `icon-192/512.png` referenciados no manifest.

### 1.9 Rota fechada em aeroportos, e taxa fixa — ✅ **FEITO em 31/07 e 01/08**

Duas mudanças que não estavam no plano e entraram porque bloqueavam o M2.

**Aeroportos** (migration `0014`, commit `6120e98`). `origin_city` e `destination_city`
eram texto livre, e as 9 linhas em produção guardavam seis grafias para três lugares —
"florianopolis", "floripa", "Florianópolis", "congonhas", "cgh", "São Paulo". O filtro da
aba Levar e o matching baixavam a tabela inteira e comparavam em JS via `cities.ts`. Com a
rota num domínio fechado (tabela `airports` + `src/lib/airports.ts`, FLN mais os destinos
com voo direto), o filtro voltou a ser `WHERE` em SQL e o `cities.ts` saiu do repo.

As duas viagens cujo destino era "São Paulo" ficaram sem aeroporto de propósito: a cidade
tem dois e escolher um seria inventar dado. Por isso a exigência de rota é condicionada ao
status — `NOT VALID` não isenta linha antiga de um `UPDATE` futuro, e uma regra
incondicional deixaria essas duas impossíveis de cancelar.

**Taxa fixa** (migration `0015`, commit `868b5e5`). A fórmula antiga tinha piso de R$ 4,90
e o mínimo de cobrança do Asaas é R$ 5,00 — todo pedido com orçamento abaixo de R$ 50, que
é a faixa comum, geraria uma cobrança recusada na criação, com o usuário vendo só "não foi
possível gerar a cobrança". Nunca esbarrou nisso porque os quatro pedidos existentes têm
orçamento alto; era falha esperando o primeiro pedido barato, e só apareceria em produção.

O segundo motivo é que `orders.budget` é digitado pelo solicitante e ninguém confere.

Quem decide o preço é `private.calc_connection_fee`, não o TypeScript. Ela perdeu o
`SECURITY DEFINER`, que existia só para ler `orders.budget` driblando o RLS. O parâmetro
`p_order_id` ficou: o patamar de **R$ 39,90 depende de pedido prioritário**, que ainda não
existe no schema.

Os Termos de Uso descreviam a fórmula antiga e mudaram junto; `TERMS_VERSION` foi para
`2026-07-31`.

**Pendência que isso abriu:** `TERMS_VERSION` só é gravado no cadastro e **não existe fluxo
de re-aceite**. Os 9 usuários atuais nunca verão os termos novos. Irrelevante com base de
teste, mas precisa de um aviso de mudança antes do lançamento público.

### 1.7 Decidir CPF vs MEI com contador — **[VOCÊ]**

Precisa sair em julho porque muda os termos, e os termos vão para revisão jurídica no M3.
Detalhes em Riscos.

---

# M2 — Dinheiro e comunicação

> **Objetivo:** a única receita do app funciona ponta a ponta, e as pessoas ficam sabendo
> das coisas sem precisar abrir o app.
>
> **Saída:** alguém que não é você pagou a taxa e o contato desbloqueou sozinho, sem
> ninguém tocar no banco.

### 2.1 Pix ponta a ponta — ❌ **nunca executado**, ver 1.3b

`ASAAS_API_KEY` nunca saiu do vazio; a taxa de conexão nunca foi cobrada uma única vez. A
correção do QR feita em 28/07 jamais rodou. A verificação do Asaas foi aprovada, mas a API
ficou com problema do lado deles e o assunto morreu aí.

A decisão de 01/08 foi estrear **direto em produção**, sem sandbox. O sandbox teria
coberto os erros que só aparecem em execução — token com espaço sobrando, evento não
marcado no painel, `ASAAS_ENV` desalinhado com a chave — então o primeiro teste real
substitui esse papel e merece cuidado proporcional: um match de verdade, com o valor
cheio de R$ 19,90, do seu próprio bolso, antes de qualquer usuário chegar perto.

**Aceite:** `matches.unlocked_at` preenchido pelo webhook, sem intervenção manual.

### 2.2 Idempotência do webhook — ✅ **CÓDIGO PRONTO em 10/10**, aceite pendente

O Asaas reenvia entrega até receber 200, e manda `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`
quase juntos para a mesma cobrança. O handler tinha um `if (status === 'succeeded')` no
meio — uma leitura seguida de uma escrita, que duas entregas simultâneas atravessam as
duas antes de qualquer uma gravar. O resultado era **quatro notificações em vez de duas**.

A saída não foi travar mais cedo, foi trocar quem decide: agora quem serializa é o próprio
`UPDATE ... WHERE unlocked_at is null`, e só a chamada cuja linha volta do banco notifica.
As outras saem em "already".

**Segundo defeito, mais grave, que apareceu ao mexer nisso.** Aquele `return` antecipado
tornava o estado meio-aplicado permanente: se a gravação em `payments` desse certo e a de
`matches` falhasse logo depois, toda reentrega batia no `status === 'succeeded'` e saía
como duplicata — **sem nunca destravar o contato**. A pessoa pagava, o banco registrava o
pagamento, e o match ficava trancado para sempre. Agora a verificação de valor é que é
pulada quando a cobrança já foi conferida; o destrave sempre roda, e é por isso que a
reentrega cura esse estado em vez de mascará-lo.

Junto foram dois ajustes menores no roteamento de eventos:

- `PAYMENT_OVERDUE` reentregue com atraso não rebaixa mais para `failed` uma cobrança que
  entrou depois. `PAYMENT_REFUNDED` continua se aplicando a cobrança paga — é justamente
  esse o caso dele.
- Evento de pagamento cuja cobrança a API do Asaas diz não estar paga agora responde
  **200**, não 500. O Asaas pausa a fila inteira de webhooks depois de algumas entregas
  sem 2xx, e um evento envenenado insistindo travaria todos os matches, não só o dele. O
  2.3 é a rede que cobre o caso legítimo (atraso de propagação).

**Onde:** a lógica saiu da rota para `src/lib/connection-settlement.ts`, porque o 2.3
precisa exatamente da mesma sequência — conferir valor, gravar `payments`, destravar,
notificar. Duas cópias divergiriam na primeira correção feita só de um lado, e o lado
esquecido é o que deixa alguém pagando sem destravar.

**Aceite (pendente, precisa da chave do Asaas):** disparar o mesmo evento três vezes deixa
o banco idêntico ao de uma vez — uma linha em `payments`, duas notificações.

### 2.3 O webhook que nunca chega — ✅ **CÓDIGO PRONTO em 10/10**, aceite pendente

Cenário real: a pessoa paga, o Asaas tenta entregar, a Vercel está fria ou fora do ar, e o
webhook desiste. A pessoa pagou e o contato não abriu.

- **Reconciliação**: `POST /api/connection/reconcile`. Autenticada, restrita às duas partes
  do match, com rate limit próprio (`reconcileByUser` / `reconcileByIp`). Relê no Asaas as
  cobranças do match e liquida pela mesma função do webhook.
- **Botão "já paguei"** no paywall, visível **inclusive antes de gerar cobrança** — quem
  pagou, fechou a aba e voltou depois precisa conferir, não gerar outro Pix. O polling de
  10 minutos também passou a dizer que desistiu, em vez de só parar calado.

O que a rota deliberadamente **não** faz é confiar em quem chama. O pedido só diz qual
match olhar; quem responde se houve pagamento é a API autenticada do Asaas. Apertar o botão
sem ter pagado devolve "ainda não identificamos" quantas vezes for. E sem resposta do Asaas
a liquidação **recusa** em vez de destravar no escuro: sem evento e sem API não sobra
evidência nenhuma de pagamento.

**Aceite (pendente, precisa da chave do Asaas):** com o webhook bloqueado de propósito, o
botão desbloqueia o match.

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

Se o Asaas negasse ou limitasse PF, não haveria receita e o modelo pararia. O plano era:
sem resposta até 10/08, abrir cadastro paralelo em Mercado Pago ou PagSeguro. **O prazo
passou sem decisão e sem plano B** — o item ficou parado junto com o 2.1.

---

# M3 — Confiança

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
- Limite de responsabilidade: o Malotex conecta, não transporta nem garante a entrega
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

# M4 — Produto pronto para estranho

> **Objetivo:** parar de otimizar para quem já sabe usar.
>
> **Saída:** alguém que nunca ouviu falar do Malotex entende o que fazer em 30 segundos.

### 4.1 O marketplace vazio — **[VOCÊ]**, e é o maior risco de produto

No dia do lançamento alguém entra, não vê nenhuma viagem publicada, e vai embora para não
voltar. Num beta fechado dá para contornar conversando; num lançamento público você tem
**uma** primeira impressão por pessoa. Nunca houve recrutamento de viajantes, então o
marketplace seguiu vazio até o fim.

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

# M5 — Ensaio geral

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

# M6 — Lançamento

### 6.1 Congelar features antes do lançamento

Nada novo entra na última semana. Só correção de bug. Feature que entra na véspera é a que
quebra.

### 6.2 Checklist final

Env vars conferidas em produção · monitoramento recebendo eventos · backup testado ·
e-mail saindo da caixa de entrada · termos na versão revisada pelo advogado ·
`TERMS_VERSION` batendo · viagens reais publicadas · suporte de plantão combinado.

### 6.3 Lançar

Não aconteceu.

---

## Riscos conhecidos quando o escopo foi fechado

Nenhum é problema de código. Nenhum se resolveria trabalhando mais horas — e é por isso
que trabalhar mais horas no código não resolveu.

**1. CPF + lançamento público aberto.** A tensão mais séria do plano. Cobrar taxa do
público como pessoa física traz três consequências: os termos precisam identificar o
fornecedor (CDC art. 31), o que para PF significa expor seu nome completo e CPF no site;
nota fiscal como PF é impraticável; e o Asaas costuma aprovar PF com limite menor. MEI
abre online, custa pouco e resolve os três — mas quem decide é contador, não eu. Precisa
sair em julho, porque muda os termos que vão ao advogado no M3.

**2. O Asaas pode negar ou limitar.** Sem PSP não há receita e o modelo inteiro para. O
prazo de decisão era 10/08 e passou em branco. Na prática o risco se concretizou pela via
mais boba: a chave simplesmente nunca foi gerada e cadastrada.

**3. Marketplace vazio.** O maior risco de produto, detalhado em 4.1.

**4. Zero telas autenticadas testadas por humano.** Dashboard, matches, paywall, chat,
perfil, carteira e os fluxos LGPD passaram por `tsc`, `eslint` e `next build` — o que
prova que compilam, não que funcionam.

**5. Termos escritos por IA, nunca lidos por advogado.** Com LGPD valendo e você como
controlador pessoa física, essa revisão não é opcional num lançamento público.

**6. Nenhuma receita jamais verificada.** Os cinco riscos acima foram registrados em
julho e agosto. O sexto é o que ficou claro só depois: um produto que nunca cobrou de
ninguém não tem modelo de negócio testado, tem hipótese de modelo de negócio. Ver
**[Por que parou](#por-que-parou)**.

---

## Sequência crítica

O que trava mais coisa, em ordem.

```
malotex.com.br ✅ ───┬─► caixa privacidade@ ──► falta o teste chegar ──► art. 41 §1 fecha
                     ├─► domínio verificado ──► Resend ──► e-mail transacional (2.5)
                     │                                      └─► notificação por e-mail (2.6)
                     └─► URL de produção ✅ ──► termos coerentes ✅

Aprovação Asaas ────► chaves em produção ──► Pix ponta a ponta (2.1)
                                              ├─► idempotência (2.2) ✅ código, falta aceite
                                              ├─► reconciliação (2.3) ✅ código, falta aceite
                                              └─► reembolso (2.4)

Migrations ✅ + deploy ✅ ──► smoke test (1.4) ──► base de todo o resto
                                  ▲
                     Upstash ✅ (1.2) · service_role ✅ (1.3)
                     falta: 3 vars do Asaas em produção (1.3b)

Decisão CPF/MEI ──► identificação nos termos ──► revisão jurídica (3.3) ──► M3 fecha

Recrutar viajantes (4.1) ─────────────── começa em agosto, termina no dia do lançamento
```

O ramo do domínio destravou em 30/07 e levou o rebrand, o login com Google e o e-mail
junto. Sobraram dois gargalos: **as chaves do Asaas**, que nunca chegaram à Vercel, e **o
smoke test (1.4)** — o único item que separava "compila e está no ar" de "funciona".
Depois do episódio da `0009` (ver 1.1b), essa distinção deixou de ser retórica.

Vale registrar o erro de leitura que esse diagrama esconde. O smoke test aparece aqui como
bloqueado pelo Asaas, e **não era**: dos seus 7 passos, só o 4, 5 e 6 dependiam de
pagamento. Os passos 1, 2, 3 e 7 — cadastro, publicar viagem e pedido, propor e aceitar
match, exportar dados e excluir conta — estavam livres desde julho, custavam cerca de 40
minutos, e nunca foram executados. O bloqueio externo serviu de álibi para o item que não
dependia dele.

---

## Por que parou

Registrado por honestidade, e porque é a parte mais útil deste documento — inclusive para
mim mesmo mais tarde.

**A causa declarada foi o Asaas.** A chave de API nunca saiu do lado deles no prazo, e sem
chave não havia como cobrar nem como testar a cobrança. Isso é verdade, e não é a causa.

**A causa real é que a premissa nunca foi testada.** Em cerca de três meses saíram 15
migrations, triggers de integridade no banco, rate limiting com dois backends, comparação
de token em tempo constante, hardening de RLS contra `PATCH` direto no PostgREST,
exportação e exclusão de dados por LGPD, e um paywall com liquidação idempotente e
reconciliação. No mesmo período: **zero conversas com clientes potenciais.** O esforço de
engenharia foi desproporcional ao risco técnico, que era baixo, e inversamente
proporcional ao risco real, que era de mercado. Blindar o PostgREST contra injeção de
notificação é trabalho correto — num produto com 9 contas de teste e nenhuma receita, era
também o lugar confortável de onde não se enxerga a pergunta difícil.

**E tem a conta que nunca foi feita.** A rota é doméstica: FLN e os destinos com voo
direto. Para mandar um item de Florianópolis a São Paulo, os Correios cobram na faixa de
R$ 25 a 45, com rastreio, seguro e porta a porta. A taxa de conexão do Malotex é R$ 19,90
**antes** do que o viajante for cobrar, exige dois encontros presenciais em aeroporto, e
não oferece rastreio, seguro nem recurso se algo der errado. O crowdshipping de mala fecha
a conta em rota **internacional**, onde existe arbitragem de imposto e de disponibilidade
de produto que paga a fricção toda; em rota doméstica essa diferença não existe. Essa
comparação de três linhas não aparece em nenhuma versão anterior deste arquivo, e deveria
ter sido a primeira linha dele.

Some-se o que o setor já tinha mostrado: a maioria das plataformas de entrega colaborativa
fechou, e a que mais se aproxima deste modelo no Brasil retém o pagamento até a entrega —
exatamente o mecanismo que aqui foi removido de propósito, para evitar custódia de
recursos de terceiros e a exigência de CNPJ. A escolha de arquitetura que simplificou o
jurídico é a mesma que tirou do produto a razão de existir depois do primeiro match: com o
contato entregue, a plataforma passa a ser um custo evitável, e a receita por par de
usuários fica travada em R$ 19,90 para sempre.

**O que eu faria diferente, em uma frase:** teria intermediado três entregas à mão, por
WhatsApp, cobrando por Pix manual, antes de escrever a primeira migration.

### O que fica de aproveitável

O código, e algumas decisões que vale ler:

- **Permissão modelada no banco, não na aplicação.** As migrations `0008`–`0015` movem
  para triggers e policies o que o TypeScript não consegue garantir: quem pode escrever
  `kyc_verified`, `connection_fee`, `unlocked_at` e os contadores de reputação. O preço de
  um match é decidido por `private.calc_connection_fee`, não pelo cliente.
- **O episódio da `0009`.** Uma migration revogou o `EXECUTE` de `calc_connection_fee` de
  `authenticated` — e `guard_match_insert()`, que é `SECURITY INVOKER` de propósito, chama
  justamente essa função. Resultado: por um dia, **nenhuma proposta podia ser criada em
  produção**, com a mensagem crua escondida atrás de um "Não foi possível criar a
  proposta.". Verificar a permissão lendo o catálogo do Postgres provou que a policy estava
  como eu tinha escrito; não provou que o app funcionava. Foi a lição mais cara do projeto
  e a mais transferível.
- **Fechar a rota num domínio de aeroportos** (`0014`). O campo era texto livre e 9 linhas
  em produção guardavam seis grafias para três lugares — "florianopolis", "floripa",
  "Florianópolis", "congonhas", "cgh", "São Paulo". Virar tabela com chave estrangeira
  devolveu o filtro para o SQL e tornou impossível gravar rota que a operação não atende.
- **A liquidação idempotente** em `src/lib/connection-settlement.ts`. Quem serializa o
  destravamento é um `UPDATE ... WHERE unlocked_at is null`, não uma leitura seguida de
  escrita — e a função é compartilhada pelo webhook e pela reconciliação justamente para
  que as duas não divirjam. Nunca rodou contra o Asaas de verdade; o raciocínio está todo
  em comentário no arquivo.
