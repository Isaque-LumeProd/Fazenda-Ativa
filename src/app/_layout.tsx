import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { C } from '@/constants/theme';
import { atualizarFazenda, useConta } from '@/lib/conta';
import { useStore } from '@/lib/store';
import { nuvemConfigurada } from '@/lib/supabase';
import { iniciar } from '@/lib/sync';

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.primary, background: C.bg, card: C.card, text: C.text, border: C.border },
};

const TELAS_DO_APP = [
  'campo',
  'config',
  'estoque/form',
  'estoque/[id]',
  'galinheiro/form',
  'galinheiro/[id]',
  'lote/form',
  'lote/[id]',
  'manejo/novo',
  'tarefa/form',
];

/** Liga a sincronização enquanto houver usuário conectado a uma fazenda. */
function useSincronizacao(ativo: boolean, fazendaId: string | undefined) {
  useEffect(() => {
    if (!ativo || !fazendaId) return;
    void atualizarFazenda();
    return iniciar(fazendaId);
  }, [ativo, fazendaId]);
}

export default function RootLayout() {
  const dadosProntos = useStore((s) => s.hidratado);
  const contaPronta = useConta((s) => s.hidratado && s.sessaoCarregada);
  const modo = useConta((s) => s.modo);
  const userId = useConta((s) => s.userId);
  const fazendaId = useConta((s) => s.fazenda?.id);

  const conectado = nuvemConfigurada && modo === 'nuvem' && !!userId && !!fazendaId;
  const precisaConta = nuvemConfigurada && modo !== 'local' && !conectado;
  useSincronizacao(conectado && dadosProntos, fazendaId);

  if (!dadosProntos || !contaPronta) {
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
        {/* Todas as telas do app ficam bloqueadas até entrar na conta (ou escolher usar sem conta). */}
        <Stack.Protected guard={!precisaConta}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
          {TELAS_DO_APP.map((nome) => (
            <Stack.Screen key={nome} name={nome} />
          ))}
        </Stack.Protected>
        <Stack.Protected guard={precisaConta}>
          <Stack.Screen name="conta" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
