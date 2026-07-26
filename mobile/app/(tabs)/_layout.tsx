import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { colors } from '@/constants/colors';

const icons = {
  index: 'home',
  viagens: 'send',
  pedidos: 'package',
  acompanhar: 'map-pin',
  carteira: 'credit-card',
} as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: '#8A8D92',
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
        tabBarStyle: {
          position: 'absolute',
          height: Platform.OS === 'ios' ? 84 : 70,
          paddingTop: 9,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          backgroundColor: '#FFFFFFF5',
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, size }) => <Feather name={icons[route.name as keyof typeof icons] ?? 'circle'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="viagens" options={{ title: 'Levar' }} />
      <Tabs.Screen name="acompanhar" options={{ title: 'Acompanhar' }} />
      <Tabs.Screen name="pedidos" options={{ title: 'Pedir' }} />
      <Tabs.Screen name="carteira" options={{ title: 'Carteira' }} />
    </Tabs>
  );
}
