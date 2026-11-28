/**
 * Regras da incubação (chocadas): calendário por espécie, fase do embrião, tarefas do dia e
 * orientações para imprevistos. Os valores de temperatura e umidade são referências gerais para
 * chocadeira de ar forçado; cada fabricante pode indicar valores um pouco diferentes.
 */
import { addDias, diffDias, hoje } from './dates';
import type { Chocada, EspecieId, EventoChocada, StatusOvo, TipoChocadeira } from './types';

export interface Especie {
  label: string;
  emoji: string;
  dias: number;
  /** dias da ovoscopia */
  ovoscopias: number[];
  /** primeiro dia da fase final (para de virar e sobe a umidade) */
  faseFinal: number;
  temp: [number, number];
  umid: [number, number];
  umidFinal: [number, number];
}

export const ESPECIES: Record<EspecieId, Especie> = {
  galinha: { label: 'Galinha', emoji: '🐔', dias: 21, ovoscopias: [7, 14], faseFinal: 18, temp: [37.5, 37.8], umid: [50, 55], umidFinal: [65, 70] },
  codorna: { label: 'Codorna', emoji: '🐤', dias: 17, ovoscopias: [7], faseFinal: 15, temp: [37.5, 37.8], umid: [45, 50], umidFinal: [65, 70] },
  pato: { label: 'Pato', emoji: '🦆', dias: 28, ovoscopias: [7, 14], faseFinal: 25, temp: [37.5, 37.8], umid: [55, 60], umidFinal: [70, 75] },
  pato_crioulo: { label: 'Pato Crioulo', emoji: '🦆', dias: 35, ovoscopias: [8, 16], faseFinal: 32, temp: [37.4, 37.6], umid: [55, 60], umidFinal: [70, 75] },
  marreco: { label: 'Marreco', emoji: '🦆', dias: 28, ovoscopias: [7, 14], faseFinal: 25, temp: [37.5, 37.8], umid: [55, 60], umidFinal: [70, 75] },
  ganso: { label: 'Ganso', emoji: '🪿', dias: 30, ovoscopias: [7, 14], faseFinal: 27, temp: [37.3, 37.5], umid: [55, 60], umidFinal: [70, 80] },
  faisao: { label: 'Faisão', emoji: '🐦', dias: 24, ovoscopias: [7, 14], faseFinal: 21, temp: [37.5, 37.8], umid: [50, 55], umidFinal: [65, 70] },
  pavao: { label: 'Pavão', emoji: '🦚', dias: 28, ovoscopias: [7, 14], faseFinal: 25, temp: [37.5, 37.7], umid: [55, 60], umidFinal: [65, 70] },
  peru: { label: 'Peru', emoji: '🦃', dias: 28, ovoscopias: [7, 14], faseFinal: 25, temp: [37.5, 37.8], umid: [55, 60], umidFinal: [65, 70] },
  angola: { label: 'Angola', emoji: '🐓', dias: 28, ovoscopias: [7, 14], faseFinal: 25, temp: [37.5, 37.8], umid: [50, 55], umidFinal: [65, 70] },
  outra: { label: 'Outra', emoji: '🥚', dias: 21, ovoscopias: [7, 14], faseFinal: 18, temp: [37.5, 37.8], umid: [50, 55], umidFinal: [65, 70] },
};

export const ORDEM_ESPECIES: EspecieId[] = [
  'galinha',
  'pato',
  'pato_crioulo',
  'marreco',
  'ganso',
  'faisao',
  'pavao',
  'codorna',
  'peru',
  'angola',
  'outra',
];

export const CHOCADEIRAS: Record<TipoChocadeira, { label: string; detalhe: string; icone: 'robot-outline' | 'hand-back-right-outline' | 'egg-outline' }> = {
  automatica: { label: 'Automática', detalhe: 'A chocadeira vira os ovos sozinha', icone: 'robot-outline' },
  manual: { label: 'Manual', detalhe: 'Você vira os ovos nos horários', icone: 'hand-back-right-outline' },
  galinha: { label: 'Galinha choca', detalhe: 'A galinha cuida dos ovos', icone: 'egg-outline' },
};

export const HORARIOS_PADRAO = ['08:00', '14:00', '20:00'];

