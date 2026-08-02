import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppHeader, Button, Chip, Screen, SelectField, TextField, completeMoneyInput, formatMoney } from '@/components/ui';
import { colors } from '@/constants/colors';
import { APPROVED_ITEM_CATEGORIES, ELECTRONIC_CATEGORIES } from '@/constants/items';
import { AIRPORT_OPTIONS, HandoffPreference, normalizeCity, useApp } from '@/context/AppContext';

const STEPS = ['Item', 'Origem', 'Destino', 'Prazo', 'Valor'];
const TIMES = Array.from({ length: 24 * 12 }, (_, index) => `${String(Math.floor(index / 12)).padStart(2, '0')}:${String((index % 12) * 5).padStart(2, '0')}`);
const DELIVERY_HANDOFF_OPTIONS: { label: string; value: HandoffPreference }[] = [
  { label: 'Saguão de desembarque', value: 'aeroporto' },
  { label: 'Inserir endereço', value: 'fora_aeroporto' },
  { label: 'Aeroporto ou endereço combinado', value: 'flexivel' },
];

const PICKUP_HANDOFF_OPTIONS: { label: string; value: HandoffPreference; airportArea?: 'embarque' | 'desembarque' }[] = [
  { label: 'Saguão de embarque', value: 'aeroporto', airportArea: 'embarque' },
  { label: 'Saguão de desembarque', value: 'aeroporto', airportArea: 'desembarque' },
  { label: 'Inserir endereço', value: 'fora_aeroporto' },
  { label: 'Aeroporto ou endereço combinado', value: 'flexivel' },
];

function futureDates() {
  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);
    return date.toLocaleDateString('pt-BR');
  });
}

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

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function hasValidPhone(value: string) {
  return value.replace(/\D/g, '').length === 11;
}

function airportFromParam(value?: string) {
  if (!value) return '';
  const exact = AIRPORT_OPTIONS.find((airport) => airport.label === value);
  if (exact) return exact.label;
  const matches = AIRPORT_OPTIONS.filter((airport) => normalizeCity(airport.label) === normalizeCity(value));
  return matches.length === 1 ? matches[0].label : '';
}

function splitWeight(value?: string) {
  const match = value?.match(/^([\d.,]+)\s*(kg|g)$/i);
  return { value: match?.[1] ?? '', unit: (match?.[2]?.toLowerCase() === 'g' ? 'g' : 'kg') as 'kg' | 'g' };
}

function airportPoint(address: string | undefined, preference: HandoffPreference | undefined) {
  if (!address || preference === 'fora_aeroporto') return '';
  if (preference === 'flexivel') return address.match(/No aeroporto: (.*?)(?: · Fora do aeroporto:|$)/)?.[1] ?? '';
  return /^Saguão de (embarque|desembarque) – /.test(address) ? '' : address;
}

function outsidePoint(address: string | undefined, preference: HandoffPreference | undefined) {
  if (!address || preference === 'aeroporto') return '';
  if (preference === 'flexivel') return address.match(/Fora do aeroporto: (.*)$/)?.[1] ?? '';
  return address;
}

function ConfirmationRow({ checked, text, onPress, error }: { checked: boolean; text: string; onPress: () => void; error?: string }) {
  return (
    <View style={styles.confirmationWrap}>
      <TouchableOpacity style={styles.confirmationRow} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.confirmationBox, checked && styles.confirmationBoxChecked, error && styles.confirmationBoxError]}>
          {checked ? <Feather name="check" size={15} color="#fff" /> : null}
        </View>
        <Text style={styles.confirmationText}>{text}</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.confirmationError}>{error}</Text> : null}
    </View>
  );
}

