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
  estoqueMinimo: number;
  /** custo por unidade informado à mão no cadastro */
  custoUnitario?: number;
  /** quando o custo foi informado à mão (ISO); compras mais novas passam a valer */
  custoInformadoEm?: string;
  /** peso de um saco, em kg (ração) */
  pesoSacoKg?: number;
  criadoEm: string;
}

/**
 * Item com o saldo calculado a partir das movimentações. O saldo nunca é gravado no item:
 * assim, baixas feitas ao mesmo tempo em aparelhos diferentes somam em vez de se sobrescrever.
 */
export interface ItemComSaldo extends ItemEstoque {
  quantidade: number;
  /** custo atual: o da compra mais recente ou o informado à mão, o que for mais novo */
  custoUnitario?: number;
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

// ------------------------------------------------------------------ chocadas (incubação)

export type EspecieId =
  | 'galinha'
  | 'codorna'
  | 'pato'
  | 'pato_crioulo'
  | 'marreco'
  | 'ganso'
  | 'faisao'
  | 'pavao'
  | 'peru'
  | 'angola'
  | 'outra';

export type StatusOvo = 'na' | 'fertil' | 'infertil' | 'duvidoso' | 'removido' | 'nascido' | 'morto';

export interface OvoChocada {
  status: StatusOvo;
  /** ex.: A1, Matriz 02 */
  ident?: string;
  obs?: string;
}

/** automática: a chocadeira vira os ovos; manual: você vira; galinha: galinha choca */
export type TipoChocadeira = 'automatica' | 'manual' | 'galinha';

export interface Chocada {
  id: string;
  nome: string;
  especie: EspecieId;
  /** dias de incubação quando a espécie é "outra" */
  diasCustom?: number;
  /** YYYY-MM-DD: dia em que os ovos foram para a chocadeira (dia 1) */
  dataInicio: string;
  tipoChocadeira: TipoChocadeira;
  /** HH:MM */
  horariosViragem: string[];
  ovos: OvoChocada[];
  encerrada: boolean;
  dataEncerramento?: string;
  /** lote que recebeu os pintinhos nascidos */
  loteDestinoId?: string;
  observacoes?: string;
  criadoEm: string;
}

/** tarefa: cuidado do calendário marcado como feito (ver `chave`) */
export type TipoEventoChocada = 'viragem' | 'temperatura' | 'umidade' | 'imprevisto' | 'tarefa' | 'nota';

export interface EventoChocada {
  id: string;
  chocadaId: string;
  tipo: TipoEventoChocada;
  /** YYYY-MM-DD */
  data: string;
  /** HH:MM */
  hora: string;
  /** °C ou % */
  valor?: number;
  /** id do imprevisto (ver IMPREVISTOS) */
  imprevisto?: string;
  /** tarefa feita: 'ovoscopia-7', 'fase-final', 'nascimento' */
  chave?: string;
  observacao?: string;
  criadoEm: string;
}

// ------------------------------------------------------------------ gado

export type Sexo = 'F' | 'M';

export type CategoriaGado = 'bezerra' | 'bezerro' | 'novilha' | 'garrote' | 'vaca' | 'touro' | 'boi';

export type Aptidao = 'corte' | 'leite' | 'misto';

export interface Animal {
  id: string;
  /** número do brinco / identificação */
  brinco: string;
  nome?: string;
  sexo: Sexo;
  categoria: CategoriaGado;
  raca?: string;
  aptidao: Aptidao;
  /** YYYY-MM-DD */
  dataNascimento?: string;
  /** YYYY-MM-DD: nascimento na fazenda ou data da compra */
  dataEntrada: string;
  origem: 'nascido' | 'comprado';
  pesoEntradaKg?: number;
  valorCompra?: number;
  maeId?: string;
  /** pasto / piquete / lote de manejo */
  pasto?: string;
  observacoes?: string;
  criadoEm: string;
}

export type TipoEventoGado =
  | 'pesagem'
  | 'vacina'
  | 'vermifugo'
  | 'medicamento'
  | 'cobertura'
  | 'inseminacao'
  | 'diagnostico'
  | 'parto'
  | 'secagem'
  | 'pasto'
  | 'venda'
  | 'morte'
  | 'nota';

export interface EventoGado {
  id: string;
  animalId: string;
  tipo: TipoEventoGado;
  /** YYYY-MM-DD */
  data: string;
  pesoKg?: number;
  /** item de estoque usado (vacina, vermífugo, medicamento) */
  itemId?: string;
  /** dose usada (na unidade do item) */
  quantidade?: number;
  /** nome do produto quando não há item de estoque */
  produto?: string;
  /** próxima dose / reforço (YYYY-MM-DD) */
  proximaData?: string;
  /** diagnóstico de prenhez */
  resultado?: 'prenhe' | 'vazia';
  /** touro / sêmen */
  reprodutor?: string;
  /** venda: valor total; compra de produto: custo */
  valor?: number;
  /** parto: bezerro cadastrado */
  bezerroId?: string;
  /** troca de pasto */
  pasto?: string;
  observacao?: string;
  criadoEm: string;
}
