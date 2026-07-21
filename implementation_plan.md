# FlyDrop Backend Implementation Plan

## Executive Summary

FlyDrop é uma plataforma de marketplace para conectar pessoas que precisam despachar itens urgentes (documentos, eletrônicos, itens esquecidos) em voos nacionais com viajantes que possuem espaço sobrando na bagagem. Este documento detalha a arquitetura backend necessária para operacionalizar a plataforma de ponta a ponta.

---

## 1. Stack Técnica Recomendada

### 1.1 Banco de Dados: PostgreSQL via Supabase
**Decisão:** PostgreSQL via Supabase (já em uso)  
**Justificativa:**
- ✅ Já configurado no projeto (`NEXT_PUBLIC_SUPABASE_URL`)
- Relacionamentos complexos (Trips → Orders → Matches)
- Suporte nativo a tipos de dados ricos (JSONB para metadados)
- Supabase oferece: Autenticação, Real-time subscriptions, PostgreSQL gerenciado
- Sem custo inicial, escalável
- Segurança: RLS (Row Level Security) nativo

**Alternativa descartada:** MongoDB seria mais simples, mas Flydrop precisa de ACID transactions para garantir consistência em pagamentos e matches.

---

### 1.2 ORM: Drizzle ORM
**Decisão:** Drizzle ORM  
**Justificativa:**
- Sintaxe TypeScript type-safe (melhor que raw SQL + menos boilerplate que Prisma)
- Suporte completo a PostgreSQL features (arrays, enums, JSON operators)
- Sem gerador de código (menos overhead, mais controle)
- Lightweight (~20KB vs Prisma ~50MB)
- Migrations nativas em TypeScript/SQL
- Query building é composable e elegante

**Comparação:**
| Aspecto | Drizzle | Prisma |
|--------|---------|--------|
| Bundle size | ~20KB | ~50MB+ |
| Type safety | Completo | Completo |
| Raw SQL | Suportado | Suportado |
| Migrations | SQL ou TypeScript | Prisma schema |
| Learning curve | Baixa | Média |
| Community | Crescendo | Grande |

**Alternativa descartada:** Prisma seria mais familiar, mas Drizzle é mais leve e eficiente para APIs serverless (Next.js App Router com edge functions).

---

### 1.3 Autenticação: Supabase Auth
**Decisão:** Supabase Auth (já em uso via `@supabase/ssr`)  
**Justificativa:**
- ✅ Já implementado no projeto
- Integração nativa com PostgreSQL (users table gerenciada por Supabase)
- Suporta JWT tokens seguros
- Row Level Security (RLS) integrado ao banco
- Providers de OAuth (Google, GitHub) fáceis de adicionar
- Sem custo adicional na Supabase

**Não usar:** NextAuth.js teria overhead extra; Clerk seria pago.

---

### 1.4 Pagamentos: Stripe Connect
**Decisão:** Stripe Connect (com escrow)  
**Justificativa:**
- Conectar múltiplas contas (traveler recebe, platform toma comissão)
- Escrow automático (retém pagamento até confirmação)
- Ideal para marketplaces
- Compliance com regulações (1099 automático)
- Webhooks confiáveis

**Fluxo:**
1. Usuário cria conta Stripe Connect durante onboarding
2. Quando Match é aceito → criar Payment Intent com escrow
3. Cliente paga → dinheiro fica com Stripe (retido)
4. Após entrega confirmada → liberar para traveler (menos comissão da plataforma)

---

### 1.5 Real-time & Notificações: Supabase Realtime + Pusher (opcional)
**Decisão:** Supabase Realtime para chat; considerar Pusher para notificações push  
**Justificativa:**
- ✅ Chat em tempo real já implementado (Realtime subscriptions)
- Supabase Realtime incluso
- Pusher caso precise de notificações push para celular (futuro)

---

## 2. Modelagem de Dados (Schema PostgreSQL)

### 2.1 Diagrama Entidade-Relacionamento

