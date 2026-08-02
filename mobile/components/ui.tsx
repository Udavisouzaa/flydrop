import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { ComponentProps, PropsWithChildren, ReactNode, useState } from 'react';
import {
  KeyboardTypeOptions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { Order, STATUS_LABELS, normalizeCity } from '@/context/AppContext';

type IconName = ComponentProps<typeof Feather>['name'];

export function Screen({ children, scroll = true, style }: PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>) {
  const content = <View style={[styles.screenContent, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function AppHeader({ title, subtitle, back = false, onBack, right }: { title: string; subtitle?: string; back?: boolean; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {back ? (
          <TouchableOpacity style={styles.iconButton} onPress={onBack ?? (() => router.back())}>
            <Feather name="arrow-left" size={21} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.headerCopy}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, badge }: { icon: IconName; onPress: () => void; badge?: number }) {
  return (
    <TouchableOpacity style={styles.iconButton} onPress={onPress}>
      <Feather name={icon} size={20} color={colors.text} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'dark' | 'secondary' | 'danger';
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[`button_${variant}`], disabled && styles.buttonDisabled]}
    >
      {icon ? <Feather name={icon} size={18} color={variant === 'secondary' ? colors.text : '#fff'} /> : null}
      <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  secureTextEntry,
  required,
  maxLength,
  error,
  prefix,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  secureTextEntry?: boolean;
  required?: boolean;
  maxLength?: number;
  error?: string;
  prefix?: string;
  onBlur?: () => void;
}) {
  const input = (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94979C"
      keyboardType={keyboardType}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
      maxLength={maxLength}
      onBlur={onBlur}
      style={prefix ? styles.prefixedInput : [styles.input, multiline && styles.inputMultiline, error && styles.fieldError]}
    />
  );

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      {prefix ? <View style={[styles.prefixedInputWrap, error && styles.fieldError]}><Text style={styles.inputPrefix}>{prefix}</Text>{input}</View> : input}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function SelectField({ label, value, placeholder, options, onSelect, required, error }: { label: string; value: string; placeholder: string; options: readonly string[]; onSelect: (value: string) => void; required?: boolean; error?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TouchableOpacity style={[styles.select, error && styles.fieldError]} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Feather name="chevron-down" size={20} color={colors.muted} />
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.option}
                  onPress={() => {
                    onSelect(option);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                  {value === option ? <Feather name="check" size={20} color={colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Segmented({ value, options, onChange }: { value: string; options: { label: string; value: string }[]; onChange: (value: string) => void }) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => (
        <TouchableOpacity key={option.value} onPress={() => onChange(option.value)} style={[styles.segment, value === option.value && styles.segmentActive]}>
          <Text style={[styles.segmentText, value === option.value && styles.segmentTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function Chip({ label, selected, onPress, tone = 'teal' }: { label: string; selected?: boolean; onPress?: () => void; tone?: 'teal' | 'purple' | 'dark' }) {
  const selectedColor = tone === 'purple' ? colors.purple : tone === 'dark' ? colors.text : colors.primary;
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={[styles.chip, selected && { backgroundColor: selectedColor, borderColor: selectedColor }]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StatusPill({ status, urgent }: { status?: Order['status']; urgent?: boolean }) {
  const label = urgent ? 'Urgente' : status ? STATUS_LABELS[status] : '';
  const backgroundColor = urgent ? colors.yellowSoft : colors.successSoft;
  const color = urgent ? colors.text : colors.primaryDark;
  return (
    <View style={[styles.status, { backgroundColor }]}>
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

function fallbackItemPhoto(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('livro')) return 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80';
  if (normalized.includes('calçado')) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=300&q=80';
  if (normalized.includes('documento')) return 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=300&q=80';
  if (normalized.includes('eletr')) return 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=300&q=80';
  return 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80';
}

export function OrderCard({ order, onPress, onProposal, emphasizeUrgent = false }: { order: Order; onPress: () => void; onProposal?: () => void; emphasizeUrgent?: boolean }) {
  const urgent = order.orderType === 'urgente';
  const itemPhoto = order.photoUris?.[0] ?? fallbackItemPhoto(order.category);
  return (
    <TouchableOpacity activeOpacity={0.82} style={[styles.card, emphasizeUrgent && urgent && styles.cardUrgent]} onPress={onPress}>
      {emphasizeUrgent && urgent ? <View style={styles.urgentBanner}><Feather name="zap" size={14} color={colors.text} /><Text style={styles.urgentBannerText}>URGENTE · MAIOR PRIORIDADE</Text></View> : null}
      <View style={styles.cardTop}>
        <Image source={{ uri: itemPhoto }} style={styles.itemThumbnail} />
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>{order.itemName}</Text>
          <Text style={styles.cardMeta}>{order.category} · {order.weight}</Text>
        </View>
        <View style={styles.cardValue}><Text style={styles.cardValueLabel}>Oferta</Text><Text style={[styles.money, emphasizeUrgent && urgent && styles.moneyUrgent]}>{formatMoney(order.suggestedValue)}</Text></View>
      </View>
      <View style={styles.routeRow}>
        <View style={styles.routeDot} />
        <Text style={styles.routeText}>{normalizeCity(order.originCity)}</Text>
        <Feather name="arrow-right" size={15} color={colors.muted} />
        <View style={[styles.routeDot, { backgroundColor: colors.orange }]} />
        <Text style={styles.routeText}>{normalizeCity(order.destinationCity)}</Text>
      </View>
      <View style={styles.cardBottom}>
        <StatusPill status={order.status} />
        {urgent ? <StatusPill urgent /> : null}
        <Text style={styles.deadline}>até {order.deadlineDate}</Text>
      </View>
      {onProposal ? <TouchableOpacity style={[styles.proposalButton, urgent && styles.proposalButtonUrgent]} onPress={(event) => { event.stopPropagation(); onProposal(); }}><Feather name={urgent ? 'zap' : 'send'} size={16} color={urgent ? colors.text : '#fff'} /><Text style={[styles.proposalButtonText, urgent && styles.proposalButtonTextUrgent]}>Fazer proposta</Text></TouchableOpacity> : null}
    </TouchableOpacity>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity> : null}
    </View>
  );
}

export function EmptyState({ icon = 'inbox', title, body }: { icon?: IconName; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Feather name={icon} size={25} color={colors.primaryDark} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function completeMoneyInput(value: string) {
  const normalized = value.includes(',') ? value.replace(/\./g, '') : value.replace('.', ',');
  const numeric = normalized.replace(/[^\d,]/g, '');
  if (!numeric.replace(',', '')) return '';
  const [integer = '', ...decimalParts] = numeric.split(',');
  const decimals = decimalParts.join('').slice(0, 2).padEnd(2, '0');
  return `${integer || '0'},${decimals}`;
}

export const typography = StyleSheet.create({
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 34, color: colors.text } as TextStyle,
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, color: colors.muted } as TextStyle,
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  screenContent: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 112 },
  header: { minHeight: 66, flexDirection: 'row', alignItems: 'center', marginHorizontal: -2, marginBottom: 10 },
  headerSide: { width: 46 },
  headerRight: { alignItems: 'flex-end' },
  headerCopy: { flex: 1 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 23, color: colors.text },
  headerSubtitle: { fontFamily: 'Inter_400Regular', color: colors.muted, fontSize: 12, marginTop: 2 },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  badge: { position: 'absolute', right: -3, top: -4, minWidth: 17, height: 17, paddingHorizontal: 3, borderRadius: 9, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 9 },
  button: { minHeight: 54, borderRadius: 16, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  button_primary: { backgroundColor: colors.primary },
  button_dark: { backgroundColor: colors.text },
  button_secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  button_danger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.38 },
  buttonText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  buttonSecondaryText: { color: colors.text },
  fieldWrap: { gap: 8, marginBottom: 15 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text },
  required: { color: colors.danger },
  input: { minHeight: 52, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text },
  prefixedInputWrap: { minHeight: 52, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  inputPrefix: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.text, marginRight: 7 },
  prefixedInput: { flex: 1, minHeight: 50, paddingVertical: 0, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text },
  inputMultiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  fieldError: { borderColor: colors.danger },
  errorText: { marginTop: -2, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, color: colors.danger },
  select: { minHeight: 52, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, color: colors.text },
  placeholder: { color: '#94979C' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '72%', backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, color: colors.text },
  sheetList: { marginHorizontal: -8 },
  option: { minHeight: 54, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: colors.text },
  segmented: { flexDirection: 'row', backgroundColor: '#E9E9EC', padding: 4, borderRadius: 14, marginBottom: 20 },
  segment: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontFamily: 'Inter_600SemiBold', color: colors.muted, fontSize: 13 },
  segmentTextActive: { color: colors.text },
  chip: { borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: colors.text },
  chipTextSelected: { color: '#fff', fontFamily: 'Inter_600SemiBold' },
  status: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardUrgent: { borderWidth: 2, borderColor: colors.yellow, backgroundColor: colors.yellowSoft },
  urgentBanner: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.yellow, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 6, marginBottom: 12 },
  urgentBannerText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5, color: colors.text },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  itemIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  itemThumbnail: { width: 52, height: 52, borderRadius: 14, backgroundColor: colors.input, marginRight: 11 },
  cardCopy: { flex: 1, paddingRight: 8 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text },
  cardMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted, marginTop: 3 },
  money: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.text },
  cardValue: { alignItems: 'flex-end' },
  cardValueLabel: { fontFamily: 'Inter_500Medium', fontSize: 8, color: colors.muted, marginBottom: 2 },
  moneyUrgent: { color: colors.text, fontSize: 17 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginVertical: 15, paddingVertical: 11, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  routeText: { fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.text, flexShrink: 1 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  deadline: { marginLeft: 'auto', fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.muted },
  proposalButton: { minHeight: 43, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  proposalButtonUrgent: { backgroundColor: colors.yellow },
  proposalButtonText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  proposalButtonTextUrgent: { color: colors.text },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 23, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: colors.primaryDark },
  empty: { alignItems: 'center', paddingVertical: 45, paddingHorizontal: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.text },
  emptyBody: { marginTop: 7, textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.muted },
});
