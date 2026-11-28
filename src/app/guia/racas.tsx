import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Chip, Icon, Row, Screen, Sheet, Tag, Txt } from '@/components/ui';
import { C, F, R, S, sombra } from '@/constants/theme';
import { GRUPOS_RACA, RACAS, type Aptidao, type GrupoRaca, type Raca } from '@/lib/guia';

const APTIDOES: Aptidao[] = ['Postura', 'Corte', 'Dupla aptidão', 'Leite', 'Ornamental', 'Guarda'];

export default function Racas() {
  const params = useLocalSearchParams<{ grupo?: GrupoRaca }>();
  const [grupo, setGrupo] = useState<GrupoRaca | 'todas'>(params.grupo ?? 'todas');
  const [apt, setApt] = useState<Aptidao | null>(null);
  const [busca, setBusca] = useState('');
  const [sel, setSel] = useState<Raca | null>(null);

  const termo = busca.trim().toLowerCase();
  const lista = RACAS.filter((r) => grupo === 'todas' || r.grupo === grupo)
    .filter((r) => !apt || r.aptidao === apt)
    .filter((r) => !termo || [r.nome, r.origem, r.aptidao, r.temperamento, r.sobre].some((x) => x.toLowerCase().includes(termo)));
  const grupos = (Object.keys(GRUPOS_RACA) as GrupoRaca[]).filter((g) => RACAS.some((r) => r.grupo === g));

  return (
    <Screen>
      <View style={[s.busca, sombra]}>
        <Icon name="magnify" size={24} color={C.muted} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar raça, origem ou característica"
          placeholderTextColor="#9AA096"
          style={s.buscaTxt}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        <Chip label="Todas" escuro ativo={grupo === 'todas'} onPress={() => setGrupo('todas')} />
        {grupos.map((g) => (
          <Chip key={g} label={GRUPOS_RACA[g].label} escuro ativo={grupo === g} onPress={() => setGrupo(g)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }} style={{ marginTop: -S.sm }}>
        {APTIDOES.map((a) => (
          <Chip key={a} label={a} escuro ativo={apt === a} onPress={() => setApt(apt === a ? null : a)} />
        ))}
      </ScrollView>
      <Txt v="muted">
        {lista.length} {lista.length === 1 ? 'raça' : 'raças'}
      </Txt>
      {lista.map((r) => (
        <Pressable key={r.id} onPress={() => setSel(r)} style={({ pressed }) => [s.item, sombra, pressed && { opacity: 0.8 }]}>
          <View style={[s.avatar, { borderColor: r.grupo === 'bovinos' ? C.primaryDark : C.terra }]}>
            <Txt style={{ fontSize: 30 }}>{GRUPOS_RACA[r.grupo].emoji}</Txt>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Txt style={{ fontFamily: F.bold, fontSize: 18 }} numberOfLines={1}>
              {r.nome}
            </Txt>
            <Txt v="muted" style={{ fontSize: 14 }} numberOfLines={1}>
              {GRUPOS_RACA[r.grupo].label} · {r.origem}
            </Txt>
            <Row wrap gap={6}>
              <Tag text={r.aptidao} />
              {r.producao ? <Tag text={r.producao} /> : <Tag text={r.peso} />}
            </Row>
          </View>
          <Icon name="chevron-right" color={C.muted} />
        </Pressable>
      ))}
      <Sheet visible={!!sel} onClose={() => setSel(null)} title={sel?.nome ?? ''}>
        {sel ? (
          <>
            <Row wrap gap={6}>
              <Tag text={GRUPOS_RACA[sel.grupo].label} />
              <Tag text={sel.aptidao} />
            </Row>
            <Txt style={{ fontSize: 16, lineHeight: 24 }}>{sel.sobre}</Txt>
            <View style={{ gap: S.sm }}>
              <Ficha icone="map-marker-outline" titulo="Origem" valor={sel.origem} />
              <Ficha icone="scale-balance" titulo="Peso adulto" valor={sel.peso} />
              {sel.producao ? <Ficha icone={sel.grupo === 'bovinos' ? 'cup-water' : 'egg-outline'} titulo="Produção" valor={sel.producao} /> : null}
              <Ficha icone="emoticon-outline" titulo="Temperamento" valor={sel.temperamento} />
            </View>
            <Txt v="small">Valores típicos: variam com a linhagem, a alimentação e o manejo.</Txt>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Ficha({ icone, titulo, valor }: { icone: 'map-marker-outline' | 'scale-balance' | 'egg-outline' | 'cup-water' | 'emoticon-outline'; titulo: string; valor: string }) {
  return (
    <Row gap={S.md} style={{ backgroundColor: C.field, borderRadius: R.md, padding: S.md, borderWidth: 1, borderColor: C.border }}>
      <Icon name={icone} size={22} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Txt v="small">{titulo}</Txt>
        <Txt style={{ fontFamily: F.semibold, fontSize: 16 }}>{valor}</Txt>
      </View>
    </Row>
  );
}

const s = StyleSheet.create({
  busca: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg },
  buscaTxt: { flex: 1, fontSize: 16, paddingVertical: 16, fontFamily: F.regular, color: C.text },
  item: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card, borderRadius: R.lg, padding: S.md, borderWidth: 1, borderColor: '#EFEBE1' },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, backgroundColor: C.areia, alignItems: 'center', justifyContent: 'center' },
});
