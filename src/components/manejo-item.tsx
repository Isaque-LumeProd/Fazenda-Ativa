import { router } from 'expo-router';

import { C } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { TIPOS_MANEJO } from '@/lib/constants';
import { rotuloDia } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { fmtMoeda, fmtQtd } from '@/lib/format';
import { useItem } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import type { Manejo } from '@/lib/types';

import { Icon, ListItem } from './ui';

export function descreverManejo(m: Manejo, unidadeItem?: string, nomeDestino?: string): string {
  const partes: string[] = [];
  switch (m.tipo) {
    case 'transferencia':
      partes.push(`${fmtQtd(m.quantidade ?? 0)} aves → ${nomeDestino ?? 'lote excluído'}`);
      break;
    case 'ovos':
      partes.push(`${fmtQtd(m.quantidade ?? 0)} ovos`);
      if (m.quebrados) partes.push(`${m.quebrados} quebrados`);
      break;
    case 'mortalidade':
    case 'venda':
    case 'entrada':
      partes.push(`${fmtQtd(m.quantidade ?? 0)} aves`);
      if (m.valor) partes.push(fmtMoeda(m.valor));
      break;
    case 'pesagem':
      if (m.pesoMedioG) partes.push(`peso médio ${fmtQtd(m.pesoMedioG)} g`);
      break;
    default:
      if (m.quantidade) partes.push(`${fmtQtd(m.quantidade)} ${unidadeItem ?? ''}`.trim());
  }
  if (m.observacao) partes.push(m.observacao);
  return partes.join(' · ');
}

export function ManejoItem({ manejo, mostrarAlvo = true }: { manejo: Manejo; mostrarAlvo?: boolean }) {
  const lote = useStore((s) => s.lotes.find((l) => l.id === manejo.loteId));
  const galinheiro = useStore((s) => s.galinheiros.find((g) => g.id === manejo.galinheiroId));
  const item = useItem(manejo.itemId);
  const destino = useStore((s) => s.lotes.find((l) => l.id === manejo.loteDestinoId));
  const excluir = useStore((s) => s.excluirManejo);
  const { apagar } = usePermissoes();
  const cfg = TIPOS_MANEJO[manejo.tipo];

  const alvo = manejo.tipo === 'transferencia' ? `de ${lote?.nome ?? 'lote excluído'}` : (lote?.nome ?? galinheiro?.nome);
  const detalhe = [item?.nome, descreverManejo(manejo, item?.unidade, destino?.nome)].filter(Boolean).join(' · ');
  const subtitulo = [rotuloDia(manejo.data), mostrarAlvo ? alvo : undefined, detalhe].filter(Boolean).join(' · ');

  async function remover() {
    const ok = await confirmar(
      'Excluir registro?',
      item ? 'A quantidade usada volta para o estoque.' : 'Essa ação não pode ser desfeita.',
      'Excluir',
    );
    if (ok) excluir(manejo.id);
  }

  return (
    <ListItem
      icon={cfg.icone}
      iconColor={cfg.cor}
      title={cfg.label}
      subtitle={subtitulo}
      onPress={apagar ? remover : undefined}
      right={apagar ? <Icon name="trash-can-outline" size={18} color={C.muted} /> : undefined}
    />
  );
}

export function irParaRegistro(params: { tipo?: string; loteId?: string; galinheiroId?: string; tarefaId?: string }) {
  router.push({ pathname: '/manejo/novo', params: Object.fromEntries(Object.entries(params).filter(([, v]) => v)) });
}
