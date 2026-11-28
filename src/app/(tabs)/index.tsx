import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { ChocadaHero } from '@/components/chocada-card';
import { ListaCuidados, useCuidadosDeHoje } from '@/components/cuidados';
import { irParaRegistro } from '@/components/manejo-item';
import { SyncIcone } from '@/components/sync-status';
import { TratoCard } from '@/components/trato-card';
import { Banner, Button, Card, Grid, Icon, IconBox, LinkAcao, Row, Screen, Section, Stat, Txt } from '@/components/ui';
import { C, F, R, S, sombra } from '@/constants/theme';
import { avesAtuais, consumoTotalKg, estoqueRacaoKg, itensBaixos, ovosPorDia } from '@/lib/calc';
import { useConta, usePermissoes } from '@/lib/conta';
import { TIPOS_MANEJO, type IconName } from '@/lib/constants';
import { dataExtenso, diaSemana, hoje, saudacao } from '@/lib/dates';
import { fmtNum, fmtPct } from '@/lib/format';
import { ativos, gestacoes } from '@/lib/gado';
import { useItens } from '@/lib/hooks';
import { usePrefs } from '@/lib/prefs';
import { sequenciaDeCuidado } from '@/lib/sequencia';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

const ATALHOS: TipoManejo[] = ['ovos', 'racao', 'agua', 'mortalidade'];

/** Logotipo "fazenda ativa." */
export function Marca({ right }: { right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Row gap={S.sm}>
        <View style={st.logo}>
          <Icon name="barn" size={26} color="#F3E3B8" />
        </View>
        <Txt style={st.marca}>
          fazenda ativa<Txt style={[st.marca, { color: C.terra }]}>.</Txt>
        </Txt>
      </Row>
      {right}
    </Row>
  );
}

export function BotaoRedondo({ icone, label, onPress }: { icone: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [st.redondo, sombra, pressed && { opacity: 0.6 }]}>
      <Icon name={icone} size={24} color={C.text} />
    </Pressable>
  );
}

