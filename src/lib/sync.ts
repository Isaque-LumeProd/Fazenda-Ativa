/**
 * Sincronização com a nuvem, "offline primeiro":
 *
 * - O app continua lendo e gravando só no aparelho (store.ts). Funciona sem internet.
 * - Cada alteração local vira uma pendência "colecao:id" (detectada comparando o estado antes/depois).
 * - Quando há conexão, as pendências são enviadas (upsert na tabela `registros`) e depois o app
 *   baixa tudo o que mudou no servidor desde o último "rev" recebido.
 * - Conflito: vale a última gravação que chegou ao servidor, registro a registro. O estoque não sofre
 *   com isso porque o saldo é a soma das movimentações, que nunca são editadas.
 * - Exclusões viram "excluido = true" no servidor, para os outros aparelhos apagarem também.
 */
import { AppState } from 'react-native';
import { create } from 'zustand';

import { supabase } from './supabase';
import { COLECOES, SYNC_VAZIO, useStore, vazio, type Colecao, type Dados } from './store';

type Registro = { id: string };
type Linha = { colecao: Colecao; id: string; dados: Registro; excluido: boolean; rev: number };

export type EstadoSync = 'desligado' | 'sincronizando' | 'ok' | 'offline' | 'erro';

export const useSyncStatus = create<{ estado: EstadoSync; ultima: string | null; aviso: string | null }>(() => ({
  estado: 'desligado',
  ultima: null,
  aviso: null,
}));

/** Quantas revisões rever a cada download (cobre gravações que terminaram fora de ordem no servidor). */
const SOBREPOSICAO = 100;
const LOTE_ENVIO = 200;
const LOTE_RECEBER = 1000;

let aplicandoRemoto = false;
let marca = 0;
const novaMarca = () => Date.now() * 1000 + (marca++ % 1000);

/** Altera os dados sem gerar pendências (dados que vieram do servidor ou limpeza local). */
export function semRegistrar(fn: () => void) {
  aplicandoRemoto = true;
  try {
    fn();
  } finally {
    aplicandoRemoto = false;
  }
}

// ------------------------------------------------------------------ detecção de alterações locais

useStore.subscribe((s, prev) => {
  if (aplicandoRemoto || !prev.hidratado || !s.sync.fazendaId) return;
  const chaves: string[] = [];
  for (const c of COLECOES) {
    if (s[c] === prev[c]) continue;
    const antes = new Map<string, Registro>((prev[c] as Registro[]).map((x) => [x.id, x]));
    for (const x of s[c] as Registro[]) {
      if (antes.get(x.id) !== x) chaves.push(`${c}:${x.id}`);
      antes.delete(x.id);
    }
    for (const id of antes.keys()) chaves.push(`${c}:${id}`);
  }
  if (!chaves.length) return;
  const pendentes = { ...s.sync.pendentes };
  for (const k of chaves) pendentes[k] = novaMarca();
  useStore.setState({ sync: { ...s.sync, pendentes } });
  agendar(1500);
});

/** Marca todos os dados atuais para envio (ex.: ao criar a fazenda com dados já no aparelho). */
function marcarTudo() {
  const s = useStore.getState();
  const pendentes: Record<string, number> = {};
  for (const c of COLECOES) for (const x of s[c] as Registro[]) pendentes[`${c}:${x.id}`] = novaMarca();
  return pendentes;
}

// ------------------------------------------------------------------ vínculo com a fazenda

/**
 * Liga os dados deste aparelho a uma fazenda.
 * `manterLocais`: true envia o que já existe no aparelho; false apaga e baixa só o que está na nuvem.
 */
export function vincularFazenda(fazendaId: string, manterLocais: boolean) {
  semRegistrar(() => {
    useStore.setState({
      ...(manterLocais ? {} : vazio),
      sync: { fazendaId, cursor: 0, pendentes: manterLocais ? marcarTudo() : {} },
    });
  });
  void sincronizar();
}

/** Apaga os dados do aparelho e o vínculo (ao sair da conta). */
export function desvincular() {
  parar();
  semRegistrar(() => useStore.setState({ ...vazio, sync: SYNC_VAZIO }));
  useSyncStatus.setState({ estado: 'desligado', ultima: null, aviso: null });
}

