# LevAí

Reconstrução do MVP descrito no handoff técnico de 16/07/2026. O app conecta solicitantes que precisam enviar itens entre cidades brasileiras a viajantes com espaço disponível na bagagem.

## Executar

Requisitos: Node.js 24 e pnpm.

```bash
pnpm install
pnpm start
```

Para abrir diretamente no navegador:

```bash
pnpm web
```

Validações disponíveis:

```bash
pnpm typecheck
pnpm build:web
```

## O que está implementado

- cadastro local com identidade única, sem o antigo `user-1` global;
- home com modos Enviar e Levar;
- pedido guiado em cinco etapas, incluindo regras especiais para eletrônicos;
- cadastro de viagem e matching exato por rota normalizada;
- vitrine de pedidos com filtros de origem e destino;
- proposta do viajante e aceite do solicitante;
- taxa de conexão simulada (Pix/cartão);
- chat persistido após a liberação da conexão;
- códigos de retirada e entrega e acompanhamento do status;
- notificações, carteira demonstrativa e persistência via AsyncStorage;
- layout responsivo para iOS, Android e web.

## Correções aplicadas durante a migração

- cidades legadas como `São Paulo - Guarulhos`, `GRU` e `CGH` são normalizadas para `São Paulo` antes de matching e filtros;
- mensagens e notificações também persistem localmente;
- IDs de novos usuários, pedidos, viagens, mensagens e notificações são únicos;
- o script de desenvolvimento não depende de variáveis específicas do Replit.

## Limites desta versão

O projeto continua sendo um MVP local. Não há backend, autenticação real, KYC, push notifications, movimentação financeira nem scanner QR. O pagamento é explicitamente simulado e os códigos de retirada/entrega são digitados manualmente.

O núcleo de estado e regras está em [`context/AppContext.tsx`](context/AppContext.tsx), e as rotas ficam em [`app/`](app/).