export const STATUS_OVO: Record<StatusOvo, { label: string; cor: string; bg: string }> = {
  na: { label: 'N/A', cor: '#5F6B63', bg: '#ECE9E0' },
  fertil: { label: 'Fértil', cor: '#2D4A33', bg: '#DDEEE6' },
  infertil: { label: 'Infértil', cor: '#5F6B63', bg: '#F1F0EC' },
  duvidoso: { label: 'Duvidoso', cor: '#9A6B12', bg: '#FBF1DC' },
  removido: { label: 'Removido', cor: '#C2412E', bg: '#FBE9E5' },
  nascido: { label: 'Nascido', cor: '#FFFFFF', bg: '#4B6B45' },
  morto: { label: 'Morto', cor: '#5F6B63', bg: '#E4E2DC' },
};

export const ORDEM_STATUS_OVO: StatusOvo[] = ['na', 'fertil', 'infertil', 'duvidoso', 'removido', 'nascido', 'morto'];

// ------------------------------------------------------------------ calendário

export function especieDa(c: Chocada): Especie {
  const e = ESPECIES[c.especie] ?? ESPECIES.outra;
  if (c.especie !== 'outra' || !c.diasCustom) return e;
  const dias = Math.max(5, Math.round(c.diasCustom));
  return { ...e, dias, faseFinal: Math.max(2, dias - 3), ovoscopias: [7, Math.round(dias / 2)].filter((d) => d < dias - 3) };
}

/** Dia da incubação (1 = dia em que os ovos entraram) */
export function diaDaChocada(c: Chocada, ref = hoje()): number {
  return diffDias(ref, c.dataInicio) + 1;
}

export function dataDoDia(c: Chocada, dia: number): string {
  return addDias(c.dataInicio, dia - 1);
}

export function dataNascimento(c: Chocada): string {
  return dataDoDia(c, especieDa(c).dias);
}

export function faltamDias(c: Chocada): number {
  return Math.max(0, especieDa(c).dias - diaDaChocada(c));
}

export function progresso(c: Chocada, dia = diaDaChocada(c)): number {
  return Math.max(0, Math.min(1, dia / especieDa(c).dias));
}

export function naFaseFinal(c: Chocada, dia = diaDaChocada(c)): boolean {
  return dia >= especieDa(c).faseFinal;
}

export function viraOvos(c: Chocada): boolean {
  return c.tipoChocadeira === 'manual';
}

export function umidadeIdeal(c: Chocada, dia = diaDaChocada(c)): [number, number] {
  const e = especieDa(c);
  return naFaseFinal(c, dia) ? e.umidFinal : e.umid;
}

export interface Fase {
  chave: string;
  titulo: string;
  kicker: string;
  texto: string;
  ovoscopia: string;
}