```
┌─────────────────────────────────────────┐
│              User (via Supabase Auth)   │
│  id, email, created_at, last_sign_in   │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        v                     v
    ┌─────────────────┐  ┌──────────────────┐
    │   Profile       │  │   PaymentAccount │
    │ (+ metadata)    │  │  (Stripe Connect)│
    └─────────────────┘  └──────────────────┘
        │                     
        ├──────────────────┬────────────────┐
        │                  │                │
        v                  v                v
   ┌─────────┐         ┌────────┐      ┌─────────┐
   │  Trip   │         │ Order  │      │ Review  │
   └─────────┘         └────────┘      └─────────┘
        │                  │
        └──────────┬───────┘
                   v
            ┌──────────────┐
            │   Match      │
            │ (relationship)│
            └──────────────┘
                   │
                   v
            ┌──────────────┐
            │   Message    │
            │  (Chat)      │
            └──────────────┘
                   │
                   v
            ┌──────────────┐
            │  Delivery    │
            │  (Tracking)  │
            └──────────────┘
                   │
                   v
            ┌──────────────┐
            │   Payment    │
            │  (Stripe)    │
            └──────────────┘
```

---

### 2.2 Tabelas Detalhadas

#### 2.2.1 `profiles`
Estende o usuário Supabase com informações de negócio.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  
  -- Rating system
  avg_rating FLOAT DEFAULT 5.0,
  total_reviews INT DEFAULT 0,
  
  -- Onboarding
  kyc_verified BOOLEAN DEFAULT FALSE,
  kyc_verification_date TIMESTAMP,
  
  -- Stats
  trips_completed INT DEFAULT 0,
  orders_completed INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_kyc_verified ON profiles(kyc_verified);
```

**Campos críticos:**
- `kyc_verified`: Necessário antes de aceitar pagamentos
- `avg_rating`, `total_reviews`: Reputação (impacta em descoberta)

---

#### 2.2.2 `payment_accounts`
Armazena informações do Stripe Connect de cada usuário.

```sql
CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Stripe Connect
  stripe_account_id TEXT UNIQUE NOT NULL,
  stripe_connect_status TEXT CHECK (stripe_connect_status IN ('pending', 'active', 'restricted')),
  
  -- Dados bancários (criptografados no Stripe)
  bank_account_last4 TEXT,
  bank_country TEXT,
  
  -- Comissões
  commission_percentage FLOAT DEFAULT 0.1, -- 10% para plataforma
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_accounts_user_id ON payment_accounts(user_id);
CREATE INDEX idx_payment_accounts_stripe_status ON payment_accounts(stripe_connect_status);
CREATE UNIQUE INDEX idx_payment_accounts_user_id_unique ON payment_accounts(user_id);
```

---

#### 2.2.3 `trips`
Viagens criadas por usuários (traveler).

```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rota
  origin_city TEXT NOT NULL,
  origin_state TEXT,
  origin_coordinates POINT, -- Para queries de proximidade futura
  destination_city TEXT NOT NULL,
  destination_state TEXT,
  destination_coordinates POINT,
  
  -- Datas
  departure_date DATE NOT NULL,
  arrival_date DATE,
  
  -- Capacidade
  available_space_kg FLOAT,
  available_space_units INT, -- Para itens pequenos sem peso
  
  -- Extras
  notes TEXT,
  allow_fragile BOOLEAN DEFAULT TRUE,
  allow_electronics BOOLEAN DEFAULT TRUE,
  allow_valuable BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trips_traveler_id ON trips(traveler_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_route ON trips(origin_city, destination_city, departure_date);
CREATE INDEX idx_trips_dates ON trips(departure_date, arrival_date);
```

---

#### 2.2.4 `orders`
Pedidos de envio criados por usuários (requester).

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Item
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('electronics', 'documents', 'clothing', 'other')),
  product_link TEXT,
  
  -- Especificações
  size_category TEXT CHECK (size_category IN ('small', 'medium', 'large')),
  weight_kg FLOAT,
  height_cm FLOAT,
  width_cm FLOAT,
  depth_cm FLOAT,
  
  -- Rota e prazo
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  needed_by_date DATE,
  
  -- Orçamento
  budget_min FLOAT,
  budget_max FLOAT,
  budget_fixed FLOAT, -- Ou valor fixo
  
  -- Requisitos especiais
  requires_signature BOOLEAN DEFAULT FALSE,
  requires_insurance BOOLEAN DEFAULT FALSE,
  fragile BOOLEAN DEFAULT FALSE,
  
  -- Status
  status TEXT CHECK (status IN ('open', 'matched', 'completed', 'cancelled')) DEFAULT 'open',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_requester_id ON orders(requester_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_route ON orders(origin_city, destination_city, needed_by_date);
```

---

#### 2.2.5 `matches`
Relacionamento entre Trip e Order (a "conexão").

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Quem propôs
  created_by UUID NOT NULL REFERENCES profiles(id), -- traveler ou requester
  
  -- Status do match
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'completed')) DEFAULT 'pending',
  
  -- Preço acordado
  agreed_price FLOAT,
  
  -- Timeline
  accepted_at TIMESTAMP,
  completed_at TIMESTAMP,
  declined_reason TEXT,
  
  -- Rastreamento
  pickup_location TEXT,
  pickup_instructions TEXT,
  dropoff_location TEXT,
  dropoff_instructions TEXT,
  
  -- Confirmações
  traveler_confirmed_pickup BOOLEAN DEFAULT FALSE,
  traveler_confirmed_pickup_at TIMESTAMP,
  requester_confirmed_dropoff BOOLEAN DEFAULT FALSE,
  requester_confirmed_dropoff_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_matches_trip_id ON matches(trip_id);
