import type { ItemComSaldo, ItemEstoque, MovEstoque } from './types';

const arred = (n: number) => Math.round(n * 1e6) / 1e6;

export function saldoDoItem(itemId: string, movimentos: MovEstoque[]): number {
  return arred(movimentos.reduce((s, m) => (m.itemId === itemId ? s + m.quantidade : s), 0));
}

/** Calcula saldo e custo atual de cada item a partir das movimentações */
export function comSaldo(itens: ItemEstoque[], movimentos: MovEstoque[]): ItemComSaldo[] {
  const saldo = new Map<string, number>();
  const ultimaCompra = new Map<string, { custo: number; em: string }>();
  for (const m of movimentos) {
    saldo.set(m.itemId, (saldo.get(m.itemId) ?? 0) + m.quantidade);
    if (m.tipo === 'entrada' && m.custoTotal && m.quantidade > 0) {
      const atual = ultimaCompra.get(m.itemId);
      if (!atual || m.criadoEm > atual.em) ultimaCompra.set(m.itemId, { custo: m.custoTotal / m.quantidade, em: m.criadoEm });
    }
  }
  return itens.map((i) => {
    const compra = ultimaCompra.get(i.id);
    const compraVale = compra && (i.custoUnitario === undefined || !i.custoInformadoEm || compra.em > i.custoInformadoEm);
    return { ...i, quantidade: arred(saldo.get(i.id) ?? 0), custoUnitario: compraVale ? compra.custo : i.custoUnitario };
  });
}
