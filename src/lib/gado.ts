/**
 * Regras do rebanho bovino: idade, peso, ganho médio diário, situação (ativo / vendido / morto),
 * gestação com calendário (como a chocada, só que com 283 dias) e cuidados sanitários do dia.
 */
import type { IconName } from './constants';
import { addDias, diffDias, fmtDataCurta, hoje } from './dates';
import { fmtMoeda, fmtQtd } from './format';
import type { Animal, Aptidao, CategoriaGado, EventoGado, TipoEventoGado } from './types';

/** Duração média da gestação bovina (dias). Zebuínos tendem a ~290, taurinos a ~280. */
export const GESTACAO_DIAS = 283;

export const CATEGORIAS_GADO: Record<CategoriaGado, { label: string; sexo: 'F' | 'M' }> = {
  bezerra: { label: 'Bezerra', sexo: 'F' },
  novilha: { label: 'Novilha', sexo: 'F' },
  vaca: { label: 'Vaca', sexo: 'F' },
  bezerro: { label: 'Bezerro', sexo: 'M' },
  garrote: { label: 'Garrote', sexo: 'M' },
  boi: { label: 'Boi', sexo: 'M' },
  touro: { label: 'Touro', sexo: 'M' },
};

export const ORDEM_CATEGORIAS: CategoriaGado[] = ['vaca', 'novilha', 'bezerra', 'touro', 'boi', 'garrote', 'bezerro'];

export const APTIDOES: Record<Aptidao, string> = { corte: 'Corte', leite: 'Leite', misto: 'Misto' };

export const TIPOS_EVENTO_GADO: Record<
  TipoEventoGado,
  { label: string; icone: IconName; cor: string; soFemea?: boolean; produto?: boolean }
> = {
  pesagem: { label: 'Pesagem', icone: 'scale-balance', cor: '#5D4037' },
  vacina: { label: 'Vacina', icone: 'needle', cor: '#7B4BA0', produto: true },
  vermifugo: { label: 'Vermífugo', icone: 'pill', cor: '#4B6B45', produto: true },
  medicamento: { label: 'Medicamento', icone: 'medical-bag', cor: '#C2412E', produto: true },
  cobertura: { label: 'Cobertura (monta)', icone: 'heart-outline', cor: '#B5532F', soFemea: true },
  inseminacao: { label: 'Inseminação', icone: 'test-tube', cor: '#B5532F', soFemea: true },
  diagnostico: { label: 'Diagnóstico de prenhez', icone: 'stethoscope', cor: '#2F7A8C', soFemea: true },
  parto: { label: 'Parto', icone: 'baby-bottle-outline', cor: '#1F9C8A', soFemea: true },
  secagem: { label: 'Secagem', icone: 'water-off-outline', cor: '#8D6E63', soFemea: true },
  pasto: { label: 'Troca de pasto', icone: 'grass', cor: '#4B6B45' },
  venda: { label: 'Venda', icone: 'cash', cor: '#2D4A33' },
  morte: { label: 'Morte', icone: 'alert-circle-outline', cor: '#C2412E' },
  nota: { label: 'Anotação', icone: 'note-text-outline', cor: '#5F6B63' },
};

export const ORDEM_EVENTOS_GADO: TipoEventoGado[] = [
  'pesagem',
  'vacina',
  'vermifugo',
  'medicamento',
  'cobertura',
  'inseminacao',
  'diagnostico',
  'parto',
  'secagem',
  'pasto',
  'venda',
  'morte',
  'nota',
];

/** Eventos que podem ser lançados para vários animais de uma vez */
export const EVENTOS_EM_LOTE: TipoEventoGado[] = ['pesagem', 'vacina', 'vermifugo', 'medicamento', 'pasto', 'nota'];

// ------------------------------------------------------------------ animal

export function eventosDo(animalId: string, eventos: EventoGado[]): EventoGado[] {
  return eventos
    .filter((e) => e.animalId === animalId)
    .sort((a, b) => (a.data === b.data ? a.criadoEm.localeCompare(b.criadoEm) : a.data.localeCompare(b.data)));
}

export type SituacaoAnimal = 'ativo' | 'vendido' | 'morto';

export function situacao(a: Animal, eventos: EventoGado[]): SituacaoAnimal {
  for (const e of eventos) {
    if (e.animalId !== a.id) continue;
    if (e.tipo === 'morte') return 'morto';
    if (e.tipo === 'venda') return 'vendido';
  }
  return 'ativo';
}

export function ativos(animais: Animal[], eventos: EventoGado[]): Animal[] {
  const fora = new Set(eventos.filter((e) => e.tipo === 'venda' || e.tipo === 'morte').map((e) => e.animalId));
  return animais.filter((a) => !fora.has(a.id));
}

export function idadeMeses(a: Animal, ref = hoje()): number | null {
  if (!a.dataNascimento) return null;
  return Math.max(0, Math.floor(diffDias(ref, a.dataNascimento) / 30.44));
}

export function fmtIdadeGado(meses: number | null): string {
  if (meses === null) return '—';
  if (meses < 1) return 'recém-nascido';
  if (meses < 24) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  return resto ? `${anos}a ${resto}m` : `${anos} anos`;
}

