// Cliente falso: traduz a parte da API do supabase-js usada pelo sync.ts para SQL no PGlite,
// executando como o usuário do "aparelho" (com as regras de segurança ativas).
export const nuvemConfigurada = true;
export const supabase = {
  from(tabela) {
    return new Q(tabela);
  },
  channel() {
    const c = { on: () => c, subscribe: () => c };
    return c;
  },
  removeChannel: async () => {},
};
export function msgErro(e) {
  return e?.message ?? String(e);
}
class Q {
  constructor(t) {
    this.t = t;
    this.w = [];
    this.p = [];
  }
  upsert(rows) {
    this.op = 'upsert';
    this.rows = rows;
    return this;
  }
  select(cols) {
    this.op = 'select';
    this.cols = cols;
    return this;
  }
  eq(c, v) {
    this.p.push(v);
    this.w.push(`${c} = $${this.p.length}`);
    return this;
  }
  gt(c, v) {
    this.p.push(v);
    this.w.push(`${c} > $${this.p.length}`);
    return this;
  }
  in(c, vs) {
    this.p.push(vs);
    this.w.push(`${c} = any($${this.p.length})`);
    return this;
  }
  order(c, o) {
    this.ord = `${c} ${o?.ascending === false ? 'desc' : 'asc'}`;
    return this;
  }
  limit(n) {
    this.lim = n;
    return this;
  }
  then(ok, falha) {
    return this.run().then(ok, falha);
  }
  async run() {
    // eslint-disable-next-line no-undef
    const ctx = globalThis.__ctx[DEVICE];
    if (ctx.offline) return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    let sql;
    let params;
    if (this.op === 'upsert') {
      const vals = [];
      params = [];
      for (const r of this.rows) {
        params.push(r.fazenda_id, r.colecao, r.id, JSON.stringify(r.dados), r.excluido);
        const b = params.length - 5;
        vals.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4}::jsonb,$${b + 5})`);
      }
      sql = `insert into registros (fazenda_id,colecao,id,dados,excluido) values ${vals.join(',')}
        on conflict (fazenda_id,colecao,id) do update set fazenda_id=excluded.fazenda_id, colecao=excluded.colecao,
        id=excluded.id, dados=excluded.dados, excluido=excluded.excluido`;
    } else {
      params = this.p;
      sql = `select ${this.cols} from ${this.t} ${this.w.length ? 'where ' + this.w.join(' and ') : ''}
        ${this.ord ? 'order by ' + this.ord : ''} ${this.lim ? 'limit ' + this.lim : ''}`;
    }
    return ctx.run(sql, params);
  }
}
