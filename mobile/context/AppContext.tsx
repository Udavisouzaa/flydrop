import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export const CITIES = [
  { city: 'São Paulo', uf: 'SP', airports: ['CGH – Congonhas', 'GRU – Guarulhos'] },
  { city: 'Brasília', uf: 'DF', airports: ['BSB – Brasília'] },
  { city: 'Porto Alegre', uf: 'RS', airports: ['POA – Salgado Filho'] },
  { city: 'Florianópolis', uf: 'SC', airports: ['FLN – Hercílio Luz'] },
  { city: 'Confins', uf: 'MG', airports: ['CNF – Belo Horizonte / Confins'] },
] as const;

export const AIRPORT_OPTIONS = [
  { city: 'São Paulo', code: 'GRU', label: 'São Paulo – Guarulhos (GRU)' },
  { city: 'São Paulo', code: 'CGH', label: 'São Paulo – Congonhas (CGH)' },
  { city: 'Brasília', code: 'BSB', label: 'Brasília (BSB)' },
  { city: 'Porto Alegre', code: 'POA', label: 'Porto Alegre (POA)' },
  { city: 'Florianópolis', code: 'FLN', label: 'Florianópolis (FLN)' },
  { city: 'Confins', code: 'CNF', label: 'Belo Horizonte – Confins (CNF)' },
] as const;

const CITY_ALIASES: Record<string, string> = {
  'sao paulo': 'São Paulo',
  'sao paulo - guarulhos': 'São Paulo',
  'sao paulo - congonhas': 'São Paulo',
  guarulhos: 'São Paulo',
  cgh: 'São Paulo',
  gru: 'São Paulo',
  brasilia: 'Brasília',
  bsb: 'Brasília',
  'porto alegre': 'Porto Alegre',
  poa: 'Porto Alegre',
  florianopolis: 'Florianópolis',
  fln: 'Florianópolis',
  confins: 'Confins',
  'belo horizonte': 'Confins',
  cnf: 'Confins',
};

export function normalizeCity(value: string) {
  const key = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  const airportCode = key.match(/\b(cgh|gru|bsb|poa|fln|cnf)\b/)?.[1];
  if (airportCode) return CITY_ALIASES[airportCode] ?? value.trim();
  return CITY_ALIASES[key] ?? value.trim();
}

export type OrderStatus =
  | 'aguardando_viajante'
  | 'viajante_interessado'
  | 'match_confirmado'
  | 'aguardando_pagamento'
  | 'aguardando_retirada'
  | 'item_retirado'
  | 'em_viagem'
  | 'entregue'
  | 'concluido'
  | 'cancelado';

export type HandoffPreference = 'aeroporto' | 'fora_aeroporto' | 'flexivel';

export type User = {
  id: string;
  name: string;
  abbreviatedName: string;
  email: string;
  phone: string;
  city: string;
  rating: number;
  completedDeliveries: number;
  completedOrders: number;
  isVerified: boolean;
};

export type Order = {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterRating: number;
  travelerId?: string;
  travelerName?: string;
  travelerRating?: number;
  itemName: string;
  category: string;
  description: string;
  brand?: string;
  model?: string;
  itemCondition?: string;
  photoUris?: string[];
  supportingDocument?: {
    uri: string;
    name: string;
    mimeType?: string;
  };
  declaredValue: number;
  weight: string;
  size: 'Pequeno' | 'Médio' | 'Grande';
  originCity: string;
  destinationCity: string;
  pickupHandoffPreference: HandoffPreference;
  deliveryHandoffPreference: HandoffPreference;
  pickupAddress: string;
  pickupContactName: string;
  pickupContactPhone: string;
  deliveryAddress: string;
  deliveryContactName: string;
  deliveryContactPhone: string;
  deadlineDate: string;
  deadlineTime: string;
  orderType: 'comum' | 'urgente';
  suggestedValue: number;
  contentInspectionAccepted: boolean;
  transportComplianceAccepted: boolean;
  declarationsAcceptedAt: string;
  connectionFee: number;
  proposedValue?: number;
  status: OrderStatus;
  connectionUnlocked: boolean;
  pickupCode: string;
  deliveryCode: string;
  createdAt: string;
};

