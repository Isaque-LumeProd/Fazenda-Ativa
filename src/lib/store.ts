import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kgParaUnidade, planoTrato } from './calc';
import { TIPOS_MANEJO } from './constants';
import { addDias, hoje } from './dates';
import { comSaldo, saldoDoItem } from './estoque';
import { novoId } from './format';
import { gerarExemplo } from './seed';
import type {
  Animal,
  Chocada,
  EventoChocada,
  EventoGado,
  Galinheiro,
  ItemEstoque,
  Lote,
  Manejo,
  MovEstoque,
  OvoChocada,
  Tarefa,
} from './types';

type Novo<T> = Omit<T, 'id' | 'criadoEm'> & { id?: string };

export const COLECOES = [
  'galinheiros',
  'lotes',
  'manejos',
  'itens',
  'movimentos',
  'tarefas',
  'chocadas',
  'eventosChocada',
  'animais',
  'eventosGado',
] as const;
export type Colecao = (typeof COLECOES)[number];

/** Controle da sincronização com a nuvem (salvo junto com os dados) */
export interface MetaSync {
  /** fazenda à qual os dados deste aparelho pertencem; null = só neste aparelho */
  fazendaId: string | null;
  /** maior "rev" já recebido do servidor */
  cursor: number;
  /** "colecao:id" → marca da alteração ainda não enviada */
  pendentes: Record<string, number>;
}

export interface Dados {
  galinheiros: Galinheiro[];
  lotes: Lote[];
  manejos: Manejo[];
  itens: ItemEstoque[];
  movimentos: MovEstoque[];
  tarefas: Tarefa[];
  chocadas: Chocada[];
  eventosChocada: EventoChocada[];
  animais: Animal[];
  eventosGado: EventoGado[];
}

interface Estado extends Dados {
  hidratado: boolean;
  sync: MetaSync;

  salvarGalinheiro: (g: Novo<Galinheiro>) => string;
  excluirGalinheiro: (id: string) => void;

  salvarLote: (l: Novo<Lote>) => string;
  excluirLote: (id: string) => void;

  registrarManejo: (m: Omit<Manejo, 'id' | 'criadoEm'>) => string;
  excluirManejo: (id: string) => void;

  /** `quantidadeInicial` só vale para item novo (vira um ajuste de estoque) */
  salvarItem: (i: Novo<ItemEstoque> & { quantidadeInicial?: number }) => string;
  excluirItem: (id: string) => void;
  entradaEstoque: (itemId: string, quantidade: number, custoTotal?: number) => void;
  ajustarEstoque: (itemId: string, novaQuantidade: number) => void;

  salvarTarefa: (t: Novo<Tarefa>) => string;
  excluirTarefa: (id: string) => void;
  /** Reagenda a tarefa para hoje + frequência */
  marcarTarefaFeita: (id: string) => void;
  /** Registra o manejo da tarefa (com item/quantidade padrão) e reagenda */
  concluirTarefa: (id: string) => void;

  /** Dá baixa da ração de todos os lotes ativos: meio trato ou o que falta do dia */
  baixarTrato: (modo: 'meio' | 'restante') => { lotes: number; kg: number };

  salvarChocada: (c: Novo<Chocada>) => string;
  excluirChocada: (id: string) => void;
  /** Troca o estado de um ovo da bandeja */
  salvarOvo: (chocadaId: string, indice: number, ovo: OvoChocada) => void;
  /** Muda a quantidade de ovos mantendo os já avaliados */
  definirQtdOvos: (chocadaId: string, qtd: number) => void;
  marcarTodosFerteis: (chocadaId: string) => void;
  registrarEventoChocada: (e: Omit<EventoChocada, 'id' | 'criadoEm'>) => string;
  excluirEventoChocada: (id: string) => void;

  salvarAnimal: (a: Novo<Animal>) => string;
  excluirAnimal: (id: string) => void;
  /** Registra o evento; vacina/vermífugo/medicamento com item e dose dão baixa no estoque */
  registrarEventoGado: (e: Omit<EventoGado, 'id' | 'criadoEm'>) => string;
  excluirEventoGado: (id: string) => void;

