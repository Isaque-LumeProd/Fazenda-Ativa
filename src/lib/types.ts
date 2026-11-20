export type TipoAve = 'poedeira' | 'corte' | 'caipira' | 'pintinho' | 'reprodutor';

export type TipoManejo =
  | 'racao'
  | 'agua'
  | 'vitamina'
  | 'vacina'
  | 'medicamento'
  | 'ovos'
  | 'mortalidade'
  | 'venda'
  | 'entrada'
  | 'transferencia'
  | 'limpeza'
  | 'pesagem';

export type CategoriaItem = 'racao' | 'vitamina' | 'vacina' | 'medicamento' | 'outros';

export type Unidade = 'kg' | 'g' | 'L' | 'ml' | 'un' | 'doses';

export interface Galinheiro {
  id: string;
  nome: string;
  capacidade: number;
  observacoes?: string;
  criadoEm: string;
}

export interface Lote {
  id: string;
  nome: string;
  galinheiroId: string;
  tipo: TipoAve;
  raca?: string;
  quantidadeInicial: number;
  /** YYYY-MM-DD */
  dataEntrada: string;
  idadeEntradaDias: number;
  /** gramas de ração por ave por dia */
  consumoDiarioG: number;
  /** item de estoque (categoria ração) que este lote come */
  racaoId?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Manejo {
  id: string;
  tipo: TipoManejo;
  /** YYYY-MM-DD */
  data: string;
  loteId?: string;
  galinheiroId?: string;
  itemId?: string;
  /** kg de ração, doses, ovos, aves… conforme o tipo */
  quantidade?: number;
  quebrados?: number;
  valor?: number;
  pesoMedioG?: number;
  /** transferência: lote que recebe as aves */
  loteDestinoId?: string;
  observacao?: string;
  criadoEm: string;
}

export interface ItemEstoque {
  id: string;
  nome: string;
  categoria: CategoriaItem;
  unidade: Unidade;
  quantidade: number;
  estoqueMinimo: number;
  custoUnitario?: number;
  /** peso de um saco, em kg (ração) */
  pesoSacoKg?: number;
  criadoEm: string;
}

export interface MovEstoque {
  id: string;
  itemId: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  /** positivo para entrada, negativo para saída; ajuste guarda a diferença */
  quantidade: number;
  data: string;
  custoTotal?: number;
  manejoId?: string;
  criadoEm: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  tipoManejo: TipoManejo;
  galinheiroId?: string;
  loteId?: string;
  frequenciaDias: number;
  /** HH:MM */
  horario?: string;
  /** YYYY-MM-DD */
  proximaData: string;
  itemId?: string;
  quantidadePadrao?: number;
  ativa: boolean;
  criadoEm: string;
}
