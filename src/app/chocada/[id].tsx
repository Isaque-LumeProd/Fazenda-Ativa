import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ovo } from '@/components/ovo';
import {
  Aviso,
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Icon,
  IconBox,
  Linha,
  Passos,
  Row,
  Screen,
  Segmented,
  Sheet,
  StatRow,
  Stepper,
  Txt,
} from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { avesAtuais } from '@/lib/calc';
import {
  calendario,
  contarOvos,
  dataDoDia,
  diaDaChocada,
  eclosao,
  especieDa,
  ESPECIES,
  faltamDias,
  faseDoDia,
  IMPREVISTOS,
  imprevistoPorId,
  naFaseFinal,
  ORDEM_STATUS_OVO,
  proximaViragem,
  proximoMarco,
  STATUS_OVO,
  ultimoValor,
  umidadeIdeal,
  viragensHoje,
  viraOvos,
  type Imprevisto,
} from '@/lib/chocada';
import { usePermissoes } from '@/lib/conta';
import { dataExtenso, fmtDataCurta, hoje, horaAtual, rotuloDia } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { fmtNum, fmtPct, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { Chocada, EventoChocada, StatusOvo } from '@/lib/types';

type Aba = 'resumo' | 'ovoscopia' | 'historico';

/** Cor do ovo na bandeja (fundo escuro, como na lanterna) */
const COR_OVO: Record<StatusOvo, string> = {
  na: '#F1B45A',
  fertil: '#F07A12',
  infertil: '#E9E3D3',
  duvidoso: '#CBA258',
  removido: '#C2412E',
  nascido: '#9CCB8E',
  morto: '#77736A',
};

const PLURAL: Partial<Record<StatusOvo, string>> = {
  fertil: 'Férteis',
  infertil: 'Inférteis',
  duvidoso: 'Duvidosos',
  nascido: 'Nascidos',
};
type Painel = null | 'temperatura' | 'umidade' | 'imprevistos' | 'menu' | 'quantidade' | 'encerrar' | 'nota';

export default function ChocadaTela() {
  const params = useLocalSearchParams<{ id: string; aba?: string }>();
  const chocada = useStore((s) => s.chocadas.find((c) => c.id === params.id));
  const [aba, setAba] = useState<Aba>(params.aba === 'ovoscopia' ? 'ovoscopia' : 'resumo');
  const [painel, setPainel] = useState<Painel>(params.aba === 'umidade' ? 'umidade' : null);

  if (!chocada) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Chocada' }} />
        <Empty icon="egg-off-outline" title="Chocada não encontrada" action={<Button title="Voltar" onPress={voltar} />} />
      </Screen>
    );
  }

  return (
    <Screen header={<Cabeca chocada={chocada} onMenu={() => setPainel('menu')} />}>
      <Stack.Screen options={{ headerShown: false, title: chocada.nome }} />
      <Numeros chocada={chocada} />
      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { value: 'resumo', label: 'Resumo' },
          { value: 'ovoscopia', label: 'Ovoscopia' },
          { value: 'historico', label: 'Histórico' },
        ]}
      />
      {aba === 'resumo' ? <Resumo chocada={chocada} abrir={setPainel} /> : null}
      {aba === 'ovoscopia' ? <Bandeja chocada={chocada} abrir={setPainel} /> : null}
      {aba === 'historico' ? <Historico chocada={chocada} abrir={setPainel} /> : null}

      <PainelMedida chocada={chocada} tipo="temperatura" visivel={painel === 'temperatura'} fechar={() => setPainel(null)} />
      <PainelMedida chocada={chocada} tipo="umidade" visivel={painel === 'umidade'} fechar={() => setPainel(null)} />
      <PainelImprevistos chocada={chocada} visivel={painel === 'imprevistos'} fechar={() => setPainel(null)} />
      <PainelQuantidade chocada={chocada} visivel={painel === 'quantidade'} fechar={() => setPainel(null)} />
      <PainelEncerrar chocada={chocada} visivel={painel === 'encerrar'} fechar={() => setPainel(null)} />
      <PainelNota chocada={chocada} visivel={painel === 'nota'} fechar={() => setPainel(null)} />
      <PainelMenu chocada={chocada} visivel={painel === 'menu'} fechar={() => setPainel(null)} abrir={setPainel} />
    </Screen>
  );
}

// ------------------------------------------------------------------ cabeçalho escuro

