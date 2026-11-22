import { TIPOS_AVE } from './constants';
import { diffDias, hoje, ultimosDias } from './dates';
import type { ItemComSaldo as ItemEstoque, Lote, Manejo, Tarefa } from './types';

/** Aves atuais = inicial + entradas − mortalidade − vendas */
export function avesAtuais(lote: Lote, manejos: Manejo[]): number {
  let n = lote.quantidadeInicial;
  for (const m of manejos) {
    if (!m.quantidade) continue;
    if (m.tipo === 'transferencia' && m.loteDestinoId === lote.id) n += m.quantidade;
    if (m.loteId !== lote.id) continue;
    if (m.tipo === 'entrada') n += m.quantidade;
    else if (m.tipo === 'mortalidade' || m.tipo === 'venda' || m.tipo === 'transferencia') n -= m.quantidade;
  }
  return Math.max(0, n);
}

/** Aves que entraram no lote depois do cadastro (entradas + transferências recebidas) */
export function avesRecebidas(lote: Lote, manejos: Manejo[]): number {
  return manejos
    .filter(
      (m) =>
        (m.tipo === 'entrada' && m.loteId === lote.id) ||
        (m.tipo === 'transferencia' && m.loteDestinoId === lote.id),
    )
    .reduce((s, m) => s + (m.quantidade ?? 0), 0);
}

/** Converte kg para a unidade do item (kg ou g) */
export function kgParaUnidade(kg: number, item: ItemEstoque): number {
  return item.unidade === 'g' ? kg * 1000 : kg;
}

/** Custo de 1 kg do item (se tiver custo e for medido em peso) */
export function custoPorKg(item: ItemEstoque): number {
  if (!item.custoUnitario) return 0;
  if (item.unidade === 'kg') return item.custoUnitario;
  if (item.unidade === 'g') return item.custoUnitario * 1000;
  return 0;
}

export function sacosRestantes(item: ItemEstoque): number | null {
  if (!item.pesoSacoKg || item.pesoSacoKg <= 0) return null;
  const kg = qtdEmKg(item);
  return kg / item.pesoSacoKg;
}

/** Consumo diário de uma ração pelos lotes ativos vinculados a ela */
export function consumoDaRacao(item: ItemEstoque, lotes: Lote[], manejos: Manejo[]) {
  const vinculados = lotes
    .filter((l) => l.ativo && l.racaoId === item.id)
    .map((l) => {
      const aves = avesAtuais(l, manejos);
      return { lote: l, aves, kgDia: consumoDiarioKg(l, aves) };
    });
  const kgDia = vinculados.reduce((s, v) => s + v.kgDia, 0);
  const estoqueKg = qtdEmKg(item);
  return {
    vinculados,
    kgDia,
    dias: kgDia > 0 ? estoqueKg / kgDia : null,
    custoDia: kgDia * custoPorKg(item),
  };
}

/** Custo diário estimado de ração (só lotes com ração vinculada e com custo cadastrado) */
export function custoRacaoDia(itens: ItemEstoque[], lotes: Lote[], manejos: Manejo[]): number {
  return itens
    .filter((i) => i.categoria === 'racao')
    .reduce((s, i) => s + consumoDaRacao(i, lotes, manejos).custoDia, 0);
}

/** Plano do trato de hoje: quanto cada lote ativo precisa e quanto já foi servido */
export function planoTrato(lotes: Lote[], manejos: Manejo[], itens: ItemEstoque[]) {
  const h = hoje();
  const linhas = lotes
    .filter((l) => l.ativo)
    .map((l) => {
      const aves = avesAtuais(l, manejos);
      const kgDia = consumoDiarioKg(l, aves);
      const item = itens.find((i) => i.id === l.racaoId);
      const servidoKg = manejos
        .filter((m) => m.tipo === 'racao' && m.loteId === l.id && m.data === h)
        .reduce((s, m) => {
          const it = itens.find((i) => i.id === m.itemId) ?? item;
          return s + (it?.unidade === 'g' ? (m.quantidade ?? 0) / 1000 : (m.quantidade ?? 0));
        }, 0);
      return { lote: l, aves, kgDia, item, servidoKg };
    })
    .filter((x) => x.kgDia > 0);
  const totalKg = linhas.reduce((s, x) => s + x.kgDia, 0);
  const servidoKg = linhas.reduce((s, x) => s + (x.kgDia - x.servidoKg < 0.1 ? x.kgDia : x.servidoKg), 0);
  return { linhas, totalKg, servidoKg, semRacao: linhas.filter((x) => !x.item) };
}

