import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

// Preenchidas no arquivo .env.local (veja docs/NUVEM.md). Precisam ser lidas assim, com ponto,
// para o Expo embutir os valores no app.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const chave = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Sem as variáveis, o app funciona só no aparelho, como antes. */
export const nuvemConfigurada = !!url && !!chave;

export const supabase: SupabaseClient | null = nuvemConfigurada
  ? createClient(url!, chave!, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// No celular, só renova o login enquanto o app está aberto na tela.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Mensagem de erro em português para mostrar ao usuário */
export function msgErro(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e);
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos e tente de novo.';
  if (/already registered|already been registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar".';
  if (/password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/unable to validate email|invalid email/i.test(m)) return 'E-mail inválido.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (/failed to fetch|network request failed|network error|load failed/i.test(m)) return 'Sem conexão com a internet.';
  return m;
}
