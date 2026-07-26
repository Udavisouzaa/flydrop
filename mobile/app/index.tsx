import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useApp } from '@/context/AppContext';

export default function Index() {
  const { hydrated, user } = useApp();
  if (!hydrated) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }
  return <Redirect href={user ? '/(tabs)' : '/auth'} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background } });
