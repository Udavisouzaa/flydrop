import { router } from 'expo-router';

import { AppHeader, EmptyState, OrderCard, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';

export default function TrackingScreen() {
  const { user, orders } = useApp();
  const active = orders.filter((order) =>
    (order.requesterId === user?.id || order.travelerId === user?.id) &&
    !['aguardando_viajante', 'cancelado', 'concluido'].includes(order.status));
  return (
    <Screen>
      <AppHeader title="Acompanhar" subtitle="Tudo que está em movimento" />
      {active.map((order) => <OrderCard key={order.id} order={order} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })} />)}
      {!active.length ? <EmptyState icon="map-pin" title="Nenhuma entrega em andamento" body="Quando um match avançar, o acompanhamento aparecerá aqui." /> : null}
    </Screen>
  );
}
