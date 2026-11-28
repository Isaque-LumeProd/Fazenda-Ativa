import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
  useFonts,
} from '@expo-google-fonts/inter';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { C, F } from '@/constants/theme';
import { atualizarFazenda, useConta } from '@/lib/conta';
import { useStore } from '@/lib/store';
import { nuvemConfigurada } from '@/lib/supabase';
import { useLembretes } from '@/lib/lembretes';
import { iniciar } from '@/lib/sync';

const tema = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: C.primary, background: C.bg, card: C.card, text: C.text, border: C.border },
};

const TELAS_DO_APP = [
  'animal/[id]',
  'animal/form',
  'campo',
  'chocada/form',
  'config',
  'estoque/index',
  'estoque/form',
  'estoque/[id]',
  'gado/evento',
  'galinheiro/form',
  'galinheiro/[id]',
  'guia/index',
  'guia/incubacao',
  'guia/racas',
  'guia/pintinhos',
  'lote/form',
  'lote/[id]',
  'manejo/novo',
  'registros',
  'tarefa/form',
  'tarefas',
];

const TITULOS: Record<string, string> = {
  'estoque/index': 'Estoque',
  registros: 'Registros',
  tarefas: 'Tarefas da rotina',
  'guia/index': 'Guia do criador',
  'guia/incubacao': 'Incubação por espécie',
  'guia/racas': 'Raças',
  'guia/pintinhos': 'Cuidados com os filhotes',
  'gado/evento': 'Registrar no gado',
  campo: 'Modo Campo',
  config: 'Configurações',
};

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

  const [fontes] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black });
  useLembretes(dadosProntos);

  const conectado = nuvemConfigurada && modo === 'nuvem' && !!userId && !!fazendaId;
  useSincronizacao(conectado && dadosProntos, fazendaId);

  if (!dadosProntos || !contaPronta || !fontes) {
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
          headerTintColor: C.primaryDark,
          headerTitleStyle: { color: C.text, fontFamily: F.bold, fontSize: 18 },
          headerStyle: { backgroundColor: C.bg },
          headerShadowVisible: false,
          headerBackTitle: 'Voltar',
          contentStyle: { backgroundColor: C.bg },
        }}>
        {/* Tela de login fora da entrada por enquanto: o app abre direto. A conta fica acessível em Configurações. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Início' }} />
        {TELAS_DO_APP.map((nome) => (
          <Stack.Screen key={nome} name={nome} options={TITULOS[nome] ? { title: TITULOS[nome] } : undefined} />
        ))}
        <Stack.Screen name="chocada/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="conta" />
      </Stack>
    </ThemeProvider>
  );
}
