import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, EmptyState, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function NotificationsScreen() {
  const { notifications, markNotificationsRead } = useApp();
  useEffect(() => { markNotificationsRead(); }, [markNotificationsRead]);
  return (
    <Screen>
      <AppHeader title="Notificações" subtitle="Atualizações dos seus pedidos e viagens" back />
      {notifications.map((item) => (
        <TouchableOpacity key={item.id} style={styles.item} onPress={() => item.orderId && router.push({ pathname: '/pedido/[id]', params: { id: item.orderId } })}>
          <View style={styles.icon}><Feather name={item.type === 'mensagem' ? 'message-circle' : item.type === 'novo_pedido' ? 'search' : 'bell'} size={19} color={colors.primaryDark} /></View>
          <View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text><Text style={styles.body}>{item.body}</Text><Text style={styles.date}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text></View>
        </TouchableOpacity>
      ))}
      {!notifications.length ? <EmptyState icon="bell" title="Tudo em dia" body="Novos matches, propostas e mensagens aparecerão aqui." /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, padding: 15, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text },
  body: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 3 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 8, color: '#999CA1', marginTop: 6 },
});