export function idadeDias(lote: Lote): number {
  return lote.idadeEntradaDias + Math.max(0, diffDias(hoje(), lote.dataEntrada));
}

export function fmtIdade(dias: number): string {
  if (dias < 14) return `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  const sem = Math.floor(dias / 7);
  return `${sem} semanas`;
}

export function consumoDiarioKg(lote: Lote, aves: number): number {
  return (aves * lote.consumoDiarioG) / 1000;
}

export function avesPorGalinheiro(galinheiroId: string, lotes: Lote[], manejos: Manejo[]): number {
  return lotes
    .filter((l) => l.ativo && l.galinheiroId === galinheiroId)
    .reduce((s, l) => s + avesAtuais(l, manejos), 0);
}

export function qtdEmKg(item: ItemEstoque): number {
  if (item.unidade === 'kg') return item.quantidade;
  if (item.unidade === 'g') return item.quantidade / 1000;
  return 0;
}

export function estoqueRacaoKg(itens: ItemEstoque[]): number {
  return itens.filter((i) => i.categoria === 'racao').reduce((s, i) => s + qtdEmKg(i), 0);
}

export function consumoTotalKg(lotes: Lote[], manejos: Manejo[]): number {
  return lotes.filter((l) => l.ativo).reduce((s, l) => s + consumoDiarioKg(l, avesAtuais(l, manejos)), 0);
}

export function itensBaixos(itens: ItemEstoque[]): ItemEstoque[] {
  return itens.filter((i) => i.quantidade <= i.estoqueMinimo);
}

/** Ovos por dia nos últimos `n` dias (opcionalmente de um lote) */
export function ovosPorDia(manejos: Manejo[], n: number, loteId?: string) {
  const dias = ultimosDias(n);
  const mapa = new Map(dias.map((d) => [d, 0]));
  for (const m of manejos) {
    if (m.tipo !== 'ovos' || !m.quantidade) continue;
    if (loteId && m.loteId !== loteId) continue;
    if (mapa.has(m.data)) mapa.set(m.data, (mapa.get(m.data) ?? 0) + m.quantidade);
  }
  return dias.map((d) => ({ data: d, ovos: mapa.get(d) ?? 0 }));
}

export function somaPeriodo(
  manejos: Manejo[],
  tipo: Manejo['tipo'],
  dias: number,
  filtro?: (m: Manejo) => boolean,
): number {
  const inicio = ultimosDias(dias)[0];
  return manejos
    .filter((m) => m.tipo === tipo && m.data >= inicio && (!filtro || filtro(m)))
    .reduce((s, m) => s + (m.quantidade ?? 0), 0);
}

export function botaOvo(lote: Lote): boolean {
  return TIPOS_AVE[lote.tipo].botaOvo;
}

export function statusTarefa(t: Tarefa): 'atrasada' | 'hoje' | 'futura' {
  const d = diffDias(t.proximaData, hoje());
  if (d < 0) return 'atrasada';
  if (d === 0) return 'hoje';
  return 'futura';
}

export function ordenarManejos(manejos: Manejo[]): Manejo[] {
  return [...manejos].sort((a, b) =>
    a.data === b.data ? b.criadoEm.localeCompare(a.criadoEm) : b.data.localeCompare(a.data),
  );
}
