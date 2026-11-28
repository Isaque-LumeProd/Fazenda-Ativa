const DIA_MS = 86_400_000;

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function hoje(): string {
  return toYMD(new Date());
}

export function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDias(ymd: string, n: number): string {
  const d = parseYMD(ymd);
  d.setDate(d.getDate() + n);
  return toYMD(d);
}

/** a − b em dias */
export function diffDias(a: string, b: string): number {
  return Math.round((parseYMD(a).getTime() - parseYMD(b).getTime()) / DIA_MS);
}

export function fmtData(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDataCurta(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${d}/${m}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function diaSemana(ymd: string): string {
  return DIAS_SEMANA[parseYMD(ymd).getDay()];
}

export function rotuloDia(ymd: string): string {
  const diff = diffDias(ymd, hoje());
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff === 1) return 'Amanhã';
  return fmtData(ymd);
}

/** "dd/mm/aaaa" → "aaaa-mm-dd" (ou null se inválida) */
export function brParaYMD(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, d, mes, y] = m.map(Number);
  const dt = new Date(y, mes - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mes - 1 || dt.getDate() !== d) return null;
  return toYMD(dt);
}

export function ultimosDias(n: number): string[] {
  const h = hoje();
  return Array.from({ length: n }, (_, i) => addDias(h, i - (n - 1)));
}

export function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const DIAS_EXTENSO = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "domingo, 4 de outubro" */
export function dataExtenso(ymd: string): string {
  const d = parseYMD(ymd);
  return `${DIAS_EXTENSO[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/** "4 de out." */
export function dataCurtaExtenso(ymd: string): string {
  const d = parseYMD(ymd);
  return `${d.getDate()} de ${MESES[d.getMonth()].slice(0, 3)}.`;
}

export function horaAtual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
