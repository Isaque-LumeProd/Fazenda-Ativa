import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { C, R, S } from '@/constants/theme';
import { statusTarefa } from '@/lib/calc';
import { TIPOS_MANEJO } from '@/lib/constants';
import { rotuloDia } from '@/lib/dates';
import { useStore } from '@/lib/store';
import type { Tarefa } from '@/lib/types';

import { irParaRegistro } from './manejo-item';
import { Badge, Icon, ListItem, Row, Txt } from './ui';

/** Tarefas que precisam de um número informado na hora (ex.: ovos coletados) */
export function precisaFormulario(t: Tarefa): boolean {
  if (['ovos', 'mortalidade', 'venda', 'entrada', 'pesagem'].includes(t.tipoManejo)) return true;
  return !!TIPOS_MANEJO[t.tipoManejo].item && !t.quantidadePadrao;
}

function frequencia(dias: number) {
  if (dias === 1) return 'Diária';
  if (dias === 7) return 'Semanal';
  return `A cada ${dias} dias`;
}

export function TarefaItem({ tarefa }: { tarefa: Tarefa }) {
  const lote = useStore((s) => s.lotes.find((l) => l.id === tarefa.loteId));
  const galinheiro = useStore((s) => s.galinheiros.find((g) => g.id === tarefa.galinheiroId));
  const concluir = useStore((s) => s.concluirTarefa);
  const cfg = TIPOS_MANEJO[tarefa.tipoManejo];
  const status = statusTarefa(tarefa);

  function feito() {
    if (precisaFormulario(tarefa)) {
      irParaRegistro({
        tipo: tarefa.tipoManejo,
        loteId: tarefa.loteId,
        galinheiroId: tarefa.galinheiroId,
        tarefaId: tarefa.id,
      });
    } else {
      concluir(tarefa.id);
    }
  }

  const subtitulo = [
    tarefa.horario,
    lote?.nome ?? galinheiro?.nome,
    frequencia(tarefa.frequenciaDias),
    status === 'futura' ? rotuloDia(tarefa.proximaData) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListItem
      icon={cfg.icone}
      iconColor={cfg.cor}
      title={tarefa.titulo}
      subtitle={subtitulo}
      onPress={() => router.push({ pathname: '/tarefa/form', params: { id: tarefa.id } })}
      right={
        <Row gap={S.sm}>
          {status === 'atrasada' ? <Badge text="Atrasada" cor={C.danger} /> : null}
          {status !== 'futura' ? (
            <Pressable
              onPress={feito}
              hitSlop={6}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: C.primary,
                  borderRadius: R.pill,
                  paddingHorizontal: S.md,
                  paddingVertical: 6,
                },
                pressed && { opacity: 0.6 },
              ]}>
              <Icon name="check" size={16} color="#fff" />
              <Txt style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Feito</Txt>
            </Pressable>
          ) : null}
        </Row>
      }
    />
  );
}
