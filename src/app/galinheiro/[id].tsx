import { router, Stack, useLocalSearchParams } from 'expo-router';

import { irParaRegistro, ManejoItem } from '@/components/manejo-item';
import { TarefaItem } from '@/components/tarefa-item';
import { Badge, Button, Card, Empty, Grid, ListItem, Progress, Row, Screen, Section, Stat, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { avesAtuais, consumoDiarioKg, fmtIdade, idadeDias, ordenarManejos, somaPeriodo } from '@/lib/calc';
import { TIPOS_AVE } from '@/lib/constants';
import { fmtNum } from '@/lib/format';
import { useStore } from '@/lib/store';

export default function GalinheiroDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const galinheiro = useStore((s) => s.galinheiros.find((g) => g.id === id));
  const todosLotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const todasTarefas = useStore((s) => s.tarefas);

  if (!galinheiro) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Galinheiro' }} />
        <Empty icon="barn" title="Galinheiro não encontrado" />
      </Screen>
    );
  }

  const lotes = todosLotes.filter((l) => l.galinheiroId === galinheiro.id);
  const ativos = lotes.filter((l) => l.ativo);
  const loteIds = new Set(lotes.map((l) => l.id));
  const aves = ativos.reduce((s, l) => s + avesAtuais(l, manejos), 0);
  const ocup = galinheiro.capacidade > 0 ? aves / galinheiro.capacidade : 0;
  const consumo = ativos.reduce((s, l) => s + consumoDiarioKg(l, avesAtuais(l, manejos)), 0);
  const doGalinheiro = (m: { galinheiroId?: string; loteId?: string }) =>
    m.galinheiroId === galinheiro.id || (!!m.loteId && loteIds.has(m.loteId));
  const ovos7 = somaPeriodo(manejos, 'ovos', 7, doGalinheiro);
  const registros = ordenarManejos(manejos.filter(doGalinheiro)).slice(0, 10);
  const tarefas = todasTarefas.filter((t) => t.ativa && doGalinheiro(t));

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: galinheiro.nome,
          headerRight: () => (
            <Button
              title="Editar"
              variant="ghost"
              small
              onPress={() => router.push({ pathname: '/galinheiro/form', params: { id: galinheiro.id } })}
            />
          ),
        }}
      />

      <Card style={{ gap: S.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label">Ocupação</Txt>
          <Txt v="small">
            {fmtNum(aves)} de {fmtNum(galinheiro.capacidade)} aves ({fmtNum(ocup * 100)}%)
          </Txt>
        </Row>
        <Progress valor={ocup} cor={ocup > 1 ? C.danger : ocup > 0.9 ? C.warning : C.primary} />
        {galinheiro.observacoes ? <Txt v="small">{galinheiro.observacoes}</Txt> : null}
      </Card>

      <Grid>
        <Stat label="Consumo de ração" valor={`${fmtNum(consumo, 1)} kg/dia`} icone="sack" cor="#8D6E63" />
        <Stat label="Ovos (7 dias)" valor={fmtNum(ovos7)} icone="egg" cor={C.egg} />
      </Grid>

      <Row wrap gap={S.sm}>
        <Button title="Troca de água" icon="water" variant="secondary" small onPress={() => irParaRegistro({ tipo: 'agua', galinheiroId: galinheiro.id })} />
        <Button title="Limpeza" icon="broom" variant="secondary" small onPress={() => irParaRegistro({ tipo: 'limpeza', galinheiroId: galinheiro.id })} />
      </Row>

      <Section
        title="Lotes"
        action={
          <Button
            title="Novo lote"
            icon="plus"
            variant="ghost"
            small
            onPress={() => router.push({ pathname: '/lote/form', params: { galinheiroId: galinheiro.id } })}
          />
        }>
        {lotes.length === 0 ? (
          <Empty icon="bird" title="Nenhum lote" text="Um lote é um grupo de aves do mesmo tipo e idade." />
        ) : (
          lotes.map((l) => (
            <ListItem
              key={l.id}
              icon="bird"
              iconColor={l.ativo ? C.primary : C.muted}
              title={l.nome}
              subtitle={`${fmtNum(avesAtuais(l, manejos))} aves · ${TIPOS_AVE[l.tipo].label} · ${fmtIdade(idadeDias(l))}`}
              onPress={() => router.push({ pathname: '/lote/[id]', params: { id: l.id } })}
              right={l.ativo ? undefined : <Badge text="Encerrado" cor={C.muted} />}
            />
          ))
        )}
      </Section>

      {tarefas.length > 0 && (
        <Section title="Tarefas">
          {tarefas.map((t) => (
            <TarefaItem key={t.id} tarefa={t} />
          ))}
        </Section>
      )}

      <Section title="Últimos registros">
        {registros.length === 0 ? (
          <Txt v="muted">Nenhum registro ainda.</Txt>
        ) : (
          registros.map((m) => <ManejoItem key={m.id} manejo={m} />)
        )}
      </Section>
    </Screen>
  );
}