  carregarExemplo: () => void;
  limparTudo: () => void;
}

export const vazio: Dados = {
  galinheiros: [],
  lotes: [],
  manejos: [],
  itens: [],
  movimentos: [],
  tarefas: [],
  chocadas: [],
  eventosChocada: [],
  animais: [],
  eventosGado: [],
};
export const SYNC_VAZIO: MetaSync = { fazendaId: null, cursor: 0, pendentes: {} };

function upsert<T extends { id: string; criadoEm: string }>(lista: T[], dado: Novo<T>): [T[], string] {
  if (dado.id && lista.some((x) => x.id === dado.id)) {
    return [lista.map((x) => (x.id === dado.id ? ({ ...x, ...dado } as T) : x)), dado.id];
  }
  const id = dado.id ?? novoId();
  return [[...lista, { ...dado, id, criadoEm: new Date().toISOString() } as T], id];
}

export const useStore = create<Estado>()(
  persist(
    (set, get) => ({
      ...vazio,
      hidratado: false,
      sync: SYNC_VAZIO,

      salvarGalinheiro: (g) => {
        const [galinheiros, id] = upsert(get().galinheiros, g);
        set({ galinheiros });
        return id;
      },
      excluirGalinheiro: (id) => {
        const s = get();
        const loteIds = new Set(s.lotes.filter((l) => l.galinheiroId === id).map((l) => l.id));
        set({
          galinheiros: s.galinheiros.filter((g) => g.id !== id),
          lotes: s.lotes.filter((l) => !loteIds.has(l.id)),
          manejos: s.manejos.filter((m) => m.galinheiroId !== id && !(m.loteId && loteIds.has(m.loteId))),
          tarefas: s.tarefas.filter((t) => t.galinheiroId !== id && !(t.loteId && loteIds.has(t.loteId))),
        });
      },

      salvarLote: (l) => {
        const [lotes, id] = upsert(get().lotes, l);
        set({ lotes });
        return id;
      },
      excluirLote: (id) => {
        const s = get();
        set({
          lotes: s.lotes.filter((l) => l.id !== id),
          manejos: s.manejos.filter((m) => m.loteId !== id),
          tarefas: s.tarefas.filter((t) => t.loteId !== id),
        });
      },

      registrarManejo: (m) => {
        const s = get();
        const id = novoId();
        const agora = new Date().toISOString();
        const manejo: Manejo = { ...m, id, criadoEm: agora };
        const darBaixa = !!(m.itemId && m.quantidade && TIPOS_MANEJO[m.tipo].item);
        set({
          manejos: [...s.manejos, manejo],
          movimentos: darBaixa
            ? [
                ...s.movimentos,
                {
                  id: novoId(),
                  itemId: m.itemId!,
                  tipo: 'saida',
                  quantidade: -(m.quantidade ?? 0),
                  data: m.data,
                  manejoId: id,
                  criadoEm: agora,
                },
              ]
            : s.movimentos,
        });
        return id;
      },
      excluirManejo: (id) => {
        const s = get();
        set({
          manejos: s.manejos.filter((m) => m.id !== id),
          movimentos: s.movimentos.filter((x) => x.manejoId !== id),
        });
      },

      salvarItem: ({ quantidadeInicial, ...i }) => {
        const s = get();
        const novo = !i.id || !s.itens.some((x) => x.id === i.id);
        const [itens, id] = upsert(s.itens, i);
        const movimentos = novo && quantidadeInicial ? [...s.movimentos, novoAjuste(id, quantidadeInicial)] : s.movimentos;
        set({ itens, movimentos });
        return id;
      },
      excluirItem: (id) => {
        const s = get();
        set({
          itens: s.itens.filter((i) => i.id !== id),
          movimentos: s.movimentos.filter((m) => m.itemId !== id),
          manejos: s.manejos.map((m) => (m.itemId === id ? { ...m, itemId: undefined } : m)),
          eventosGado: s.eventosGado.map((e) => (e.itemId === id ? { ...e, itemId: undefined } : e)),
          tarefas: s.tarefas.map((t) => (t.itemId === id ? { ...t, itemId: undefined } : t)),
        });
      },
      entradaEstoque: (itemId, quantidade, custoTotal) => {
        const s = get();
        const agora = new Date().toISOString();
        set({
          movimentos: [
            ...s.movimentos,
            { id: novoId(), itemId, tipo: 'entrada', quantidade, data: hoje(), custoTotal, criadoEm: agora },
          ],
        });
      },
      ajustarEstoque: (itemId, novaQuantidade) => {
        const s = get();
        if (!s.itens.some((i) => i.id === itemId)) return;
        const diff = Math.round((novaQuantidade - saldoDoItem(itemId, s.movimentos)) * 1e6) / 1e6;
        if (diff === 0) return;
        set({ movimentos: [...s.movimentos, novoAjuste(itemId, diff)] });
      },

      salvarTarefa: (t) => {
        const [tarefas, id] = upsert(get().tarefas, t);
        set({ tarefas });
        return id;
      },
      excluirTarefa: (id) => set({ tarefas: get().tarefas.filter((t) => t.id !== id) }),
      marcarTarefaFeita: (id) => {
        set({
          tarefas: get().tarefas.map((t) =>
            t.id === id ? { ...t, proximaData: addDias(hoje(), Math.max(1, t.frequenciaDias)) } : t,
          ),
        });
      },
      concluirTarefa: (id) => {
        const s = get();
        const t = s.tarefas.find((x) => x.id === id);
        if (!t) return;
        const lote = t.loteId ? s.lotes.find((l) => l.id === t.loteId) : undefined;
        s.registrarManejo({
          tipo: t.tipoManejo,
          data: hoje(),
          loteId: t.loteId,
          galinheiroId: t.galinheiroId ?? lote?.galinheiroId,
          itemId: t.itemId,
          quantidade: t.quantidadePadrao,
          observacao: `Tarefa: ${t.titulo}`,
        });
        get().marcarTarefaFeita(id);
      },

      baixarTrato: (modo) => {
        const s = get();
        const { linhas } = planoTrato(s.lotes, s.manejos, comSaldo(s.itens, s.movimentos));
        let lotes = 0;
        let kg = 0;
        for (const l of linhas) {
          if (!l.item) continue;
          const falta = Math.max(0, l.kgDia - l.servidoKg);
          if (falta < 0.1) continue;
          const qtdKg = Math.round((modo === 'meio' ? Math.min(l.kgDia / 2, falta) : falta) * 100) / 100;
          if (qtdKg <= 0) continue;
          get().registrarManejo({
            tipo: 'racao',
            data: hoje(),
            loteId: l.lote.id,
            galinheiroId: l.lote.galinheiroId,
            itemId: l.item.id,
            quantidade: kgParaUnidade(qtdKg, l.item),
            observacao: modo === 'meio' ? 'Meio trato' : 'Trato do dia',
          });
          lotes += 1;
          kg += qtdKg;
        }
        return { lotes, kg };
      },

      salvarChocada: (c) => {
        const [chocadas, id] = upsert(get().chocadas, c);
        set({ chocadas });
        return id;
      },
      excluirChocada: (id) => {
        const s = get();
        set({
          chocadas: s.chocadas.filter((c) => c.id !== id),
          eventosChocada: s.eventosChocada.filter((e) => e.chocadaId !== id),
        });
      },
      salvarOvo: (chocadaId, indice, ovo) => {
        set({
          chocadas: get().chocadas.map((c) =>
            c.id === chocadaId ? { ...c, ovos: c.ovos.map((o, i) => (i === indice ? ovo : o)) } : c,
          ),
        });
      },
      definirQtdOvos: (chocadaId, qtd) => {
        const n = Math.max(1, Math.min(500, Math.round(qtd)));
        set({
          chocadas: get().chocadas.map((c) => {
            if (c.id !== chocadaId) return c;
            const ovos = c.ovos.slice(0, n);
            while (ovos.length < n) ovos.push({ status: 'na' });
            return { ...c, ovos };
          }),
        });
      },
      marcarTodosFerteis: (chocadaId) => {
        set({
          chocadas: get().chocadas.map((c) =>
            c.id === chocadaId
              ? { ...c, ovos: c.ovos.map((o) => (o.status === 'na' ? { ...o, status: 'fertil' as const } : o)) }
              : c,
          ),
        });
      },
      registrarEventoChocada: (e) => {
        const id = novoId();
        set({ eventosChocada: [...get().eventosChocada, { ...e, id, criadoEm: new Date().toISOString() }] });
        return id;
      },
      excluirEventoChocada: (id) => set({ eventosChocada: get().eventosChocada.filter((e) => e.id !== id) }),

      salvarAnimal: (a) => {
        const [animais, id] = upsert(get().animais, a);
        set({ animais });
        return id;
      },
      excluirAnimal: (id) => {
        const s = get();
        const evIds = new Set(s.eventosGado.filter((e) => e.animalId === id).map((e) => e.id));
        set({
          animais: s.animais.map((a) => (a.maeId === id ? { ...a, maeId: undefined } : a)).filter((a) => a.id !== id),
          eventosGado: s.eventosGado.filter((e) => e.animalId !== id),
          movimentos: s.movimentos.filter((m) => !(m.manejoId && evIds.has(m.manejoId))),
        });
      },
      registrarEventoGado: (e) => {
        const s = get();
        const id = novoId();
        const agora = new Date().toISOString();
        const darBaixa = !!(e.itemId && e.quantidade && ['vacina', 'vermifugo', 'medicamento'].includes(e.tipo));
        set({
          eventosGado: [...s.eventosGado, { ...e, id, criadoEm: agora }],
          movimentos: darBaixa
            ? [
                ...s.movimentos,
                { id: novoId(), itemId: e.itemId!, tipo: 'saida', quantidade: -(e.quantidade ?? 0), data: e.data, manejoId: id, criadoEm: agora },
              ]
            : s.movimentos,
        });
        return id;
      },
      excluirEventoGado: (id) => {
        const s = get();
        set({
          eventosGado: s.eventosGado.filter((e) => e.id !== id),
          movimentos: s.movimentos.filter((m) => m.manejoId !== id),
        });
      },

      carregarExemplo: () => set(gerarExemplo()),
      limparTudo: () => set(vazio),
    }),
    {
      name: 'fazenda-ativa:v1',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (salvo, versao) => migrar(salvo as Partial<Dados & { sync: MetaSync }>, versao),
      partialize: (s): Dados & { sync: MetaSync } => ({
        galinheiros: s.galinheiros,
        lotes: s.lotes,
        manejos: s.manejos,
        itens: s.itens,
        movimentos: s.movimentos,
        tarefas: s.tarefas,
        chocadas: s.chocadas,
        eventosChocada: s.eventosChocada,
        animais: s.animais,
        eventosGado: s.eventosGado,
        sync: s.sync,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hidratado: true });
      },
    },
  ),
);

