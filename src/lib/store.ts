import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { kgParaUnidade, planoTrato } from './calc';
import { TIPOS_MANEJO } from './constants';
import { addDias, hoje } from './dates';
import { novoId } from './format';
import { gerarExemplo } from './seed';
import type { Galinheiro, ItemEstoque, Lote, Manejo, MovEstoque, Tarefa } from './types';

type Novo<T> = Omit<T, 'id' | 'criadoEm'> & { id?: string };

export interface Dados {
  galinheiros: Galinheiro[];
  lotes: Lote[];
  manejos: Manejo[];
  itens: ItemEstoque[];
  movimentos: MovEstoque[];
  tarefas: Tarefa[];
}

interface Estado extends Dados {
  hidratado: boolean;

  salvarGalinheiro: (g: Novo<Galinheiro>) => string;
  excluirGalinheiro: (id: string) => void;

  salvarLote: (l: Novo<Lote>) => string;
  excluirLote: (id: string) => void;

  registrarManejo: (m: Omit<Manejo, 'id' | 'criadoEm'>) => string;
  excluirManejo: (id: string) => void;

  salvarItem: (i: Novo<ItemEstoque>) => string;
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

  carregarExemplo: () => void;
  limparTudo: () => void;
}

const vazio: Dados = { galinheiros: [], lotes: [], manejos: [], itens: [], movimentos: [], tarefas: [] };

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
          itens: darBaixa
            ? s.itens.map((i) => (i.id === m.itemId ? { ...i, quantidade: i.quantidade - (m.quantidade ?? 0) } : i))
            : s.itens,
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
        const mov = s.movimentos.find((x) => x.manejoId === id);
        set({
          manejos: s.manejos.filter((m) => m.id !== id),
          movimentos: s.movimentos.filter((x) => x.manejoId !== id),
          itens: mov
            ? s.itens.map((i) => (i.id === mov.itemId ? { ...i, quantidade: i.quantidade - mov.quantidade } : i))
            : s.itens,
        });
      },

      salvarItem: (i) => {
        const [itens, id] = upsert(get().itens, i);
        set({ itens });
        return id;
      },
      excluirItem: (id) => {
        const s = get();
        set({
          itens: s.itens.filter((i) => i.id !== id),
          movimentos: s.movimentos.filter((m) => m.itemId !== id),
          manejos: s.manejos.map((m) => (m.itemId === id ? { ...m, itemId: undefined } : m)),
          tarefas: s.tarefas.map((t) => (t.itemId === id ? { ...t, itemId: undefined } : t)),
        });
      },
      entradaEstoque: (itemId, quantidade, custoTotal) => {
        const s = get();
        const agora = new Date().toISOString();
        set({
          itens: s.itens.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  quantidade: i.quantidade + quantidade,
                  custoUnitario: custoTotal && quantidade > 0 ? custoTotal / quantidade : i.custoUnitario,
                }
              : i,
          ),
          movimentos: [
            ...s.movimentos,
            { id: novoId(), itemId, tipo: 'entrada', quantidade, data: hoje(), custoTotal, criadoEm: agora },
          ],
        });
      },
      ajustarEstoque: (itemId, novaQuantidade) => {
        const s = get();
        const item = s.itens.find((i) => i.id === itemId);
        if (!item) return;
        const diff = novaQuantidade - item.quantidade;
        if (diff === 0) return;
        set({
          itens: s.itens.map((i) => (i.id === itemId ? { ...i, quantidade: novaQuantidade } : i)),
          movimentos: [
            ...s.movimentos,
            {
              id: novoId(),
              itemId,
              tipo: 'ajuste',
              quantidade: diff,
              data: hoje(),
              criadoEm: new Date().toISOString(),
            },
          ],
        });
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
        const { linhas } = planoTrato(s.lotes, s.manejos, s.itens);
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

      carregarExemplo: () => set(gerarExemplo()),
      limparTudo: () => set(vazio),
    }),
    {
      name: 'fazenda-ativa:v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s): Dados => ({
        galinheiros: s.galinheiros,
        lotes: s.lotes,
        manejos: s.manejos,
        itens: s.itens,
        movimentos: s.movimentos,
        tarefas: s.tarefas,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hidratado: true });
      },
    },
  ),
);
