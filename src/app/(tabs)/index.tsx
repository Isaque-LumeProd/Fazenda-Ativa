import { router } from 'expo-router';
import { View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { irParaRegistro } from '@/components/manejo-item';
import { TarefaItem } from '@/components/tarefa-item';
import { TratoCard } from '@/components/trato-card';
import { Banner, Button, Card, Empty, Grid, Icon, Progress, Row, Screen, Section, Stat, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import {
  avesAtuais,
  avesPorGalinheiro,
  consumoTotalKg,
  custoRacaoDia,
  estoqueRacaoKg,
  itensBaixos,
  ovosPorDia,
  somaPeriodo,
  statusTarefa,
} from '@/lib/calc';
import { TIPOS_MANEJO, type IconName } from '@/lib/constants';
import { diaSemana, fmtData, hoje, saudacao } from '@/lib/dates';
import { fmtMoeda, fmtNum, fmtPct } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

const ATALHOS: TipoManejo[] = ['ovos', 'racao', 'agua', 'mortalidade'];

export default function Inicio() {
  const galinheiros = useStore((s) => s.galinheiros);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const itens = useStore((s) => s.itens);
  const tarefas = useStore((s) => s.tarefas);
  const carregarExemplo = useStore((s) => s.carregarExemplo);

  if (galinheiros.length === 0) {
    return (
      <Screen>
        <View style={{ gap: S.xs }}>
          <Txt v="h1">Bem-vindo!</Txt>
          <Txt v="muted">Organize seus galinheiros, lotes, ração e rotina em um só lugar.</Txt>
        </View>
        <Empty
          icon="barn"
          title="Comece cadastrando um galinheiro"
          text="Depois adicione os lotes de aves que vivem nele."
          action={
            <View style={{ gap: S.sm, alignSelf: 'stretch', marginTop: S.sm }}>
              <Button title="Cadastrar galinheiro" icon="plus" onPress={() => router.push('/galinheiro/form')} />
              <Button title="Ver com dados de exemplo" variant="ghost" onPress={carregarExemplo} />
            </View>
          }
        />
      </Screen>
    );
  }

  const lotesAtivos = lotes.filter((l) => l.ativo);
  const totalAves = lotesAtivos.reduce((s, l) => s + avesAtuais(l, manejos), 0);
  const ovos7 = ovosPorDia(manejos, 7);
  const ovosHoje = ovos7[ovos7.length - 1].ovos;
  const mediaOvos = ovos7.slice(0, -1).reduce((s, d) => s + d.ovos, 0) / 6;
  const poedeiras = lotesAtivos
    .filter((l) => l.tipo === 'poedeira' || l.tipo === 'caipira')
    .reduce((s, l) => s + avesAtuais(l, manejos), 0);
  const racaoKg = estoqueRacaoKg(itens);
  const consumoKg = consumoTotalKg(lotes, manejos);
  const diasRacao = consumoKg > 0 ? racaoKg / consumoKg : Infinity;
  const custoDia = custoRacaoDia(itens, lotes, manejos);
  const mortes7 = somaPeriodo(manejos, 'mortalidade', 7);
  const baixos = itensBaixos(itens);
  const tarefasAtivas = tarefas.filter((t) => t.ativa);
  const atrasadas = tarefasAtivas.filter((t) => statusTarefa(t) === 'atrasada');
  const doDia = tarefasAtivas
    .filter((t) => statusTarefa(t) !== 'futura')
    .sort((a, b) => (a.horario ?? '99').localeCompare(b.horario ?? '99'));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }} wrap>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Txt v="h1">{saudacao()}!</Txt>
          <Txt v="muted">
            {diaSemana(hoje())}, {fmtData(hoje())} · {doDia.length} tarefa(s) para hoje
          </Txt>
        </View>
        <Button title="Modo Campo" icon="account-hard-hat" small variant="secondary" onPress={() => router.push('/campo')} />
      </Row>

      {(diasRacao < 7 || baixos.length > 0 || atrasadas.length > 0) && (
        <View style={{ gap: S.sm }}>
          {diasRacao < 7 && (
            <Banner
              icon="sack"
              tipo={diasRacao < 3 ? 'danger' : 'warning'}
              text={`A ração em estoque dura só mais ${fmtNum(diasRacao)} dia(s). Hora de comprar!`}
              onPress={() => router.push('/estoque')}
            />
          )}
          {baixos.length > 0 && (
            <Banner
              icon="package-variant"
              text={`${baixos.length} item(ns) abaixo do estoque mínimo: ${baixos.map((i) => i.nome).join(', ')}`}
              onPress={() => router.push('/estoque')}
            />
          )}
          {atrasadas.length > 0 && (
            <Banner
              icon="calendar-alert"
              tipo="danger"
              text={`${atrasadas.length} tarefa(s) atrasada(s)`}
              onPress={() => router.push('/tarefas')}
            />
          )}
        </View>
      )}

      <Grid>
        <Stat label="Aves no plantel" valor={fmtNum(totalAves)} icone="bird" detalhe={`${lotesAtivos.length} lote(s) ativo(s)`} />
        <Stat
          label="Ovos hoje"
          valor={fmtNum(ovosHoje)}
          icone="egg"
          cor={C.egg}
          detalhe={poedeiras > 0 ? `Postura média ${fmtPct(mediaOvos / poedeiras)}` : undefined}
        />
        <Stat
          label="Ração em estoque"
          valor={`${fmtNum(racaoKg)} kg`}
          icone="sack"
          cor="#8D6E63"
          detalhe={[
            Number.isFinite(diasRacao) ? `Dura ~${fmtNum(diasRacao)} dias (${fmtNum(consumoKg, 1)} kg/dia)` : undefined,
            custoDia > 0 ? `${fmtMoeda(custoDia)}/dia` : undefined,
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => router.push('/estoque')}
        />
        <Stat
          label="Mortalidade (7 dias)"
          valor={fmtNum(mortes7)}
          icone="alert-circle-outline"
          cor={C.danger}
          detalhe={totalAves > 0 ? fmtPct(mortes7 / (totalAves + mortes7)) + ' do plantel' : undefined}
        />
      </Grid>

      <TratoCard />

      <Section title="Registrar agora">
        <Row wrap gap={S.sm}>
          {ATALHOS.map((tipo) => (
            <Atalho
              key={tipo}
              icone={TIPOS_MANEJO[tipo].icone}
              cor={TIPOS_MANEJO[tipo].cor}
              label={TIPOS_MANEJO[tipo].label}
              onPress={() => irParaRegistro({ tipo })}
            />
          ))}
          <Atalho icone="dots-horizontal" cor={C.muted} label="Outro" onPress={() => irParaRegistro({})} />
        </Row>
      </Section>

      <Section
        title="Tarefas de hoje"
        action={<Button title="Ver todas" variant="ghost" small onPress={() => router.push('/tarefas')} />}>
        {doDia.length === 0 ? (
          <Card>
            <Txt v="muted">Tudo feito por hoje. 🎉</Txt>
          </Card>
        ) : (
          doDia.map((t) => <TarefaItem key={t.id} tarefa={t} />)
        )}
      </Section>

      <Section title="Produção de ovos – últimos 7 dias">
        <Card>
          <BarChart dados={ovos7.map((d) => ({ rotulo: diaSemana(d.data), valor: d.ovos }))} />
        </Card>
      </Section>

      <Section title="Galinheiros">
        {galinheiros.map((g) => {
          const aves = avesPorGalinheiro(g.id, lotes, manejos);
          const ocup = g.capacidade > 0 ? aves / g.capacidade : 0;
          return (
            <Card key={g.id} onPress={() => router.push({ pathname: '/galinheiro/[id]', params: { id: g.id } })} style={{ gap: S.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                  {g.nome}
                </Txt>
                <Txt v="small">
                  {fmtNum(aves)} / {fmtNum(g.capacidade)} aves
                </Txt>
              </Row>
              <Progress valor={ocup} cor={ocup > 1 ? C.danger : ocup > 0.9 ? C.warning : C.primary} />
            </Card>
          );
        })}
      </Section>
    </Screen>
  );
}

function Atalho({ icone, cor, label, onPress }: { icone: IconName; cor: string; label: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ alignItems: 'center', gap: S.xs, flexGrow: 1, flexBasis: 100, paddingVertical: S.md }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: cor + '1A', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icone} color={cor} />
      </View>
      <Txt v="small" style={{ color: C.text, fontWeight: '600', textAlign: 'center' }}>
        {label}
      </Txt>
    </Card>
  );
}