/** O que acontece dentro do ovo no dia `dia` */
export function faseDoDia(c: Chocada, dia: number): Fase {
  const e = especieDa(c);
  const p = dia / e.dias;
  if (dia >= e.dias)
    return {
      chave: 'nascimento',
      kicker: 'Nascimento',
      titulo: 'Hora de nascer',
      texto:
        'Os filhotes estão rompendo a casca. Isso pode levar até 24 horas por ovo. Não abra a chocadeira e não ajude a tirar da casca: espere a maioria nascer e secar antes de retirar.',
      ovoscopia: 'Não faça ovoscopia agora: a chocadeira precisa ficar fechada.',
    };
  if (dia >= e.faseFinal)
    return {
      chave: 'final',
      kicker: 'Fase final',
      titulo: 'Fase final: parar de virar',
      texto:
        'O filhote já está quase todo formado e vira o bico para a câmara de ar. Pare a viragem, aumente a umidade e evite abrir a chocadeira até o nascimento.',
      ovoscopia: 'O ovo fica escuro, só a câmara de ar aparece clara e inclinada.',
    };
  if (p <= 0.1)
    return {
      chave: 'inicio',
      kicker: 'Início',
      titulo: 'Início do desenvolvimento',
      texto:
        'O embrião começa a se formar nas primeiras 24 horas. Surge a linha que dá origem à coluna e ao sistema nervoso. Por fora, o ovo ainda parece igual a um ovo comum.',
      ovoscopia: 'Ainda é cedo: na lanterna o ovo aparece claro, só com a gema.',
    };
  if (p <= 0.22)
    return {
      chave: 'coracao',
      kicker: 'Coração e vasos',
      titulo: 'O coração começa a bater',
      texto:
        'Os vasos sanguíneos se espalham pela gema e o coração já bate. É a fase da "aranha": um ponto escuro com veias saindo dele.',
      ovoscopia: 'Ovo fértil mostra veias vermelhas e um ponto escuro. Ovo claro, sem veias, é infértil.',
    };
  if (p <= 0.38)
    return {
      chave: 'orgaos',
      kicker: 'Formação',
      titulo: 'Olhos, asas e pernas',
      texto: 'Os olhos ficam bem visíveis, aparecem as asas e as pernas, e o bico começa a se formar.',
      ovoscopia: 'O embrião aparece maior e se mexe. Um anel de sangue sem embrião indica que ele morreu.',
    };
  if (p <= 0.58)
    return {
      chave: 'penas',
      kicker: 'Penas',
      titulo: 'Formação das penas',
      texto:
        'Surgem as penas, o bico endurece e as unhas se formam. O embrião se movimenta bastante dentro do ovo.',
      ovoscopia: 'Metade do ovo fica escura. Ainda dá para ver veias perto da casca.',
    };
  if (p <= 0.78)
    return {
      chave: 'crescimento',
      kicker: 'Crescimento',
      titulo: 'Crescimento rápido',
      texto: 'O filhote cresce rápido e ocupa cada vez mais espaço. A clara vai sendo absorvida.',
      ovoscopia: 'A maior parte do ovo está escura e a câmara de ar está maior.',
    };
  return {
    chave: 'preparo',
    kicker: 'Preparação',
    titulo: 'Preparação para nascer',
    texto: 'O filhote se posiciona para nascer e começa a puxar a gema para dentro da barriga: é a reserva dos primeiros dias de vida.',
    ovoscopia: 'Ovo quase todo escuro. Se a lanterna mostrar ovo claro ou com cheiro, retire.',
  };
}

export interface Marco {
  dia: number;
  data: string;
  titulo: string;
  texto: string;
  icone: 'flag-outline' | 'flashlight' | 'water-percent' | 'egg-easter' | 'check-decagram-outline';
}

export function calendario(c: Chocada): Marco[] {
  const e = especieDa(c);
  const m: Marco[] = [
    { dia: 1, data: dataDoDia(c, 1), titulo: 'Início da incubação', texto: 'Ovos colocados na chocadeira', icone: 'flag-outline' },
    ...e.ovoscopias.map((d, i) => ({
      dia: d,
      data: dataDoDia(c, d),
      titulo: `${i + 1}ª ovoscopia`,
      texto: i === 0 ? 'Retire os ovos claros (inférteis)' : 'Retire os ovos que pararam de se desenvolver',
      icone: 'flashlight' as const,
    })),
    {
      dia: e.faseFinal,
      data: dataDoDia(c, e.faseFinal),
      titulo: 'Fase final',
      texto: c.tipoChocadeira === 'galinha' ? 'Deixe a galinha quieta no ninho' : 'Pare de virar e aumente a umidade',
      icone: 'water-percent',
    },
    { dia: e.dias, data: dataDoDia(c, e.dias), titulo: 'Nascimento previsto', texto: 'Não abra a chocadeira durante a eclosão', icone: 'egg-easter' },
    { dia: e.dias + 2, data: dataDoDia(c, e.dias + 2), titulo: 'Fechar a chocada', texto: 'Conte os nascidos e mande para um lote', icone: 'check-decagram-outline' },
  ];
  return m;
}

/** Próximo marco (o de hoje ou o seguinte) */
export function proximoMarco(c: Chocada): Marco | undefined {
  const dia = diaDaChocada(c);
  const lista = calendario(c);
  return lista.find((m) => m.dia === dia) ?? lista.find((m) => m.dia > dia);
}

// ------------------------------------------------------------------ ovos

export function contarOvos(c: Chocada) {
  const n: Record<StatusOvo, number> = { na: 0, fertil: 0, infertil: 0, duvidoso: 0, removido: 0, nascido: 0, morto: 0 };
  for (const o of c.ovos) n[o.status] += 1;
  return n;
}

/** Taxa de eclosão: nascidos ÷ ovos férteis (inclui os que nasceram e os que morreram depois da ovoscopia) */
export function eclosao(c: Chocada): number | null {
  const n = contarOvos(c);
  const ferteis = n.fertil + n.nascido + n.morto + n.duvidoso;
  return ferteis > 0 ? n.nascido / ferteis : null;
}

