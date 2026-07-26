import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, Button, Screen, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrder, payConnectionFee } = useApp();
  const order = getOrder(id);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [processing, setProcessing] = useState(false);
  if (!order) return <Screen><AppHeader title="Pagamento" back /><Text>Pedido não encontrado.</Text></Screen>;
  const orderId = order.id;

  function pay() {
    setProcessing(true);
    setTimeout(() => {
      payConnectionFee(orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      router.replace({ pathname: '/pedido/[id]', params: { id: orderId } });
    }, 1200);
  }

  return (
    <Screen>
      <AppHeader title="Liberar conexão" subtitle="Pagamento simulado" back />
      <View style={styles.total}><Text style={styles.totalLabel}>Taxa única LevAí</Text><Text style={styles.totalValue}>{formatMoney(order.connectionFee)}</Text><Text style={styles.totalBody}>Após a confirmação, você acessa o chat e os dados completos do viajante.</Text></View>
      <Text style={styles.section}>Forma de pagamento</Text>
      <TouchableOpacity onPress={() => setMethod('pix')} style={[styles.method, method === 'pix' && styles.methodActive]}><View style={styles.methodIcon}><Feather name="zap" size={20} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.methodTitle}>Pix</Text><Text style={styles.methodBody}>Confirmação imediata · simulação</Text></View>{method === 'pix' ? <Feather name="check-circle" size={20} color={colors.primary} /> : null}</TouchableOpacity>
      <TouchableOpacity onPress={() => setMethod('card')} style={[styles.method, method === 'card' && styles.methodActive]}><View style={styles.methodIcon}><Feather name="credit-card" size={20} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.methodTitle}>Cartão de crédito</Text><Text style={styles.methodBody}>Pagamento de teste · sem cobrança real</Text></View>{method === 'card' ? <Feather name="check-circle" size={20} color={colors.primary} /> : null}</TouchableOpacity>
      <View style={styles.secure}><Feather name="lock" size={16} color={colors.muted} /><Text style={styles.secureText}>Este MVP não coleta nem transmite dados financeiros.</Text></View>
      {processing ? <View style={styles.processing}><ActivityIndicator color={colors.primary} /><Text style={styles.processingText}>Confirmando pagamento...</Text></View> : <Button label={`Pagar ${formatMoney(order.connectionFee)}`} icon="lock" onPress={pay} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  total: { borderRadius: 22, padding: 21, backgroundColor: colors.text },
  totalLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: '#BFC1C5' },
  totalValue: { fontFamily: 'Inter_700Bold', fontSize: 33, color: colors.yellow, marginTop: 6 },
  totalBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: '#BFC1C5', marginTop: 13 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text, marginTop: 24, marginBottom: 12 },
  method: { minHeight: 70, borderRadius: 17, padding: 13, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 10 },
  methodActive: { borderColor: colors.primary, backgroundColor: colors.successSoft },
  methodIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text },
  methodBody: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.muted, marginTop: 4 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginVertical: 20 },
  secureText: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.muted },
  processing: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  processingText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.primaryDark },
});
