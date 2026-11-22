import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Simula 2 aparelhos (dono e funcionário) sincronizando com um Postgres em memória que usa o
// supabase/schema.sql de verdade, com as regras de segurança ativas. Rode com: npm run test:nuvem
const SCHEMA = new URL('../../supabase/schema.sql', import.meta.url);
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
grant usage on schema public to authenticated, anon;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
`);
await db.exec(readFileSync(SCHEMA, 'utf8'));
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
let fila = Promise.resolve();
function runAs(uid, sql, params = []) {
  const p = fila.then(async () => {
    await db.exec(`reset role; select set_config('test.uid','${uid}',false); set role authenticated;`);
    try {
      const r = await db.query(sql, params);
      return { data: r.rows, error: null };
    } catch (e) {
      return { data: null, error: { message: e.message, code: e.code } };
    } finally {
      await db.exec('reset role');
    }
  });
  fila = p.catch(() => {});
  return p;
}
globalThis.__ctx = {
  a: { offline: false, run: (s, p) => runAs(A, s, p) },
  b: { offline: false, run: (s, p) => runAs(B, s, p) },
  c: { offline: false, run: (s, p) => runAs(A, s, p) },
};

// Dados antigos (versão 1, saldo gravado no item) para testar a migração no aparelho "c"
globalThis.__seed = {
  c: {
    'fazenda-ativa:v1': JSON.stringify({
      version: 0,
      state: {
        galinheiros: [],
        lotes: [],
        manejos: [],
        tarefas: [],
        itens: [{ id: 'r1', nome: 'Ração', categoria: 'racao', unidade: 'kg', quantidade: 70, estoqueMinimo: 10, custoUnitario: 2.5, criadoEm: '2026-01-01' }],
        movimentos: [
          { id: 'm1', itemId: 'r1', tipo: 'entrada', quantidade: 100, data: '2026-01-02', custoTotal: 250, criadoEm: '2026-01-02T00:00:00Z' },
          { id: 'm2', itemId: 'r1', tipo: 'saida', quantidade: -20, data: '2026-01-03', criadoEm: '2026-01-03T00:00:00Z' },
        ],
      },
    }),
  },
};

const a = await import('./out/dev-a.mjs');
const b = await import('./out/dev-b.mjs');
const c = await import('./out/dev-c.mjs');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
await espera(50);

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (!cond) falhas++;
  console.log(`${cond ? 'OK   ' : 'FALHA'} ${nome}${extra ? '  → ' + extra : ''}`);
};
const S = (d) => d.useStore.getState();
const saldo = (d, id) => d.comSaldo(S(d).itens, S(d).movimentos).find((i) => i.id === id)?.quantidade;
const pend = (d) => Object.keys(S(d).sync.pendentes).length;
const assina = (d) =>
  JSON.stringify(
    ['galinheiros', 'lotes', 'manejos', 'itens', 'movimentos', 'tarefas'].map((k) =>
      [...S(d)[k]].sort((x, y) => x.id.localeCompare(y.id)),
    ),
  );

// --- migração
const itemC = c.comSaldo(S(c).itens, S(c).movimentos)[0];
ok('migração v1→v2 mantém saldo 70 kg', itemC?.quantidade === 70, String(itemC?.quantidade));
ok('migração tira "quantidade" do item salvo', !('quantidade' in S(c).itens[0]));
ok('migração cria ajuste de -10', S(c).movimentos.some((m) => m.tipo === 'ajuste' && m.quantidade === -10));
ok('custo atual vem da compra (2,50)', itemC?.custoUnitario === 2.5);

// --- fazenda
const f = (await runAs(A, `select public.criar_fazenda('Sítio','Ana') id`)).data[0].id;
const cod = (await runAs(A, `select codigo_convite c from fazendas`)).data[0].c;
await runAs(B, `select public.entrar_fazenda($1,'Beto')`, [cod]);

// --- aparelho A: dados de exemplo locais e depois cria a fazenda enviando tudo
ok('A hidratado', S(a).hidratado);
S(a).carregarExemplo();
ok('sem fazenda, nada fica pendente', pend(a) === 0);
a.sync.vincularFazenda(f, true);
await a.sync.sincronizar();
await a.sync.sincronizar();
const noServidor = (await runAs(A, `select count(*)::int n from registros`)).data[0].n;
const local = ['galinheiros', 'lotes', 'manejos', 'itens', 'movimentos', 'tarefas'].reduce((s, k) => s + S(a)[k].length, 0);
ok('A enviou todos os registros', noServidor === local && pend(a) === 0, `${noServidor}/${local}, pendentes ${pend(a)}`);
ok('status ok', a.sync.useSyncStatus.getState().estado === 'ok');

// --- aparelho B entra e recebe tudo
S(b).carregarExemplo(); // lixo local que deve ser descartado
b.sync.vincularFazenda(f, false);
await b.sync.sincronizar();
ok('B recebeu exatamente os dados de A', assina(a) === assina(b));

// --- baixas de estoque simultâneas sem internet
const racao = S(a).itens.find((i) => i.categoria === 'racao');
const lote = S(a).lotes[0];
const antes = saldo(a, racao.id);
globalThis.__ctx.a.offline = true;
globalThis.__ctx.b.offline = true;
S(a).registrarManejo({ tipo: 'racao', data: '2026-11-21', loteId: lote.id, itemId: racao.id, quantidade: 10 });
S(b).registrarManejo({ tipo: 'racao', data: '2026-11-21', loteId: lote.id, itemId: racao.id, quantidade: 5 });
S(b).entradaEstoque(racao.id, 40, 120);
await a.sync.sincronizar();
await b.sync.sincronizar();
ok('sem internet: status offline e pendências guardadas', a.sync.useSyncStatus.getState().estado === 'offline' && pend(a) === 2 && pend(b) === 3, `${pend(a)} / ${pend(b)}`);
globalThis.__ctx.a.offline = false;
globalThis.__ctx.b.offline = false;
await a.sync.sincronizar();
await b.sync.sincronizar();
await a.sync.sincronizar();
ok('saldo igual nos dois após voltar a internet', saldo(a, racao.id) === saldo(b, racao.id), `${saldo(a, racao.id)} / ${saldo(b, racao.id)}`);
ok('saldo = antes − 10 − 5 + 40', saldo(a, racao.id) === Math.round((antes - 15 + 40) * 1e6) / 1e6, `${antes} → ${saldo(a, racao.id)}`);
ok('compra do funcionário atualiza custo para 3,00', a.comSaldo(S(a).itens, S(a).movimentos).find((i) => i.id === racao.id).custoUnitario === 3);
ok('dados iguais nos dois', assina(a) === assina(b));

// --- funcionário tenta apagar e editar cadastro: servidor recusa e o app desfaz
const manejoAlvo = S(b).manejos[0];
const galAlvo = S(b).galinheiros[0];
S(b).excluirManejo(manejoAlvo.id);
S(b).salvarGalinheiro({ ...galAlvo, nome: 'Renomeado pelo funcionário' });
S(b).salvarGalinheiro({ nome: 'Galinheiro novo do funcionário', capacidade: 10 });
await b.sync.sincronizar();
ok('manejo apagado pelo funcionário voltou', S(b).manejos.some((m) => m.id === manejoAlvo.id));
ok('nome do galinheiro voltou ao original', S(b).galinheiros.find((g) => g.id === galAlvo.id)?.nome === galAlvo.nome);
ok('galinheiro criado pelo funcionário foi removido', !S(b).galinheiros.some((g) => g.nome === 'Galinheiro novo do funcionário'));
ok('aviso mostrado ao funcionário', !!b.sync.useSyncStatus.getState().aviso);
ok('sem pendências presas', pend(b) === 0, String(pend(b)));
ok('dados de B voltaram a bater com A', assina(a) === assina(b));

// --- funcionário conclui tarefa (permitido) e dono vê
const tarefa = S(b).tarefas[0];
S(b).concluirTarefa(tarefa.id);
await b.sync.sincronizar();
await a.sync.sincronizar();
ok('tarefa concluída pelo funcionário chega ao dono', S(a).tarefas.find((t) => t.id === tarefa.id)?.proximaData === S(b).tarefas.find((t) => t.id === tarefa.id)?.proximaData);
ok('manejo da tarefa chega ao dono', assina(a) === assina(b));

// --- dono apaga, funcionário recebe a exclusão
const lixo = S(a).tarefas[1];
S(a).excluirTarefa(lixo.id);
await a.sync.sincronizar();
await b.sync.sincronizar();
ok('exclusão do dono chega ao funcionário', !S(b).tarefas.some((t) => t.id === lixo.id));

// --- edição durante o envio não se perde
S(a).salvarGalinheiro({ ...S(a).galinheiros[0], nome: 'Versão 1' });
const envio = a.sync.sincronizar();
S(a).salvarGalinheiro({ ...S(a).galinheiros[0], nome: 'Versão 2' });
await envio;
await a.sync.sincronizar();
await b.sync.sincronizar();
ok('edição feita durante o envio também é enviada', S(b).galinheiros.some((g) => g.nome === 'Versão 2'));

// --- sair da conta limpa o aparelho
b.sync.desvincular();
ok('desvincular limpa dados e vínculo', S(b).galinheiros.length === 0 && S(b).sync.fazendaId === null);

console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodos os testes passaram');
process.exit(falhas ? 1 : 0);
