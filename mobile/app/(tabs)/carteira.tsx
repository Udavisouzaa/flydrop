import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, Button, Screen, SectionTitle, Segmented, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function WalletScreen() {
  const { user, orders, logout } = useApp();
  const [section, setSection] = useState('carteira');
  const earnings = orders.filter((order) => order.travelerId === user?.id && ['entregue', 'concluido'].includes(order.status)).reduce((sum, order) => sum + (order.proposedValue ?? order.suggestedValue), 0);
  const pending = orders.filter((order) => order.travelerId === user?.id && !['entregue', 'concluido', 'cancelado'].includes(order.status)).reduce((sum, order) => sum + (order.proposedValue ?? order.suggestedValue), 0);

  function signOut() {
    logout();
    router.replace('/auth');
  }

  return (
    <Screen>
      <AppHeader title="Carteira" subtitle="Valores e dados da sua conta" />
      <Segmented value={section} onChange={setSection} options={[{ label: 'Carteira', value: 'carteira' }, { label: 'Meu perfil', value: 'perfil' }]} />

      {section === 'carteira' ? <>
        <View style={styles.balance}>
          <Text style={styles.balanceLabel}>Recebido em entregas</Text>
          <Text style={styles.balanceValue}>{formatMoney(earnings)}</Text>
          <View style={styles.balanceInfo}><Feather name="info" size={14} color="#B8BBC0" /><Text style={styles.balanceHint}>O valor da entrega é combinado e pago diretamente pelo solicitante.</Text></View>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}><Text style={styles.statLabel}>Em andamento</Text><Text style={styles.statValue}>{formatMoney(pending)}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>Taxas LevAí</Text><Text style={styles.statValue}>R$ 0,00</Text></View>
        </View>
        <SectionTitle title="Atividade" />
        <View style={styles.notice}><View style={styles.noticeIcon}><Feather name="credit-card" size={21} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.noticeTitle}>Integração financeira em breve</Text><Text style={styles.noticeBody}>Este MVP não movimenta dinheiro. Pagamentos exibidos são simulações.</Text></View></View>
      </> : <>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</Text></View>
          <Text style={styles.profileName}>{user?.name ?? 'Usuário LevAí'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? 'E-mail não informado'}</Text>
          <View style={[styles.verification, user?.isVerified && styles.verificationDone]}><Feather name={user?.isVerified ? 'check-circle' : 'clock'} size={15} color={user?.isVerified ? colors.primaryDark : colors.text} /><Text style={[styles.verificationText, user?.isVerified && styles.verificationTextDone]}>{user?.isVerified ? 'Contato verificado' : 'Contato pendente'}</Text></View>
        </View>

        <View style={styles.contactVerificationCard}>
          <Text style={styles.contactVerificationTitle}>Verificação de contato</Text>
          <Text style={styles.contactVerificationBody}>A confirmação será feita por links enviados ao e-mail e ao celular cadastrados.</Text>
          <View style={styles.contactVerificationRows}>
            <ContactVerificationRow icon="mail" label="E-mail" confirmed={Boolean(user?.isVerified)} />
            <View style={styles.profileDivider} />
            <ContactVerificationRow icon="phone" label="Celular" confirmed={Boolean(user?.isVerified)} />
          </View>
          {!user?.isVerified ? <Text style={styles.contactVerificationHint}>O envio dos links será ativado quando o aplicativo estiver conectado ao servidor.</Text> : null}
        </View>

        <View style={styles.profileStats}>
          <View style={styles.profileStat}><Text style={styles.profileStatValue}>★ {user?.rating.toFixed(1) ?? '5.0'}</Text><Text style={styles.profileStatLabel}>Avaliação</Text></View>
          <View style={styles.profileStat}><Text style={styles.profileStatValue}>{user?.completedDeliveries ?? 0}</Text><Text style={styles.profileStatLabel}>Entregas</Text></View>
          <View style={styles.profileStat}><Text style={styles.profileStatValue}>{user?.completedOrders ?? 0}</Text><Text style={styles.profileStatLabel}>Pedidos</Text></View>
        </View>

        <SectionTitle title="Dados da conta" />
        <View style={styles.accountCard}>
          <ProfileRow icon="phone" label="Telefone" value={user?.phone || 'Não informado'} />
          <View style={styles.profileDivider} />
          <ProfileRow icon="map-pin" label="Cidade" value={user?.city || 'Não informada'} />
          <View style={styles.profileDivider} />
          <ProfileRow icon="mail" label="E-mail" value={user?.email || 'Não informado'} />
        </View>
        <View style={styles.signOut}><Button label="Sair da conta" icon="log-out" variant="secondary" onPress={signOut} /></View>
      </>}
    </Screen>
  );
}

