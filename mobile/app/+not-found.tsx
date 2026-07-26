import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';

export default function NotFoundScreen() {
  return <Screen style={styles.screen}><Text style={styles.code}>404</Text><Text style={styles.title}>Essa rota não embarcou.</Text><Text style={styles.body}>Volte ao início para continuar usando o LevAí.</Text><Button label="Ir para o início" onPress={() => router.replace('/(tabs)')} /></Screen>;
}

const styles = StyleSheet.create({ screen: { justifyContent: 'center' }, code: { fontFamily: 'Inter_700Bold', fontSize: 60, color: colors.yellow }, title: { fontFamily: 'Inter_700Bold', fontSize: 24, color: colors.text }, body: { fontFamily: 'Inter_400Regular', fontSize: 13, color: colors.muted, marginTop: 7, marginBottom: 24 } });