export default function Hoje() {
  const galinheiros = useStore((s) => s.galinheiros);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const chocadas = useStore((s) => s.chocadas);
  const animais = useStore((s) => s.animais);
  const eventosGado = useStore((s) => s.eventosGado);
  const eventosChocada = useStore((s) => s.eventosChocada);
  const carregarExemplo = useStore((s) => s.carregarExemplo);
  const nome = usePrefs((s) => s.nome);
  const itens = useItens();
  const cuidados = useCuidadosDeHoje();
  const { editarCadastros } = usePermissoes();
  const naNuvem = useConta((s) => s.modo === 'nuvem');

  const ativas = chocadas.filter((c) => !c.encerrada).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const vazio = galinheiros.length === 0 && chocadas.length === 0 && animais.length === 0;
  const seq = sequenciaDeCuidado({ manejos, eventosChocada, eventosGado });
  const pendentes = cuidados.filter((c) => !c.feita).length;
  const feitas = cuidados.length - pendentes;
  const hora = new Date().getHours();
  const { width } = useWindowDimensions();
  const larguraCartao = Math.min(width - 56, 440);

  const cabecalho = (
    <>
      <Marca
        right={
          <Row gap={S.sm}>
            <SyncIcone />
            <BotaoRedondo icone="account-hard-hat" label="Modo Campo" onPress={() => router.push('/campo')} />
          </Row>
        }
      />
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: S.sm }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="kicker">{dataExtenso(hoje())}</Txt>
          <Row gap={S.sm}>
            <Txt v="display" style={{ flexShrink: 1 }} numberOfLines={1}>
              {saudacao()}
              {nome ? `, ${nome.split(' ')[0]}` : ''}
            </Txt>
            <Icon name={hora >= 18 || hora < 5 ? 'weather-night' : 'white-balance-sunny'} size={26} color={C.ouro} />
          </Row>
          <Txt v="muted" style={{ fontSize: 16 }}>
            {pendentes === 0
              ? 'Tudo em dia por aqui'
              : `${pendentes} ${pendentes === 1 ? 'cuidado' : 'cuidados'} para hoje${
                  ativas.length ? ` em ${ativas.length} ${ativas.length === 1 ? 'chocada' : 'chocadas'}` : ''
                }`}
          </Txt>
        </View>
        {seq > 0 ? (
          <View style={[st.seq, sombra]} accessibilityLabel={`Sequência de ${seq} dias de cuidado`}>
            <Icon name="fire" size={20} color={C.terra} />
            <Txt style={{ fontFamily: F.bold, fontSize: 18 }}>{seq}</Txt>
          </View>
        ) : null}
      </Row>
    </>
  );

  if (vazio) {
    return (
      <Screen topo>
        {cabecalho}
        <Card style={{ gap: S.md, alignItems: 'center', paddingVertical: S.xl }}>
          <IconBox name="egg-outline" cor={C.ouro} bg={C.areia} size={72} />
          <Txt v="h2" style={{ textAlign: 'center' }}>
            Bem-vindo à sua fazenda
          </Txt>
          <Txt v="muted" style={{ textAlign: 'center' }}>
            Organize chocadas, galinheiros, gado, ração e a rotina em um só lugar. Por onde quer começar?
          </Txt>
          <View style={{ gap: S.sm, alignSelf: 'stretch', marginTop: S.sm }}>
            <Button title="Nova chocada" icon="egg-outline" variant="terra" onPress={() => router.push('/chocada/form')} />
            {editarCadastros ? (
              <>
                <Button title="Cadastrar galinheiro" icon="barn" variant="secondary" onPress={() => router.push('/galinheiro/form')} />
                <Button title="Cadastrar animal" icon="cow" variant="secondary" onPress={() => router.push('/animal/form')} />
              </>
            ) : null}
            {!naNuvem ? <Button title="Ver com dados de exemplo" variant="ghost" onPress={carregarExemplo} /> : null}
          </View>
        </Card>
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
  const baixos = itensBaixos(itens);
  const rebanho = ativos(animais, eventosGado).length;
  const prenhes = gestacoes(animais, eventosGado);

  return (
    <Screen topo>
      {cabecalho}

      {ativas.length > 0 ? (
        <View style={{ gap: S.sm }}>
          {ativas.length === 1 ? (
            <ChocadaHero chocada={ativas[0]} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}
              style={{ marginHorizontal: -S.lg }}>
              {ativas.map((c) => (
                <View key={c.id} style={{ width: larguraCartao, paddingVertical: S.sm }}>
                  <ChocadaHero chocada={c} />
                </View>
              ))}
            </ScrollView>
          )}
          <View style={{ alignItems: 'flex-end' }}>
            <LinkAcao title="Ver chocadas" onPress={() => router.push('/aves')} />
          </View>
        </View>
      ) : null}

      {(diasRacao < 7 || baixos.length > 0) && (
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
              text={`${baixos.length} item(ns) abaixo do mínimo: ${baixos.map((i) => i.nome).join(', ')}`}
              onPress={() => router.push('/estoque')}
            />
          )}
        </View>
      )}

      <View style={{ gap: S.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt v="h2">Seu cuidado de hoje</Txt>
            <Txt v="muted">
              {cuidados.length === 0 ? 'Nenhuma tarefa marcada para hoje' : `${feitas} de ${cuidados.length} tarefas concluídas`}
            </Txt>
          </View>
          <Pressable onPress={() => router.push('/tarefas')} style={st.checkTopo} accessibilityLabel="Ver todas as tarefas">
            <Icon name="check" size={22} color={C.primaryDark} />
          </Pressable>
        </Row>
        {cuidados.length > 0 ? (
          <ListaCuidados cuidados={cuidados} />
        ) : (
          <Card style={{ alignItems: 'center', gap: S.xs }}>
            <Txt v="muted">Tudo feito por hoje. 🎉</Txt>
          </Card>
        )}
      </View>

      <Section title="Sua fazenda">
        <Grid>
          {galinheiros.length > 0 ? (
            <Stat
              label="Aves no plantel"
              valor={fmtNum(totalAves)}
              icone="bird"
              detalhe={`${lotesAtivos.length} lote(s) ativo(s)`}
              onPress={() => router.push('/aves')}
            />
          ) : null}
          {galinheiros.length > 0 ? (
            <Stat
              label="Ovos hoje"
              valor={fmtNum(ovosHoje)}
              icone="egg"
              cor={C.ouro}
              detalhe={poedeiras > 0 ? `Postura ${fmtPct(mediaOvos / poedeiras)}` : undefined}
            />
          ) : null}
          {animais.length > 0 ? (
            <Stat
              label="Rebanho"
              valor={`${fmtNum(rebanho)} cab.`}
              icone="cow"
              cor={C.terra}
              detalhe={prenhes.length ? `${prenhes.length} gestação(ões)` : undefined}
              onPress={() => router.push('/gado')}
            />
          ) : null}
          {racaoKg > 0 || consumoKg > 0 ? (
            <Stat
              label="Ração"
              valor={`${fmtNum(racaoKg)} kg`}
              icone="sack"
              cor="#8D6E63"
              detalhe={Number.isFinite(diasRacao) ? `Dura ~${fmtNum(diasRacao)} dias` : undefined}
              onPress={() => router.push('/estoque')}
            />
          ) : null}
        </Grid>
      </Section>

      {lotesAtivos.length > 0 ? <TratoCard /> : null}

      {galinheiros.length > 0 ? (
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
          </Row>
        </Section>
      ) : null}

      {galinheiros.length > 0 ? (
        <Section title="Ovos nos últimos 7 dias">
          <Card>
            <BarChart dados={ovos7.map((d) => ({ rotulo: diaSemana(d.data), valor: d.ovos }))} />
          </Card>
        </Section>
      ) : null}
    </Screen>
  );
}

function Atalho({ icone, cor, label, onPress }: { icone: IconName; cor: string; label: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ alignItems: 'center', gap: S.xs, flexGrow: 1, flexBasis: 140, paddingVertical: S.md }}>
      <IconBox name={icone} cor={cor} bg={cor + '1A'} />
      <Txt v="small" style={{ color: C.text, fontFamily: F.semibold, textAlign: 'center' }}>
        {label}
      </Txt>
    </Card>
  );
}

const st = StyleSheet.create({
  logo: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.primaryDark, alignItems: 'center', justifyContent: 'center' },
  marca: { fontSize: 26, fontFamily: F.extrabold, color: C.text, letterSpacing: -1 },
  redondo: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seq: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.pill,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  checkTopo: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