export default function CreateOrderScreen() {
  const params = useLocalSearchParams<{ origin?: string; destination?: string; category?: string; editId?: string }>();
  const { createOrder, updateOrder, getOrder } = useApp();
  const editOrder = params.editId ? getOrder(params.editId) : undefined;
  const initialWeight = splitWeight(editOrder?.weight);
  const [step, setStep] = useState(0);
  const [attemptedStep, setAttemptedStep] = useState<number | null>(null);
  const [itemName, setItemName] = useState(editOrder?.itemName ?? '');
  const [category, setCategory] = useState(editOrder?.category ?? (params.category && APPROVED_ITEM_CATEGORIES.includes(params.category as typeof APPROVED_ITEM_CATEGORIES[number]) ? params.category : ''));
  const [description, setDescription] = useState(editOrder?.description ?? '');
  const [declaredValue, setDeclaredValue] = useState(editOrder ? completeMoneyInput(String(editOrder.declaredValue).replace('.', ',')) : '');
  const [weight, setWeight] = useState(initialWeight.value);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>(initialWeight.unit);
  const [size, setSize] = useState<'Pequeno' | 'Médio'>(editOrder?.size === 'Médio' ? 'Médio' : 'Pequeno');
  const [photoUris, setPhotoUris] = useState<string[]>(editOrder?.photoUris ?? []);
  const [supportingDocument, setSupportingDocument] = useState<{ uri: string; name: string; mimeType?: string } | undefined>(editOrder?.supportingDocument);
  const [brand, setBrand] = useState(editOrder?.brand ?? '');
  const [model, setModel] = useState(editOrder?.model ?? '');
  const [condition, setCondition] = useState(editOrder?.itemCondition ?? '');
  const [originCity, setOriginCity] = useState(editOrder?.originCity ?? airportFromParam(params.origin));
  const [pickupHandoffPreference, setPickupHandoffPreference] = useState<HandoffPreference>(editOrder?.pickupHandoffPreference ?? 'aeroporto');
  const [pickupAirportArea, setPickupAirportArea] = useState<'embarque' | 'desembarque'>(editOrder?.pickupAddress?.startsWith('Saguão de desembarque') ? 'desembarque' : 'embarque');
  const [pickupAirportMeetingPoint, setPickupAirportMeetingPoint] = useState(airportPoint(editOrder?.pickupAddress, editOrder?.pickupHandoffPreference));
  const [pickupAddress, setPickupAddress] = useState(outsidePoint(editOrder?.pickupAddress, editOrder?.pickupHandoffPreference));
  const [pickupName, setPickupName] = useState(editOrder?.pickupContactName ?? '');
  const [pickupPhone, setPickupPhone] = useState(editOrder?.pickupContactPhone ?? '');
  const [destinationCity, setDestinationCity] = useState(editOrder?.destinationCity ?? airportFromParam(params.destination));
  const [deliveryHandoffPreference, setDeliveryHandoffPreference] = useState<HandoffPreference>(editOrder?.deliveryHandoffPreference ?? 'aeroporto');
  const [deliveryAirportMeetingPoint, setDeliveryAirportMeetingPoint] = useState(airportPoint(editOrder?.deliveryAddress, editOrder?.deliveryHandoffPreference));
  const [deliveryAddress, setDeliveryAddress] = useState(outsidePoint(editOrder?.deliveryAddress, editOrder?.deliveryHandoffPreference));
  const [deliveryName, setDeliveryName] = useState(editOrder?.deliveryContactName ?? '');
  const [deliveryPhone, setDeliveryPhone] = useState(editOrder?.deliveryContactPhone ?? '');
  const [deadlineDate, setDeadlineDate] = useState(editOrder?.deadlineDate ?? '');
  const [deadlineTime, setDeadlineTime] = useState(editOrder?.deadlineTime ?? '18:00');
  const [orderType, setOrderType] = useState<'comum' | 'urgente'>(editOrder?.orderType ?? 'comum');
  const [suggestedValue, setSuggestedValue] = useState(editOrder ? completeMoneyInput(String(editOrder.suggestedValue).replace('.', ',')) : '');
  const [contentInspectionAccepted, setContentInspectionAccepted] = useState(editOrder?.contentInspectionAccepted ?? false);
  const [transportComplianceAccepted, setTransportComplianceAccepted] = useState(editOrder?.transportComplianceAccepted ?? false);
  const isElectronic = ELECTRONIC_CATEGORIES.includes(category as typeof ELECTRONIC_CATEGORIES[number]);
  const declaredLimit = 2000;
  const weightLimit = 5;
  const airports = AIRPORT_OPTIONS.map((airport) => airport.label);
  const dates = useMemo(() => {
    const availableDates = futureDates();
    return editOrder?.deadlineDate && !availableDates.includes(editOrder.deadlineDate) ? [editOrder.deadlineDate, ...availableDates] : availableDates;
  }, [editOrder?.deadlineDate]);
  const declaredNumber = numberValue(declaredValue);
  const weightNumber = numberValue(weight);
  const weightInKg = weightUnit === 'g' ? weightNumber / 1000 : weightNumber;
  const showStepErrors = attemptedStep === step;

  const fieldErrors = {
    itemName: !itemName.trim() ? 'Informe o nome do item.' : undefined,
    category: !category ? 'Selecione uma categoria.' : undefined,
    photos: !photoUris.length ? 'Adicione pelo menos uma foto do item.' : undefined,
    declaredValue: declaredNumber <= 0
      ? 'Informe o valor declarado.'
      : declaredNumber > declaredLimit
        ? `O valor máximo permitido é ${formatMoney(declaredLimit)}.`
        : undefined,
    weight: weightNumber <= 0
      ? 'Informe o peso do item.'
      : weightInKg > weightLimit
        ? `O peso máximo permitido é ${weightLimit} kg (5.000 g).`
        : undefined,
    brand: isElectronic && !brand.trim() ? 'Informe a marca do eletrônico.' : undefined,
    model: isElectronic && !model.trim() ? 'Informe o modelo do eletrônico.' : undefined,
    condition: isElectronic && !condition ? 'Selecione o estado do eletrônico.' : undefined,
    originCity: !originCity ? 'Selecione o aeroporto de origem.' : undefined,
    pickupAddress: pickupHandoffPreference === 'fora_aeroporto' && !pickupAddress.trim() ? 'Informe o endereço de retirada fora do aeroporto.' : undefined,
    pickupName: !pickupName.trim() ? 'Informe a pessoa de contato.' : undefined,
    pickupPhone: !hasValidPhone(pickupPhone) ? 'Informe um celular com DDD e 9 dígitos.' : undefined,
    destinationCity: !destinationCity
      ? 'Selecione o aeroporto de destino.'
      : destinationCity === originCity
        ? 'O aeroporto de destino deve ser diferente da origem.'
        : undefined,
    deliveryAddress: deliveryHandoffPreference === 'fora_aeroporto' && !deliveryAddress.trim() ? 'Informe o endereço de entrega fora do aeroporto.' : undefined,
    deliveryName: !deliveryName.trim() ? 'Informe quem vai receber.' : undefined,
    deliveryPhone: !hasValidPhone(deliveryPhone) ? 'Informe um celular com DDD e 9 dígitos.' : undefined,
    deadlineDate: !deadlineDate ? 'Selecione a data limite.' : undefined,
    deadlineTime: !deadlineTime ? 'Selecione o horário limite.' : undefined,
    suggestedValue: numberValue(suggestedValue) <= 0 ? 'Informe o valor sugerido ao viajante.' : undefined,
    contentInspectionAccepted: !contentInspectionAccepted ? 'Confirme que o item poderá ser aberto e conferido.' : undefined,
    transportComplianceAccepted: !transportComplianceAccepted ? 'Confirme a declaração de conformidade para transporte aéreo.' : undefined,
  };

  const stepHasErrors = [
    Boolean(fieldErrors.itemName || fieldErrors.category || fieldErrors.photos || fieldErrors.declaredValue || fieldErrors.weight || fieldErrors.brand || fieldErrors.model || fieldErrors.condition),
    Boolean(fieldErrors.originCity || fieldErrors.pickupAddress || fieldErrors.pickupName || fieldErrors.pickupPhone),
    Boolean(fieldErrors.destinationCity || fieldErrors.deliveryAddress || fieldErrors.deliveryName || fieldErrors.deliveryPhone),
    Boolean(fieldErrors.deadlineDate || fieldErrors.deadlineTime),
    Boolean(fieldErrors.suggestedValue || fieldErrors.contentInspectionAccepted || fieldErrors.transportComplianceAccepted),
  ];

  const canContinue = !stepHasErrors[step];

  function next() {
    setAttemptedStep(step);
    if (!canContinue) {
      return;
    }
    if (step < 4) {
      setStep((current) => current + 1);
      setAttemptedStep(null);
    }
    else publish();
  }

  function back() {
    if (step > 0) {
      setStep((current) => current - 1);
      setAttemptedStep(null);
      return;
    }
    router.back();
  }

  function publish() {
    const resolvedPickupAddress = pickupHandoffPreference === 'aeroporto'
      ? pickupAirportMeetingPoint.trim() || `Saguão de ${pickupAirportArea} – ${originCity}`
      : pickupHandoffPreference === 'flexivel'
        ? [pickupAirportMeetingPoint.trim() ? `No aeroporto: ${pickupAirportMeetingPoint.trim()}` : '', pickupAddress.trim() ? `Fora do aeroporto: ${pickupAddress.trim()}` : ''].filter(Boolean).join(' · ') || 'Flexível: aeroporto ou local combinado'
        : pickupAddress.trim();
    const resolvedDeliveryAddress = deliveryHandoffPreference === 'aeroporto'
      ? deliveryAirportMeetingPoint.trim() || `Saguão de desembarque – ${destinationCity}`
      : deliveryHandoffPreference === 'flexivel'
        ? [deliveryAirportMeetingPoint.trim() ? `No aeroporto: ${deliveryAirportMeetingPoint.trim()}` : '', deliveryAddress.trim() ? `Fora do aeroporto: ${deliveryAddress.trim()}` : ''].filter(Boolean).join(' · ') || 'Flexível: aeroporto ou local combinado'
        : deliveryAddress.trim();
    const input = {
      itemName: itemName.trim(), category, description: description.trim(), declaredValue: numberValue(declaredValue), weight: `${weight.trim()} ${weightUnit}`, size,
      brand: brand.trim() || undefined, model: model.trim() || undefined, itemCondition: condition || undefined,
      photoUris,
      supportingDocument,
      originCity, destinationCity, pickupHandoffPreference, deliveryHandoffPreference,
      pickupAddress: resolvedPickupAddress, pickupContactName: pickupName.trim(), pickupContactPhone: pickupPhone.trim(),
      deliveryAddress: resolvedDeliveryAddress, deliveryContactName: deliveryName.trim(), deliveryContactPhone: deliveryPhone.trim(),
      deadlineDate, deadlineTime, orderType, suggestedValue: numberValue(suggestedValue),
      contentInspectionAccepted,
      transportComplianceAccepted,
    };
    if (editOrder) {
      updateOrder(editOrder.id, input);
      router.back();
      return;
    }
    const order = createOrder(input);
    router.replace({ pathname: '/pedido/[id]', params: { id: order.id, created: '1' } });
  }

  async function pickPhotos() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, 5 - photoUris.length),
        quality: 0.8,
      });
      if (!result.canceled) {
        setPhotoUris((current) => [...new Set([...current, ...result.assets.map((asset) => asset.uri)])].slice(0, 5));
      }
    } catch {
      Alert.alert('Não foi possível abrir as fotos', 'Verifique a permissão de acesso à galeria e tente novamente.');
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled) {
        const document = result.assets[0];
        setSupportingDocument({ uri: document.uri, name: document.name, mimeType: document.mimeType });
      }
    } catch {
      Alert.alert('Não foi possível anexar o documento', 'Tente novamente com um arquivo PDF ou imagem.');
    }
  }

  return (
    <Screen>
      <AppHeader title={editOrder ? 'Editar pedido' : 'Criar pedido'} subtitle={`Etapa ${step + 1} de 5 · ${STEPS[step]}`} back onBack={back} />
      <View style={styles.progress}>{STEPS.map((label, index) => <View key={label} style={[styles.progressBar, index <= step && styles.progressActive]} />)}</View>
      <View style={styles.stepIntro}>
        <Text style={styles.stepTitle}>{['O que você quer enviar?', 'Onde o viajante retira o item?', 'Onde entregar?', 'Até quando precisa chegar?', 'Quanto oferece ao viajante?'][step]}</Text>
        <Text style={styles.stepBody}>{['Descreva com clareza para o viajante decidir com segurança.', 'Informe onde o viajante deverá receber o item antes de embarcar e levá-lo na viagem.', 'Escolha o aeroporto e confirme onde o viajante deverá entregar o item ao destinatário.', 'Escolha uma data nos próximos 30 dias e um horário limite.', 'Publicar é grátis. A taxa só é paga quando houver um match.'][step]}</Text>
      </View>

      {step === 0 ? <>
        <TextField label="Nome do item" required value={itemName} onChangeText={setItemName} placeholder="Ex.: Três livros universitários" error={showStepErrors ? fieldErrors.itemName : undefined} />
        <SelectField label="Categoria" required value={category} placeholder="Selecione uma categoria" options={APPROVED_ITEM_CATEGORIES} onSelect={setCategory} error={showStepErrors ? fieldErrors.category : undefined} />
        <TextField label="Descrição" value={description} onChangeText={setDescription} placeholder="Conteúdo, embalagem e cuidados necessários (opcional)" multiline />

        <Text style={styles.label}>Fotos do item<Text style={styles.required}> *</Text></Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickPhotos}>
          <View style={styles.uploadIcon}><Feather name="camera" size={21} color={colors.primaryDark} /></View>
          <View style={styles.uploadCopy}>
            <Text style={styles.uploadTitle}>{photoUris.length ? 'Adicionar mais fotos' : 'Adicionar fotos'}</Text>
            <Text style={styles.uploadBody}>Obrigatório · até 5 imagens</Text>
          </View>
          <Feather name="plus" size={20} color={colors.primaryDark} />
        </TouchableOpacity>
        {showStepErrors && fieldErrors.photos ? <Text style={styles.customError}>{fieldErrors.photos}</Text> : null}
        {photoUris.length ? <View style={styles.photoGrid}>{photoUris.map((uri, index) => <View key={uri} style={styles.photoWrap}><Image source={{ uri }} style={styles.photo} /><TouchableOpacity style={styles.removePhoto} onPress={() => setPhotoUris((current) => current.filter((item) => item !== uri))}><Feather name="x" size={13} color="#fff" /></TouchableOpacity><Text style={styles.photoNumber}>{index + 1}</Text></View>)}</View> : null}

        <Text style={styles.label}>Nota fiscal ou declaração <Text style={styles.optional}>(opcional)</Text></Text>
        <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
          <View style={styles.uploadIcon}><Feather name="file-text" size={21} color={colors.primaryDark} /></View>
          <View style={styles.uploadCopy}>
            <Text style={styles.uploadTitle} numberOfLines={1}>{supportingDocument?.name ?? 'Anexar documento'}</Text>
            <Text style={styles.uploadBody}>PDF ou imagem</Text>
          </View>
          {supportingDocument ? <TouchableOpacity onPress={() => setSupportingDocument(undefined)}><Feather name="x" size={20} color={colors.danger} /></TouchableOpacity> : <Feather name="paperclip" size={19} color={colors.primaryDark} />}
        </TouchableOpacity>

        <TextField label={`Valor declarado (máx. ${formatMoney(declaredLimit)})`} required prefix="R$" value={declaredValue} onChangeText={(value) => setDeclaredValue(decimalInput(value))} onBlur={() => setDeclaredValue((value) => completeMoneyInput(value))} placeholder="0,00" keyboardType="decimal-pad" error={showStepErrors || declaredNumber > declaredLimit ? fieldErrors.declaredValue : undefined} />
        <View style={styles.row}>
          <View style={styles.weightValue}><TextField label="Peso" required value={weight} onChangeText={(value) => setWeight(decimalInput(value))} placeholder={weightUnit === 'kg' ? 'Ex.: 1,5' : 'Ex.: 750'} keyboardType="decimal-pad" error={showStepErrors || weightInKg > weightLimit ? fieldErrors.weight : undefined} /></View>
          <View style={styles.weightUnit}><SelectField label="Unidade" required value={weightUnit} placeholder="Selecione" options={['kg', 'g']} onSelect={(value) => setWeightUnit(value as 'kg' | 'g')} /></View>
        </View>
        <Text style={styles.weightHint}>{weightUnit === 'kg' ? 'Peso em quilogramas' : 'Peso em gramas'} · limite de 5 kg ou 5.000 g</Text>
        <Text style={styles.label}>Tamanho<Text style={styles.required}> *</Text></Text><View style={styles.chips}>{(['Pequeno', 'Médio'] as const).map((item) => <Chip key={item} label={item} selected={size === item} onPress={() => setSize(item)} />)}</View>
        {isElectronic ? <View style={styles.electronic}><View style={styles.electronicTitle}><Feather name="smartphone" size={18} color={colors.purple} /><Text style={styles.electronicText}>Detalhes do eletrônico</Text></View><TextField label="Marca" required value={brand} onChangeText={setBrand} placeholder="Ex.: Apple" error={showStepErrors ? fieldErrors.brand : undefined} /><TextField label="Modelo" required value={model} onChangeText={setModel} placeholder="Ex.: iPhone 15" error={showStepErrors ? fieldErrors.model : undefined} /><SelectField label="Estado do item" required value={condition} placeholder="Selecione" options={['Novo', 'Seminovo', 'Usado em bom estado', 'Usado funcionando']} onSelect={setCondition} error={showStepErrors ? fieldErrors.condition : undefined} /></View> : null}
      </> : null}

      {step === 1 ? <>
        <SelectField label="Aeroporto de origem" required value={originCity} placeholder="Selecione" options={airports.filter((airport) => airport !== destinationCity)} onSelect={setOriginCity} error={showStepErrors ? fieldErrors.originCity : undefined} />
        <Text style={styles.label}>Onde o viajante receberá o item?<Text style={styles.required}> *</Text></Text>
        <TextField label="Outro ponto dentro do aeroporto (opcional)" value={pickupAirportMeetingPoint} onChangeText={setPickupAirportMeetingPoint} placeholder="Ex.: check-in da LATAM ou ao lado da casa de câmbio" />
        <View style={styles.chips}>{PICKUP_HANDOFF_OPTIONS.map((option) => <Chip key={`${option.value}-${option.airportArea ?? 'geral'}`} label={option.label} selected={option.value === 'aeroporto' ? pickupHandoffPreference === 'aeroporto' && pickupAirportArea === option.airportArea : pickupHandoffPreference === option.value} onPress={() => { setPickupHandoffPreference(option.value); if (option.airportArea) setPickupAirportArea(option.airportArea); }} />)}</View>
        <Text style={styles.locationHint}>{pickupHandoffPreference === 'aeroporto' ? `Você entregará o item ao viajante no saguão de ${pickupAirportArea} do aeroporto selecionado, antes de ele levá-lo na viagem.` : pickupHandoffPreference === 'fora_aeroporto' ? 'Você informará um endereço fora do aeroporto onde o viajante deverá receber o item.' : 'O viajante poderá receber o item no aeroporto ou em outro endereço previamente combinado entre as partes.'}</Text>
        {pickupHandoffPreference !== 'aeroporto' ? <TextField label={pickupHandoffPreference === 'fora_aeroporto' ? 'Endereço de retirada' : 'Endereço alternativo (opcional)'} required={pickupHandoffPreference === 'fora_aeroporto'} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Rua, número e bairro" error={showStepErrors ? fieldErrors.pickupAddress : undefined} /> : null}
        <TextField label="Pessoa de contato" required value={pickupName} onChangeText={setPickupName} placeholder="Nome completo" error={showStepErrors ? fieldErrors.pickupName : undefined} />
        <TextField label="Telefone" required value={pickupPhone} onChangeText={(value) => setPickupPhone(formatPhoneInput(value))} maxLength={15} keyboardType="phone-pad" placeholder="(00) 00000-0000" error={showStepErrors ? fieldErrors.pickupPhone : undefined} />
      </> : null}

      {step === 2 ? <>
        <SelectField label="Aeroporto de destino" required value={destinationCity} placeholder="Selecione" options={airports.filter((airport) => airport !== originCity)} onSelect={setDestinationCity} error={showStepErrors ? fieldErrors.destinationCity : undefined} />
        <Text style={styles.label}>Local de entrega<Text style={styles.required}> *</Text></Text>
        <TextField label="Outro ponto dentro do aeroporto (opcional)" value={deliveryAirportMeetingPoint} onChangeText={setDeliveryAirportMeetingPoint} placeholder="Ex.: check-in da LATAM ou ao lado da casa de câmbio" />
        <View style={styles.chips}>{DELIVERY_HANDOFF_OPTIONS.map((option) => <Chip key={option.value} label={option.label} selected={deliveryHandoffPreference === option.value} onPress={() => setDeliveryHandoffPreference(option.value)} />)}</View>
        <Text style={styles.locationHint}>{deliveryHandoffPreference === 'aeroporto' ? 'O viajante entregará o item ao destinatário no saguão de desembarque do aeroporto selecionado.' : deliveryHandoffPreference === 'fora_aeroporto' ? 'Informe o endereço fora do aeroporto onde o viajante deverá entregar o item.' : 'O viajante poderá entregar o item no aeroporto ou em outro endereço previamente combinado entre as partes.'}</Text>
        {deliveryHandoffPreference !== 'aeroporto' ? <TextField label={deliveryHandoffPreference === 'fora_aeroporto' ? 'Endereço de entrega' : 'Endereço alternativo (opcional)'} required={deliveryHandoffPreference === 'fora_aeroporto'} value={deliveryAddress} onChangeText={setDeliveryAddress} placeholder="Rua, número e bairro" error={showStepErrors ? fieldErrors.deliveryAddress : undefined} /> : null}
        <TextField label="Quem vai receber" required value={deliveryName} onChangeText={setDeliveryName} placeholder="Nome completo" error={showStepErrors ? fieldErrors.deliveryName : undefined} />
        <TextField label="Telefone" required value={deliveryPhone} onChangeText={(value) => setDeliveryPhone(formatPhoneInput(value))} maxLength={15} keyboardType="phone-pad" placeholder="(00) 00000-0000" error={showStepErrors ? fieldErrors.deliveryPhone : undefined} />
      </> : null}

      {step === 3 ? <>
        <SelectField label="Data limite" required value={deadlineDate} placeholder="Selecione uma data" options={dates} onSelect={setDeadlineDate} error={showStepErrors ? fieldErrors.deadlineDate : undefined} />
        <SelectField label="Horário limite" required value={deadlineTime} placeholder="Selecione" options={TIMES} onSelect={setDeadlineTime} error={showStepErrors ? fieldErrors.deadlineTime : undefined} />
        <Text style={styles.label}>Prioridade<Text style={styles.required}> *</Text></Text><View style={styles.priorityRow}><TouchableOpacity onPress={() => setOrderType('comum')} style={[styles.priority, orderType === 'comum' && styles.prioritySelected]}><Feather name="clock" size={20} color={orderType === 'comum' ? colors.primaryDark : colors.muted} /><Text style={styles.priorityTitle}>Comum</Text><Text style={styles.priorityFee}>Taxa R$ 19,90</Text></TouchableOpacity><TouchableOpacity onPress={() => setOrderType('urgente')} style={[styles.priority, orderType === 'urgente' && styles.priorityUrgent]}><Feather name="zap" size={20} color={orderType === 'urgente' ? colors.orange : colors.muted} /><Text style={styles.priorityTitle}>Urgente</Text><Text style={styles.priorityFee}>Taxa R$ 39,90</Text></TouchableOpacity></View>
      </> : null}

      {step === 4 ? <>
        <View style={styles.summary}><Text style={styles.summaryItem}>{itemName}</Text><Text style={styles.summaryRoute}>{originCity} → {destinationCity}</Text><Text style={styles.summaryMeta}>Entrega até {deadlineDate}, {deadlineTime}</Text></View>
        <TextField label="Valor sugerido ao viajante" required prefix="R$" value={suggestedValue} onChangeText={(value) => setSuggestedValue(decimalInput(value))} onBlur={() => setSuggestedValue((value) => completeMoneyInput(value))} keyboardType="decimal-pad" placeholder="80,00" error={showStepErrors ? fieldErrors.suggestedValue : undefined} />
        <View style={styles.feeInfo}><Feather name="info" size={18} color={colors.primaryDark} /><Text style={styles.feeText}>Você paga {formatMoney(orderType === 'urgente' ? 39.9 : 19.9)} à LevAí somente depois de aceitar uma proposta. O valor ao viajante é combinado diretamente.</Text></View>
        <View style={styles.confirmations}>
          <Text style={styles.confirmationsTitle}>Declarações obrigatórias<Text style={styles.required}> *</Text></Text>
          <ConfirmationRow
            checked={contentInspectionAccepted}
            onPress={() => setContentInspectionAccepted((current) => !current)}
            text="Declaro que o item poderá ser aberto e conferido, não está lacrado e contém somente o material informado neste pedido."
            error={showStepErrors ? fieldErrors.contentInspectionAccepted : undefined}
          />
          <ConfirmationRow
            checked={transportComplianceAccepted}
            onPress={() => setTransportComplianceAccepted((current) => !current)}
            text="Declaro estar ciente de que sou responsável por verificar que o item respeita as regras da LevAí, as normas aplicáveis da ANAC e a legislação brasileira para transporte aéreo."
            error={showStepErrors ? fieldErrors.transportComplianceAccepted : undefined}
          />
        </View>
      </> : null}

      {showStepErrors && !canContinue ? <View style={styles.errorBanner}><Feather name="alert-circle" size={18} color={colors.danger} /><Text style={styles.errorBannerText}>Revise os campos indicados antes de continuar.</Text></View> : null}
      <View style={styles.actions}>{step > 0 ? <View style={styles.backButton}><Button label="Voltar" variant="secondary" onPress={back} /></View> : null}<View style={styles.nextButton}><Button label={step === 4 ? (editOrder ? 'Salvar alterações' : 'Publicar pedido') : 'Continuar'} icon={step === 4 ? 'check' : 'arrow-right'} onPress={next} /></View></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 6, marginBottom: 26 },
  progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  progressActive: { backgroundColor: colors.yellow },
  stepIntro: { marginBottom: 24 },
  stepTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 30, color: colors.text },
  stepBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 7 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  weightValue: { flex: 1.35 },
  weightUnit: { flex: 0.65 },
  weightHint: { marginTop: -10, marginBottom: 18, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted },
  locationHint: { marginTop: -10, marginBottom: 18, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text, marginBottom: 8 },
  required: { color: colors.danger },
  optional: { color: colors.muted, fontFamily: 'Inter_400Regular' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  uploadBox: { minHeight: 68, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  uploadIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center' },
  uploadCopy: { flex: 1 },
  uploadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.text },
  uploadBody: { fontFamily: 'Inter_400Regular', fontSize: 10, color: colors.muted, marginTop: 3 },
  customError: { marginTop: -8, marginBottom: 14, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, color: colors.danger },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 18 },
  photoWrap: { width: 72, height: 72, borderRadius: 14, overflow: 'visible' },
  photo: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.input },
  removePhoto: { position: 'absolute', right: -5, top: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  photoNumber: { position: 'absolute', left: 6, bottom: 5, minWidth: 18, height: 18, borderRadius: 9, textAlign: 'center', lineHeight: 18, backgroundColor: '#111111CC', color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 9 },
  electronic: { borderRadius: 18, padding: 15, backgroundColor: '#F3EEFF', borderWidth: 1, borderColor: '#E4D8FF' },
  electronicTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  electronicText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.purple },
  priorityRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  priority: { flex: 1, borderRadius: 17, padding: 16, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  prioritySelected: { borderColor: colors.primary, backgroundColor: colors.successSoft },
  priorityUrgent: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  priorityTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text, marginTop: 10 },
  priorityFee: { fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.muted, marginTop: 3 },
  summary: { borderRadius: 18, backgroundColor: colors.text, padding: 18, marginBottom: 18 },
  summaryItem: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 17 },
  summaryRoute: { fontFamily: 'Inter_600SemiBold', color: colors.yellow, fontSize: 13, marginTop: 10 },
  summaryMeta: { fontFamily: 'Inter_400Regular', color: '#BFC1C5', fontSize: 11, marginTop: 4 },
  feeInfo: { flexDirection: 'row', gap: 9, backgroundColor: colors.successSoft, padding: 14, borderRadius: 15 },
  feeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: colors.primaryDark },
  confirmations: { marginTop: 20 },
  confirmationsTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.text, marginBottom: 12 },
  confirmationWrap: { marginBottom: 13 },
  confirmationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  confirmationBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  confirmationBoxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  confirmationBoxError: { borderColor: colors.danger },
  confirmationText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, color: colors.text },
  confirmationError: { marginLeft: 32, marginTop: 4, fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 15, color: colors.danger },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, borderWidth: 1, borderColor: '#F5CACA', backgroundColor: '#FFF3F3', padding: 13, marginTop: 22 },
  errorBannerText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 17, color: colors.danger },
  actions: { flexDirection: 'row', gap: 10, marginTop: 26 },
  backButton: { flex: 0.42 },
  nextButton: { flex: 1 },
});
