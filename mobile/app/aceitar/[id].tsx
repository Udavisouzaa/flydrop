import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppHeader, Button, Screen, TextField, completeMoneyInput, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

function decimalInput(value: string) {
  const normalized = value.includes(',') ? value.replace(/\./g, '') : value.replace('.', ',');
  const numeric = normalized.replace(/[^\d,]/g, '');
  const [integer = '', ...decimalParts] = numeric.split(',');
  const decimals = decimalParts.join('').slice(0, 2);
  return decimalParts.length ? `${integer},${decimals}` : integer;
}

function numberValue(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

export default function AcceptOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getOrder, sendProposal } = useApp();
  const order = getOrder(id);
  const [value, setValue] = useState(completeMoneyInput(String(order?.suggestedValue ?? '')));
  const [checked, setChecked] = useState(false);
  if (!order) return <Screen><AppHeader title="Aceitar pedido" back /><Text>Pedido não encontrado.</Text></Screen>;
  const orderId = order.id;

  function submit() {
    const amount = numberValue(value);
    if (!amount || !checked) { Alert.alert('Confirme os dados', 'Informe seu valor e confirme que verificará o conteúdo.'); return; }
    const sent = sendProposal(orderId, amount);
    if (!sent) {
      Alert.alert('Locais incompatíveis', 'Este pedido exige retirada ou entrega fora do aeroporto, mas sua viagem está configurada para encontros somente no aeroporto.');
      return;
    }
    router.replace({ pathname: '/pedido/[id]', params: { id: orderId } });
  }

  return (
    <Screen>
      <AppHeader title="Enviar proposta" subtitle={`${order.originCity} → ${order.destinationCity}`} back />
      <View style={styles.item}><Text style={styles.itemName}>{order.itemName}</Text><Text style={styles.itemMeta}>{order.category} · {order.weight} · {order.size}</Text><Text style={styles.itemValue}>Sugestão: {formatMoney(order.suggestedValue)}</Text></View>
      <Text style={styles.title}>Quanto você cobra para levar?</Text><Text style={styles.body}>Esse valor vai direto para você. A taxa de conexão é paga separadamente pelo solicitante.</Text>
      <TextField label="Sua proposta" prefix="R$" value={value} onChangeText={(input) => setValue(decimalInput(input))} onBlur={() => setValue((input) => completeMoneyInput(input))} keyboardType="decimal-pad" placeholder="0,00" />
      <View style={styles.safety}><Text style={styles.safetyTitle}>Antes de aceitar</Text><Text style={styles.safetyText}>• Confira o conteúdo antes de guardar na bagagem.{`\n`}• Não transporte itens proibidos ou sem embalagem adequada.{`\n`}• Combine locais públicos para retirada e entrega.</Text></View>
      <Button label={checked ? 'Conteúdo será verificado ✓' : 'Confirmar compromisso de segurança'} variant="secondary" icon="shield" onPress={() => setChecked((current) => !current)} />
      <View style={{ height: 10 }} /><Button label="Enviar proposta" icon="send" disabled={!checked || !numberValue(value)} onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { borderRadius: 19, padding: 17, backgroundColor: colors.yellow, marginBottom: 25 },
  itemName: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#625B28', marginTop: 5 },
  itemValue: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text, marginTop: 13 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 23, color: colors.text },
  body: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 7, marginBottom: 23 },
  safety: { backgroundColor: colors.card, borderRadius: 18, padding: 17, borderWidth: 1, borderColor: colors.border, marginVertical: 8, marginBottom: 16 },
  safetyTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text, marginBottom: 8 },
  safetyText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 19, color: colors.muted },
});
