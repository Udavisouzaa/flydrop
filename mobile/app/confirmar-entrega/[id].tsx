import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Button, Screen, TextField } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function ConfirmDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, getOrder, confirmDelivery } = useApp();
  const order = getOrder(id);
  const [value, setValue] = useState('');
  if (!order) return <Screen><AppHeader title="Confirmar entrega" back /><Text>Pedido não encontrado.</Text></Screen>;
  const requester = order.requesterId === user?.id;

  function confirm() {
    if (!confirmDelivery(id, value)) { Alert.alert('Código incorreto', 'Confira os quatro dígitos com quem recebeu o item.'); return; }
    router.replace({ pathname: '/pedido/[id]', params: { id } });
  }

  return (
    <Screen>
      <AppHeader title="Confirmar entrega" subtitle={order.destinationCity} back />
      <View style={styles.icon}><Feather name="check-circle" size={32} color={colors.primaryDark} /></View>
      <Text style={styles.title}>{requester ? 'Código de entrega' : 'Conclua a entrega'}</Text>
      <Text style={styles.body}>{requester ? 'Compartilhe este código somente quando o destinatário estiver com o item.' : 'Depois que o destinatário receber e conferir, peça o código de quatro dígitos.'}</Text>
      {requester ? <View style={styles.code}>{order.deliveryCode.split('').map((digit, index) => <View key={`${digit}-${index}`} style={styles.digit}><Text style={styles.digitText}>{digit}</Text></View>)}</View> : <TextField label="Código de entrega" value={value} onChangeText={(text) => setValue(text.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0000" />}
      <View style={styles.confirmation}><Feather name="shield" size={18} color={colors.primaryDark} /><Text style={styles.confirmationText}>A confirmação registra a entrega localmente neste dispositivo.</Text></View>
      {!requester ? <Button label="Confirmar entrega" icon="check" disabled={value.length !== 4} onPress={confirm} /> : <Button label="Voltar ao pedido" variant="secondary" onPress={() => router.back()} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 66, height: 66, borderRadius: 21, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text, marginTop: 20 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.muted, marginTop: 8, marginBottom: 26 },
  code: { flexDirection: 'row', gap: 9, marginBottom: 24 },
  digit: { flex: 1, height: 68, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  digitText: { fontFamily: 'Inter_700Bold', fontSize: 27, color: colors.text },
  confirmation: { flexDirection: 'row', gap: 9, backgroundColor: colors.successSoft, borderRadius: 15, padding: 14, marginVertical: 18 },
  confirmationText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 16, color: colors.primaryDark },
});
