import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, F, R, S, sombra } from '@/constants/theme';
import {
  dataNascimento,
  diaDaChocada,
  especieDa,
  ESPECIES,
  faltamDias,
  faseDoDia,
  progresso,
  proximaViragem,
  ultimoValor,
} from '@/lib/chocada';
import { fmtDataCurta } from '@/lib/dates';
import { fmtNum } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Chocada } from '@/lib/types';

import { Ovo } from './ovo';
import { Icon, Progress, Row, Txt } from './ui';

export function abrirChocada(id: string, aba?: string) {
  router.push({ pathname: '/chocada/[id]', params: aba ? { id, aba } : { id } });
}

/** Etiqueta "🐔 Galinha · 12 ovos" */
export function EtiquetaEspecie({ chocada }: { chocada: Chocada }) {
  const e = ESPECIES[chocada.especie] ?? ESPECIES.outra;
  return (
    <View style={s.etiqueta}>
      <Txt style={{ fontSize: 15 }}>{e.emoji}</Txt>
      <Txt v="muted" style={{ fontSize: 14 }}>
        {e.label} · {chocada.ovos.length} ovos
      </Txt>
    </View>
  );
}

/** Cartão grande da tela Hoje */
export function ChocadaHero({ chocada }: { chocada: Chocada }) {
  const eventos = useStore((st) => st.eventosChocada);
  const e = especieDa(chocada);
  const dia = Math.max(1, diaDaChocada(chocada));
  const fase = faseDoDia(chocada, dia);
  const umid = ultimoValor(chocada, eventos, 'umidade');
  const virada = proximaViragem(chocada, eventos);
  const faltam = faltamDias(chocada);

  return (
    <Pressable onPress={() => abrirChocada(chocada.id)} style={({ pressed }) => [s.hero, sombra, pressed && { opacity: 0.85 }]}>
      <Row gap={S.lg} style={{ alignItems: 'center' }}>
        <Ovo p={progresso(chocada, dia)} tamanho={116} />
        <View style={{ flex: 1, gap: 4 }}>
          <EtiquetaEspecie chocada={chocada} />
          <Txt v="h3" style={{ fontSize: 20 }} numberOfLines={2}>
            {chocada.nome}
          </Txt>
          <Row gap={2} style={{ alignItems: 'flex-end' }}>
            <Txt style={s.diaGrande}>{Math.min(dia, e.dias)}</Txt>
            <Txt style={s.diaTotal}>/{e.dias} dias</Txt>
          </Row>
          <Txt style={{ color: C.primary, fontFamily: F.semibold, fontSize: 14 }}>
            {faltam > 0 ? `Faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'} · nasce ${fmtDataCurta(dataNascimento(chocada))}` : 'Dia do nascimento!'}
          </Txt>
        </View>
      </Row>
      <View style={s.fase}>
        <Txt style={{ fontFamily: F.semibold, color: C.primaryDark }}>{fase.titulo}</Txt>
      </View>
      <Row gap={0}>
        <Mini icone="water-outline" cor={C.info} valor={umid ? `${fmtNum(umid.valor ?? 0)}%` : '—'} label="Umidade" />
        <Mini icone="rotate-right" cor={C.ouro} valor={virada ?? (chocada.tipoChocadeira === 'automatica' ? 'Auto' : '—')} label="Próx. virada" div />
        <Mini icone="flag-outline" cor={C.terra} valor={fmtDataCurta(dataNascimento(chocada))} label="Nascimento" div />
      </Row>
    </Pressable>
  );
}

function Mini({ icone, cor, valor, label, div }: { icone: 'water-outline' | 'rotate-right' | 'flag-outline'; cor: string; valor: string; label: string; div?: boolean }) {
  return (
    <Row gap={S.sm} style={[{ flex: 1, paddingHorizontal: S.sm }, div && { borderLeftWidth: 1, borderLeftColor: C.border }]}>
      <Icon name={icone} size={20} color={cor} />
      <View>
        <Txt style={{ fontFamily: F.bold, fontSize: 17 }}>{valor}</Txt>
        <Txt v="small">{label}</Txt>
      </View>
    </Row>
  );
}

/** Linha da lista de chocadas */
export function ChocadaItem({ chocada }: { chocada: Chocada }) {
  const e = especieDa(chocada);
  const dia = Math.max(1, diaDaChocada(chocada));
  const p = progresso(chocada, dia);
  const nascidos = chocada.ovos.filter((o) => o.status === 'nascido').length;
  return (
    <Pressable onPress={() => abrirChocada(chocada.id)} style={({ pressed }) => [s.item, sombra, pressed && { opacity: 0.8 }]}>
      <Ovo p={chocada.encerrada ? 1 : p} anel={chocada.encerrada ? 1 : p} tamanho={76} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt style={{ fontFamily: F.bold, fontSize: 17 }} numberOfLines={1}>
          {chocada.nome}
        </Txt>
        <Txt v="small">
          {ESPECIES[chocada.especie]?.emoji} {e.label} · {chocada.ovos.length} ovos
          {chocada.encerrada ? ` · ${nascidos} nascidos` : ''}
        </Txt>
        {chocada.encerrada ? (
          <Txt v="small" style={{ color: C.primary, fontFamily: F.semibold }}>
            Encerrada
          </Txt>
        ) : (
          <>
            <Progress valor={p} cor={C.primary} altura={6} />
            <Txt v="small" style={{ color: C.primaryDark, fontFamily: F.semibold }}>
              Dia {Math.min(dia, e.dias)} de {e.dias} · {faseDoDia(chocada, dia).kicker}
            </Txt>
          </>
        )}
      </View>
      <Icon name="chevron-right" color={C.muted} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: C.card, borderRadius: R.xl, padding: S.lg, gap: S.md, borderWidth: 1, borderColor: '#EFEBE1' },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: C.field,
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: 4,
  },
  diaGrande: { fontSize: 44, lineHeight: 48, fontFamily: F.extrabold, color: C.text, letterSpacing: -1.5 },
  diaTotal: { fontSize: 18, color: C.muted, fontFamily: F.medium, marginBottom: 6 },
  fase: { backgroundColor: C.primarySoft, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: S.lg },
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
});