export function temDadosLocais(): boolean {
  const s = useStore.getState();
  return COLECOES.some((c) => s[c].length > 0);
}

export function qtdPendentes(): number {
  return Object.keys(useStore.getState().sync.pendentes).length;
}

// ------------------------------------------------------------------ envio

function linhaDe(chave: string, fazendaId: string, dados: Dados) {
  const i = chave.indexOf(':');
  const colecao = chave.slice(0, i) as Colecao;
  const id = chave.slice(i + 1);
  const atual = (dados[colecao] as Registro[]).find((x) => x.id === id);
  return { fazenda_id: fazendaId, colecao, id, dados: atual ?? {}, excluido: !atual };
}

function ehPermissao(e: { code?: string; message?: string } | null) {
  return !!e && (e.code === '42501' || /row-level security|permission denied/i.test(e.message ?? ''));
}

async function enviar(fazendaId: string) {
  const sb = supabase!;
  const { sync } = useStore.getState();
  const marcas = Object.entries(sync.pendentes);
  if (!marcas.length) return;

  const enviadas: [string, number][] = [];
  const recusadas: string[] = [];
  for (let i = 0; i < marcas.length; i += LOTE_ENVIO) {
    const lote = marcas.slice(i, i + LOTE_ENVIO);
    const dados = useStore.getState();
    const linhas = lote.map(([k]) => linhaDe(k, fazendaId, dados));
    const { error } = await sb.from('registros').upsert(linhas, { onConflict: 'fazenda_id,colecao,id' });
    if (!error) {
      enviadas.push(...lote);
      continue;
    }
    if (!ehPermissao(error)) throw error;
    // Algum registro não é permitido para este usuário: envia um a um para separar.
    for (let j = 0; j < lote.length; j++) {
      const r = await sb.from('registros').upsert([linhas[j]], { onConflict: 'fazenda_id,colecao,id' });
      if (!r.error) enviadas.push(lote[j]);
      else if (ehPermissao(r.error)) recusadas.push(lote[j][0]);
      else throw r.error;
    }
  }

  // Remove das pendências o que foi enviado e não mudou de novo enquanto enviava.
  const atual = { ...useStore.getState().sync.pendentes };
  for (const [k, m] of enviadas) if (atual[k] === m) delete atual[k];
  for (const k of recusadas) delete atual[k];
  useStore.setState({ sync: { ...useStore.getState().sync, pendentes: atual } });

  if (recusadas.length) {
    await desfazerRecusadas(fazendaId, recusadas);
    useSyncStatus.setState({
      aviso: 'Algumas alterações não foram salvas porque só o dono da fazenda pode fazê-las.',
    });
  }
}

/** Volta os registros recusados para a versão do servidor (ou remove, se não existirem lá). */
async function desfazerRecusadas(fazendaId: string, chaves: string[]) {
  const porColecao = new Map<Colecao, string[]>();
  for (const k of chaves) {
    const i = k.indexOf(':');
    const c = k.slice(0, i) as Colecao;
    porColecao.set(c, [...(porColecao.get(c) ?? []), k.slice(i + 1)]);
  }
  const linhas: Linha[] = [];
  for (const [colecao, ids] of porColecao) {
    const { data, error } = await supabase!
      .from('registros')
      .select('colecao,id,dados,excluido,rev')
      .eq('fazenda_id', fazendaId)
      .eq('colecao', colecao)
      .in('id', ids);
    if (error) throw error;
    const achados = new Set((data ?? []).map((d) => d.id as string));
    linhas.push(...((data ?? []) as Linha[]));
    for (const id of ids) {
      if (!achados.has(id)) linhas.push({ colecao, id, dados: { id }, excluido: true, rev: 0 });
    }
  }
  aplicar(linhas);
}

// ------------------------------------------------------------------ recebimento