CREATE INDEX idx_matches_order_id ON matches(order_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_by ON matches(created_by);
CREATE UNIQUE INDEX idx_matches_unique_active ON matches(trip_id, order_id) 
  WHERE status IN ('pending', 'accepted');
```

**Campos críticos:**
- `created_by`: Controla fluxo (se traveler criou match, order pending; se requester criou, trip pending)
- Confirmações: Rastreamento do delivery (pickup → dropoff)

---

#### 2.2.6 `messages`
Chat em tempo real dentro de um match.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'image', 'location')) DEFAULT 'text',
  
  -- Para imagens/attachments
  attachment_url TEXT,
  attachment_metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

---

#### 2.2.7 `reviews`
Sistema de rating e feedback pós-entrega.

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Quem está avaliando quem
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Rating
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  
  -- Aspectos específicos
  communication_rating INT,
  reliability_rating INT,
  care_of_item_rating INT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reviews_match_id ON reviews(match_id);
CREATE INDEX idx_reviews_reviewed_user_id ON reviews(reviewed_user_id);
CREATE UNIQUE INDEX idx_reviews_unique_per_match ON reviews(match_id, reviewer_id);
```

---

#### 2.2.8 `payments`
Histórico de transações (integrado com Stripe).

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  
  -- Partes
  payer_id UUID NOT NULL REFERENCES profiles(id), -- requester
  payee_id UUID NOT NULL REFERENCES profiles(id), -- traveler
  
  -- Stripe
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_transfer_id TEXT, -- Para Stripe Connect
  
  -- Valores
  amount_total FLOAT NOT NULL, -- Valor total
  amount_to_traveler FLOAT NOT NULL, -- (amount_total * (1 - commission))
  amount_commission FLOAT NOT NULL, -- (amount_total * commission)
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')) DEFAULT 'pending',
  
  -- Datas
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP,
  refunded_at TIMESTAMP
);