export interface Pesagem {
  data: string;
  kg: number;
}

export function pesagens(a: Animal, eventos: EventoGado[]): Pesagem[] {
  const lista: Pesagem[] = [];
  if (a.pesoEntradaKg) lista.push({ data: a.dataEntrada, kg: a.pesoEntradaKg });
  for (const e of eventosDo(a.id, eventos)) if (e.tipo === 'pesagem' && e.pesoKg) lista.push({ data: e.data, kg: e.pesoKg });
  return lista.sort((x, y) => x.data.localeCompare(y.data));
}

export function pesoAtual(a: Animal, eventos: EventoGado[]): number | null {
  const p = pesagens(a, eventos);
  return p.length ? p[p.length - 1].kg : null;
}

/** Ganho médio diário (kg/dia) entre a primeira e a última pesagem */
export function gmd(a: Animal, eventos: EventoGado[]): number | null {
  const p = pesagens(a, eventos);
  if (p.length < 2) return null;
  const dias = diffDias(p[p.length - 1].data, p[0].data);
  return dias > 0 ? (p[p.length - 1].kg - p[0].kg) / dias : null;
}

/** Arrobas (15 kg de peso vivo). Para carcaça, o comprador usa o rendimento (~50–55%). */
export function arrobas(kg: number): number {
  return kg / 15;
}

export function pastoAtual(a: Animal, eventos: EventoGado[]): string | undefined {
  const trocas = eventosDo(a.id, eventos).filter((e) => e.tipo === 'pasto' && e.pasto);
  return trocas.length ? trocas[trocas.length - 1].pasto : a.pasto;
}

export function nomeAnimal(a: Animal | undefined): string {
  if (!a) return 'Animal excluído';
  return a.nome ? `${a.brinco} · ${a.nome}` : `Brinco ${a.brinco}`;
}

/** Resumo de um evento para listas: "320 kg · próxima 10/12" */
export function descreverEventoGado(e: EventoGado): string {
  const p: string[] = [];
  if (e.pesoKg) p.push(`${fmtQtd(e.pesoKg)} kg`);
  if (e.produto) p.push(e.produto);
  if (e.quantidade) p.push(`dose ${fmtQtd(e.quantidade)}`);
  if (e.reprodutor) p.push(e.reprodutor);
  if (e.resultado) p.push(e.resultado === 'prenhe' ? 'Prenhe' : 'Vazia');
  if (e.pasto) p.push(`→ ${e.pasto}`);
  if (e.valor) p.push(fmtMoeda(e.valor));
  if (e.proximaData) p.push(`próxima ${fmtDataCurta(e.proximaData)}`);
  if (e.observacao) p.push(e.observacao);
  return p.join(' · ');
}

// ------------------------------------------------------------------ gestação

export interface Gestacao {
  vaca: Animal;
  inicio: string;
  tipo: 'cobertura' | 'inseminacao';
  reprodutor?: string;
  confirmada: boolean;
  dia: number;
  previsao: string;
  faltam: number;
}

/** Gestação em andamento: última cobertura/inseminação sem parto depois e sem diagnóstico "vazia" */
export function gestacao(vaca: Animal, eventos: EventoGado[], ref = hoje()): Gestacao | null {
  if (vaca.sexo !== 'F') return null;
  const evs = eventosDo(vaca.id, eventos);
  let ini: EventoGado | undefined;
  let confirmada = false;
  for (const e of evs) {
    if (e.tipo === 'cobertura' || e.tipo === 'inseminacao') {
      ini = e;
      confirmada = false;
    } else if (ini && e.tipo === 'parto') ini = undefined;
    else if (ini && e.tipo === 'diagnostico') {
      if (e.resultado === 'vazia') ini = undefined;
      else confirmada = true;
    } else if (e.tipo === 'venda' || e.tipo === 'morte') return null;
  }
  if (!ini) return null;
  const dia = diffDias(ref, ini.data) + 1;
  const previsao = addDias(ini.data, GESTACAO_DIAS);
  return {
    vaca,
    inicio: ini.data,
    tipo: ini.tipo as 'cobertura' | 'inseminacao',
    reprodutor: ini.reprodutor,
    confirmada,
    dia,
    previsao,
    faltam: Math.max(0, diffDias(previsao, ref)),
  };
}

export function gestacoes(animais: Animal[], eventos: EventoGado[]): Gestacao[] {
  return ativos(animais, eventos)
    .map((a) => gestacao(a, eventos))
    .filter((g): g is Gestacao => !!g)
    .sort((a, b) => a.previsao.localeCompare(b.previsao));
}

export interface MarcoGestacao {
  dia: number;
  data: string;
  titulo: string;
  texto: string;
  icone: IconName;
}

