import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

// Testa as regras de permissão do supabase/schema.sql num Postgres em memória.
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true),'')::uuid $$;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;
grant usage on schema public to authenticated, anon;
grant all on all sequences in schema public to authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b'),('00000000-0000-0000-0000-00000000000c');
`);
const sql = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
try { await db.exec(sql); } catch(e) { console.log("SQL ERRO:", e.message); process.exit(1); }
await db.exec(sql); // idempotente
await db.exec(`grant usage, select on all sequences in schema public to authenticated;`);
const A='00000000-0000-0000-0000-00000000000a',B='00000000-0000-0000-0000-00000000000b',C='00000000-0000-0000-0000-00000000000c';
async function as(uid, q, params=[]) {
  await db.exec(`reset role; select set_config('test.uid','${uid}',false); set role authenticated;`);
  try { const r = await db.query(q, params); return r.rows; } catch(e) { return 'ERRO: '+e.message; } finally { await db.exec('reset role'); }
}
let falhas = 0;
const ok=(n,c)=>{ if(!c) falhas++; console.log((c?'OK   ':'FALHA')+' '+n); };
const f = (await as(A, `select public.criar_fazenda('Sítio','Ana') as id`))[0].id;
const cod = (await as(A, `select codigo_convite from fazendas`))[0].codigo_convite;
ok('dono vê fazenda e código '+cod, cod.length===6);
ok('B não vê fazenda antes de entrar', (await as(B,`select * from fazendas`)).length===0);
ok('B entra com código', typeof (await as(B, `select public.entrar_fazenda($1,'Beto') as id`, [cod.toLowerCase()]))[0].id === 'string');
ok('código errado falha', String(await as(C, `select public.entrar_fazenda('XXXXXX','C')`)).startsWith('ERRO'));
const up = `insert into registros (fazenda_id,colecao,id,dados,excluido) values ($1,$2,$3,$4,$5)
  on conflict (fazenda_id,colecao,id) do update set fazenda_id=excluded.fazenda_id, colecao=excluded.colecao, id=excluded.id, dados=excluded.dados, excluido=excluded.excluido returning rev, atualizado_por`;
let r = await as(A, up, [f,'galinheiros','g1','{"nome":"G1"}',false]); ok('dono cria galinheiro', Array.isArray(r));
r = await as(B, up, [f,'galinheiros','g2','{}',false]); ok('funcionário NÃO cria galinheiro', String(r).startsWith('ERRO'));
r = await as(B, up, [f,'manejos','m1','{"tipo":"ovos"}',false]); ok('funcionário registra manejo', Array.isArray(r) && r[0].atualizado_por===B);
const rev1 = r[0].rev;
r = await as(B, up, [f,'manejos','m1','{"tipo":"ovos","q":2}',false]); ok('reenvio (upsert) do funcionário + rev cresce', Array.isArray(r) && Number(r[0].rev) > Number(rev1));
r = await as(B, up, [f,'manejos','m1','{}',true]); ok('funcionário NÃO apaga manejo', String(r).startsWith('ERRO'));
r = await as(A, up, [f,'manejos','m1','{}',true]); ok('dono apaga manejo', Array.isArray(r));
r = await as(B, up, [f,'eventosChocada','ec1','{"tipo":"viragem"}',false]); ok('funcionário registra viragem da chocada', Array.isArray(r));
r = await as(B, up, [f,'chocadas','c1','{"nome":"C1"}',false]); ok('funcionário marca ovoscopia (chocada)', Array.isArray(r));
r = await as(B, up, [f,'eventosGado','eg1','{"tipo":"pesagem"}',false]); ok('funcionário registra pesagem do gado', Array.isArray(r));
r = await as(B, up, [f,'animais','a1','{}',false]); ok('funcionário NÃO cadastra animal', String(r).startsWith('ERRO'));
r = await as(B, up, [f,'eventosGado','eg1','{}',true]); ok('funcionário NÃO apaga evento do gado', String(r).startsWith('ERRO'));
r = await as(A, up, [f,'animais','a1','{"brinco":"12"}',false]); ok('dono cadastra animal', Array.isArray(r));
r = await as(A, up, [f,'outracoisa','x1','{}',false]); ok('coleção desconhecida é recusada', String(r).startsWith('ERRO'));
r = await as(C, `select * from registros`); ok('estranho não lê registros', r.length===0);
r = await as(C, up, [f,'manejos','m9','{}',false]); ok('estranho não grava', String(r).startsWith('ERRO'));
r = await as(B, `delete from registros`); ok('ninguém apaga linha de verdade', (await as(A,`select count(*)::int n from registros`))[0].n===6);
r = await as(B, `select public.novo_codigo_convite($1)`, [f]); ok('funcionário não troca código', String(r).startsWith('ERRO'));
r = await as(A, `select public.novo_codigo_convite($1) c`, [f]); ok('dono troca código', r[0]?.c?.length===6);
r = await as(B, `select nome,papel from membros order by papel`); ok('funcionário vê membros', r.length===2);
r = await as(B, `update fazendas set nome='x'`); ok('funcionário não renomeia', (await as(A,`select nome from fazendas`))[0].nome==='Sítio');
r = await as(A, `delete from membros where user_id=$1`, [A]); ok('dono não se remove', (await as(A,`select count(*)::int n from membros`))[0].n===2);
r = await as(B, `delete from membros where user_id=$1`, [B]); ok('funcionário sai', (await as(A,`select count(*)::int n from membros`))[0].n===1);
r = await as(B, `select * from registros`); ok('quem saiu não lê mais', r.length===0);
r = await as(A, `select rev from registros where fazenda_id=$1 and rev > 0 order by rev`, [f]); ok('pull por rev', r.length===6);
console.log(falhas ? `${falhas} FALHA(S)` : 'Regras de permissão ok');
process.exit(falhas ? 1 : 0);
