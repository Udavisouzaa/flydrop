import { router } from 'expo-router';

import { AppHeader, Button, EmptyState, OrderCard, Screen } from '@/components/ui';
import { useApp } from '@/context/AppContext';

export default function OrdersScreen() {
  const { user, orders } = useApp();
  const mine = orders.filter((order) => order.requesterId === user?.id);
  return (
    <Screen>
      <AppHeader title="Meus pedidos" subtitle={`${mine.length} pedido(s) publicado(s)`} />
      {mine.map((order) => <OrderCard key={order.id} order={order} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })} />)}
      {!mine.length ? <><EmptyState icon="package" title="Você ainda não publicou" body="Criar um pedido é grátis. A taxa só é cobrada quando houver conexão." /><Button label="Criar primeiro pedido" icon="plus" onPress={() => router.push('/criar-pedido')} /></> : null}
    </Screen>
  );
}