function aplicar(linhas: Linha[]) {
  if (!linhas.length) return;
  const s = useStore.getState();
  const pendentes = s.sync.pendentes;
  const mudancas: Partial<Dados> = {};
  for (const c of COLECOES) {
    const daColecao = linhas.filter((l) => l.colecao === c && !pendentes[`${c}:${l.id}`]);
    if (!daColecao.length) continue;
    const lista = [...(s[c] as Registro[])];
    const indice = new Map(lista.map((x, i) => [x.id, i]));
    let mudou = false;
    const remover = new Set<string>();
    for (const l of daColecao) {
      const i = indice.get(l.id);
      if (l.excluido) {
        if (i !== undefined) {
          remover.add(l.id);
          mudou = true;
        }
      } else if (i === undefined) {
        indice.set(l.id, lista.length);
        lista.push(l.dados);
        mudou = true;
      } else if (JSON.stringify(lista[i]) !== JSON.stringify(l.dados)) {
        lista[i] = l.dados;
        mudou = true;
      }
    }
    if (mudou) (mudancas as Record<string, Registro[]>)[c] = remover.size ? lista.filter((x) => !remover.has(x.id)) : lista;
  }
  if (Object.keys(mudancas).length) semRegistrar(() => useStore.setState(mudancas));
}

async function receber(fazendaId: string) {
  let desde = Math.max(0, useStore.getState().sync.cursor - SOBREPOSICAO);
  let maior = useStore.getState().sync.cursor;
  for (;;) {
    const { data, error } = await supabase!
      .from('registros')
      .select('colecao,id,dados,excluido,rev')
      .eq('fazenda_id', fazendaId)
      .gt('rev', desde)
      .order('rev', { ascending: true })
      .limit(LOTE_RECEBER);
    if (error) throw error;
    const linhas = (data ?? []) as Linha[];
    // Se a fazenda mudou no meio do caminho (saiu da conta), descarta.
    if (useStore.getState().sync.fazendaId !== fazendaId) return;
    aplicar(linhas);
    for (const l of linhas) maior = Math.max(maior, Number(l.rev));
    if (linhas.length < LOTE_RECEBER) break;
    desde = Number(linhas[linhas.length - 1].rev);
  }
  useStore.setState({ sync: { ...useStore.getState().sync, cursor: maior } });
}

// ------------------------------------------------------------------ ciclo

let rodando: Promise<void> | null = null;
let repetir = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export function agendar(ms = 500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void sincronizar();
  }, ms);
}

/** Envia pendências e baixa novidades. Chamadas simultâneas viram uma só (com repetição no fim). */
export function sincronizar(): Promise<void> {
  if (rodando) {
    repetir = true;
    return rodando;
  }
  rodando = (async () => {
    do {
      repetir = false;
      const fazendaId = useStore.getState().sync.fazendaId;
      if (!supabase || !fazendaId) return;
      useSyncStatus.setState({ estado: 'sincronizando' });
      try {
        await enviar(fazendaId);
        await receber(fazendaId);
        useSyncStatus.setState({ estado: 'ok', ultima: new Date().toISOString() });
      } catch (e) {
        const msg = (e as { message?: string })?.message ?? '';
        const semRede = /fetch|network|load failed|timeout/i.test(msg) || !msg;
        useSyncStatus.setState({ estado: semRede ? 'offline' : 'erro', aviso: semRede ? null : msg });
        return;
      }
    } while (repetir);
  })().finally(() => {
    rodando = null;
  });
  return rodando;
}

// ------------------------------------------------------------------ gatilhos (tempo real, app aberto, intervalo)

let pararFns: (() => void)[] = [];

/** Liga a sincronização automática para a fazenda atual. Devolve a função que desliga. */
export function iniciar(fazendaId: string): () => void {
  parar();
  if (!supabase) return () => {};
  const sb = supabase;

  const canal = sb
    .channel(`registros:${fazendaId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'registros', filter: `fazenda_id=eq.${fazendaId}` },
      () => agendar(400),
    )
    .subscribe();
  const app = AppState.addEventListener('change', (e) => {
    if (e === 'active') agendar(0);
  });
  const intervalo = setInterval(() => agendar(0), 60_000);

  pararFns = [
    () => void sb.removeChannel(canal),
    () => app.remove(),
    () => clearInterval(intervalo),
  ];
  agendar(0);
  return parar;
}

function parar() {
  for (const f of pararFns) f();
  pararFns = [];
  if (timer) clearTimeout(timer);
  timer = null;
}
