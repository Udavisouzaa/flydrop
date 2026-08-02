import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppHeader, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, getOrder, messages, sendMessage } = useApp();
  const order = getOrder(id);
  const [text, setText] = useState('');
  if (!order) return <Screen><AppHeader title="Conversa" back /><Text>Pedido não encontrado.</Text></Screen>;
  const orderMessages = messages.filter((message) => message.orderId === id);
  const otherName = order.requesterId === user?.id ? order.travelerName : order.requesterName;

  function submit() {
    sendMessage(id, text);
    setText('');
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <AppHeader title={otherName ?? 'Conversa'} subtitle={order.itemName} back />
      <View style={styles.route}><Feather name="package" size={16} color={colors.primaryDark} /><Text style={styles.routeText}>{order.originCity} → {order.destinationCity}</Text><View style={styles.online} /><Text style={styles.onlineText}>Conexão liberada</Text></View>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={20}>
        <ScrollView contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {!orderMessages.length ? <Text style={styles.empty}>A conversa começa aqui. Combine local e horário da retirada.</Text> : null}
          {orderMessages.map((message) => {
            const mine = message.senderId === user?.id;
            if (message.isAuto) return <View key={message.id} style={styles.system}><Feather name="shield" size={14} color={colors.primaryDark} /><Text style={styles.systemText}>{message.text}</Text></View>;
            return <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}><Text style={[styles.bubbleText, mine && styles.mineText]}>{message.text}</Text><Text style={[styles.time, mine && styles.mineTime]}>{new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>;
          })}
        </ScrollView>
        <View style={styles.composer}><TextInput value={text} onChangeText={setText} placeholder="Escreva uma mensagem" placeholderTextColor="#94979C" style={styles.input} multiline /><TouchableOpacity disabled={!text.trim()} onPress={submit} style={[styles.send, !text.trim() && styles.sendDisabled]}><Feather name="arrow-up" size={20} color="#fff" /></TouchableOpacity></View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  route: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.card, borderRadius: 14, padding: 11, borderWidth: 1, borderColor: colors.border },
  routeText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.text },
  online: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  onlineText: { fontFamily: 'Inter_500Medium', fontSize: 9, color: colors.primaryDark },
  keyboard: { flex: 1 },
  messages: { flexGrow: 1, paddingVertical: 18 },
  empty: { alignSelf: 'center', maxWidth: 260, textAlign: 'center', fontFamily: 'Inter_400Regular', color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 30 },
  system: { alignSelf: 'center', maxWidth: '90%', flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: 13, padding: 10, marginBottom: 14 },
  systemText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, color: colors.primaryDark },
  bubble: { maxWidth: '78%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 10, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.text, borderBottomRightRadius: 5 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, color: colors.text },
  mineText: { color: '#fff' },
  time: { fontFamily: 'Inter_400Regular', fontSize: 8, color: colors.muted, alignSelf: 'flex-end', marginTop: 4 },
  mineTime: { color: '#AEB0B4' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 110, minHeight: 48, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingTop: 13, paddingBottom: 13, fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.text },
  send: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.35 },
});
