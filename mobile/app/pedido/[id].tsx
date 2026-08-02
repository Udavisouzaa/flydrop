import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, Button, Screen, StatusPill, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { HandoffPreference, STATUS_LABELS, useApp } from '@/context/AppContext';

function handoffLabel(preference?: HandoffPreference) {
  if (preference === 'fora_aeroporto') return 'Fora do aeroporto';
  if (preference === 'flexivel') return 'Aeroporto ou local combinado';
  return 'Saguão de desembarque';
}

export default function OrderDetailScreen() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { user, getOrder, acceptProposal, markInTransit, finishOrder, cancelOrder } = useApp();
  const order = getOrder(id);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  if (!order) return <Screen><AppHeader title="Pedido" back /><Text style={styles.notFound}>Pedido não encontrado.</Text></Screen>;
  const orderId = order.id;
  const isRequester = order.requesterId === user?.id;
  const isTraveler = order.travelerId === user?.id;

  function accept() {
    acceptProposal(orderId);
    router.push({ pathname: '/pagamento/[id]', params: { id: orderId } });
  }

  function cancel() {
    setCancelConfirmationOpen(true);
  }

  function confirmCancellation() {
    cancelOrder(orderId);
    setCancelConfirmationOpen(false);
  }

  function edit() {
    router.push({ pathname: '/criar-pedido', params: { editId: orderId } });
  }

  return (
    <Screen>
      <AppHeader title="Detalhes do pedido" subtitle={`#${order.id.slice(-8).toUpperCase()}`} back />
      <Modal transparent visible={cancelConfirmationOpen} animationType="fade" onRequestClose={() => setCancelConfirmationOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setCancelConfirmationOpen(false)}>
          <Pressable style={styles.cancelDialog} onPress={(event) => event.stopPropagation()}>
            <View style={styles.cancelDialogIcon}><Feather name="alert-triangle" size={24} color={colors.danger} /></View>
            <Text style={styles.cancelDialogTitle}>Cancelar este pedido?</Text>
            <Text style={styles.cancelDialogBody}>O pedido será retirado das rotas disponíveis e não poderá mais receber propostas de viajantes.</Text>
            <View style={styles.cancelDialogActions}>
              <View style={styles.cancelDialogButton}><Button label="Manter pedido" variant="secondary" onPress={() => setCancelConfirmationOpen(false)} /></View>
              <View style={styles.cancelDialogButton}><Button label="Confirmar cancelamento" variant="danger" icon="x-circle" onPress={confirmCancellation} /></View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {created ? <View style={styles.success}><Feather name="check-circle" size={20} color={colors.primaryDark} /><View style={{ flex: 1 }}><Text style={styles.successTitle}>Pedido publicado!</Text><Text style={styles.successBody}>Agora ele já pode aparecer para viajantes compatíveis.</Text></View></View> : null}
      <View style={styles.mainCard}>
        <View style={styles.titleRow}><View style={styles.itemIcon}><Feather name="package" size={25} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.itemName}>{order.itemName}</Text><Text style={styles.category}>{order.category} · {order.weight} · {order.size}</Text></View></View>
        <View style={styles.route}>
          <View style={styles.routePoint}><View style={styles.originDot} /><View><Text style={styles.routeLabel}>ORIGEM</Text><Text style={styles.city}>{order.originCity}</Text></View></View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}><View style={styles.destinationDot} /><View><Text style={styles.routeLabel}>DESTINO</Text><Text style={styles.city}>{order.destinationCity}</Text></View></View>
        </View>
        <View style={styles.pills}><StatusPill status={order.status} />{order.orderType === 'urgente' ? <StatusPill urgent /> : null}</View>
      </View>

      <View style={styles.valueRow}><View><Text style={styles.valueLabel}>Oferta ao viajante</Text><Text style={styles.value}>{formatMoney(order.proposedValue ?? order.suggestedValue)}</Text></View><View style={styles.deadline}><Feather name="calendar" size={17} color={colors.muted} /><View><Text style={styles.valueLabel}>Prazo</Text><Text style={styles.deadlineText}>{order.deadlineDate}, {order.deadlineTime}</Text></View></View></View>

      <Text style={styles.section}>Sobre o item</Text>
      <View style={styles.infoCard}>{order.description ? <><Text style={styles.description}>{order.description}</Text><View style={styles.divider} /></> : null}<InfoRow label="Valor declarado" value={formatMoney(order.declaredValue)} /><InfoRow label="Categoria" value={order.category} /><InfoRow label="Retirada" value={handoffLabel(order.pickupHandoffPreference)} /><InfoRow label="Entrega" value={handoffLabel(order.deliveryHandoffPreference)} />{order.brand ? <InfoRow label="Eletrônico" value={`${order.brand} ${order.model} · ${order.itemCondition}`} /> : null}</View>

      {order.photoUris?.length ? <><Text style={styles.section}>Fotos do item</Text><View style={styles.photoGrid}>{order.photoUris.map((uri) => <Image key={uri} source={{ uri }} style={styles.itemPhoto} />)}</View></> : null}
      {order.supportingDocument ? <TouchableOpacity style={styles.document} onPress={() => Linking.openURL(order.supportingDocument!.uri)}><View style={styles.documentIcon}><Feather name="file-text" size={20} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.documentLabel}>Nota fiscal ou declaração</Text><Text style={styles.documentName} numberOfLines={1}>{order.supportingDocument.name}</Text></View><Feather name="external-link" size={17} color={colors.muted} /></TouchableOpacity> : null}

      {order.travelerName ? <><Text style={styles.section}>Viajante</Text><View style={styles.person}><View style={styles.avatar}><Text style={styles.avatarText}>{order.travelerName.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={styles.personName}>{order.travelerName}</Text><Text style={styles.personMeta}>★ {order.travelerRating?.toFixed(1) ?? '5.0'} · contato protegido até o match</Text></View></View></> : <><Text style={styles.section}>Solicitante</Text><View style={styles.person}><View style={styles.avatar}><Text style={styles.avatarText}>{order.requesterName.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={styles.personName}>{order.requesterName}</Text><Text style={styles.personMeta}>★ {order.requesterRating.toFixed(1)} · dados protegidos até o match</Text></View></View></>}

      {isRequester && order.status === 'viajante_interessado' ? <View style={styles.proposal}><Text style={styles.proposalTitle}>Você recebeu uma proposta</Text><Text style={styles.proposalBody}>{order.travelerName} pode levar por {formatMoney(order.proposedValue ?? order.suggestedValue)}.</Text><Button label="Aceitar e liberar conexão" icon="check" onPress={accept} /></View> : null}
      {!isRequester && order.status === 'aguardando_viajante' ? <Button label="Quero levar este item" icon="send" onPress={() => router.push({ pathname: '/aceitar/[id]', params: { id: order.id } })} /> : null}
      {isRequester && order.status === 'aguardando_pagamento' ? <Button label={`Pagar taxa de ${formatMoney(order.connectionFee)}`} icon="credit-card" onPress={() => router.push({ pathname: '/pagamento/[id]', params: { id: order.id } })} /> : null}
      {order.connectionUnlocked && (isRequester || isTraveler) ? <View style={styles.actionStack}><Button label="Abrir conversa" icon="message-circle" variant="dark" onPress={() => router.push({ pathname: '/chat/[id]', params: { id: order.id } })} />
        {order.status === 'aguardando_retirada' ? <Button label="Confirmar retirada" icon="package" onPress={() => router.push({ pathname: '/confirmar-retirada/[id]', params: { id: order.id } })} /> : null}
        {order.status === 'item_retirado' && isTraveler ? <Button label="Marcar como em viagem" icon="send" onPress={() => markInTransit(order.id)} /> : null}
        {order.status === 'em_viagem' ? <Button label="Confirmar entrega" icon="check-circle" onPress={() => router.push({ pathname: '/confirmar-entrega/[id]', params: { id: order.id } })} /> : null}
        {order.status === 'entregue' && isRequester ? <Button label="Concluir e avaliar" icon="star" onPress={() => finishOrder(order.id)} /> : null}
      </View> : null}
      {isRequester && order.status === 'aguardando_viajante' ? <View style={styles.manageActions}><View style={styles.manageButton}><Button label="Editar pedido" icon="edit-3" variant="secondary" onPress={edit} /></View><View style={styles.manageButton}><Button label="Cancelar pedido" icon="x-circle" variant="danger" onPress={cancel} /></View></View> : null}
      {isRequester && order.status === 'viajante_interessado' ? <View style={styles.cancelOnly}><Button label="Cancelar pedido" icon="x-circle" variant="danger" onPress={cancel} /></View> : null}

      <View style={styles.timeline}><Text style={styles.timelineTitle}>Status atual</Text><Text style={styles.timelineStatus}>{STATUS_LABELS[order.status]}</Text><Text style={styles.timelineBody}>Os dados completos de retirada e entrega ficam protegidos até a conexão ser liberada.</Text></View>
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  notFound: { textAlign: 'center', marginTop: 50, fontFamily: 'Inter_600SemiBold', color: colors.muted },
  success: { flexDirection: 'row', gap: 10, backgroundColor: colors.successSoft, borderRadius: 16, padding: 14, marginBottom: 13 },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.primaryDark },
  successBody: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.primaryDark, marginTop: 3 },
  mainCard: { backgroundColor: colors.card, borderRadius: 21, padding: 17, borderWidth: 1, borderColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text },
  category: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted, marginTop: 4 },
  route: { marginTop: 20, marginLeft: 4 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  originDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  destinationDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.orange },
  routeLine: { width: 2, height: 25, backgroundColor: colors.border, marginLeft: 5 },
  routeLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 8, color: colors.muted, letterSpacing: 1 },
  city: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginTop: 2 },
  pills: { flexDirection: 'row', gap: 7, marginTop: 17 },
  valueRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.yellow, borderRadius: 18, padding: 16 },
  valueLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: '#696126' },
  value: { fontFamily: 'Inter_700Bold', fontSize: 22, color: colors.text, marginTop: 4 },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deadlineText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.text, marginTop: 4 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text, marginTop: 23, marginBottom: 11 },
  infoCard: { backgroundColor: colors.card, borderRadius: 17, padding: 16, borderWidth: 1, borderColor: colors.border },
  description: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 5, gap: 12 },
  infoLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted },
  infoValue: { flex: 1, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.text },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  itemPhoto: { width: 88, height: 88, borderRadius: 15, backgroundColor: colors.input },
  document: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.card, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.border },
  documentIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  documentLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.muted },
  documentName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.text, marginTop: 3 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: colors.card, borderRadius: 17, padding: 14, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.yellow, fontFamily: 'Inter_700Bold', fontSize: 18 },
  personName: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text },
  personMeta: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.muted, marginTop: 4 },
  proposal: { backgroundColor: colors.orangeSoft, borderRadius: 18, padding: 16, marginTop: 18, gap: 10 },
  proposalTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, color: colors.text },
  proposalBody: { fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.muted, marginBottom: 4 },
  actionStack: { gap: 10, marginTop: 19 },
  manageActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  manageButton: { flex: 1 },
  cancelOnly: { marginTop: 18 },
  modalOverlay: { flex: 1, backgroundColor: '#11111180', alignItems: 'center', justifyContent: 'center', padding: 22 },
  cancelDialog: { width: '100%', maxWidth: 440, borderRadius: 22, backgroundColor: colors.card, padding: 20 },
  cancelDialogIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FDECEC', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  cancelDialogTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text },
  cancelDialogBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 19, color: colors.muted, marginTop: 7 },
  cancelDialogActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelDialogButton: { flex: 1 },
  timeline: { borderRadius: 17, padding: 16, backgroundColor: '#EDEEF0', marginTop: 22 },
  timelineTitle: { fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.muted },
  timelineStatus: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text, marginTop: 4 },
  timelineBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 6 },
});
