export function fmtNum(n: number, casas = 0): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/** Mostra até 2 casas decimais, sem zeros sobrando */
export function fmtQtd(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function fmtMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtPct(n: number): string {
  return `${fmtNum(n * 100, 1)}%`;
}

/** Aceita "1.234,5" ou "1234.5" */
export function parseNum(texto: string): number | null {
  const t = texto.trim();
  if (!t) return null;
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

export function numParaTexto(n: number | undefined): string {
  return n === undefined ? '' : String(n).replace('.', ',');
}

export function novoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
