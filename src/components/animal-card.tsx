import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, F, R, S, sombra } from '@/constants/theme';
import { fmtDataCurta } from '@/lib/dates';
import { fmtNum } from '@/lib/format';
import {
  CATEGORIAS_GADO,
  faseGestacao,
  fmtIdadeGado,
  GESTACAO_DIAS,
  gestacao,
  idadeMeses,
  nomeAnimal,
  pastoAtual,
  pesoAtual,
  situacao,
  type Gestacao,
} from '@/lib/gado';
import { useStore } from '@/lib/store';
import type { Animal } from '@/lib/types';

import { Anel } from './ovo';
import { Icon, Tag, Txt } from './ui';

export function abrirAnimal(id: string) {
  router.push({ pathname: '/animal/[id]', params: { id } });
}

/** Avatar redondo com anel colorido por sexo */
export function AvatarAnimal({ animal, tamanho = 60 }: { animal: Animal; tamanho?: number }) {
  const cor = animal.sexo === 'F' ? C.terra : C.primaryDark;
  const jovem = animal.categoria === 'bezerro' || animal.categoria === 'bezerra';
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        borderWidth: 2.5,
        borderColor: cor,
        backgroundColor: C.areia,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name="cow" size={tamanho * (jovem ? 0.42 : 0.55)} color={cor} />
    </View>
  );
}

export function AnimalItem({ animal }: { animal: Animal }) {
  const eventos = useStore((s) => s.eventosGado);
  const sit = situacao(animal, eventos);
  const peso = pesoAtual(animal, eventos);
  const g = gestacao(animal, eventos);
  const pasto = pastoAtual(animal, eventos);
  const sub = [CATEGORIAS_GADO[animal.categoria].label, animal.raca, pasto].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={() => abrirAnimal(animal.id)} style={({ pressed }) => [s.item, sombra, pressed && { opacity: 0.8 }, sit !== 'ativo' && { opacity: 0.6 }]}>
      <AvatarAnimal animal={animal} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 18 }} numberOfLines={1}>
          {nomeAnimal(animal)}
        </Txt>
        <Txt v="muted" numberOfLines={1} style={{ fontSize: 14 }}>
          {sub}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {animal.dataNascimento ? <Tag text={fmtIdadeGado(idadeMeses(animal))} /> : null}
          {peso ? <Tag text={`${fmtNum(peso)} kg`} /> : null}
          {g ? <Tag text={g.confirmada ? `Prenhe · ${g.dia}d` : `Coberta · ${g.dia}d`} /> : null}
          {sit !== 'ativo' ? <Tag text={sit === 'vendido' ? 'Vendido' : 'Morto'} /> : null}
        </View>
      </View>
      <Icon name="chevron-right" color={C.muted} />
    </Pressable>
  );
}

/** Cartão de gestação com anel de progresso (a "chocada" da vaca) */
export function GestacaoCard({ g }: { g: Gestacao }) {
  const fase = faseGestacao(g);
  const p = Math.min(1, g.dia / GESTACAO_DIAS);
  return (
    <Pressable onPress={() => abrirAnimal(g.vaca.id)} style={({ pressed }) => [s.gest, sombra, pressed && { opacity: 0.85 }]}>
      <View style={{ flexDirection: 'row', gap: S.lg, alignItems: 'center' }}>
        <Anel p={p} tamanho={104}>
          <Icon name="cow" size={42} color="#F3E3B8" />
        </Anel>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.etiqueta}>
            <Txt v="muted" style={{ fontSize: 13 }}>
              {g.tipo === 'inseminacao' ? 'Inseminação' : 'Monta'}
              {g.reprodutor ? ` · ${g.reprodutor}` : ''}
            </Txt>
          </View>
          <Txt v="h3" numberOfLines={1}>
            {nomeAnimal(g.vaca)}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Txt style={s.diaGrande}>{Math.min(g.dia, GESTACAO_DIAS)}</Txt>
            <Txt style={s.diaTotal}>/{GESTACAO_DIAS} dias</Txt>
          </View>
          <Txt style={{ color: C.primary, fontFamily: F.semibold, fontSize: 14 }}>
            {g.faltam > 0 ? `Faltam ${g.faltam} dias · pare ${fmtDataCurta(g.previsao)}` : 'Parto a qualquer momento'}
          </Txt>
        </View>
      </View>
      <View style={[s.fase, !g.confirmada && { backgroundColor: C.warningSoft }]}>
        <Txt style={{ fontFamily: F.semibold, color: g.confirmada ? C.primaryDark : C.warning }}>{fase.titulo}</Txt>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: S.md,
    borderWidth: 1,
    borderColor: '#EFEBE1',
  },
  gest: { backgroundColor: C.card, borderRadius: R.xl, padding: S.lg, gap: S.md, borderWidth: 1, borderColor: '#EFEBE1' },
  etiqueta: { alignSelf: 'flex-start', backgroundColor: C.field, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 3 },
  diaGrande: { fontSize: 36, lineHeight: 40, fontFamily: F.extrabold, color: C.text, letterSpacing: -1.2 },
  diaTotal: { fontSize: 16, color: C.muted, fontFamily: F.medium, marginBottom: 4 },
  fase: { backgroundColor: C.primarySoft, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: S.lg },
});