function novoAjuste(itemId: string, quantidade: number): MovEstoque {
  return { id: novoId(), itemId, tipo: 'ajuste', quantidade, data: hoje(), criadoEm: new Date().toISOString() };
}

/**
 * v2 → v3: chocadas e gado são coleções novas e começam vazias (`{ ...vazio, ...salvo }`).
 *
 * v1 → v2: o saldo deixou de ficar gravado no item. Para cada item, a diferença entre o saldo
 * antigo e a soma das movimentações vira um "ajuste", então nada muda para o usuário.
 */
function migrar(salvo: Partial<Dados & { sync: MetaSync }>, versao: number) {
  const dados = { ...vazio, ...salvo };
  if (versao < 2) {
    const ajustes: MovEstoque[] = [];
    dados.itens = (dados.itens as (ItemEstoque & { quantidade?: number })[]).map(({ quantidade, ...item }) => {
      const diff = Math.round(((quantidade ?? 0) - saldoDoItem(item.id, dados.movimentos)) * 1e6) / 1e6;
      if (diff !== 0) ajustes.push(novoAjuste(item.id, diff));
      return item;
    });
    dados.movimentos = [...dados.movimentos, ...ajustes];
  }
  return { ...dados, sync: salvo.sync ?? SYNC_VAZIO };
}