function ProfileRow({ icon, label, value }: { icon: 'phone' | 'map-pin' | 'mail'; label: string; value: string }) {
  return <View style={styles.profileRow}><View style={styles.profileRowIcon}><Feather name={icon} size={17} color={colors.primaryDark} /></View><View style={{ flex: 1 }}><Text style={styles.profileRowLabel}>{label}</Text><Text style={styles.profileRowValue}>{value}</Text></View></View>;
}

function ContactVerificationRow({ icon, label, confirmed }: { icon: 'mail' | 'phone'; label: string; confirmed: boolean }) {
  return <View style={styles.contactVerificationRow}><Feather name={icon} size={16} color={colors.primaryDark} /><Text style={styles.contactVerificationLabel}>{label}</Text><View style={[styles.contactStatus, confirmed && styles.contactStatusDone]}><Text style={[styles.contactStatusText, confirmed && styles.contactStatusTextDone]}>{confirmed ? 'Confirmado' : 'Confirmação pendente'}</Text></View></View>;
}

const styles = StyleSheet.create({
  balance: { backgroundColor: colors.text, borderRadius: 23, padding: 22 },
  balanceLabel: { fontFamily: 'Inter_500Medium', color: '#BFC1C5', fontSize: 12 },
  balanceValue: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 34, marginTop: 7 },
  balanceInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 18 },
  balanceHint: { flex: 1, fontFamily: 'Inter_400Regular', color: '#B8BBC0', fontSize: 10, lineHeight: 15 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, backgroundColor: colors.card, borderRadius: 17, padding: 16, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.muted },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text, marginTop: 6 },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border },
  noticeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text },
  noticeBody: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: colors.muted, marginTop: 4 },
  profileCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.border },
  profileAvatar: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 28, color: colors.yellow },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 19, color: colors.text, marginTop: 13 },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted, marginTop: 4 },
  verification: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.yellowSoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, marginTop: 13 },
  verificationDone: { backgroundColor: colors.successSoft },
  verificationText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: colors.text },
  verificationTextDone: { color: colors.primaryDark },
  contactVerificationCard: { backgroundColor: colors.card, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, marginTop: 11 },
  contactVerificationTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text },
  contactVerificationBody: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 16, color: colors.muted, marginTop: 5 },
  contactVerificationRows: { marginTop: 11 },
  contactVerificationRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 9 },
  contactVerificationLabel: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 11, color: colors.text },
  contactStatus: { backgroundColor: colors.yellowSoft, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6 },
  contactStatusDone: { backgroundColor: colors.successSoft },
  contactStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, color: colors.text },
  contactStatusTextDone: { color: colors.primaryDark },
  contactVerificationHint: { fontFamily: 'Inter_400Regular', fontSize: 9, lineHeight: 14, color: colors.muted, marginTop: 8 },
  profileStats: { flexDirection: 'row', gap: 9, marginTop: 11 },
  profileStat: { flex: 1, alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  profileStatValue: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text },
  profileStatLabel: { fontFamily: 'Inter_400Regular', fontSize: 9, color: colors.muted, marginTop: 4 },
  accountCard: { backgroundColor: colors.card, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: colors.border },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 11, minHeight: 48 },
  profileRowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  profileRowLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, color: colors.muted },
  profileRowValue: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.text, marginTop: 3 },
  profileDivider: { height: 1, backgroundColor: colors.border, marginVertical: 5 },
  signOut: { marginTop: 16 },
});