CREATE INDEX idx_payments_match_id ON payments(match_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_payee_id ON payments(payee_id);
CREATE INDEX idx_payments_status ON payments(status);
```

---

#### 2.2.9 `notifications`
Histórico de notificações (para logging e re-send).

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'match_created', 'payment_released', etc
  title TEXT NOT NULL,
  message TEXT,
  
  related_match_id UUID REFERENCES matches(id),
  related_order_id UUID REFERENCES orders(id),
  related_trip_id UUID REFERENCES trips(id),
  
  read BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
```

---

## 3. Row Level Security (RLS)

Implementar RLS no Supabase para segurança:

```sql
-- Profiles: Usuário pode ver/editar apenas seu próprio
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trips: Traveler pode ver/editar, orders podem ver públicas
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Travelers can view their own trips"
  ON trips FOR SELECT
  USING (auth.uid() = traveler_id);

CREATE POLICY "Anyone can view active trips for matching"
  ON trips FOR SELECT
  USING (status = 'active');

-- Similar para orders, messages, etc.
```

---

## 4. Fluxo de Matching (Algoritmo)

### 4.1 Matching Automático

**Objetivo:** Quando um Order é criado, sugerir Trips compatíveis.

```typescript
// src/utils/matching.ts (pseudo-código)
async function suggestMatches(orderId: uuid) {
  const order = await db.select().from(orders).where(eq(orders.id, orderId));
  
  // Critério: mesma origem, destino, dentro da janela de data
  const compatibleTrips = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.origin_city, order.origin_city),
        eq(trips.destination_city, order.destination_city),
        gte(trips.departure_date, order.created_at),
        lte(trips.departure_date, order.needed_by_date || addDays(new Date(), 7)),
        gt(trips.available_space_kg, order.weight_kg || 0),
        eq(trips.status, 'active')
      )
    )
    .orderBy(desc(trips.avg_rating)) // Traveler mais bem avaliado primeiro
    .limit(5);
  
  // Criar notificações para travelers dos trips compatíveis
  for (const trip of compatibleTrips) {
    await createNotification(trip.traveler_id, {
      type: 'match_suggested',
      title: `Nova encomenda para ${order.destination_city}`,
      related_order_id: orderId,
    });
  }
}
```

**Cenários de matching:**
1. **Requester cria Order** → Sugerir Trips compatíveis
2. **Traveler cria Trip** → Sugerir Orders compatíveis
3. **Traveler vê Order** → Pode expressar interesse manualmente

---

### 4.2 Scoring (Futuro)

Para melhor matching:

```
score = (
  destination_match_score * 0.4 +
  date_alignment_score * 0.3 +
  traveler_rating * 0.2 +
  price_fit_score * 0.1
)
```

---

## 5. Segurança e Pagamentos

### 5.1 Fluxo de Pagamento com Stripe Connect

```
1. Onboarding
   └─ Traveler: "Configurar Pagamentos" → Redireciona a Stripe Connect
   └─ Stripe gera account_id → Armazenar em payment_accounts

2. Order Criada & Match Aceito
   └─ Requester: "Confirmar e Pagar"
   └─ Backend: Criar Payment Intent (amount = agreed_price)
   └─ Stripe: Reter dinheiro (em escrow)

3. Delivery Em Andamento
   └─ Chat: Traveler + Requester coordinam pickup/dropoff
   └─ Confirmações: "Recebi" (requester) + "Entreguei" (traveler)

4. Após Confirmação
   └─ Backend: Calcular comissão (10%)
   └─ Stripe: Criar Transfer para stripe_account_id do traveler
   └─ Stripe: Manter comissão na plataforma

5. Fallback (Disputa)
   └─ Se requester não confirmar em 7 dias → Reembolso automático
   └─ Dispute resolution via chat/moderação
```

**Código exemplo (pseudocódigo):**

```typescript
// src/actions/payment.ts
export async function initializePayment(matchId: string, amount: number) {
  const match = await db.select().from(matches).where(eq(matches.id, matchId));
  const payee = await db.select().from(paymentAccounts).where(eq(paymentAccounts.user_id, match.trip.traveler_id));
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: 'brl',
    metadata: { matchId, orderId: match.order_id, tripId: match.trip_id },
  });
  
  await db.insert(payments).values({
    match_id: matchId,
    stripe_payment_intent_id: paymentIntent.id,
    status: 'pending',
  });
  
  return { clientSecret: paymentIntent.client_secret };
}

export async function confirmPayment(paymentIntentId: string) {
  const payment = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  if (payment.status === 'succeeded') {
    const paymentRecord = await db
      .select()
      .from(payments)
      .where(eq(payments.stripe_payment_intent_id, paymentIntentId));
    
    // Calcular comissão
    const commission = paymentRecord.amount_total * 0.1; // 10%
    const toTraveler = paymentRecord.amount_total - commission;
    
    // Criar transfer para Stripe Connect do traveler
    const transfer = await stripe.transfers.create({
      amount: Math.round(toTraveler * 100),
      currency: 'brl',
      destination: traveler_stripe_account_id,
      metadata: { matchId: paymentRecord.match_id },
    });
    
    // Atualizar payment record
    await db
      .update(payments)
      .set({
        status: 'succeeded',
        stripe_transfer_id: transfer.id,
        paid_at: new Date(),
      })
      .where(eq(payments.id, paymentRecord.id));
  }
}
```

---

### 5.2 Segurança Adicional

#### Validações
- ✅ Autenticação obrigatória (Supabase Auth)
- ✅ RLS no banco (user não vê dados de outros)
- ✅ Validação de entrada (Zod/Valibot)
- ✅ Rate limiting (Upstash ou similar)
- ✅ CORS restrito

#### Conformidade
- KYC (Know Your Customer): Perfil marcado como `kyc_verified` antes de receber pagamentos
- AML (Anti-Money Laundering): Stripe gerencia via Stripe Connect
- GDPR: Dados deletáveis (ON DELETE CASCADE)
- Refund policy: 30 dias, ou após disputa resolvida

---

## 6. APIs/Endpoints (Server Actions + Route Handlers)

### 6.1 Autenticação
- `POST /auth/signup` (já implementado)
- `POST /auth/login` (já implementado)
- `POST /auth/signout`
- `POST /auth/reset-password`

### 6.2 Perfil
- `GET /api/profile/:id` (view profile public)
- `PUT /api/profile` (update próprio)
- `GET /api/profile/reviews/:userId` (listar reviews)

### 6.3 Trips
- `POST /api/trips` (criar) - já com server action
- `GET /api/trips` (listar minhas)
- `GET /api/trips/search` (buscar compatíveis com order)
- `PUT /api/trips/:id` (editar)
- `DELETE /api/trips/:id` (cancelar)

### 6.4 Orders
- `POST /api/orders` (criar) - já com server action
- `GET /api/orders` (listar minhas)
- `GET /api/orders/search` (buscar compatíveis com trip)
- `PUT /api/orders/:id` (editar)
- `DELETE /api/orders/:id` (cancelar)

### 6.5 Matches
- `POST /api/matches` (criar/expressar interesse) - já com server action
- `GET /api/matches/:id` (view detalhe)
- `PUT /api/matches/:id` (respond: accept/decline) - já com server action
- `GET /api/matches` (listar meus matches)
- `POST /api/matches/:id/confirm-pickup` (traveler confirma)
- `POST /api/matches/:id/confirm-dropoff` (requester confirma)

### 6.6 Messages (Chat)
- `POST /api/messages` (enviar) - já com server action
- `GET /api/matches/:id/messages` (histórico)
- Real-time via Supabase Realtime (já implementado)

### 6.7 Pagamentos
- `POST /api/payments/init` (iniciar payment intent)
- `POST /api/payments/confirm` (confirmar após cliente pagar)
- `GET /api/payments/:id` (status)
- `POST /api/payments/:id/refund` (reembolsar)

### 6.8 Reviews
- `POST /api/reviews` (deixar review)
- `GET /api/reviews/user/:id` (listar reviews de um usuário)

---

## 7. Estrutura de Pastas (Proposta)

```
src/
├── app/
│   ├── api/                       # Route handlers
│   │   ├── auth/                  # Endpoints de auth
│   │   ├── trips/                 # Trips CRUD
│   │   ├── orders/                # Orders CRUD
│   │   ├── matches/               # Matches CRUD
│   │   ├── messages/              # Messages
│   │   ├── payments/              # Payment logic
│   │   └── reviews/               # Reviews
│   ├── (pages)/
│   │   ├── dashboard/             # Dashboard
│   │   ├── trips/                 # Trips pages (UI)
│   │   ├── orders/                # Orders pages (UI)
│   │   ├── matches/               # Matches pages (UI)
│   │   └── profile/               # Profile pages (UI)
│   └── layout.tsx
│
├── db/
│   ├── schema.ts                  # Drizzle schema (definição de tabelas)
│   ├── relations.ts               # Drizzle relations
│   └── index.ts                   # DB client
│
├── lib/
│   ├── stripe.ts                  # Stripe initialization
│   ├── supabase/
│   │   ├── client.ts              # Client-side Supabase
│   │   ├── server.ts              # Server-side Supabase (já existe)
│   │   └── middleware.ts          # Auth middleware (já existe)
│   ├── validations/               # Zod schemas
│   │   ├── trip.ts
│   │   ├── order.ts
│   │   ├── payment.ts
│   │   └── ...
│   └── utils/
│       ├── matching.ts            # Matching algorithm
│       ├── notifications.ts       # Notification logic
│       ├── format.ts              # Formatters
│       └── ...
│
├── actions/                       # Server Actions
│   ├── auth.ts                    # Auth actions
│   ├── trips.ts
│   ├── orders.ts
│   ├── matches.ts
│   ├── messages.ts
│   ├── payments.ts
│   └── reviews.ts
│
├── components/
│   ├── Chat.tsx                   # Chat (já existe)
│   ├── MatchCard.tsx
│   ├── TripForm.tsx
│   ├── OrderForm.tsx
│   └── ...
│
├── types/
│   ├── database.ts                # TypeScript interfaces (já existe)
│   ├── stripe.ts
│   ├── supabase.ts
│   └── ...
│
└── middleware.ts                  # Next.js middleware (já existe)
```

---

## 8. Implementação por Fases

### Fase 1: Fundação Backend (Semanas 1-2)
- [ ] Instalar Drizzle ORM + migrations
- [ ] Reescrever schema em Drizzle
- [ ] Implementar RLS policies
- [ ] Setup Stripe Connect
- [ ] Validações com Zod
- [ ] Tests unitários

### Fase 2: APIs (Semanas 3-4)
- [ ] Routes: CRUD trips, orders
- [ ] Algoritmo de matching
- [ ] Payment flow (intent + confirm)
- [ ] Webhook handlers (Stripe)
- [ ] Rate limiting

### Fase 3: Notificações & Real-time (Semana 5)
- [ ] Sistema de notificações
- [ ] Push notifications (Pusher/FCM)
- [ ] Rastreamento de delivery
- [ ] Confirmações

### Fase 4: Testes & Compliance (Semana 6)
- [ ] Testes de integração
- [ ] Segurança (OWASP)
- [ ] KYC flow
- [ ] Documentação API (Swagger/OpenAPI)

### Fase 5: Otimizações & Deploy (Semana 7)
- [ ] Caching (Redis)
- [ ] CDN para assets
- [ ] Monitoring (Sentry)
- [ ] CI/CD (GitHub Actions)

---

## 9. Dependências a Instalar

```bash
# ORM
npm install drizzle-orm drizzle-kit pg

# Validações
npm install zod

# Pagamentos
npm install stripe

# Notifications (opcional)
npm install pusher pusher-js

# Utils
npm install date-fns class-variance-authority
npm install @hookform/resolvers react-hook-form

# Tipos
npm install @types/pg --save-dev
```

---

## 10. Próximos Passos

1. **Aprovação do plano** → Feedback e ajustes
2. **Setup Drizzle** → Reescrever schema
3. **Stripe Connect** → Setup developer account
4. **Routes & Actions** → Implementar endpoints
5. **Testes** → E2E com Playwright

---

## Anexo: Comparação ORM

| Critério | Drizzle | Prisma | TypeORM |
|----------|---------|--------|---------|
| **Tamanho** | ~20KB | ~50MB | ~100KB |
| **Type Safety** | Excelente | Excelente | Bom |
| **PostgreSQL** | Suporte total | Suporte completo | Completo |
| **Migrations** | SQL/TypeScript | Prisma schema | SQL/TypeScript |
| **Query building** | Composable | Simple | Complex |
| **Learning curve** | Baixa | Baixa | Alta |
| **Comunidade** | Crescendo | Grande | Média |

---

**Preparado por:** Claude  
**Data:** 2026-07-20  
**Status:** ✅ Pronto para Aprovação
