import { router } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Linha, Sheet } from '@/components/ui';
import { C, F, MaxW, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import type { IconName } from '@/lib/constants';

const ABAS: Record<string, { label: string; icone: IconName; iconeAtivo: IconName }> = {
  index: { label: 'Hoje', icone: 'home-outline', iconeAtivo: 'home' },
  aves: { label: 'Aves', icone: 'egg-outline', iconeAtivo: 'egg' },
  gado: { label: 'Gado', icone: 'cow', iconeAtivo: 'cow' },
  perfil: { label: 'Perfil', icone: 'account-outline', iconeAtivo: 'account' },
};

function BarraAbas({ state, navigateToTab, abrirNova }: BottomTabBarProps & { abrirNova: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.barra, { paddingBottom: Math.max(insets.bottom, S.sm) }]}>
      <View style={s.barraInner}>
        {state.routes.map((route, i) => {
          if (route.name === 'nova') {
            return (
              <Pressable key={route.key} onPress={abrirNova} style={s.aba} accessibilityRole="button" accessibilityLabel="Nova">
                <View style={s.nova}>
                  <Icon name="plus" size={32} color="#fff" />
                </View>
                <Text style={[s.label, { color: C.text }]}>Nova</Text>
              </Pressable>
            );
          }
          const cfg = ABAS[route.name];
          if (!cfg) return null;
          const ativo = state.index === i;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              accessibilityLabel={cfg.label}
              onPress={() => {
                if (!ativo) navigateToTab(route.key);
              }}
              style={s.aba}>
              <View style={[s.iconeAba, ativo && { backgroundColor: C.primarySoft }]}>
                <Icon name={ativo ? cfg.iconeAtivo : cfg.icone} size={24} color={ativo ? C.primaryDark : C.muted} />
              </View>
              <Text style={[s.label, ativo && { color: C.text, fontFamily: F.bold }]}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const OPCOES: { titulo: string; sub: string; icone: IconName; cor: string; rota: string; soDono?: boolean }[] = [
  { titulo: 'Nova chocada', sub: 'Calendário automático, viragem e ovoscopia', icone: 'egg-outline', cor: C.ouro, rota: '/chocada/form' },
  { titulo: 'Registrar nas aves', sub: 'Ovos, ração, água, vacina, mortalidade…', icone: 'clipboard-text-outline', cor: C.primary, rota: '/manejo/novo' },
  { titulo: 'Registrar no gado', sub: 'Pesagem, vacina, cobertura, parto…', icone: 'clipboard-pulse-outline', cor: C.terra, rota: '/gado/evento' },
  { titulo: 'Cadastrar animal', sub: 'Vaca, novilha, bezerro, touro…', icone: 'cow', cor: C.primaryDark, rota: '/animal/form', soDono: true },
  { titulo: 'Nova tarefa da rotina', sub: 'Água, ração, limpeza com lembrete', icone: 'calendar-check', cor: C.info, rota: '/tarefa/form' },
];

export default function TabsLayout() {
  const [nova, setNova] = useState(false);
  const { editarCadastros } = usePermissoes();

  return (
    <>
      <Tabs
        tabBar={(props) => <BarraAbas {...props} abrirNova={() => setNova(true)} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
        <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
        <Tabs.Screen name="aves" options={{ title: 'Aves' }} />
        <Tabs.Screen name="nova" options={{ title: 'Nova' }} />
        <Tabs.Screen name="gado" options={{ title: 'Gado' }} />
        <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      </Tabs>
      <Sheet visible={nova} onClose={() => setNova(false)} title="O que você quer fazer?">
        <View style={{ marginHorizontal: -S.xl }}>
          {OPCOES.filter((o) => !o.soDono || editarCadastros).map((o, i) => (
            <Linha
              key={o.rota}
              primeira={i === 0}
              title={o.titulo}
              subtitle={o.sub}
              icon={o.icone}
              iconColor={o.cor}
              onPress={() => {
                setNova(false);
                router.push(o.rota as never);
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );
}


const s = StyleSheet.create({
  barra: { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, alignItems: 'center' },
  barraInner: { flexDirection: 'row', width: '100%', maxWidth: MaxW, paddingTop: S.sm, paddingHorizontal: S.sm },
  aba: { flex: 1, alignItems: 'center', gap: 4 },
  iconeAba: { width: 64, height: 36, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, color: C.muted, fontFamily: F.semibold },
  nova: {
    width: 60,
    height: 52,
    marginTop: -14,
    borderRadius: 18,
    backgroundColor: C.terra,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.terra,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
