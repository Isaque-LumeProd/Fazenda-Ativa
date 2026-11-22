import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui';
import { C } from '@/constants/theme';
import { useConta } from '@/lib/conta';
import type { IconName } from '@/lib/constants';
import { useStore } from '@/lib/store';
import { useSyncStatus, type EstadoSync } from '@/lib/sync';

const VISUAL: Record<EstadoSync, { icone: IconName; cor: string; texto: string }> = {
  desligado: { icone: 'cloud-outline', cor: C.muted, texto: 'Sincronização desligada' },
  sincronizando: { icone: 'cloud-sync-outline', cor: C.info, texto: 'Sincronizando' },
  ok: { icone: 'cloud-check-outline', cor: C.primary, texto: 'Tudo salvo na nuvem' },
  offline: { icone: 'cloud-off-outline', cor: C.warning, texto: 'Sem internet: salvo no aparelho' },
  erro: { icone: 'cloud-alert', cor: C.danger, texto: 'Erro ao sincronizar' },
};

/** Ícone de nuvem no cabeçalho: mostra se os dados já foram enviados. */
export function SyncIcone() {
  const conectado = useConta((s) => s.modo === 'nuvem' && !!s.fazenda);
  const estado = useSyncStatus((s) => s.estado);
  const pendentes = useStore((s) => Object.keys(s.sync.pendentes).length);
  if (!conectado) return null;
  const v = VISUAL[estado === 'ok' && pendentes > 0 ? 'sincronizando' : estado];
  return (
    <Pressable
      onPress={() => router.push('/config')}
      hitSlop={8}
      style={{ paddingHorizontal: 8 }}
      accessibilityRole="button"
      accessibilityLabel={v.texto}>
      <Icon name={v.icone} color={v.cor} />
    </Pressable>
  );
}

export function textoSync(estado: EstadoSync, pendentes: number): { texto: string; cor: string; icone: IconName } {
  const v = VISUAL[estado];
  if (pendentes > 0 && estado !== 'sincronizando') {
    return {
      texto: `${pendentes} ${pendentes === 1 ? 'alteração aguardando' : 'alterações aguardando'} envio`,
      cor: estado === 'erro' ? C.danger : C.warning,
      icone: v.icone,
    };
  }
  return { texto: v.texto, cor: v.cor, icone: v.icone };
}