// ------------------------------------------------------------------ tarefas do dia

export interface TarefaChocada {
  /** chave única no dia */
  id: string;
  chocadaId: string;
  tipo: 'viragem' | 'umidade' | 'ovoscopia' | 'fase-final' | 'nascimento';
  titulo: string;
  hora?: string;
  feita: boolean;
  atrasada: boolean;
}

function horaAgora(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function tarefasDaChocada(c: Chocada, eventos: EventoChocada[], ref = hoje()): TarefaChocada[] {
  if (c.encerrada) return [];
  const e = especieDa(c);
  const dia = diaDaChocada(c, ref);
  if (dia < 1) return [];
  const doDia = eventos.filter((x) => x.chocadaId === c.id && x.data === ref);
  const agora = horaAgora();
  const lista: TarefaChocada[] = [];

  if (c.tipoChocadeira !== 'galinha' && dia < e.dias) {
    const feita = doDia.some((x) => x.tipo === 'umidade');
    lista.push({ id: `${c.id}:umidade`, chocadaId: c.id, tipo: 'umidade', titulo: 'Registrar umidade', hora: '09:00', feita, atrasada: !feita && agora > '09:00' });
  }
  if (viraOvos(c) && dia < e.faseFinal) {
    const viragens = doDia.filter((x) => x.tipo === 'viragem').length;
    [...c.horariosViragem].sort().forEach((h, i) => {
      const feita = viragens > i;
      lista.push({ id: `${c.id}:virar:${h}`, chocadaId: c.id, tipo: 'viragem', titulo: 'Virar os ovos', hora: h, feita, atrasada: !feita && agora > h });
    });
  }
  const feitas = new Set(eventos.filter((x) => x.chocadaId === c.id && x.tipo === 'tarefa').map((x) => x.chave));
  e.ovoscopias.forEach((d, i) => {
    if (d !== dia) return;
    const chave = `ovoscopia-${d}`;
    lista.push({ id: `${c.id}:${chave}`, chocadaId: c.id, tipo: 'ovoscopia', titulo: `${i + 1}ª ovoscopia`, feita: feitas.has(chave), atrasada: false });
  });
  if (dia === e.faseFinal) {
    lista.push({
      id: `${c.id}:fase-final`,
      chocadaId: c.id,
      tipo: 'fase-final',
      titulo: c.tipoChocadeira === 'galinha' ? 'Fase final: deixe a galinha quieta' : 'Parar a viragem e subir a umidade',
      feita: feitas.has('fase-final'),
      atrasada: false,
    });
  }
  if (dia >= e.dias) {
    lista.push({ id: `${c.id}:nascimento`, chocadaId: c.id, tipo: 'nascimento', titulo: 'Conferir os nascimentos', feita: feitas.has('nascimento'), atrasada: dia > e.dias + 1 && !feitas.has('nascimento') });
  }
  return lista.sort((a, b) => (a.hora ?? '99').localeCompare(b.hora ?? '99'));
}

/** Viragens de hoje: [feitas, total] */
export function viragensHoje(c: Chocada, eventos: EventoChocada[]): [number, number] {
  const h = hoje();
  const feitas = eventos.filter((x) => x.chocadaId === c.id && x.tipo === 'viragem' && x.data === h).length;
  return [Math.min(feitas, c.horariosViragem.length), c.horariosViragem.length];
}

export function proximaViragem(c: Chocada, eventos: EventoChocada[]): string | null {
  if (!viraOvos(c) || naFaseFinal(c)) return null;
  const [feitas] = viragensHoje(c, eventos);
  const ordenados = [...c.horariosViragem].sort();
  return ordenados[feitas] ?? ordenados[0] ?? null;
}

export function ultimoValor(c: Chocada, eventos: EventoChocada[], tipo: 'temperatura' | 'umidade'): EventoChocada | undefined {
  return eventos
    .filter((x) => x.chocadaId === c.id && x.tipo === tipo && x.valor !== undefined)
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora))[0];
}

// ------------------------------------------------------------------ imprevistos

export interface Imprevisto {
  id: string;
  titulo: string;
  icone: 'flash-off' | 'thermometer-high' | 'thermometer-low' | 'water-off' | 'water-alert' | 'egg-off-outline' | 'emoticon-sick-outline' | 'rotate-3d-variant' | 'run';
  passos: string[];
}

