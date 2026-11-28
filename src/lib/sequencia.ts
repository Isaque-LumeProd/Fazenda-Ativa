import { addDias, hoje } from './dates';
import type { Dados } from './store';

/** Dias em que houve algum cuidado registrado (manejo, chocada ou gado) */
function diasComCuidado(d: Pick<Dados, 'manejos' | 'eventosChocada' | 'eventosGado'>): Set<string> {
  const dias = new Set<string>();
  for (const m of d.manejos) dias.add(m.data);
  for (const e of d.eventosChocada) dias.add(e.data);
  for (const e of d.eventosGado) dias.add(e.data);
  return dias;
}

/**
 * Sequência de cuidado: quantos dias seguidos tiveram algum registro, contando até hoje.
 * Se hoje ainda não teve registro, a sequência de ontem continua valendo.
 */
export function sequenciaDeCuidado(d: Pick<Dados, 'manejos' | 'eventosChocada' | 'eventosGado'>, ref = hoje()): number {
  const dias = diasComCuidado(d);
  let dia = dias.has(ref) ? ref : addDias(ref, -1);
  let n = 0;
  while (dias.has(dia)) {
    n += 1;
    dia = addDias(dia, -1);
  }
  return n;
}
