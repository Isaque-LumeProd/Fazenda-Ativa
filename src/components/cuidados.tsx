import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { C, F, R, S, sombra } from '@/constants/theme';
import { statusTarefa } from '@/lib/calc';
import { tarefasDaChocada, type TarefaChocada } from '@/lib/chocada';
import { TIPOS_MANEJO, type IconName } from '@/lib/constants';
import { hoje, rotuloDia } from '@/lib/dates';
import { cuidadosGado, TIPOS_EVENTO_GADO } from '@/lib/gado';
import { useStore } from '@/lib/store';
import type { Tarefa } from '@/lib/types';

import { abrirChocada } from './chocada-card';
import { irParaRegistro } from './manejo-item';
import { precisaFormulario } from './tarefa-item';
import { Icon, IconBox, Progress, Row, Txt } from './ui';

export interface Cuidado {
  id: string;
  titulo: string;
  icone: IconName;
  cor: string;
  hora?: string;
  onde?: string;
  atrasada: boolean;
  feita: boolean;
  /** marcar como feito direto (sem formulário) */
  marcar?: () => void;
  /** abrir para registrar */
  abrir: () => void;
}

const ICONE_CHOCADA: Record<TarefaChocada['tipo'], [IconName, string]> = {
  viragem: ['rotate-right', C.primary],
  umidade: ['water-outline', C.info],
  ovoscopia: ['flashlight', C.ouro],
  'fase-final': ['water-percent', C.terra],
  nascimento: ['egg-easter', C.terra],
};

function horaAgora() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Todos os cuidados de hoje: chocadas, tarefas da rotina das aves e doses/marcos do gado */
export function useCuidadosDeHoje(): Cuidado[] {
  const chocadas = useStore((s) => s.chocadas);
  const eventosChocada = useStore((s) => s.eventosChocada);
  const tarefas = useStore((s) => s.tarefas);
  const manejos = useStore((s) => s.manejos);
  const lotes = useStore((s) => s.lotes);
  const galinheiros = useStore((s) => s.galinheiros);
  const animais = useStore((s) => s.animais);
  const eventosGado = useStore((s) => s.eventosGado);
  const registrar = useStore((s) => s.registrarEventoChocada);
  const concluir = useStore((s) => s.concluirTarefa);
  const h = hoje();

  const lista: Cuidado[] = [];

  for (const c of chocadas) {
    for (const t of tarefasDaChocada(c, eventosChocada)) {
      const [icone, cor] = ICONE_CHOCADA[t.tipo];
      const marcar =
        t.tipo === 'viragem'
          ? () => registrar({ chocadaId: c.id, tipo: 'viragem', data: h, hora: horaAgora() })
          : t.tipo === 'fase-final'
            ? () => registrar({ chocadaId: c.id, tipo: 'tarefa', chave: 'fase-final', data: h, hora: horaAgora() })
            : undefined;
      lista.push({
        id: t.id,
        titulo: t.titulo,
        icone,
        cor,
        hora: t.hora,
        onde: c.nome,
        atrasada: t.atrasada,
        feita: t.feita,
        marcar,
        abrir: () => abrirChocada(c.id, t.tipo === 'ovoscopia' ? 'ovoscopia' : t.tipo === 'umidade' ? 'umidade' : undefined),
      });
    }
  }

  const feitasHoje = new Set(manejos.filter((m) => m.data === h && m.observacao?.startsWith('Tarefa: ')).map((m) => m.observacao));
  for (const t of tarefas) {
    if (!t.ativa) continue;
    const st = statusTarefa(t);
    const feita = st === 'futura' && feitasHoje.has(`Tarefa: ${t.titulo}`);
    if (st === 'futura' && !feita) continue;
    const cfg = TIPOS_MANEJO[t.tipoManejo];
    const lote = lotes.find((l) => l.id === t.loteId);
    const gal = galinheiros.find((g) => g.id === t.galinheiroId);
    lista.push({
      id: `tarefa:${t.id}`,
      titulo: t.titulo,
      icone: cfg.icone,
      cor: cfg.cor,
      hora: t.horario,
      onde: [lote?.nome ?? gal?.nome, st === 'atrasada' && t.proximaData !== h ? rotuloDia(t.proximaData) : undefined].filter(Boolean).join(' · '),
      atrasada: st === 'atrasada' || (!feita && !!t.horario && t.horario < horaAgora()),
      feita,
      marcar: feita || precisaFormulario(t) ? undefined : () => concluir(t.id),
      abrir: () => abrirTarefa(t),
    });
  }

  // Doses iguais no mesmo dia viram uma linha só ("Vermífugo · 6 animais")
  const grupos = new Map<string, ReturnType<typeof cuidadosGado>>();
  for (const g of cuidadosGado(animais, eventosGado, 0)) {
    const k = `${g.tipo}|${g.titulo}|${g.data}`;
    grupos.set(k, [...(grupos.get(k) ?? []), g]);
  }
  for (const [k, gs] of grupos) {
    const g = gs[0];
    const cfg = TIPOS_EVENTO_GADO[g.tipo];
    const varios = gs.length > 1;
    lista.push({
      id: `gado:${k}`,
      titulo: g.titulo,
      icone: cfg.icone,
      cor: cfg.cor,
      onde: [varios ? `${gs.length} animais` : g.detalhe, g.atrasado ? `desde ${rotuloDia(g.data)}` : undefined].filter(Boolean).join(' · '),
      atrasada: g.atrasado,
      feita: false,
      abrir: () =>
        varios
          ? router.push({ pathname: '/gado/evento', params: { tipo: g.tipo } })
          : g.tipo === 'nota' || g.tipo === 'secagem' || g.tipo === 'parto'
            ? router.push({ pathname: '/animal/[id]', params: { id: g.animalId } })
            : router.push({ pathname: '/gado/evento', params: { tipo: g.tipo, animalId: g.animalId } }),
    });
  }

  return lista.sort((a, b) => Number(a.feita) - Number(b.feita) || Number(b.atrasada) - Number(a.atrasada) || (a.hora ?? '99').localeCompare(b.hora ?? '99'));
}

