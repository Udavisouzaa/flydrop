import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Screen, SelectField, TextField, typography } from '@/components/ui';
import { colors } from '@/constants/colors';
import { CITIES, useApp } from '@/context/AppContext';

export default function AuthScreen() {
  const { login } = useApp();
  const [name, setName] = useState('Veridiano Fernandes');
  const [email, setEmail] = useState('veridiano@exemplo.com');
  const [phone, setPhone] = useState('(48) 99999-9999');
  const [city, setCity] = useState('Florianópolis');

  function handleContinue() {
    if (!name.trim() || !email.includes('@') || !phone.trim() || !city) {
      Alert.alert('Confira os dados', 'Preencha nome, e-mail, telefone e cidade.');
      return;
    }
    login({ name, email, phone, city });
    router.replace('/(tabs)');
  }

  return (
    <Screen style={styles.screen}>
      <View style={styles.brandMark}>
        <Text style={styles.brandL}>L</Text>
        <View style={styles.brandArrow}><Text style={styles.brandArrowText}>↗</Text></View>
      </View>
      <Text style={styles.brand}>LevAí</Text>
      <Text style={typography.title}>Sua viagem pode levar mais.</Text>
      <Text style={[typography.subtitle, styles.intro]}>Entre para enviar um item ou ganhar levando algo na sua próxima rota.</Text>
      <View style={styles.form}>
        <TextField label="Nome completo" value={name} onChangeText={setName} placeholder="Como podemos chamar você?" />
        <TextField label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="voce@email.com" />
        <TextField label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="(00) 00000-0000" />
        <SelectField label="Sua cidade" value={city} placeholder="Selecione" options={CITIES.map((item) => item.city)} onSelect={setCity} />
      </View>
      <Button label="Continuar" icon="arrow-right" onPress={handleContinue} />
      <Text style={styles.terms}>Ao continuar, você concorda com os termos de uso e reconhece que esta versão usa pagamentos simulados.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 34, paddingBottom: 34 },
  brandMark: { width: 58, height: 58, borderRadius: 19, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brandL: { fontFamily: 'Inter_700Bold', fontSize: 30, color: colors.text, marginLeft: -8 },
  brandArrow: { position: 'absolute', right: 8, top: 6 },
  brandArrowText: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.primaryDark },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 17, color: colors.primaryDark, marginBottom: 16 },
  intro: { marginTop: 10, maxWidth: 360 },
  form: { marginTop: 28, marginBottom: 6 },
  terms: { textAlign: 'center', fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, color: colors.muted, marginTop: 16, paddingHorizontal: 12 },
});
