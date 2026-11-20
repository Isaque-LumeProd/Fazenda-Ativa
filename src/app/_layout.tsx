import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { C } from '@/constants/theme';
import { useStore } from '@/lib/store';

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.primary, background: C.bg, card: C.card, text: C.text, border: C.border },
};

export default function RootLayout() {
  const hidratado = useStore((s) => s.hidratado);

  if (!hidratado) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={tema}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: C.primary,
          headerTitleStyle: { color: C.text },
          headerBackTitle: 'Voltar',
          contentStyle: { backgroundColor: C.bg },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
      </Stack>
    </ThemeProvider>
  );
}
