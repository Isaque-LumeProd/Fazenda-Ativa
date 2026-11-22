import { useMemo } from 'react';

import { comSaldo } from './estoque';
import { useStore } from './store';
import type { ItemComSaldo } from './types';

export function useItens(): ItemComSaldo[] {
  const itens = useStore((s) => s.itens);
  const movimentos = useStore((s) => s.movimentos);
  return useMemo(() => comSaldo(itens, movimentos), [itens, movimentos]);
}

export function useItem(id: string | undefined): ItemComSaldo | undefined {
  const itens = useItens();
  return itens.find((i) => i.id === id);
}
