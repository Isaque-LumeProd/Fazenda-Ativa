import { router, Stack, useLocalSearchParams } from 'expo-router';

import { BarChart } from '@/components/bar-chart';
import { irParaRegistro, ManejoItem } from '@/components/manejo-item';
import { Badge, Banner, Button, Card, Empty, Grid, ListItem, Row, Screen, Section, Stat, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import {
  avesAtuais,
  avesRecebidas,
  botaOvo,
  consumoDaRacao,
  consumoDiarioKg,
  fmtIdade,
  idadeDias,
  ordenarManejos,
  ovosPorDia,
} from '@/lib/calc';
import { TIPOS_AVE, TIPOS_MANEJO } from '@/lib/constants';
import { diaSemana, fmtData } from '@/lib/dates';
import { fmtNum, fmtPct, fmtQtd } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

export default function LoteDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lote = useStore((s) => s.lotes.find((l) => l.id === id));
  const galinheiro = useStore((s) => s.galinheiros.find((g) => g.id === lote?.galinheiroId));
  const manejos = useStore((s) => s.manejos);
  const itens = useStore((s) => s.itens);
  const lotes = useStore((s) => s.lotes);

  if (!lote) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Lote' }} />
        <Empty icon="bird" title="Lote não encontrado" />
      </Screen>
    );
  }

  const doLote = manejos.filter((m) => m.loteId === lote.id || m.loteDestinoId === lote.id);
  const aves = avesAtuais(lote, manejos);
  const mortes = doLote.filter((m) => m.tipo === 'mortalidade').reduce((s, m) => s + (m.quantidade ?? 0), 0);
  const base = lote.quantidadeInicial + avesRecebidas(lote, manejos);
  const racao = itens.find((i) => i.id === lote.racaoId);
  const usoRacao = racao ? consumoDaRacao(racao, lotes, manejos) : null;
  const poe = botaOvo(lote);
  const ovos7 = ovosPorDia(manejos, 7, lote.id);
  const media = ovos7.reduce((s, d) => s + d.ovos, 0) / 7;
  const ultimaPesagem = ordenarManejos(doLote.filter((m) => m.tipo === 'pesagem'))[0];

  const acoes: TipoManejo[] = poe
    ? ['ovos', 'racao', 'vitamina', 'vacina', 'mortalidade', 'venda', 'transferencia']
    : ['racao', 'vitamina', 'vacina', 'medicamento', 'pesagem', 'mortalidade', 'venda', 'transferencia'];

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: lote.nome,
          headerRight: () => (
            <Button
              title="Editar"
              variant="ghost"
              small
              onPress={() => router.push({ pathname: '/lote/form', params: { id: lote.id } })}
            />
          ),
        }}
      />

      <Card style={{ gap: S.xs }}>
        <Row wrap gap={S.sm}>
          <Badge text={TIPOS_AVE[lote.tipo].label} />
          {lote.raca ? <Badge text={lote.raca} cor={C.muted} /> : null}
          {!lote.ativo ? <Badge text="Encerrado" cor={C.danger} /> : null}
        </Row>
        <Txt v="muted">
          {galinheiro?.nome} · entrada em {fmtData(lote.dataEntrada)}
        </Txt>
      </Card>

      {racao && usoRacao ? (
        <ListItem
          icon="sack"
          iconColor="#8D6E63"
          title={racao.nome}
          subtitle={[
            `${fmtQtd(racao.quantidade)} ${racao.unidade} em estoque`,
            usoRacao.dias !== null ? `dura ~${fmtNum(usoRacao.dias)} dias` : undefined,
            usoRacao.vinculados.length > 1 ? `dividida com ${usoRacao.vinculados.length - 1} lote(s)` : undefined,
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => router.push({ pathname: '/estoque/[id]', params: { id: racao.id } })}
        />
      ) : lote.ativo ? (
        <Banner
          icon="sack"
          tipo="info"
          text="Vincule uma ração a este lote para calcular a duração do estoque e o trato do dia."
          onPress={() => router.push({ pathname: '/lote/form', params: { id: lote.id } })}
        />
      ) : null}

      <Grid>
        <Stat label="Aves atuais" valor={fmtNum(aves)} icone="bird" detalhe={`Inicial: ${fmtNum(lote.quantidadeInicial)}`} />
        <Stat label="Idade" valor={fmtIdade(idadeDias(lote))} icone="calendar" cor={C.info} detalhe={`${idadeDias(lote)} dias`} />
        <Stat
          label="Ração por dia"
          valor={`${fmtNum(consumoDiarioKg(lote, aves), 1)} kg`}
          icone="sack"
          cor="#8D6E63"
          detalhe={`${fmtNum(lote.consumoDiarioG)} g por ave`}
        />
        <Stat
          label="Mortalidade total"
          valor={fmtNum(mortes)}
          icone="alert-circle-outline"
          cor={C.danger}
          detalhe={base > 0 ? fmtPct(mortes / base) : undefined}
        />
        {poe ? (
          <Stat
            label="Taxa de postura (7 dias)"
            valor={aves > 0 ? fmtPct(media / aves) : '–'}
            icone="egg"
            cor={C.egg}
            detalhe={`Média de ${fmtNum(media)} ovos/dia`}
          />
        ) : ultimaPesagem?.pesoMedioG ? (
          <Stat
            label="Peso médio"
            valor={`${fmtNum(ultimaPesagem.pesoMedioG)} g`}
            icone="scale-balance"
            cor="#5D4037"
            detalhe={`Pesado em ${fmtData(ultimaPesagem.data)}`}
          />
        ) : null}
      </Grid>

      <Section title="Registrar">
        <Row wrap gap={S.sm}>
          {acoes.map((t) => (
            <Button
              key={t}
              title={TIPOS_MANEJO[t].label}
              icon={TIPOS_MANEJO[t].icone}
              variant="secondary"
              small
              onPress={() => irParaRegistro({ tipo: t, loteId: lote.id })}
            />
          ))}
        </Row>
      </Section>

      {poe && (
        <Section title="Ovos – últimos 7 dias">
          <Card>
            <BarChart dados={ovos7.map((d) => ({ rotulo: diaSemana(d.data), valor: d.ovos }))} />
          </Card>
        </Section>
      )}

      <Section title="Histórico">
        {doLote.length === 0 ? (
          <Txt v="muted">Nenhum registro ainda.</Txt>
        ) : (
          ordenarManejos(doLote)
            .slice(0, 30)
            .map((m) => <ManejoItem key={m.id} manejo={m} mostrarAlvo={false} />)
        )}
      </Section>
    </Screen>
  );
}
