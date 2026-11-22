import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useStore } from './store';
import { nuvemConfigurada, supabase } from './supabase';
import { desvincular, temDadosLocais, vincularFazenda } from './sync';

export type Papel = 'dono' | 'funcionario';

export interface Fazenda {
  id: string;
  nome: string;
  papel: Papel;
  codigoConvite?: string;
}

export interface Membro {
  userId: string;
  nome: string;
  papel: Papel;
}

interface EstadoConta {
  /** 'local' = escolheu usar sem conta; null = ainda não escolheu */
  modo: 'local' | 'nuvem' | null;
  fazenda: Fazenda | null;
  /** não salvos: vêm da sessão do Supabase */
  userId: string | null;
  email: string | null;
  nome: string;
  sessaoCarregada: boolean;
  hidratado: boolean;
}

export const useConta = create<EstadoConta>()(
  persist(
    (): EstadoConta => ({
      modo: null,
      fazenda: null,
      userId: null,
      email: null,
      nome: '',
      sessaoCarregada: !nuvemConfigurada,
      hidratado: false,
    }),
    {
      name: 'fazenda-ativa:conta',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ modo: s.modo, fazenda: s.fazenda }),
      onRehydrateStorage: () => () => useConta.setState({ hidratado: true }),
    },
  ),
);

// Acompanha login/logout (inclusive sessão restaurada ao abrir o app).
if (supabase) {
  supabase.auth.onAuthStateChange((_evento, sessao) => {
    const u = sessao?.user;
    useConta.setState({
      userId: u?.id ?? null,
      email: u?.email ?? null,
      nome: (u?.user_metadata?.nome as string | undefined) ?? '',
      sessaoCarregada: true,
    });
  });
}

/** O que o usuário atual pode fazer. Sem conta (só no aparelho) pode tudo. */
export function usePermissoes() {
  const papel = useConta((s) => (s.modo === 'nuvem' ? s.fazenda?.papel : 'dono'));
  const dono = papel !== 'funcionario';
  return { dono, editarCadastros: dono, apagar: dono };
}

// ------------------------------------------------------------------ login

function sb() {
  if (!supabase) throw new Error('Nuvem não configurada');
  return supabase;
}

export async function entrar(email: string, senha: string) {
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password: senha });
  if (error) throw error;
}

/** Devolve true se precisar confirmar o e-mail antes de entrar. */
export async function cadastrar(nome: string, email: string, senha: string): Promise<boolean> {
  const { data, error } = await sb().auth.signUp({
    email: email.trim(),
    password: senha,
    options: { data: { nome: nome.trim() } },
  });
  if (error) throw error;
  return !data.session;
}

export async function sair() {
  desvincular();
  useConta.setState({ fazenda: null, modo: null });
  if (supabase) await supabase.auth.signOut();
}

export function usarSemConta() {
  useConta.setState({ modo: 'local' });
}

/** Volta para a tela de login, mantendo os dados do aparelho (para depois enviá-los à fazenda). */
export function querConectar() {
  useConta.setState({ modo: null });
}

// ------------------------------------------------------------------ fazenda

/** Procura a fazenda da qual o usuário já participa (ex.: depois de reinstalar o app). */
export async function buscarMinhaFazenda(): Promise<Fazenda | null> {
  const userId = useConta.getState().userId;
  if (!userId) return null;
  const { data, error } = await sb()
    .from('membros')
    .select('papel, fazendas ( id, nome, codigo_convite )')
    .eq('user_id', userId)
    .order('criado_em', { ascending: true })
    .limit(1);
  if (error) throw error;
  type F = { id: string; nome: string; codigo_convite: string };
  const linha = data?.[0] as unknown as { papel: Papel; fazendas: F | F[] | null } | undefined;
  // Relação "muitos para um": o Supabase devolve um objeto (o tipo genérico diz lista).
  const f = Array.isArray(linha?.fazendas) ? linha.fazendas[0] : linha?.fazendas;
  if (!linha || !f) return null;
  return { id: f.id, nome: f.nome, papel: linha.papel, codigoConvite: f.codigo_convite };
}

/** Atualiza nome/papel/código (pode ter mudado em outro aparelho). Se saiu da fazenda, desconecta. */
export async function atualizarFazenda() {
  const atual = useConta.getState().fazenda;
  if (!atual || !supabase) return;
  const f = await buscarMinhaFazenda().catch(() => undefined);
  if (f === undefined) return; // sem internet: mantém como está
  if (f === null || f.id !== atual.id) {
    desvincular();
    useConta.setState({ fazenda: null });
    return;
  }
  useConta.setState({ fazenda: f });
}

/** Conecta à fazenda. `manterLocais`: envia os dados que já estão neste aparelho. */
export function conectar(f: Fazenda, manterLocais: boolean) {
  useConta.setState({ fazenda: f, modo: 'nuvem' });
  if (useStore.getState().sync.fazendaId !== f.id) vincularFazenda(f.id, manterLocais && temDadosLocais());
}

export async function criarFazenda(nomeFazenda: string): Promise<Fazenda> {
  const { data, error } = await sb().rpc('criar_fazenda', {
    nome_fazenda: nomeFazenda.trim(),
    meu_nome: useConta.getState().nome,
  });
  if (error) throw error;
  const f = await buscarMinhaFazenda();
  return f ?? { id: data as string, nome: nomeFazenda.trim(), papel: 'dono' };
}

export async function entrarComCodigo(codigo: string): Promise<Fazenda> {
  const { error } = await sb().rpc('entrar_fazenda', {
    codigo: codigo.trim().toUpperCase(),
    meu_nome: useConta.getState().nome,
  });
  if (error) {
    if (error.code === 'P0002') throw new Error('Código de convite não encontrado. Confira com o dono da fazenda.');
    throw error;
  }
  const f = await buscarMinhaFazenda();
  if (!f) throw new Error('Não foi possível entrar na fazenda.');
  return f;
}

export async function trocarCodigo(): Promise<string> {
  const f = useConta.getState().fazenda;
  if (!f) throw new Error('Sem fazenda');
  const { data, error } = await sb().rpc('novo_codigo_convite', { f: f.id });
  if (error) throw error;
  useConta.setState({ fazenda: { ...f, codigoConvite: data as string } });
  return data as string;
}

export async function listarMembros(): Promise<Membro[]> {
  const f = useConta.getState().fazenda;
  if (!f) return [];
  const { data, error } = await sb()
    .from('membros')
    .select('user_id, nome, papel')
    .eq('fazenda_id', f.id)
    .order('criado_em', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({ userId: m.user_id as string, nome: m.nome as string, papel: m.papel as Papel }));
}

export async function removerMembro(userId: string) {
  const f = useConta.getState().fazenda;
  if (!f) return;
  const { error } = await sb().from('membros').delete().eq('fazenda_id', f.id).eq('user_id', userId);
  if (error) throw error;
}