export type CreateOrderInput = Omit<
  Order,
  | 'id'
  | 'requesterId'
  | 'requesterName'
  | 'requesterRating'
  | 'connectionFee'
  | 'status'
  | 'connectionUnlocked'
  | 'pickupCode'
  | 'deliveryCode'
  | 'declarationsAcceptedAt'
  | 'createdAt'
>;

export type Trip = {
  id: string;
  travelerId: string;
  travelerName: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
  departureTime: string;
  arrivalTime: string;
  airline?: string;
  flightNumber?: string;
  availableSpace: string;
  maxWeightKg: number;
  acceptedCategories: string[];
  acceptsOffAirportHandoff: boolean;
  minValue: number;
  status: 'ativa' | 'concluida';
  createdAt: string;
};

export type CreateTripInput = Omit<Trip, 'id' | 'travelerId' | 'travelerName' | 'status' | 'createdAt'>;

export type Message = {
  id: string;
  orderId: string;
  senderId: string;
  text: string;
  isAuto: boolean;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  type: 'novo_pedido' | 'pedido_aceito' | 'conexao_liberada' | 'mensagem';
  title: string;
  body: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  aguardando_viajante: 'Buscando viajante',
  viajante_interessado: 'Proposta recebida',
  match_confirmado: 'Match confirmado',
  aguardando_pagamento: 'Aguardando pagamento',
  aguardando_retirada: 'Aguardando retirada',
  item_retirado: 'Item retirado',
  em_viagem: 'Em viagem',
  entregue: 'Entregue',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function code() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function abbreviatedName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)?.charAt(0)}.` : parts[0];
}

function orderRequiresOffAirport(order: Pick<Order, 'pickupHandoffPreference' | 'deliveryHandoffPreference'>) {
  return order.pickupHandoffPreference === 'fora_aeroporto' || order.deliveryHandoffPreference === 'fora_aeroporto';
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'avail-1',
    requesterId: 'requester-joao',
    requesterName: 'João P.',
    requesterRating: 4.8,
    itemName: 'Livros universitários',
    category: 'Livros',
    description: 'Três livros embalados e sem itens frágeis.',
    photoUris: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80'],
    declaredValue: 240,
    weight: '2 kg',
    size: 'Médio',
    originCity: 'Brasília',
    destinationCity: 'Florianópolis',
    pickupHandoffPreference: 'aeroporto',
    deliveryHandoffPreference: 'aeroporto',
    pickupAddress: 'Asa Sul, Brasília',
    pickupContactName: 'João',
    pickupContactPhone: '(61) 99999-0001',
    deliveryAddress: 'Centro, Florianópolis',
    deliveryContactName: 'Luiza',
    deliveryContactPhone: '(48) 99999-0002',
    deadlineDate: '22/07/2026',
    deadlineTime: '18:00',
    orderType: 'comum',
    suggestedValue: 60,
    contentInspectionAccepted: true,
    transportComplianceAccepted: true,
    declarationsAcceptedAt: '2026-07-16T09:00:00.000Z',
    connectionFee: 19.9,
    status: 'aguardando_viajante',
    connectionUnlocked: false,
    pickupCode: '4821',
    deliveryCode: '7314',
    createdAt: '2026-07-16T09:00:00.000Z',
  },
  {
    id: 'avail-2',
    requesterId: 'requester-roberto',
    requesterName: 'Roberto A.',
    requesterRating: 4.6,
    itemName: 'Óculos e carregador',
    category: 'Acessórios eletrônicos',
    description: 'Óculos em estojo rígido e carregador USB-C.',
    photoUris: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=300&q=80'],
    declaredValue: 430,
    weight: '0,5 kg',
    size: 'Pequeno',
    originCity: 'São Paulo - Guarulhos',
    destinationCity: 'Florianópolis',
    pickupHandoffPreference: 'aeroporto',
    deliveryHandoffPreference: 'aeroporto',
    pickupAddress: 'Próximo ao aeroporto de Guarulhos',
    pickupContactName: 'Roberto',
    pickupContactPhone: '(11) 99999-0003',
    deliveryAddress: 'Trindade, Florianópolis',
    deliveryContactName: 'Caio',
    deliveryContactPhone: '(48) 99999-0004',
    deadlineDate: '19/07/2026',
    deadlineTime: '20:00',
    orderType: 'urgente',
    suggestedValue: 80,
    contentInspectionAccepted: true,
    transportComplianceAccepted: true,
    declarationsAcceptedAt: '2026-07-16T10:00:00.000Z',
    connectionFee: 39.9,
    status: 'aguardando_viajante',
    connectionUnlocked: false,
    pickupCode: '1348',
    deliveryCode: '9952',
    createdAt: '2026-07-16T10:00:00.000Z',
  },
  {
    id: 'avail-3',
    requesterId: 'requester-maria',
    requesterName: 'Maria S.',
    requesterRating: 4.9,
    itemName: 'Envelope de documentos',
    category: 'Documentos simples',
    description: 'Cópias autenticadas dentro de envelope lacrado.',
    photoUris: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=300&q=80'],
    declaredValue: 80,
    weight: '0,2 kg',
    size: 'Pequeno',
    originCity: 'Florianópolis',
    destinationCity: 'São Paulo',
    pickupHandoffPreference: 'aeroporto',
    deliveryHandoffPreference: 'aeroporto',
    pickupAddress: 'Centro, Florianópolis',
    pickupContactName: 'Maria',
    pickupContactPhone: '(48) 99999-0005',
    deliveryAddress: 'Pinheiros, São Paulo',
    deliveryContactName: 'Bia',
    deliveryContactPhone: '(11) 99999-0006',
    deadlineDate: '24/07/2026',
    deadlineTime: '12:00',
    orderType: 'comum',
    suggestedValue: 50,
    contentInspectionAccepted: true,
    transportComplianceAccepted: true,
    declarationsAcceptedAt: '2026-07-16T11:00:00.000Z',
    connectionFee: 19.9,
    status: 'aguardando_viajante',
    connectionUnlocked: false,
    pickupCode: '8237',
    deliveryCode: '4205',
    createdAt: '2026-07-16T11:00:00.000Z',
  },
];

type LoginInput = { name: string; email: string; phone: string; city: string };

type AppContextValue = {
  hydrated: boolean;
  user: User | null;
  orders: Order[];
  trips: Trip[];
  messages: Message[];
  notifications: AppNotification[];
  unreadCount: number;
  login: (input: LoginInput) => void;
  logout: () => void;
  createOrder: (input: CreateOrderInput) => Order;
  updateOrder: (orderId: string, input: CreateOrderInput) => void;
  createTrip: (input: CreateTripInput) => Trip;
  sendProposal: (orderId: string, value: number) => boolean;
  acceptProposal: (orderId: string) => void;
  payConnectionFee: (orderId: string) => void;
  confirmPickup: (orderId: string, codeValue: string) => boolean;
  markInTransit: (orderId: string) => void;
  confirmDelivery: (orderId: string, codeValue: string) => boolean;
  finishOrder: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  sendMessage: (orderId: string, text: string) => void;
  markNotificationsRead: () => void;
  getOrder: (id: string) => Order | undefined;
};

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE = {
  user: '@levai/user',
  orders: '@levai/orders',
  trips: '@levai/trips',
  messages: '@levai/messages',
  notifications: '@levai/notifications',
};

export function AppProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    AsyncStorage.multiGet(Object.values(STORAGE))
      .then((entries) => {
        const saved = Object.fromEntries(entries);
        const savedUser = saved[STORAGE.user];
        const savedOrders = saved[STORAGE.orders];
        const savedTrips = saved[STORAGE.trips];
        const savedMessages = saved[STORAGE.messages];
        const savedNotifications = saved[STORAGE.notifications];
        if (savedUser) setUser(JSON.parse(savedUser));
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        if (savedTrips) setTrips(JSON.parse(savedTrips));
        if (savedMessages) setMessages(JSON.parse(savedMessages));
        if (savedNotifications) setNotifications(JSON.parse(savedNotifications));
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const entries: [string, string][] = [
      [STORAGE.orders, JSON.stringify(orders)],
      [STORAGE.trips, JSON.stringify(trips)],
      [STORAGE.messages, JSON.stringify(messages)],
      [STORAGE.notifications, JSON.stringify(notifications)],
    ];
    if (user) entries.push([STORAGE.user, JSON.stringify(user)]);
    AsyncStorage.multiSet(entries).catch(() => undefined);
    if (!user) AsyncStorage.removeItem(STORAGE.user).catch(() => undefined);
  }, [hydrated, messages, notifications, orders, trips, user]);

  const pushNotification = useCallback((notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    setNotifications((current) => [
      {
        ...notification,
        id: uid('notification'),
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }, []);

  const login = useCallback((input: LoginInput) => {
    setUser({
      id: uid('user'),
      name: input.name.trim(),
      abbreviatedName: abbreviatedName(input.name),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      city: normalizeCity(input.city),
      rating: 5,
      completedDeliveries: 0,
      completedOrders: 0,
      isVerified: false,
    });
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const createOrder = useCallback(
    (input: CreateOrderInput) => {
      if (!user) throw new Error('Faça login para publicar um pedido.');
      const order: Order = {
        ...input,
        id: uid('order'),
        requesterId: user.id,
        requesterName: user.abbreviatedName,
        requesterRating: user.rating,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        connectionFee: input.orderType === 'urgente' ? 39.9 : 19.9,
        status: 'aguardando_viajante',
        connectionUnlocked: false,
        pickupCode: code(),
        deliveryCode: code(),
        declarationsAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setOrders((current) => [order, ...current]);
      const matching = trips.filter(
        (trip) =>
          normalizeCity(trip.originCity) === normalizeCity(order.originCity) &&
          normalizeCity(trip.destinationCity) === normalizeCity(order.destinationCity) &&
          (!orderRequiresOffAirport(order) || trip.acceptsOffAirportHandoff) &&
          trip.status === 'ativa',
      );
      if (matching.length) {
        pushNotification({
          type: 'novo_pedido',
          title: 'Encontramos uma viagem compatível',
          body: `${matching.length} viajante(s) fazem a rota ${order.originCity} → ${order.destinationCity}.`,
          orderId: order.id,
        });
      }
      return order;
    },
    [pushNotification, trips, user],
  );

  const createTrip = useCallback(
    (input: CreateTripInput) => {
      if (!user) throw new Error('Faça login para cadastrar uma viagem.');
      const trip: Trip = {
        ...input,
        id: uid('trip'),
        travelerId: user.id,
        travelerName: user.abbreviatedName,
        originCity: input.originCity,
        destinationCity: input.destinationCity,
        status: 'ativa',
        createdAt: new Date().toISOString(),
      };
      setTrips((current) => [trip, ...current]);
      const matches = orders.filter(
        (order) =>
          order.status === 'aguardando_viajante' &&
          order.requesterId !== user.id &&
          normalizeCity(order.originCity) === normalizeCity(trip.originCity) &&
          normalizeCity(order.destinationCity) === normalizeCity(trip.destinationCity) &&
          (!orderRequiresOffAirport(order) || trip.acceptsOffAirportHandoff),
      );
      if (matches.length) {
        pushNotification({
          type: 'novo_pedido',
          title: 'Pedidos na sua rota',
          body: `${matches.length} pedido(s) combinam com a viagem cadastrada.`,
        });
      }
      return trip;
    },
    [orders, pushNotification, user],
  );

  const patchOrder = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, ...patch } : order)));
  }, []);

  const updateOrder = useCallback(
    (orderId: string, input: CreateOrderInput) => {
      if (!user) return;
      setOrders((current) => current.map((order) => {
        if (order.id !== orderId || order.requesterId !== user.id || order.status !== 'aguardando_viajante') return order;
        return {
          ...order,
          ...input,
          connectionFee: input.orderType === 'urgente' ? 39.9 : 19.9,
          declarationsAcceptedAt: new Date().toISOString(),
        };
      }));
    },
    [user],
  );

  const sendProposal = useCallback(
    (orderId: string, value: number) => {
      if (!user) return false;
      const order = orders.find((item) => item.id === orderId);
      if (!order) return false;
      const travelerRouteTrips = trips.filter(
        (trip) =>
          trip.travelerId === user.id &&
          trip.status === 'ativa' &&
          normalizeCity(trip.originCity) === normalizeCity(order.originCity) &&
          normalizeCity(trip.destinationCity) === normalizeCity(order.destinationCity),
      );
      if (orderRequiresOffAirport(order) && travelerRouteTrips.length > 0 && !travelerRouteTrips.some((trip) => trip.acceptsOffAirportHandoff)) {
        return false;
      }
      patchOrder(orderId, {
        travelerId: user.id,
        travelerName: user.abbreviatedName,
        travelerRating: user.rating,
        proposedValue: value,
        status: 'viajante_interessado',
      });
      pushNotification({
        type: 'pedido_aceito',
        title: 'Proposta enviada',
        body: 'O solicitante já pode revisar sua proposta.',
        orderId,
      });
      return true;
    },
    [orders, patchOrder, pushNotification, trips, user],
  );

  const acceptProposal = useCallback(
    (orderId: string) => patchOrder(orderId, { status: 'aguardando_pagamento' }),
    [patchOrder],
  );

  const payConnectionFee = useCallback(
    (orderId: string) => {
      patchOrder(orderId, { status: 'aguardando_retirada', connectionUnlocked: true });
      pushNotification({
        type: 'conexao_liberada',
        title: 'Conexão liberada',
        body: 'Chat e dados de contato agora estão disponíveis.',
        orderId,
      });
      setMessages((current) => [
        ...current,
        {
          id: uid('message'),
          orderId,
          senderId: 'system',
          text: 'Conexão liberada. Combinem a retirada e a entrega com segurança.',
          isAuto: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [patchOrder, pushNotification],
  );

  const confirmPickup = useCallback(
    (orderId: string, codeValue: string) => {
      const order = orders.find((item) => item.id === orderId);
      if (!order || order.pickupCode !== codeValue.trim()) return false;
      patchOrder(orderId, { status: 'item_retirado' });
      return true;
    },
    [orders, patchOrder],
  );

  const markInTransit = useCallback((orderId: string) => patchOrder(orderId, { status: 'em_viagem' }), [patchOrder]);

  const confirmDelivery = useCallback(
    (orderId: string, codeValue: string) => {
      const order = orders.find((item) => item.id === orderId);
      if (!order || order.deliveryCode !== codeValue.trim()) return false;
      patchOrder(orderId, { status: 'entregue' });
      return true;
    },
    [orders, patchOrder],
  );

  const finishOrder = useCallback((orderId: string) => patchOrder(orderId, { status: 'concluido' }), [patchOrder]);
  const cancelOrder = useCallback((orderId: string) => patchOrder(orderId, { status: 'cancelado' }), [patchOrder]);

  const sendMessage = useCallback(
    (orderId: string, text: string) => {
      if (!user || !text.trim()) return;
      setMessages((current) => [
        ...current,
        {
          id: uid('message'),
          orderId,
          senderId: user.id,
          text: text.trim(),
          isAuto: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [user],
  );

  const markNotificationsRead = useCallback(
    () => setNotifications((current) => current.map((item) => ({ ...item, read: true }))),
    [],
  );
  const getOrder = useCallback((id: string) => orders.find((order) => order.id === id), [orders]);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      user,
      orders,
      trips,
      messages,
      notifications,
      unreadCount: notifications.filter((item) => !item.read).length,
      login,
      logout,
      createOrder,
      updateOrder,
      createTrip,
      sendProposal,
      acceptProposal,
      payConnectionFee,
      confirmPickup,
      markInTransit,
      confirmDelivery,
      finishOrder,
      cancelOrder,
      sendMessage,
      markNotificationsRead,
      getOrder,
    }),
    [
      acceptProposal,
      cancelOrder,
      confirmDelivery,
      confirmPickup,
      createOrder,
      createTrip,
      finishOrder,
      getOrder,
      hydrated,
      login,
      logout,
      markInTransit,
      markNotificationsRead,
      messages,
      notifications,
      orders,
      payConnectionFee,
      sendMessage,
      sendProposal,
      trips,
      updateOrder,
      user,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa estar dentro de AppProvider.');
  return value;
}

export function getUserLevel(deliveries: number) {
  if (deliveries >= 50) return 'Diamante';
  if (deliveries >= 20) return 'Ouro';
  if (deliveries >= 5) return 'Prata';
  return 'Bronze';
}