function abrirTarefa(t: Tarefa) {
  if (precisaFormulario(t)) {
    irParaRegistro({ tipo: t.tipoManejo, loteId: t.loteId, galinheiroId: t.galinheiroId, tarefaId: t.id });
  } else {
    router.push({ pathname: '/tarefa/form', params: { id: t.id } });
  }
}

/** Cartão "Seu cuidado de hoje" com barra de progresso e checklist */
export function ListaCuidados({ cuidados, limite = 7 }: { cuidados: Cuidado[]; limite?: number }) {
  const [tudo, setTudo] = useState(false);
  const feitas = cuidados.filter((c) => c.feita).length;
  const mostrar = tudo ? cuidados : cuidados.slice(0, limite);
  return (
    <View style={[s.card, sombra]}>
      <View style={{ padding: S.lg, paddingBottom: S.sm }}>
        <Progress valor={cuidados.length ? feitas / cuidados.length : 1} cor={C.primaryDark} altura={8} />
      </View>
      {mostrar.map((c, i) => (
        <LinhaCuidado key={c.id} c={c} primeira={i === 0} />
      ))}
      {cuidados.length > limite ? (
        <Pressable onPress={() => setTudo(!tudo)} style={({ pressed }) => [s.mais, pressed && { opacity: 0.6 }]}>
          <Txt style={{ color: C.primary, fontFamily: F.semibold }}>
            {tudo ? 'Mostrar menos' : `Ver todos os ${cuidados.length} cuidados`}
          </Txt>
          <Icon name={tudo ? 'chevron-up' : 'chevron-down'} size={20} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function LinhaCuidado({ c, primeira }: { c: Cuidado; primeira: boolean }) {
  const sub = [c.hora, c.onde].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={c.abrir} style={({ pressed }) => [s.linha, !primeira && s.div, pressed && { opacity: 0.7 }]}>
      <View style={{ opacity: c.feita ? 0.5 : 1 }}>
        <IconBox name={c.icone} cor={c.cor} bg={C.field} size={48} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={[{ fontFamily: F.semibold, fontSize: 17 }, c.feita && { color: C.muted, textDecorationLine: 'line-through' }]} numberOfLines={1}>
          {c.titulo}
        </Txt>
        <Row gap={4}>
          {c.atrasada && !c.feita ? <Icon name="clock-alert-outline" size={15} color={C.ouro} /> : c.hora ? <Icon name="clock-outline" size={15} color={C.muted} /> : null}
          <Txt v="small" style={{ fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
            {c.atrasada && !c.feita ? `Atrasada${sub ? ' · ' : ''}${sub}` : sub}
          </Txt>
        </Row>
      </View>
      <Pressable
        onPress={c.feita ? undefined : (c.marcar ?? c.abrir)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: c.feita }}
        accessibilityLabel={c.titulo}
        style={[s.check, c.feita && s.checkFeito]}>
        {c.feita ? <Icon name="check" size={20} color="#fff" /> : null}
      </Pressable>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.xl, borderWidth: 1, borderColor: '#EFEBE1', overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, paddingHorizontal: S.lg },
  div: { borderTopWidth: 1, borderTopColor: C.border },
  check: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#DCD6C8',
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFeito: { backgroundColor: C.primary, borderColor: C.primary },
  mais: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: S.md, borderTopWidth: 1, borderTopColor: C.border },
});