export const IMPREVISTOS: Imprevisto[] = [
  {
    id: 'energia',
    titulo: 'Faltou energia',
    icone: 'flash-off',
    passos: [
      'Não abra a chocadeira: o calor fica guardado lá dentro.',
      'Cubra com uma manta ou cobertor, sem tampar os respiros.',
      'Nos primeiros dias o embrião aguenta melhor o frio; algumas horas costumam ser toleradas.',
      'Quando a energia voltar, confira a temperatura. O nascimento pode atrasar cerca de 1 dia.',
    ],
  },
  {
    id: 'temp-alta',
    titulo: 'Temperatura alta',
    icone: 'thermometer-high',
    passos: [
      'Abra a tampa por alguns minutos para baixar o calor.',
      'Confira o termostato e o termômetro: compare com um segundo termômetro, se tiver.',
      'Afaste a chocadeira do sol, de janelas e de fogões.',
      'Calor demais é mais perigoso que frio. Acima de 39 °C por horas pode matar os embriões.',
    ],
  },
  {
    id: 'temp-baixa',
    titulo: 'Temperatura baixa',
    icone: 'thermometer-low',
    passos: [
      'Confira se a tampa está bem fechada e se a resistência está ligando.',
      'Leve a chocadeira para um cômodo sem vento e sem variação de temperatura.',
      'Ajuste o termostato aos poucos, de 0,2 em 0,2 °C, e espere estabilizar.',
      'Frio por pouco tempo costuma só atrasar o nascimento.',
    ],
  },
  {
    id: 'umidade-baixa',
    titulo: 'Umidade baixa',
    icone: 'water-off',
    passos: [
      'Complete a água do reservatório com água morna.',
      'Aumente a área de água: uma esponja ou pano úmido ajuda.',
      'Abra a chocadeira o mínimo possível.',
      'Na fase final, umidade baixa deixa a membrana dura e o filhote não consegue sair.',
    ],
  },
  {
    id: 'umidade-alta',
    titulo: 'Umidade alta',
    icone: 'water-alert',
    passos: [
      'Retire parte da água ou diminua a área do reservatório.',
      'Abra um pouco mais os respiros, se a chocadeira tiver.',
      'Umidade alta o tempo todo deixa o filhote grande e molhado, com dificuldade para nascer.',
    ],
  },
  {
    id: 'ovo-trincado',
    titulo: 'Ovo trincado ou vazando',
    icone: 'egg-off-outline',
    passos: [
      'Retire o ovo e veja se a trinca é pequena.',
      'Trinca pequena: pode selar com uma gota de vela ou esmalte incolor.',
      'Se estiver vazando ou com cheiro, descarte longe dos outros ovos.',
      'Lave as mãos antes de mexer nos outros ovos.',
    ],
  },
  {
    id: 'ovo-podre',
    titulo: 'Ovo com mau cheiro',
    icone: 'emoticon-sick-outline',
    passos: [
      'Retire o ovo com cuidado, sem apertar: ovo podre pode estourar.',
      'Faça a ovoscopia para achar ovos escuros sem veias ou com manchas.',
      'Limpe a bandeja e o lugar onde estava o ovo.',
      'Marque o ovo como "Removido" na bandeja de ovoscopia.',
    ],
  },
  {
    id: 'viragem',
    titulo: 'A chocadeira parou de virar',
    icone: 'rotate-3d-variant',
    passos: [
      'Vire os ovos à mão nos horários de viragem até consertar.',
      'Confira o motor e as engrenagens da bandeja.',
      'Mude a chocada para "Manual" para receber os lembretes de viragem.',
    ],
  },
  {
    id: 'galinha-saiu',
    titulo: 'A galinha saiu do ninho',
    icone: 'run',
    passos: [
      'É normal ela sair algumas vezes por dia para comer, beber e fazer as necessidades.',
      'Se ficar fora por mais de 1 hora, cubra os ovos com um pano para segurar o calor.',
      'Deixe água e comida perto do ninho e mantenha o lugar calmo e escuro.',
      'Se ela abandonar de vez, leve os ovos para uma chocadeira o quanto antes.',
    ],
  },
];

export function imprevistoPorId(id: string | undefined): Imprevisto | undefined {
  return IMPREVISTOS.find((i) => i.id === id);
}
