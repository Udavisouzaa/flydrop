# Validação FlyDrop — conversas reais

Meta: 30 conversas. Registrar **no momento** (ou logo depois), não de memória no fim do dia.

## Como conduzir

Não venda. Pergunte sobre o passado, não sobre o futuro — "você já fez isso?" vale
muito mais que "você usaria isso?". Ninguém mente sobre o que já fez; todo mundo
mente sobre o que faria.

Roteiro curto:

1. "Você já precisou trazer/mandar alguma coisa de outra cidade ou país?"
2. "Como resolveu da última vez?" (é aqui que mora a dor real)
3. "Quanto isso te custou — em dinheiro, tempo, ou dor de cabeça?"
4. "O que te impediu de resolver de outro jeito?"
5. Só no fim, se fizer sentido: "Se existisse alguém indo pra lá com espaço na mala,
   quanto você pagaria pra ser conectado com essa pessoa?"

⚠️ O número da pergunta 5 é o mais fácil de se enganar. Anote o que a pessoa
**disse**, e separadamente o que você **acha** que ela pagaria de verdade.

## Sinais para prestar atenção

- 🟢 **Forte**: já pagou alguém pra fazer isso; já usou grupo de WhatsApp/Facebook
  pra achar viajante; tem uma história específica e recente
- 🟡 **Morno**: acha a ideia boa, mas nunca teve o problema
- 🔴 **Fraco**: elogia muito e não tem nenhuma história concreta

## Registro

| # | Data | Nome/apelido | Perfil (viajante/comprador) | Rota | Já teve a dor? | Como resolveu | Disse que pagaria | Sua leitura | Contato deixado? |
|---|------|--------------|------------------------------|------|----------------|---------------|-------------------|-------------|------------------|
| 1 |      |              |                              |      |                |               |                   |             |                  |
| 2 |      |              |                              |      |                |               |                   |             |                  |
| 3 |      |              |                              |      |                |               |                   |             |                  |
| 4 |      |              |                              |      |                |               |                   |             |                  |
| 5 |      |              |                              |      |                |               |                   |             |                  |

<!-- copie linhas conforme precisar -->

## Placar

- Conversas: 0 / 30
- Já teve a dor: 0
- Já pagou alguém por isso: 0
- Deixaram contato: 0

## O que decide o rumo do produto

A taxa de conexão está hoje em **10% do orçamento do pedido, entre R$ 4,90 e
R$ 29,90** (padrão R$ 9,90 quando não há orçamento). Se as conversas apontarem
consistentemente para outro patamar, é só ajustar `calculateConnectionFee` em
`src/app/matches/actions.ts`.

Perguntas em aberto que a validação deveria responder:

- [ ] Quem paga a taxa: quem pede, quem viaja, ou os dois dividem?
- [ ] Cobrar por match ou assinatura mensal para viajantes frequentes?
- [ ] A objeção principal é preço, confiança, ou "não conheço a pessoa"?
- [ ] Rota mais citada (define onde concentrar a oferta inicial)
