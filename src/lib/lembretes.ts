/**
 * Lembretes no celular (notificações locais, sem servidor): viragem, umidade, ovoscopia, fase
 * final e nascimento das chocadas, tarefas da rotina e doses/marcos do gado.
 *
 * A cada mudança nos dados, as notificações dos próximos 7 dias são reagendadas do zero.
 * O iPhone guarda no máximo 64 notificações agendadas por app, então ficamos nas 60 primeiras.
 */
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { dataDoDia, diaDaChocada, especieDa, viraOvos } from './chocada';
import { addDias, hoje, parseYMD } from './dates';
import { cuidadosGado } from './gado';
import { usePrefs, type Lembretes } from './prefs';
import { useStore, type Dados } from './store';

const NATIVO = Platform.OS === 'ios' || Platform.OS === 'android';
const MAX = 60;
const DIAS = 7;

if (NATIVO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const lembretesDisponiveis = NATIVO;

/** Pede permissão ao sistema. Devolve true se o usuário permitiu. */
export async function pedirPermissao(): Promise<boolean> {
  if (!NATIVO) return false;
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted) return true;
  const r = await Notifications.requestPermissionsAsync();
  return r.granted;
}

interface Aviso {
  quando: Date;
  titulo: string;
  texto: string;
}

function em(ymd: string, hhmm: string): Date {
  const d = parseYMD(ymd);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Monta a lista de avisos dos próximos dias (exportado para teste) */
export function montarAvisos(dados: Dados, prefs: Lembretes, agora = new Date()): Aviso[] {
  const lista: Aviso[] = [];
  const h = hoje();
  const dias = Array.from({ length: DIAS }, (_, i) => addDias(h, i));

  for (const c of dados.chocadas) {
    if (c.encerrada) continue;
    const e = especieDa(c);
    for (const ymd of dias) {
      const dia = diaDaChocada(c, ymd);
      if (dia < 1 || dia > e.dias + 1) continue;
      if (prefs.viragem && viraOvos(c) && dia < e.faseFinal) {
        for (const hora of c.horariosViragem) {
          lista.push({ quando: em(ymd, hora), titulo: 'Hora de virar os ovos!', texto: `${c.nome} · ${hora}` });
        }
      }
      if (prefs.umidade && c.tipoChocadeira !== 'galinha' && dia < e.dias) {
        lista.push({ quando: em(ymd, '09:00'), titulo: 'Registrar a umidade', texto: `${c.nome} · confira o higrômetro` });
      }
      if (prefs.ovoscopia && e.ovoscopias.includes(dia)) {
        lista.push({ quando: em(ymd, '08:00'), titulo: `Ovoscopia hoje · dia ${dia}`, texto: `${c.nome} · retire os ovos claros` });
      }
      if (prefs.faseFinal && dia === e.faseFinal) {
        lista.push({
          quando: em(ymd, '08:00'),
          titulo: 'Começou a fase final',
          texto: c.tipoChocadeira === 'galinha' ? `${c.nome} · deixe a galinha quieta` : `${c.nome} · pare de virar e aumente a umidade`,
        });
      }
      if (prefs.nascimento && (dia === e.dias - 2 || dia === e.dias)) {
        lista.push({
          quando: em(ymd, '08:00'),
          titulo: dia === e.dias ? 'Dia do nascimento!' : 'Nascimento em 2 dias',
          texto: `${c.nome} · previsto para ${dataDoDia(c, e.dias).split('-').reverse().slice(0, 2).join('/')}`,
        });
      }
    }
  }

  if (prefs.tarefas) {
    for (const t of dados.tarefas) {
      if (!t.ativa || !t.horario) continue;
      const data = t.proximaData < h ? h : t.proximaData;
      if (data > dias[dias.length - 1]) continue;
      lista.push({ quando: em(data, t.horario), titulo: t.titulo, texto: 'Tarefa da rotina' });
    }
  }

  if (prefs.gado) {
    for (const g of cuidadosGado(dados.animais, dados.eventosGado, DIAS)) {
      lista.push({ quando: em(g.data < h ? h : g.data, '07:30'), titulo: g.titulo, texto: g.detalhe });
    }
  }

  return lista
    .filter((a) => a.quando.getTime() > agora.getTime() + 30_000)
    .sort((a, b) => a.quando.getTime() - b.quando.getTime())
    .slice(0, MAX);
}

let ultimaAssinatura = '';

async function reagendar(dados: Dados, prefs: Lembretes) {
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;
  const avisos = montarAvisos(dados, prefs);
  const assinatura = JSON.stringify(avisos.map((a) => [a.quando.getTime(), a.titulo, a.texto]));
  if (assinatura === ultimaAssinatura) return;
  ultimaAssinatura = assinatura;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const a of avisos) {
    await Notifications.scheduleNotificationAsync({
      content: { title: a.titulo, body: a.texto, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: a.quando },
    });
  }
}

export async function desligarLembretes() {
  if (!NATIVO) return;
  ultimaAssinatura = '';
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Mantém os lembretes em dia com os dados (montado uma vez no layout raiz) */
export function useLembretes(pronto: boolean) {
  const chocadas = useStore((s) => s.chocadas);
  const tarefas = useStore((s) => s.tarefas);
  const animais = useStore((s) => s.animais);
  const eventosGado = useStore((s) => s.eventosGado);
  const ativos = usePrefs((s) => s.lembretesAtivos);
  const prefs = usePrefs((s) => s.lembretes);

  useEffect(() => {
    if (!NATIVO || !pronto || !ativos) return;
    const t = setTimeout(() => {
      reagendar(useStore.getState(), prefs).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [pronto, ativos, prefs, chocadas, tarefas, animais, eventosGado]);
}