function Cabeca({ chocada, onMenu }: { chocada: Chocada; onMenu: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const e = especieDa(chocada);
  const diaHoje = diaDaChocada(chocada);
  const diaAtual = Math.max(1, Math.min(diaHoje, e.dias));
  const [dia, setDia] = useState(diaAtual);
  const lista = useRef<ScrollViewInstance>(null);
  const faltam = faltamDias(chocada);
  const fase = faseDoDia(chocada, dia);
  const tam = Math.min(300, width - 90);

  useEffect(() => {
    const t = setTimeout(() => lista.current?.scrollTo({ x: Math.max(0, (diaAtual - 3) * 54), animated: false }), 50);
    return () => clearTimeout(t);
  }, [diaAtual]);

  return (
    <View style={[s.cabeca, { paddingTop: insets.top + S.sm }]}>
      <View style={s.cabecaInner}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={voltar} style={s.botaoEscuro} accessibilityLabel="Voltar" hitSlop={6}>
            <Icon name="arrow-left" color="#fff" />
          </Pressable>
          <Pressable onPress={onMenu} style={s.botaoEscuro} accessibilityLabel="Mais opções" hitSlop={6}>
            <Icon name="dots-horizontal" color="#fff" />
          </Pressable>
        </Row>
        <View style={{ alignItems: 'center', marginTop: -36, gap: 4 }}>
          <Txt style={s.titulo} numberOfLines={1}>
            {chocada.nome}
          </Txt>
          <Txt style={{ color: C.ouro, fontFamily: F.medium, fontSize: 16 }}>
            {chocada.encerrada
              ? `Encerrada · ${contarOvos(chocada).nascido} nascidos`
              : diaHoje < 1
                ? `Começa em ${rotuloDia(chocada.dataInicio)}`
                : `Dia ${diaAtual} de ${e.dias} · ${faltam > 0 ? `Faltam ${faltam} ${faltam === 1 ? 'dia' : 'dias'}` : 'Nascimento!'}`}
          </Txt>
        </View>
        <View style={{ alignItems: 'center', marginVertical: S.md }}>
          <Ovo p={dia / e.dias} anel={Math.max(0, diaAtual) / e.dias} tamanho={tam} escuro />
        </View>
        <View style={{ alignItems: 'center', gap: S.sm }}>
          <Txt style={{ color: C.ouro, fontFamily: F.semibold, fontSize: 16 }}>{fmtNum((dia / e.dias) * 100)}% da incubação</Txt>
          <View style={s.pilulaEscura}>
            <Txt style={{ color: '#fff', fontFamily: F.semibold, fontSize: 14 }}>
              {dia === diaHoje ? `Hoje · dia ${dia}` : `Dia ${dia} · ${fmtDataCurta(dataDoDia(chocada, dia))}`}
            </Txt>
          </View>
          <Txt style={s.fase}>{fase.titulo}</Txt>
        </View>
      </View>
      <ScrollView
        ref={lista}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: S.lg, paddingVertical: S.md }}>
        {Array.from({ length: e.dias }, (_, i) => i + 1).map((d) => {
          const sel = d === dia;
          const ehHoje = d === diaHoje;
          return (
            <Pressable
              key={d}
              onPress={() => setDia(d)}
              accessibilityLabel={`Dia ${d}`}
              style={[s.diaBolinha, ehHoje && !sel && { borderColor: C.ouro, borderWidth: 1.5 }, sel && s.diaSel]}>
              <Txt style={{ color: sel ? C.noite : '#BDB8AC', fontFamily: sel ? F.bold : F.medium, fontSize: 15 }}>{d}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      <Txt style={{ color: '#8A867C', textAlign: 'center', fontSize: 14 }}>Toque em um dia para ver o ovo</Txt>
      <View style={s.tampa} />
    </View>
  );
}

function Numeros({ chocada }: { chocada: Chocada }) {
  const eventos = useStore((s) => s.eventosChocada);
  const e = especieDa(chocada);
  const dia = diaDaChocada(chocada);
  const n = contarOvos(chocada);
  const ativos = chocada.ovos.length - n.removido - n.infertil;
  const prox = e.ovoscopias.find((d) => d >= dia);
  const virada = proximaViragem(chocada, eventos);
  const [uMin, uMax] = umidadeIdeal(chocada);

  if (chocada.encerrada) {
    const ecl = eclosao(chocada);
    return (
      <StatRow
        itens={[
          { valor: fmtNum(chocada.ovos.length), label: 'Ovos', icone: 'egg-outline' },
          { valor: fmtNum(n.nascido), label: 'Nascidos', icone: 'egg-easter' },
          { valor: ecl === null ? '—' : fmtPct(ecl), label: 'Eclosão', icone: 'chart-arc' },
        ]}
      />
    );
  }
  return (
    <StatRow
      itens={[
        { valor: fmtNum(ativos), label: 'Ovos', icone: 'egg-outline' },
        prox
          ? { valor: `Dia ${prox}`, label: `${e.ovoscopias.indexOf(prox) + 1}ª ovoscopia`, icone: 'flashlight' }
          : dia < e.dias
            ? { valor: `Dia ${e.dias}`, label: 'Nascimento', icone: 'egg-easter' }
            : { valor: fmtNum(n.nascido), label: 'Nascidos', icone: 'egg-easter' },
        virada
          ? { valor: virada, label: 'Próx. virada', icone: 'rotate-right' }
          : { valor: `${uMin}–${uMax}%`, label: 'Umidade ideal', icone: 'water-outline' },
      ]}
    />
  );
}

// ------------------------------------------------------------------ resumo

function Resumo({ chocada, abrir }: { chocada: Chocada; abrir: (p: Painel) => void }) {
  const eventos = useStore((s) => s.eventosChocada);
  const registrar = useStore((s) => s.registrarEventoChocada);
  const e = especieDa(chocada);
  const dia = diaDaChocada(chocada);
  const fase = faseDoDia(chocada, Math.max(1, dia));
  const marco = proximoMarco(chocada);
  const [feitas, total] = viragensHoje(chocada, eventos);
  const virada = proximaViragem(chocada, eventos);
  const temp = ultimoValor(chocada, eventos, 'temperatura');
  const umid = ultimoValor(chocada, eventos, 'umidade');
  const [uMin, uMax] = umidadeIdeal(chocada);
  const marcos = calendario(chocada);
  const h = hoje();
  const podeEncerrar = !chocada.encerrada && dia >= e.dias - 1;

  return (
    <View style={{ gap: S.lg }}>
      {chocada.encerrada ? null : (
        <Card style={{ gap: S.lg }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="h2">Hoje</Txt>
            <Txt v="muted">{dataExtenso(h)}</Txt>
          </Row>

          {viraOvos(chocada) && !naFaseFinal(chocada) ? (
            <Row gap={S.md}>
              <IconBox name="rotate-right" cor={C.primaryDark} bg="#DDEEE6" size={52} />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt style={{ fontFamily: F.semibold, fontSize: 17 }}>Viragem dos ovos</Txt>
                <Row gap={6}>
                  {Array.from({ length: total }, (_, i) => (
                    <View key={i} style={[s.traco, i < feitas && { backgroundColor: C.primary }]} />
                  ))}
                  <Txt v="small" style={{ marginLeft: 4 }}>
                    {feitas >= total ? 'todas feitas hoje' : `próxima às ${virada}`}
                  </Txt>
                </Row>
              </View>
              <Button
                title="Virei"
                small
                onPress={() => registrar({ chocadaId: chocada.id, tipo: 'viragem', data: h, hora: horaAtual() })}
                style={{ minHeight: 46, paddingHorizontal: S.xl }}
              />
            </Row>
          ) : null}

          {chocada.tipoChocadeira !== 'galinha' ? (
            <Row gap={S.md} style={{ alignItems: 'stretch' }}>
              <Medidor
                titulo="Temperatura"
                icone="thermometer"
                cor={C.info}
                valor={temp?.valor}
                unidade="°C"
                ideal={e.temp}
                casas={1}
                onPress={() => abrir('temperatura')}
              />
              <Medidor
                titulo={`Umidade · ${chocada.tipoChocadeira === 'manual' ? 'manual' : 'auto'}`}
                icone="water-outline"
                cor={C.info}
                valor={umid?.data === h ? umid.valor : undefined}
                unidade="%"
                ideal={[uMin, uMax]}
                casas={0}
                onPress={() => abrir('umidade')}
              />
            </Row>
          ) : null}

          {marco ? (
            <Aviso
              kicker={marco.dia === dia ? 'Agora' : `Próximo · dia ${marco.dia} · ${fmtDataCurta(marco.data)}`}
              title={marco.titulo}
              text={marco.texto}
              icon={marco.icone}
              cor={marco.dia === dia ? C.warning : C.primary}
              bg={marco.dia === dia ? C.warningSoft : C.primarySoft}
            />
          ) : null}

          <View style={{ height: 1, backgroundColor: C.border }} />
          <Pressable onPress={() => abrir('imprevistos')} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: S.sm }, pressed && { opacity: 0.6 }]}>
            <Icon name="lightning-bolt-outline" size={20} color={C.muted} />
            <Txt v="muted" style={{ flex: 1 }}>
              {chocada.tipoChocadeira === 'galinha' ? 'Algum problema com a galinha ou os ovos? ' : 'Faltou energia ou outro problema? '}
              <Txt style={{ color: C.primary, fontFamily: F.semibold }}>Registrar</Txt>
            </Txt>
          </Pressable>
        </Card>
      )}

      {podeEncerrar ? (
        <Card style={{ gap: S.md, backgroundColor: C.terraSoft, borderColor: '#EFD2C6' }}>
          <Row gap={S.md}>
            <IconBox name="egg-easter" cor={C.terra} bg="#fff" />
            <View style={{ flex: 1 }}>
              <Txt v="h3">Já nasceram?</Txt>
              <Txt v="small">Marque os nascidos na bandeja e feche a chocada. Os filhotes podem ir direto para um lote.</Txt>
            </View>
          </Row>
          <Button title="Encerrar chocada" icon="check-decagram-outline" variant="terra" onPress={() => abrir('encerrar')} />
        </Card>
      ) : null}

      <Card style={{ gap: S.sm }}>
        <Txt v="kicker">{fase.kicker}</Txt>
        <Txt v="h2">{fase.titulo}</Txt>
        <Txt style={{ fontSize: 16, lineHeight: 24 }}>{fase.texto}</Txt>
        <Card flat style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start', marginTop: S.sm }}>
          <Icon name="flashlight" size={20} color={C.ouro} />
          <Txt style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
            <Txt style={{ fontFamily: F.semibold }}>Na lanterna: </Txt>
            {fase.ovoscopia}
          </Txt>
        </Card>
      </Card>

      <View style={{ gap: S.md }}>
        <Txt v="h2">Calendário</Txt>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {marcos.map((m, i) => {
            const passou = m.data < h;
            const ehHoje = m.data === h;
            return (
              <Row key={m.titulo + m.dia} gap={S.md} style={[{ padding: S.lg }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                <View style={[s.diaMarco, ehHoje && { backgroundColor: C.terra }, passou && { backgroundColor: C.primarySoft }]}>
                  {passou ? (
                    <Icon name="check" size={18} color={C.primary} />
                  ) : (
                    <Txt style={{ fontFamily: F.bold, color: ehHoje ? '#fff' : C.text }}>{m.dia}</Txt>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={[{ fontFamily: F.semibold, fontSize: 16 }, passou && { color: C.muted }]}>{m.titulo}</Txt>
                  <Txt v="small">{m.texto}</Txt>
                </View>
                <Txt v="small" style={{ fontFamily: F.semibold, color: ehHoje ? C.terra : C.muted }}>
                  {ehHoje ? 'Hoje' : fmtDataCurta(m.data)}
                </Txt>
              </Row>
            );
          })}
        </Card>
      </View>

      <Card flat style={{ gap: 6 }}>
        <Txt v="label">
          {ESPECIES[chocada.especie]?.emoji} {e.label}: referências
        </Txt>
        <Txt v="small">
          Temperatura {fmtNum(e.temp[0], 1)}–{fmtNum(e.temp[1], 1)} °C · Umidade {e.umid[0]}–{e.umid[1]}% até o dia {e.faseFinal - 1}, depois{' '}
          {e.umidFinal[0]}–{e.umidFinal[1]}%. Siga também o manual da sua chocadeira.
        </Txt>
      </Card>
    </View>
  );
}

function Medidor({
  titulo,
  icone,
  cor,
  valor,
  unidade,
  ideal,
  casas,
  onPress,
}: {
  titulo: string;
  icone: 'thermometer' | 'water-outline';
  cor: string;
  valor?: number;
  unidade: string;
  ideal: [number, number];
  casas: number;
  onPress: () => void;
}) {
  const margem = (ideal[1] - ideal[0]) * 1.5 + (unidade === '%' ? 10 : 1);
  const min = ideal[0] - margem;
  const max = ideal[1] + margem;
  const pos = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const fora = valor !== undefined && (valor < ideal[0] || valor > ideal[1]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.medidor, pressed && { opacity: 0.7 }]}>
      <Row gap={6}>
        <Icon name={icone} size={18} color={cor} />
        <Txt v="small" style={{ fontSize: 14, color: C.text }} numberOfLines={1}>
          {titulo}
        </Txt>
      </Row>
      {valor === undefined ? (
        <Row gap={4} style={{ marginVertical: 6 }}>
          <Icon name="plus" size={22} color={C.primaryDark} />
          <Txt style={{ fontFamily: F.bold, fontSize: 20, color: C.primaryDark }}>Registrar</Txt>
        </Row>
      ) : (
        <Row gap={2} style={{ alignItems: 'flex-end' }}>
          <Txt style={{ fontFamily: F.extrabold, fontSize: 32, letterSpacing: -1, color: fora ? C.danger : C.text }}>
            {fmtNum(valor, casas)}
          </Txt>
          <Txt v="muted" style={{ marginBottom: 6 }}>
            {unidade}
          </Txt>
        </Row>
      )}
      <View style={s.regua}>
        <View style={[s.reguaIdeal, { left: `${pos(ideal[0]) * 100}%`, width: `${(pos(ideal[1]) - pos(ideal[0])) * 100}%` }]} />
        {valor !== undefined ? <View style={[s.reguaPonto, { left: `${pos(valor) * 100}%` }]} /> : null}
      </View>
      <Txt v="small" style={{ fontSize: 13 }}>
        <Txt style={{ fontFamily: F.semibold, fontSize: 13 }}>Ideal </Txt>
        {fmtNum(ideal[0], casas)}–{fmtNum(ideal[1], casas)}
        {unidade}
      </Txt>
    </Pressable>
  );
}

// ------------------------------------------------------------------ bandeja de ovoscopia

function Bandeja({ chocada, abrir }: { chocada: Chocada; abrir: (p: Painel) => void }) {
  const marcarTodos = useStore((s) => s.marcarTodosFerteis);
  const eventos = useStore((s) => s.eventosChocada);
  const registrar = useStore((s) => s.registrarEventoChocada);
  const [filtro, setFiltro] = useState<StatusOvo | 'todos'>('todos');
  const [ovoSel, setOvoSel] = useState<number | null>(null);
  const n = contarOvos(chocada);
  const e = especieDa(chocada);
  const dia = diaDaChocada(chocada);
  const chaveHoje = e.ovoscopias.includes(dia) ? `ovoscopia-${dia}` : null;
  const feitaHoje = !!chaveHoje && eventos.some((x) => x.chocadaId === chocada.id && x.tipo === 'tarefa' && x.chave === chaveHoje);
  const lista = chocada.ovos.map((o, i) => ({ o, i })).filter(({ o }) => filtro === 'todos' || o.status === filtro);

  return (
    <View style={{ gap: S.lg }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="h2">Bandeja de ovos</Txt>
          <Txt v="muted">Toque em um ovo para marcar o que viu na lanterna</Txt>
        </View>
        <Button title="Editar quantidade" icon="pencil-outline" small variant="secondary" onPress={() => abrir('quantidade')} />
      </Row>

      <Card style={{ gap: S.md }}>
        <Row>
          {(['fertil', 'infertil', 'duvidoso', 'nascido'] as StatusOvo[]).map((st) => (
            <View key={st} style={{ flex: 1, alignItems: 'center' }}>
              <Txt style={{ fontFamily: F.extrabold, fontSize: 24, color: st === 'duvidoso' ? C.warning : C.text }}>{n[st]}</Txt>
              <Txt v="small">{PLURAL[st]}</Txt>
            </View>
          ))}
        </Row>
        {n.na > 0 ? (
          <>
            <View style={s.naoAvaliados}>
              <Txt style={{ flex: 1, fontFamily: F.semibold, fontSize: 16 }}>
                {n.na} ainda não {n.na === 1 ? 'avaliado' : 'avaliados'}
              </Txt>
              <Button title="Marcar todos férteis" icon="check" small variant="dark" onPress={() => marcarTodos(chocada.id)} />
            </View>
            <Txt v="small">Depois toque só nos ovos claros, duvidosos ou mortos.</Txt>
          </>
        ) : null}
        {chaveHoje && !feitaHoje ? (
          <Button
            title="Ovoscopia de hoje feita"
            icon="flashlight"
            variant="secondary"
            onPress={() => registrar({ chocadaId: chocada.id, tipo: 'tarefa', chave: chaveHoje, data: hoje(), hora: horaAtual() })}
          />
        ) : null}
      </Card>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {(['todos', 'fertil', 'duvidoso', 'removido', 'nascido', 'infertil', 'morto'] as const).map((f) => (
          <Chip
            key={f}
            label={f === 'todos' ? 'Todos' : STATUS_OVO[f].label}
            ativo={filtro === f}
            onPress={() => setFiltro(f)}
          />
        ))}
      </ScrollView>

      <View style={s.bandeja}>
        {lista.map(({ o, i }) => {
          const cfg = STATUS_OVO[o.status];
          return (
            <Pressable key={i} onPress={() => setOvoSel(i)} style={({ pressed }) => [s.ovoCel, pressed && { opacity: 0.7 }]} accessibilityLabel={`Ovo ${i + 1}: ${cfg.label}`}>
              <Icon
                name={o.status === 'nascido' ? 'egg-easter' : o.status === 'removido' || o.status === 'morto' ? 'egg-off' : 'egg'}
                size={30}
                color={COR_OVO[o.status]}
              />
              <Txt style={{ color: '#fff', fontFamily: F.bold, fontSize: 13 }}>{String(i + 1).padStart(2, '0')}</Txt>
              {o.ident ? (
                <Txt style={{ color: '#BDB8AC', fontSize: 10 }} numberOfLines={1}>
                  {o.ident}
                </Txt>
              ) : null}
            </Pressable>
          );
        })}
        {lista.length === 0 ? <Txt v="muted">Nenhum ovo com esse estado.</Txt> : null}
      </View>

      <PainelOvo chocada={chocada} indice={ovoSel} fechar={() => setOvoSel(null)} />
    </View>
  );
}

function PainelOvo({ chocada, indice, fechar }: { chocada: Chocada; indice: number | null; fechar: () => void }) {
  const salvarOvo = useStore((s) => s.salvarOvo);
  const ovo = indice === null ? undefined : chocada.ovos[indice];
  const [status, setStatus] = useState<StatusOvo>('na');
  const [ident, setIdent] = useState('');
  const [obs, setObs] = useState('');
  const [aberto, setAberto] = useState<number | null>(null);

  if (indice !== aberto) {
    setAberto(indice);
    if (ovo) {
      setStatus(ovo.status);
      setIdent(ovo.ident ?? '');
      setObs(ovo.obs ?? '');
    }
  }

  return (
    <Sheet
      visible={indice !== null}
      onClose={fechar}
      title={`Ovo ${String((indice ?? 0) + 1).padStart(2, '0')}`}
      footer={
        <Button
          title="Salvar alterações"
          icon="check"
          onPress={() => {
            if (indice === null) return;
            salvarOvo(chocada.id, indice, { status, ident: ident.trim() || undefined, obs: obs.trim() || undefined });
            fechar();
          }}
        />
      }>
      <Txt v="label">Status</Txt>
      <Row wrap gap={S.sm}>
        {ORDEM_STATUS_OVO.map((st) => {
          const cfg = STATUS_OVO[st];
          const ativo = st === status;
          return (
            <Pressable
              key={st}
              onPress={() => setStatus(st)}
              style={[s.statusChip, { backgroundColor: cfg.bg, borderColor: ativo ? C.primaryDark : 'transparent' }]}>
              {ativo ? <Icon name="check" size={16} color={cfg.cor} /> : null}
              <Txt style={{ color: cfg.cor, fontFamily: F.semibold, fontSize: 15 }}>{cfg.label}</Txt>
            </Pressable>
          );
        })}
      </Row>
      <Field label="Identificação do ovo" value={ident} onChangeText={setIdent} placeholder="Ex: A1, Matriz 02, Lote B" />
      <Field label="Observação (opcional)" value={obs} onChangeText={setObs} placeholder="Ex: casca manchada, ovo pequeno" multiline />
    </Sheet>
  );
}

// ------------------------------------------------------------------ histórico

const EVENTO_VISUAL: Record<EventoChocada['tipo'], { icone: 'rotate-right' | 'thermometer' | 'water-outline' | 'lightning-bolt-outline' | 'check-circle-outline' | 'note-text-outline'; cor: string; label: string }> = {
  viragem: { icone: 'rotate-right', cor: C.primary, label: 'Viragem dos ovos' },
  temperatura: { icone: 'thermometer', cor: C.info, label: 'Temperatura' },
  umidade: { icone: 'water-outline', cor: C.info, label: 'Umidade' },
  imprevisto: { icone: 'lightning-bolt-outline', cor: C.warning, label: 'Imprevisto' },
  tarefa: { icone: 'check-circle-outline', cor: C.primary, label: 'Cuidado feito' },
  nota: { icone: 'note-text-outline', cor: C.muted, label: 'Anotação' },
};

function descreverEvento(ev: EventoChocada): [string, string] {
  const v = EVENTO_VISUAL[ev.tipo];
  switch (ev.tipo) {
    case 'temperatura':
      return [v.label, `${fmtNum(ev.valor ?? 0, 1)} °C`];
    case 'umidade':
      return [v.label, `${fmtNum(ev.valor ?? 0)}%`];
    case 'imprevisto':
      return [imprevistoPorId(ev.imprevisto)?.titulo ?? v.label, ev.observacao ?? ''];
    case 'tarefa':
      return [
        ev.chave?.startsWith('ovoscopia') ? `Ovoscopia do dia ${ev.chave.split('-')[1]}` : ev.chave === 'fase-final' ? 'Fase final iniciada' : ev.chave === 'nascimento' ? 'Nascimentos conferidos' : v.label,
        ev.observacao ?? '',
      ];
    default:
      return [v.label, ev.observacao ?? ''];
  }
}

function Historico({ chocada, abrir }: { chocada: Chocada; abrir: (p: Painel) => void }) {
  const eventos = useStore((s) => s.eventosChocada);
  const excluir = useStore((s) => s.excluirEventoChocada);
  const { apagar } = usePermissoes();
  const lista = eventos
    .filter((e) => e.chocadaId === chocada.id)
    .sort((a, b) => (b.data + b.hora).localeCompare(a.data + a.hora));

  return (
    <View style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h2">Histórico</Txt>
        <Button title="Anotar" icon="plus" small variant="secondary" onPress={() => abrir('nota')} />
      </Row>
      {lista.length === 0 ? (
        <Empty icon="history" title="Nada registrado ainda" text="Viragens, temperatura, umidade e imprevistos aparecem aqui." />
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {lista.map((ev, i) => {
            const v = EVENTO_VISUAL[ev.tipo];
            const [titulo, det] = descreverEvento(ev);
            return (
              <Linha
                key={ev.id}
                primeira={i === 0}
                icon={v.icone}
                iconColor={v.cor}
                title={titulo}
                subtitle={[`${rotuloDia(ev.data)} · ${ev.hora}`, `dia ${diaDaChocada(chocada, ev.data)}`, det].filter(Boolean).join(' · ')}
                onPress={
                  apagar
                    ? async () => {
                        if (await confirmar('Excluir registro?', `${titulo} de ${rotuloDia(ev.data)} às ${ev.hora}.`, 'Excluir')) excluir(ev.id);
                      }
                    : undefined
                }
                right={apagar ? <Icon name="trash-can-outline" size={18} color={C.muted} /> : <View />}
              />
            );
          })}
        </Card>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ painéis

function PainelMedida({ chocada, tipo, visivel, fechar }: { chocada: Chocada; tipo: 'temperatura' | 'umidade'; visivel: boolean; fechar: () => void }) {
  const registrar = useStore((s) => s.registrarEventoChocada);
  const e = especieDa(chocada);
  const ideal = tipo === 'temperatura' ? e.temp : umidadeIdeal(chocada);
  const [texto, setTexto] = useState('');
  const valor = parseNum(texto);
  const valido = valor !== null && (tipo === 'temperatura' ? valor > 20 && valor < 45 : valor >= 0 && valor <= 100);
  const fora = valido && (valor! < ideal[0] || valor! > ideal[1]);
  const sugestoes = tipo === 'temperatura' ? [ideal[0], (ideal[0] + ideal[1]) / 2, ideal[1]].map((v) => Math.round(v * 10) / 10) : [ideal[0], Math.round((ideal[0] + ideal[1]) / 2), ideal[1]];

  return (
    <Sheet
      visible={visivel}
      onClose={fechar}
      title={tipo === 'temperatura' ? 'Registrar temperatura' : 'Registrar umidade'}
      footer={
        <Button
          title="Salvar"
          icon="check"
          disabled={!valido}
          onPress={() => {
            if (!valido) return;
            registrar({ chocadaId: chocada.id, tipo, valor: valor!, data: hoje(), hora: horaAtual() });
            setTexto('');
            fechar();
          }}
        />
      }>
      <Txt v="muted">
        Ideal para {e.label.toLowerCase()} {naFaseFinal(chocada) ? 'na fase final' : 'nesta fase'}: {fmtNum(ideal[0], tipo === 'temperatura' ? 1 : 0)}–
        {fmtNum(ideal[1], tipo === 'temperatura' ? 1 : 0)}
        {tipo === 'temperatura' ? ' °C' : '%'}
      </Txt>
      <Field
        label={tipo === 'temperatura' ? 'Temperatura no termômetro' : 'Umidade no higrômetro'}
        value={texto}
        onChangeText={setTexto}
        keyboardType="decimal-pad"
        suffix={tipo === 'temperatura' ? '°C' : '%'}
        placeholder={tipo === 'temperatura' ? 'Ex: 37,6' : 'Ex: 55'}
      />
      <Row gap={S.sm} wrap>
        {sugestoes.map((v) => (
          <Chip key={v} label={`${fmtNum(v, tipo === 'temperatura' ? 1 : 0)}${tipo === 'temperatura' ? ' °C' : '%'}`} onPress={() => setTexto(String(v).replace('.', ','))} />
        ))}
      </Row>
      {fora ? (
        <Aviso
          icon="alert-outline"
          cor={C.danger}
          bg={C.dangerSoft}
          title="Fora da faixa ideal"
          text={`Veja o que fazer em "Imprevistos": ${tipo === 'temperatura' ? (valor! > ideal[1] ? 'Temperatura alta' : 'Temperatura baixa') : valor! > ideal[1] ? 'Umidade alta' : 'Umidade baixa'}.`}
        />
      ) : null}
    </Sheet>
  );
}

function PainelImprevistos({ chocada, visivel, fechar }: { chocada: Chocada; visivel: boolean; fechar: () => void }) {
  const registrar = useStore((s) => s.registrarEventoChocada);
  const [sel, setSel] = useState<Imprevisto | null>(null);
  const lista = IMPREVISTOS.filter((i) => (chocada.tipoChocadeira === 'galinha' ? ['galinha-saiu', 'ovo-trincado', 'ovo-podre'].includes(i.id) : i.id !== 'galinha-saiu'));

  function fecharTudo() {
    setSel(null);
    fechar();
  }

  return (
    <Sheet
      visible={visivel}
      onClose={fecharTudo}
      title={sel ? 'O que fazer agora' : 'O que aconteceu?'}
      footer={
        sel ? (
          <>
            <Button
              title="Entendi"
              onPress={() => {
                registrar({ chocadaId: chocada.id, tipo: 'imprevisto', imprevisto: sel.id, data: hoje(), hora: horaAtual() });
                fecharTudo();
              }}
            />
            <Button title="Voltar" variant="ghost" onPress={() => setSel(null)} />
          </>
        ) : undefined
      }>
      {sel ? (
        <>
          <Row gap={S.md}>
            <IconBox name={sel.icone} cor={C.warning} bg={C.warningSoft} />
            <Txt v="h3" style={{ flex: 1 }}>
              {sel.titulo}
            </Txt>
          </Row>
          <Passos itens={sel.passos} />
          <Txt v="small">Ao tocar em “Entendi”, o imprevisto fica anotado no histórico da chocada.</Txt>
        </>
      ) : (
        <View style={{ marginHorizontal: -S.xl }}>
          {lista.map((i, k) => (
            <Linha key={i.id} primeira={k === 0} icon={i.icone} iconColor={C.warning} title={i.titulo} onPress={() => setSel(i)} />
          ))}
        </View>
      )}
    </Sheet>
  );
}

function PainelQuantidade({ chocada, visivel, fechar }: { chocada: Chocada; visivel: boolean; fechar: () => void }) {
  const definir = useStore((s) => s.definirQtdOvos);
  const [qtd, setQtd] = useState(chocada.ovos.length);
  const [aberto, setAberto] = useState(false);
  if (visivel !== aberto) {
    setAberto(visivel);
    if (visivel) setQtd(chocada.ovos.length);
  }
  return (
    <Sheet
      visible={visivel}
      onClose={fechar}
      title="Quantidade de ovos"
      footer={
        <Button
          title="Salvar"
          icon="check"
          onPress={() => {
            definir(chocada.id, qtd);
            fechar();
          }}
        />
      }>
      <Stepper value={qtd} onChange={setQtd} min={1} max={500} />
      {qtd < chocada.ovos.length ? (
        <Txt v="small" style={{ textAlign: 'center', color: C.danger }}>
          Os últimos {chocada.ovos.length - qtd} ovos da bandeja serão removidos.
        </Txt>
      ) : null}
    </Sheet>
  );
}

function PainelNota({ chocada, visivel, fechar }: { chocada: Chocada; visivel: boolean; fechar: () => void }) {
  const registrar = useStore((s) => s.registrarEventoChocada);
  const [texto, setTexto] = useState('');
  return (
    <Sheet
      visible={visivel}
      onClose={fechar}
      title="Anotação"
      footer={
        <Button
          title="Salvar"
          icon="check"
          disabled={!texto.trim()}
          onPress={() => {
            registrar({ chocadaId: chocada.id, tipo: 'nota', observacao: texto.trim(), data: hoje(), hora: horaAtual() });
            setTexto('');
            fechar();
          }}
        />
      }>
      <Field value={texto} onChangeText={setTexto} placeholder="Ex: troquei a água do reservatório" multiline />
    </Sheet>
  );
}

function PainelEncerrar({ chocada, visivel, fechar }: { chocada: Chocada; visivel: boolean; fechar: () => void }) {
  const salvarChocada = useStore((s) => s.salvarChocada);
  const salvarLote = useStore((s) => s.salvarLote);
  const registrarManejo = useStore((s) => s.registrarManejo);
  const registrar = useStore((s) => s.registrarEventoChocada);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const galinheiros = useStore((s) => s.galinheiros);
  const { editarCadastros } = usePermissoes();
  const n = contarOvos(chocada);
  const [destino, setDestino] = useState<string>('nenhum');
  const ativos = lotes.filter((l) => l.ativo);

  function encerrar() {
    const h = hoje();
    let loteDestinoId: string | undefined;
    if (n.nascido > 0 && destino.startsWith('lote:')) {
      loteDestinoId = destino.slice(5);
      registrarManejo({ tipo: 'entrada', data: h, loteId: loteDestinoId, quantidade: n.nascido, observacao: `Nascidos na chocada ${chocada.nome}` });
    } else if (n.nascido > 0 && destino.startsWith('novo:')) {
      loteDestinoId = salvarLote({
        nome: `Pintinhos ${chocada.nome}`,
        galinheiroId: destino.slice(5),
        tipo: 'pintinho',
        quantidadeInicial: n.nascido,
        dataEntrada: h,
        idadeEntradaDias: 0,
        consumoDiarioG: 30,
        ativo: true,
      });
    }
    registrar({ chocadaId: chocada.id, tipo: 'tarefa', chave: 'nascimento', data: h, hora: horaAtual(), observacao: `${n.nascido} nascidos` });
    salvarChocada({ ...chocada, encerrada: true, dataEncerramento: h, loteDestinoId });
    fechar();
  }

  return (
    <Sheet
      visible={visivel}
      onClose={fechar}
      title="Encerrar chocada"
      footer={<Button title={`Encerrar com ${n.nascido} nascidos`} icon="check" variant="terra" onPress={encerrar} />}>
      <StatRow
        flat
        itens={[
          { valor: fmtNum(chocada.ovos.length), label: 'Ovos' },
          { valor: fmtNum(n.nascido), label: 'Nascidos' },
          { valor: (() => { const e = eclosao(chocada); return e === null ? '—' : fmtPct(e); })(), label: 'Eclosão' },
        ]}
      />
      {n.na > 0 || n.fertil > 0 ? (
        <Txt v="small">
          Ainda há {n.na + n.fertil} ovo(s) sem marcar como nascido. Marque na aba Ovoscopia antes, se precisar.
        </Txt>
      ) : null}
      {n.nascido > 0 ? (
        <>
          <Txt v="label">Para onde vão os filhotes?</Txt>
          <View style={{ gap: S.sm }}>
            <Chip label="Não mandar para lote" ativo={destino === 'nenhum'} onPress={() => setDestino('nenhum')} />
            {ativos.map((l) => (
              <Chip
                key={l.id}
                icon="bird"
                label={`Somar ao lote ${l.nome} (${fmtNum(avesAtuais(l, manejos))} aves)`}
                ativo={destino === `lote:${l.id}`}
                onPress={() => setDestino(`lote:${l.id}`)}
              />
            ))}
            {editarCadastros
              ? galinheiros.map((g) => (
                  <Chip
                    key={g.id}
                    icon="plus"
                    label={`Novo lote de pintinhos em ${g.nome}`}
                    ativo={destino === `novo:${g.id}`}
                    onPress={() => setDestino(`novo:${g.id}`)}
                  />
                ))
              : null}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}

function PainelMenu({ chocada, visivel, fechar, abrir }: { chocada: Chocada; visivel: boolean; fechar: () => void; abrir: (p: Painel) => void }) {
  const excluir = useStore((s) => s.excluirChocada);
  const salvar = useStore((s) => s.salvarChocada);
  const { apagar } = usePermissoes();
  return (
    <Sheet visible={visivel} onClose={fechar} title={chocada.nome}>
      <View style={{ marginHorizontal: -S.xl }}>
        <Linha
          primeira
          icon="pencil-outline"
          title="Editar chocada"
          onPress={() => {
            fechar();
            router.push({ pathname: '/chocada/form', params: { id: chocada.id } });
          }}
        />
        {chocada.encerrada ? (
          <Linha
            icon="restore"
            title="Reabrir chocada"
            onPress={() => {
              salvar({ ...chocada, encerrada: false, dataEncerramento: undefined });
              fechar();
            }}
          />
        ) : (
          <Linha icon="check-decagram-outline" iconColor={C.terra} title="Encerrar chocada" onPress={() => abrir('encerrar')} />
        )}
        <Linha icon="lightning-bolt-outline" iconColor={C.warning} title="Registrar imprevisto" onPress={() => abrir('imprevistos')} />
        <Linha icon="book-open-variant" iconColor={C.info} title="Guia de incubação" onPress={() => { fechar(); router.push('/guia/incubacao'); }} />
        {apagar ? (
          <Linha
            icon="trash-can-outline"
            iconColor={C.danger}
            title="Excluir chocada"
            onPress={async () => {
              if (await confirmar('Excluir chocada?', 'A chocada e todo o histórico dela serão apagados.', 'Excluir')) {
                fechar();
                excluir(chocada.id);
                voltar();
              }
            }}
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  cabeca: { backgroundColor: C.noite, width: '100%', alignItems: 'center' },
  cabecaInner: { width: '100%', maxWidth: 720, paddingHorizontal: S.lg },
  botaoEscuro: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1B1C1A',
    borderWidth: 1,
    borderColor: '#33342F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  titulo: { color: '#fff', fontFamily: F.extrabold, fontSize: 28, letterSpacing: -0.6, maxWidth: '75%', textAlign: 'center' },
  pilulaEscura: { backgroundColor: '#2A2B27', borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: 4 },
  fase: { color: '#fff', fontFamily: F.bold, fontSize: 24, letterSpacing: -0.4, textAlign: 'center' },
  diaBolinha: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1B1C1A', alignItems: 'center', justifyContent: 'center' },
  diaSel: { backgroundColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  tampa: { width: '100%', height: 32, backgroundColor: C.bg, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: S.lg },
  traco: { width: 16, height: 7, borderRadius: 4, backgroundColor: '#DCD8CD' },
  medidor: { flex: 1, backgroundColor: C.field, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: S.md, gap: 6 },
  regua: { height: 8, borderRadius: 4, backgroundColor: '#E6E2D6', marginTop: 2 },
  reguaIdeal: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4, backgroundColor: '#9CCBB4' },
  reguaPonto: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    backgroundColor: C.text,
    borderWidth: 2,
    borderColor: '#fff',
  },
  diaMarco: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.field, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  naoAvaliados: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.primarySoft, borderRadius: R.md, padding: S.md },
  bandeja: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  ovoCel: {
    width: 74,
    height: 92,
    borderRadius: 18,
    backgroundColor: '#141513',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: S.lg, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1.5 },
});
