import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { CategoriaItem, TipoAve, TipoManejo, Unidade } from './types';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Consumo médio de referência (g/ave/dia). Ajustável em cada lote. */
export const TIPOS_AVE: Record<TipoAve, { label: string; consumoG: number; botaOvo: boolean }> = {
  poedeira: { label: 'Poedeira', consumoG: 115, botaOvo: true },
  caipira: { label: 'Caipira', consumoG: 100, botaOvo: true },
  corte: { label: 'Frango de corte', consumoG: 120, botaOvo: false },
  pintinho: { label: 'Pintinho', consumoG: 30, botaOvo: false },
  reprodutor: { label: 'Reprodutor (galo)', consumoG: 130, botaOvo: false },
};

export type AlvoManejo = 'lote' | 'galinheiro';

export const TIPOS_MANEJO: Record<
  TipoManejo,
  {
    label: string;
    icone: IconName;
    cor: string;
    alvo: AlvoManejo;
    /** categoria de estoque que dá baixa */
    item?: CategoriaItem;
    /** rótulo do campo quantidade (sem item) */
    qtdLabel?: string;
  }
> = {
  ovos: { label: 'Coleta de ovos', icone: 'egg', cor: '#F9A825', alvo: 'lote', qtdLabel: 'Ovos coletados' },
  racao: { label: 'Ração', icone: 'sack', cor: '#8D6E63', alvo: 'lote', item: 'racao' },
  agua: { label: 'Troca de água', icone: 'water', cor: '#1E88E5', alvo: 'galinheiro' },
  vitamina: { label: 'Vitamina', icone: 'pill', cor: '#7CB342', alvo: 'lote', item: 'vitamina' },
  vacina: { label: 'Vacina', icone: 'needle', cor: '#8E24AA', alvo: 'lote', item: 'vacina' },
  medicamento: { label: 'Medicamento', icone: 'medical-bag', cor: '#D81B60', alvo: 'lote', item: 'medicamento' },
  mortalidade: { label: 'Mortalidade', icone: 'alert-circle-outline', cor: '#C62828', alvo: 'lote', qtdLabel: 'Aves mortas' },
  venda: { label: 'Venda de aves', icone: 'cash', cor: '#2E7D32', alvo: 'lote', qtdLabel: 'Aves vendidas' },
  entrada: { label: 'Entrada de aves', icone: 'plus-circle-outline', cor: '#00897B', alvo: 'lote', qtdLabel: 'Aves adicionadas' },
  transferencia: { label: 'Transferir / evoluir', icone: 'swap-horizontal', cor: '#3949AB', alvo: 'lote', qtdLabel: 'Aves transferidas' },
  limpeza: { label: 'Limpeza', icone: 'broom', cor: '#546E7A', alvo: 'galinheiro' },
  pesagem: { label: 'Pesagem', icone: 'scale-balance', cor: '#5D4037', alvo: 'lote' },
};

export const ORDEM_MANEJO: TipoManejo[] = [
  'ovos',
  'racao',
  'agua',
  'vitamina',
  'vacina',
  'medicamento',
  'mortalidade',
  'venda',
  'entrada',
  'transferencia',
  'limpeza',
  'pesagem',
];

export const CATEGORIAS_ITEM: Record<CategoriaItem, { label: string; icone: IconName; cor: string }> = {
  racao: { label: 'Ração', icone: 'sack', cor: '#8D6E63' },
  vitamina: { label: 'Vitamina', icone: 'pill', cor: '#7CB342' },
  vacina: { label: 'Vacina', icone: 'needle', cor: '#8E24AA' },
  medicamento: { label: 'Medicamento', icone: 'medical-bag', cor: '#D81B60' },
  outros: { label: 'Outros', icone: 'package-variant', cor: '#546E7A' },
};

export const UNIDADES: Unidade[] = ['kg', 'g', 'L', 'ml', 'un', 'doses'];
