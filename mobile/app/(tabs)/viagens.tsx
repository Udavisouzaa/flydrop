import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, Button, EmptyState, OrderCard, Screen, Segmented, SelectField, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CITIES, normalizeCity, useApp } from '@/context/AppContext';

export default function TripsScreen() {
  const { user, orders, trips } = useApp();
  const [mode, setMode] = useState('disponiveis');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const cities = CITIES.map((item) => item.city);
  const available = useMemo(
    () => orders.filter((order) =>
      order.requesterId !== user?.id &&
      order.status === 'aguardando_viajante' &&
      (!origin || normalizeCity(order.originCity) === origin) &&
      (!destination || normalizeCity(order.destinationCity) === destination))
      .sort((first, second) => Number(second.orderType === 'urgente') - Number(first.orderType === 'urgente')),
    [destination, orders, origin, user?.id],
  );
  const myTrips = trips.filter((trip) => trip.travelerId === user?.id);

  return (
    <Screen>
      <AppHeader title="Levar" subtitle="Ganhe na rota que você já vai fazer" right={<TouchableOpacity style={styles.add} onPress={() => router.push('/cadastrar-viagem')}><Feather name="plus" size={21} color="#fff" /></TouchableOpacity>} />
      <Segmented value={mode} onChange={setMode} options={[{ label: `Pedidos (${available.length})`, value: 'disponiveis' }, { label: `Minhas viagens (${myTrips.length})`, value: 'minhas' }]} />

      {mode === 'disponiveis' ? (
        <>
          <View style={styles.filters}>
            <View style={styles.filter}><SelectField label="Origem" value={origin} placeholder="Todas" options={cities} onSelect={setOrigin} /></View>
            <View style={styles.filter}><SelectField label="Destino" value={destination} placeholder="Todos" options={cities} onSelect={setDestination} /></View>
          </View>
          {(origin || destination) ? <TouchableOpacity onPress={() => { setOrigin(''); setDestination(''); }}><Text style={styles.clear}>Limpar filtros</Text></TouchableOpacity> : null}
          <Text style={styles.result}>{available.length} pedido(s) disponível(is)</Text>
          {available.map((order) => <OrderCard key={order.id} order={order} emphasizeUrgent onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })} onProposal={() => router.push({ pathname: '/aceitar/[id]', params: { id: order.id } })} />)}
          {!available.length ? <EmptyState icon="search" title="Nenhum pedido nessa rota" body="Limpe os filtros ou cadastre sua viagem para receber novos matches." /> : null}
        </>
      ) : (
        <>
          {myTrips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.plane}><Feather name="send" size={21} color={colors.primaryDark} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripRoute}>{trip.originCity} → {trip.destinationCity}</Text>
                <Text style={styles.tripMeta}>{trip.departureDate}, {trip.departureTime}–{trip.arrivalTime}{trip.airline || trip.flightNumber ? ` · ${[trip.airline, trip.flightNumber].filter(Boolean).join(' ')}` : ''}</Text>
                <Text style={styles.tripMeta}>{trip.availableSpace} · até {trip.maxWeightKg} kg · mín. {formatMoney(trip.minValue)}</Text>
                <Text style={styles.tripMeta}>{trip.acceptsOffAirportHandoff ? 'Aceita encontro em local combinado' : 'Encontro somente no aeroporto'}</Text>
              </View>
            </View>
          ))}
          {!myTrips.length ? (
            <>
              <EmptyState icon="send" title="Nenhuma viagem cadastrada" body="Cadastre sua próxima rota e veja pedidos que cabem na sua bagagem." />
              <Button label="Cadastrar viagem" icon="plus" onPress={() => router.push('/cadastrar-viagem')} />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 10 },
  filter: { flex: 1 },
  clear: { alignSelf: 'flex-end', fontFamily: 'Inter_600SemiBold', color: colors.primaryDark, fontSize: 12, marginTop: -6, marginBottom: 12 },
  result: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.muted, marginBottom: 10 },
  tripCard: { borderRadius: 18, padding: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', gap: 12, marginBottom: 12 },
  plane: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  tripRoute: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text, marginBottom: 6 },
  tripMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: colors.muted },
});
