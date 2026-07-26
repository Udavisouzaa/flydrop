import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, Button, Chip, IconButton, OrderCard, Screen, SectionTitle, Segmented, SelectField } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CITIES, normalizeCity, useApp } from '@/context/AppContext';

const categories = ['Documentos', 'Eletrônicos', 'Livros', 'Presentes'];

export default function HomeScreen() {
  const { user, orders, unreadCount } = useApp();
  const [mode, setMode] = useState('enviar');
  const [origin, setOrigin] = useState(user?.city ?? 'Florianópolis');
  const [destination, setDestination] = useState('São Paulo');
  const cityOptions = CITIES.map((item) => item.city);
  const recent = useMemo(() => orders.filter((order) => order.requesterId === user?.id).slice(0, 2), [orders, user?.id]);

  function go() {
    const route = mode === 'enviar' ? '/criar-pedido' : '/cadastrar-viagem';
    router.push({ pathname: route, params: { origin, destination } });
  }

  return (
    <Screen>
      <AppHeader
        title={`Olá, ${user?.name.split(' ')[0] ?? 'viajante'}!`}
        subtitle="Para onde vamos hoje?"
        right={<IconButton icon="bell" badge={unreadCount} onPress={() => router.push('/notificacoes')} />}
      />
      <Segmented
        value={mode}
        onChange={setMode}
        options={[{ label: 'Quero enviar', value: 'enviar' }, { label: 'Quero levar', value: 'levar' }]}
      />

      <View style={[styles.hero, mode === 'levar' && styles.heroDark]}>
        <View style={styles.heroTop}>
          <View style={[styles.heroIcon, mode === 'levar' && styles.heroIconDark]}>
            <Feather name={mode === 'enviar' ? 'package' : 'briefcase'} size={23} color={mode === 'enviar' ? colors.text : colors.yellow} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={[styles.heroTitle, mode === 'levar' && styles.heroTextLight]}>{mode === 'enviar' ? 'Envie de um jeito mais humano' : 'Transforme espaço em oportunidade'}</Text>
            <Text style={[styles.heroBody, mode === 'levar' && styles.heroMutedLight]}>{mode === 'enviar' ? 'Conecte-se com alguém que já vai para o seu destino.' : 'Cadastre sua rota e escolha o que faz sentido levar.'}</Text>
          </View>
        </View>
        <View style={styles.routeBox}>
          <SelectField label="Saindo de" value={origin} placeholder="Origem" options={cityOptions} onSelect={setOrigin} />
          <TouchableOpacity style={styles.swap} onPress={() => { setOrigin(destination); setDestination(origin); }}>
            <Feather name="repeat" size={17} color={colors.primaryDark} />
          </TouchableOpacity>
          <SelectField label="Indo para" value={destination} placeholder="Destino" options={cityOptions.filter((city) => city !== origin)} onSelect={setDestination} />
        </View>
        <Button label={mode === 'enviar' ? 'Criar pedido grátis' : 'Cadastrar minha viagem'} icon="arrow-right" variant={mode === 'enviar' ? 'dark' : 'primary'} disabled={!origin || !destination || origin === destination} onPress={go} />
      </View>

      <SectionTitle title="Atalhos por categoria" />
      <View style={styles.chips}>{categories.map((category) => <Chip key={category} label={category} onPress={() => router.push({ pathname: '/criar-pedido', params: { category, origin, destination } })} />)}</View>

      <SectionTitle title={recent.length ? 'Seus pedidos recentes' : 'Pedidos na rota'} action="Ver todos" onAction={() => router.push('/(tabs)/pedidos')} />
      {(recent.length ? recent : orders.filter((order) => order.status === 'aguardando_viajante').slice(0, 2)).map((order) => (
        <OrderCard key={order.id} order={order} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: order.id } })} />
      ))}

      <TouchableOpacity style={styles.safety} onPress={() => undefined}>
        <View style={styles.safetyIcon}><Feather name="shield" size={20} color={colors.primaryDark} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.safetyTitle}>Leve e envie com segurança</Text>
          <Text style={styles.safetyBody}>Confira os itens permitidos antes de combinar.</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.muted} />
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 18, backgroundColor: colors.yellow },
  heroDark: { backgroundColor: colors.text },
  heroTop: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  heroIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#FFFFFF80', alignItems: 'center', justifyContent: 'center' },
  heroIconDark: { backgroundColor: '#FFFFFF16' },
  heroCopy: { flex: 1 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 23, color: colors.text },
  heroTextLight: { color: '#fff' },
  heroBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, color: '#4B461E', marginTop: 4 },
  heroMutedLight: { color: '#BFC1C5' },
  routeBox: { backgroundColor: colors.background, borderRadius: 18, padding: 14, paddingBottom: 0, marginBottom: 13 },
  swap: { zIndex: 2, position: 'absolute', right: 20, top: 77, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safety: { marginTop: 13, borderRadius: 17, backgroundColor: colors.card, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border },
  safetyIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  safetyTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text },
  safetyBody: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted, marginTop: 3 },
});