export function calendarioGestacao(g: Gestacao): MarcoGestacao[] {
  const d = (n: number) => addDias(g.inicio, n - 1);
  const leite = g.vaca.aptidao !== 'corte';
  const m: MarcoGestacao[] = [
    { dia: 1, data: d(1), titulo: g.tipo === 'inseminacao' ? 'Inseminação' : 'Cobertura', texto: g.reprodutor ? `Reprodutor: ${g.reprodutor}` : 'Início da gestação', icone: 'heart-outline' },
    { dia: 21, data: d(21), titulo: 'Observar retorno ao cio', texto: 'Se voltar ao cio, ela não emprenhou', icone: 'eye-outline' },
    { dia: 45, data: d(45), titulo: 'Diagnóstico de prenhez', texto: 'Toque ou ultrassom entre 30 e 60 dias', icone: 'stethoscope' },
  ];
  if (leite) m.push({ dia: GESTACAO_DIAS - 60, data: d(GESTACAO_DIAS - 60), titulo: 'Secagem', texto: 'Pare a ordenha 60 dias antes do parto', icone: 'water-off-outline' });
  m.push(
    { dia: GESTACAO_DIAS - 21, data: d(GESTACAO_DIAS - 21), titulo: 'Pré-parto', texto: 'Leve para o piquete maternidade, perto de casa', icone: 'home-heart' },
    { dia: GESTACAO_DIAS, data: d(GESTACAO_DIAS), titulo: 'Parto previsto', texto: 'Pode variar uns 10 dias para mais ou para menos', icone: 'baby-bottle-outline' },
  );
  return m;
}

export function faseGestacao(g: Gestacao): { titulo: string; texto: string } {
  const p = g.dia / GESTACAO_DIAS;
  if (g.dia <= 45 && !g.confirmada)
    return { titulo: 'Aguardando confirmação', texto: 'Observe se ela volta ao cio por volta do dia 21. Confirme a prenhez com toque ou ultrassom.' };
  if (p < 0.34) return { titulo: '1º trimestre', texto: 'O embrião se fixa e os órgãos se formam. Evite estresse, transporte e vacinas não recomendadas para prenhes.' };
  if (p < 0.67) return { titulo: '2º trimestre', texto: 'O bezerro cresce devagar. Mantenha a vaca em bom estado corporal, com sal mineral à vontade.' };
  if (g.faltam > 21) return { titulo: '3º trimestre', texto: 'Fase de maior crescimento do bezerro. Capriche no pasto e no sal mineral; vacas leiteiras devem ser secas.' };
  if (g.faltam > 0) return { titulo: 'Pré-parto', texto: 'Mantenha no piquete maternidade e observe: úbere cheio, vulva inchada e ligamentos da cauda soltos indicam parto próximo.' };
  return { titulo: 'Parto a qualquer momento', texto: 'Observe de longe. Se o trabalho de parto passar de 2 horas sem progresso, chame o veterinário.' };
}

// ------------------------------------------------------------------ cuidados do dia

export interface CuidadoGado {
  id: string;
  animalId: string;
  tipo: TipoEventoGado;
  titulo: string;
  detalhe: string;
  data: string;
  atrasado: boolean;
}

/**
 * Doses pendentes: eventos sanitários com "próxima dose" que ainda não ganharam um registro
 * posterior do mesmo tipo e produto. Mais marcos de gestação de hoje.
 */
export function cuidadosGado(animais: Animal[], eventos: EventoGado[], ateDias = 0, ref = hoje()): CuidadoGado[] {
  const limite = addDias(ref, ateDias);
  const vivos = new Map(ativos(animais, eventos).map((a) => [a.id, a]));
  const lista: CuidadoGado[] = [];
  for (const e of eventos) {
    if (!e.proximaData || !vivos.has(e.animalId) || e.proximaData > limite) continue;
    const feito = eventos.some(
      (x) =>
        x.animalId === e.animalId &&
        x.tipo === e.tipo &&
        x.id !== e.id &&
        (x.produto ?? x.itemId) === (e.produto ?? e.itemId) &&
        x.data >= e.proximaData! &&
        x.data > e.data,
    );
    if (feito) continue;
    const cfg = TIPOS_EVENTO_GADO[e.tipo];
    lista.push({
      id: `dose:${e.id}`,
      animalId: e.animalId,
      tipo: e.tipo,
      titulo: `${cfg.label}${e.produto ? `: ${e.produto}` : ''}`,
      detalhe: nomeAnimal(vivos.get(e.animalId)),
      data: e.proximaData,
      atrasado: e.proximaData < ref,
    });
  }
  for (const g of gestacoes(animais, eventos)) {
    for (const m of calendarioGestacao(g)) {
      if (m.dia === 1 || m.data < ref || m.data > limite) continue;
      if (m.titulo === 'Diagnóstico de prenhez' && g.confirmada) continue;
      lista.push({
        id: `gest:${g.vaca.id}:${m.dia}`,
        animalId: g.vaca.id,
        tipo: m.titulo.startsWith('Parto') ? 'parto' : m.titulo.startsWith('Diag') ? 'diagnostico' : m.titulo === 'Secagem' ? 'secagem' : 'nota',
        titulo: m.titulo,
        detalhe: nomeAnimal(g.vaca),
        data: m.data,
        atrasado: false,
      });
    }
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data));
}
