import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppHeader, Button, Chip, Screen, SelectField, TextField, completeMoneyInput, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { APPROVED_ITEM_CATEGORIES } from '@/constants/items';
import { AIRPORT_OPTIONS, normalizeCity, useApp } from '@/context/AppContext';

const TIMES = Array.from({ length: 24 * 12 }, (_, index) => `${String(Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}`);
const MINIMUM_VALUE = 30;
const WEIGHT_LIMIT_KG = 5;
const HANDOFF_OPTIONS = ['Não, somente no aeroporto', 'Sim, em local combinado'] as const;

function numberValue(value: string) {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function decimalInput(value: string) {
  const normalized = value.includes(',') ? value.replace(/\./g, '') : value.replace('.', ',');
  const numeric = normalized.replace(/[^\d,]/g, '');
  const [integer = '', ...decimalParts] = numeric.split(',');
  const decimals = decimalParts.join('').slice(0, 2);
  return decimalParts.length ? `${integer},${decimals}` : integer;
}

function airportFromParam(value?: string) {
  if (!value) return '';
  const exact = AIRPORT_OPTIONS.find((airport) => airport.label === value);
  if (exact) return exact.label;
  const matches = AIRPORT_OPTIONS.filter((airport) => normalizeCity(airport.label) === normalizeCity(value));
  return matches.length === 1 ? matches[0].label : '';
}

export default function CreateTripScreen() {
  const params = useLocalSearchParams<{ origin?: string; destination?: string }>();
  const { createTrip } = useApp();
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [origin, setOrigin] = useState(airportFromParam(params.origin));
  const [destination, setDestination] = useState(airportFromParam(params.destination));
  const [date, setDate] = useState('');
  const [departureTime, setDepartureTime] = useState('08:00');
  const [arrivalTime, setArrivalTime] = useState('10:00');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [handoffOption, setHandoffOption] = useState('');
  const [space, setSpace] = useState('Mala de mão');
  const [weight, setWeight] = useState('5');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');
  const [minValue, setMinValue] = useState('30,00');
  const [categories, setCategories] = useState<string[]>(['Documentos simples', 'Livros']);
  const airports = AIRPORT_OPTIONS.map((airport) => airport.label);
  const dates = useMemo(() => Array.from({ length: 30 }, (_, index) => { const value = new Date(); value.setDate(value.getDate() + index + 1); return value.toLocaleDateString('pt-BR'); }), []);
  const weightNumber = numberValue(weight);
  const weightInKg = weightUnit === 'g' ? weightNumber / 1000 : weightNumber;
  const minimumValueNumber = numberValue(minValue);
  const fieldErrors = {
    origin: !origin ? 'Selecione o aeroporto de origem.' : undefined,
    destination: !destination
      ? 'Selecione o aeroporto de destino.'
      : destination === origin
        ? 'O aeroporto de destino deve ser diferente da origem.'
        : undefined,
    date: !date ? 'Selecione a data da viagem.' : undefined,
    departureTime: !departureTime ? 'Selecione o horário de saída.' : undefined,
    arrivalTime: !arrivalTime ? 'Selecione o horário de chegada.' : undefined,
    handoffOption: !handoffOption ? 'Informe se aceita encontrar o solicitante fora do aeroporto.' : undefined,
    space: !space ? 'Selecione o tipo de espaço disponível.' : undefined,
    weight: weightNumber <= 0
      ? 'Informe o peso máximo disponível.'
      : weightInKg > WEIGHT_LIMIT_KG
        ? 'O limite máximo é de 5 kg (5.000 g).'
        : undefined,
    minValue: minimumValueNumber < MINIMUM_VALUE ? `O valor mínimo permitido é ${formatMoney(MINIMUM_VALUE)}.` : undefined,
    categories: !categories.length ? 'Selecione ao menos uma categoria.' : undefined,
  };
  const canSubmit = !Object.values(fieldErrors).some(Boolean);

  function toggleCategory(category: string) {
    setCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  function submit() {
    setAttemptedSubmit(true);
    if (!canSubmit) return;
    createTrip({
      originCity: origin,
      destinationCity: destination,
      departureDate: date,
      departureTime,
      arrivalTime,
      airline: airline.trim() || undefined,
      flightNumber: flightNumber.trim().toUpperCase() || undefined,
      availableSpace: space,
      maxWeightKg: Number(weightInKg.toFixed(3)),
      acceptedCategories: categories,
      acceptsOffAirportHandoff: handoffOption === 'Sim, em local combinado',
      minValue: minimumValueNumber,
    });
    router.replace('/(tabs)/viagens');
  }

  return (
    <Screen>
      <AppHeader title="Cadastrar viagem" subtitle="Encontre pedidos que combinam com sua rota" back />
      <View style={styles.hero}><Text style={styles.heroTitle}>Sua bagagem tem espaço?</Text><Text style={styles.heroBody}>Cadastre os dados do voo. Você decide quais pedidos aceitar.</Text></View>
      <Text style={styles.section}>Rota e horário</Text>
      <SelectField label="Aeroporto de origem" required value={origin} placeholder="Selecione" options={airports.filter((airport) => airport !== destination)} onSelect={setOrigin} error={attemptedSubmit ? fieldErrors.origin : undefined} />
      <SelectField label="Aeroporto de destino" required value={destination} placeholder="Selecione" options={airports.filter((airport) => airport !== origin)} onSelect={setDestination} error={attemptedSubmit ? fieldErrors.destination : undefined} />
      <SelectField label="Data da viagem" required value={date} placeholder="Selecione" options={dates} onSelect={setDate} error={attemptedSubmit ? fieldErrors.date : undefined} />
      <View style={styles.row}><View style={styles.flex}><SelectField label="Saída" required value={departureTime} placeholder="Horário" options={TIMES} onSelect={setDepartureTime} error={attemptedSubmit ? fieldErrors.departureTime : undefined} /></View><View style={styles.flex}><SelectField label="Chegada" required value={arrivalTime} placeholder="Horário" options={TIMES} onSelect={setArrivalTime} error={attemptedSubmit ? fieldErrors.arrivalTime : undefined} /></View></View>
      <View style={styles.row}><View style={styles.flex}><TextField label="Companhia aérea (opcional)" value={airline} onChangeText={setAirline} placeholder="Ex.: LATAM" /></View><View style={styles.flex}><TextField label="Número do voo (opcional)" value={flightNumber} onChangeText={setFlightNumber} placeholder="LA 3456" /></View></View>
      <SelectField label="Recebe ou entrega fora do aeroporto?" required value={handoffOption} placeholder="Selecione" options={HANDOFF_OPTIONS} onSelect={setHandoffOption} error={attemptedSubmit ? fieldErrors.handoffOption : undefined} />
      <Text style={styles.fieldHint}>Se aceitar, o local será combinado com o solicitante após o match.</Text>
      <Text style={styles.section}>Capacidade disponível</Text>
      <SelectField label="Tipo de espaço" required value={space} placeholder="Selecione" options={['Item pessoal', 'Mala de mão']} onSelect={setSpace} error={attemptedSubmit ? fieldErrors.space : undefined} />
      <View style={styles.row}>
        <View style={styles.weightValue}><TextField label="Peso máximo" required value={weight} onChangeText={(value) => setWeight(decimalInput(value))} keyboardType="decimal-pad" placeholder={weightUnit === 'kg' ? 'Ex.: 2,5' : 'Ex.: 750'} error={attemptedSubmit || weightInKg > WEIGHT_LIMIT_KG ? fieldErrors.weight : undefined} /></View>
        <View style={styles.weightUnit}><SelectField label="Unidade" required value={weightUnit} placeholder="Selecione" options={['kg', 'g']} onSelect={(value) => setWeightUnit(value as 'kg' | 'g')} /></View>
      </View>
      <Text style={styles.weightHint}>{weightUnit === 'kg' ? 'Peso em quilogramas' : 'Peso em gramas'} · limite máximo de 5 kg ou 5.000 g</Text>
      <TextField label={`Valor mínimo por item (mín. ${formatMoney(MINIMUM_VALUE)})`} required prefix="R$" value={minValue} onChangeText={(value) => setMinValue(decimalInput(value))} onBlur={() => setMinValue((value) => completeMoneyInput(value))} keyboardType="decimal-pad" placeholder="30,00" error={attemptedSubmit || (minimumValueNumber > 0 && minimumValueNumber < MINIMUM_VALUE) ? fieldErrors.minValue : undefined} />
      <Text style={styles.fieldHint}>É o menor valor que você aceita receber para transportar um item.</Text>
      <Text style={styles.label}>Categorias aceitas<Text style={styles.required}> *</Text></Text><View style={styles.chips}>{APPROVED_ITEM_CATEGORIES.map((category) => <Chip key={category} label={category} selected={categories.includes(category)} onPress={() => toggleCategory(category)} />)}</View>
      {attemptedSubmit && fieldErrors.categories ? <Text style={styles.customError}>{fieldErrors.categories}</Text> : null}
      <View style={styles.notice}><Text style={styles.noticeText}>A retirada e a entrega podem acontecer nos saguões de desembarque dos aeroportos selecionados ou fora das dependências aeroportuárias, em qualquer local previamente acordado entre as partes, desde que o viajante tenha aceitado essa opção. Nunca aceite itens lacrados sem conferir o conteúdo. Você pode recusar qualquer pedido.</Text></View>
      {attemptedSubmit && !canSubmit ? <Text style={styles.formError}>Revise os campos indicados antes de cadastrar a viagem.</Text> : null}
      <Button label="Cadastrar viagem" icon="send" onPress={submit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 21, padding: 19, backgroundColor: colors.yellow, marginBottom: 8 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, color: colors.text },
  heroBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: '#514B1F', marginTop: 5 },
  section: { fontFamily: 'Inter_700Bold', fontSize: 18, color: colors.text, marginTop: 22, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  weightValue: { flex: 1.35 },
  weightUnit: { flex: 0.65 },
  weightHint: { marginTop: -10, marginBottom: 18, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted },
  fieldHint: { marginTop: -10, marginBottom: 18, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 9 },
  required: { color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  customError: { marginTop: -12, marginBottom: 16, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, color: colors.danger },
  notice: { backgroundColor: colors.orangeSoft, borderRadius: 15, padding: 14, marginBottom: 18 },
  noticeText: { fontFamily: 'Inter_400Regular', color: '#8D431F', fontSize: 11, lineHeight: 17 },
  formError: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17, color: colors.danger, marginBottom: 12 },
});
