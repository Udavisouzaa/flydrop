import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Button, Screen, TextField } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function ConfirmPickupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, getOrder, confirmPickup } = useApp();
  const order = getOrder(id);
  const [value, setValue] = useState('');
  if (!order) return <Screen><AppHeader title="Confirmar retirada" back /><Text>Pedido não encontrado.</Text></Screen>;
  const requester = order.requesterId === user?.id;

  function confirm() {
    if (!confirmPickup(id, value)) { Alert.alert('Código incorreto', 'Confira os quatro dígitos com o solicitante.'); return; }
    router.replace({ pathname: '/pedido/[id]', params: { id } });
  }

  return (
    <Screen>
      <AppHeader title="Confirmar retirada" subtitle={order.itemName} back />
      <View style={styles.icon}><Feather name="package" size={31} color={colors.primaryDark} /></View>
      <Text style={styles.title}>{requester ? 'Mostre o código ao viajante' : 'Digite o código da retirada'}</Text>
      <Text style={styles.body}>{requester ? 'Entregue o item somente após conferir a identidade e o conteúdo com o viajante.' : 'Peça ao solicitante o código de quatro dígitos depois de conferir e receber o item.'}</Text>
      {requester ? <View style={styles.code}>{order.pickupCode.split('').map((digit, index) => <View key={`${digit}-${index}`} style={styles.digit}><Text style={styles.digitText}>{digit}</Text></View>)}</View> : <TextField label="Código de retirada" value={value} onChangeText={(text) => setValue(text.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="0000" />}
      <View style={styles.warning}><Feather name="alert-triangle" size={18} color={colors.orange} /><Text style={styles.warningText}>Nunca confirme antes de o item trocar de mãos. Esta versão usa código numérico; leitura por QR ainda não está integrada.</Text></View>
      {!requester ? <Button label="Confirmar item retirado" icon="check" disabled={value.length !== 4} onPress={confirm} /> : <Button label="Voltar ao pedido" variant="secondary" onPress={() => router.back()} />}
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
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colors.orangeSoft, borderRadius: 16, padding: 14, marginVertical: 18 },
  warningText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 16, color: '#80401F' },
});
