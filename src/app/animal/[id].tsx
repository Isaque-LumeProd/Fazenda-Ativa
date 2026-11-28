import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AvatarAnimal, abrirAnimal } from '@/components/animal-card';
import { BarChart } from '@/components/bar-chart';
import { Anel } from '@/components/ovo';
import { Aviso, Badge, Button, Card, Empty, Icon, IconBox, Linha, Row, Screen, Segmented, StatRow, Tag, Txt } from '@/components/ui';
import { C, F, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { fmtData, fmtDataCurta, hoje, rotuloDia } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { fmtMoeda, fmtNum, fmtQtd } from '@/lib/format';
import {
  APTIDOES,
  arrobas,
  calendarioGestacao,
  CATEGORIAS_GADO,
  descreverEventoGado,
  eventosDo,
  faseGestacao,
  fmtIdadeGado,
  GESTACAO_DIAS,
  gestacao,
  gmd,
  idadeMeses,
  nomeAnimal,
  ORDEM_EVENTOS_GADO,
  pastoAtual,
  pesagens,
  pesoAtual,
  situacao,
  TIPOS_EVENTO_GADO,
} from '@/lib/gado';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { TipoEventoGado } from '@/lib/types';

type Aba = 'resumo' | 'pesagens' | 'historico';

export default function AnimalTela() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const animal = useStore((s) => s.animais.find((a) => a.id === id));
  const animais = useStore((s) => s.animais);
  const eventos = useStore((s) => s.eventosGado);
  const excluirEvento = useStore((s) => s.excluirEventoGado);
  const { editarCadastros, apagar } = usePermissoes();
  const [aba, setAba] = useState<Aba>('resumo');

  if (!animal) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Animal' }} />
        <Empty icon="cow-off" title="Animal não encontrado" action={<Button title="Voltar" onPress={voltar} />} />
      </Screen>
    );
  }

  const sit = situacao(animal, eventos);
  const peso = pesoAtual(animal, eventos);
  const ganho = gmd(animal, eventos);
  const g = gestacao(animal, eventos);
  const evs = eventosDo(animal.id, eventos).reverse();
  const pes = pesagens(animal, eventos);
  const mae = animais.find((a) => a.id === animal.maeId);
  const filhos = animais.filter((a) => a.maeId === animal.id);
  const pasto = pastoAtual(animal, eventos);
  const acoes = ORDEM_EVENTOS_GADO.filter((t) => t !== 'nota' && (!TIPOS_EVENTO_GADO[t].soFemea || animal.sexo === 'F'));

  function registrar(tipo?: TipoEventoGado) {
    router.push({ pathname: '/gado/evento', params: tipo ? { tipo, animalId: animal!.id } : { animalId: animal!.id } });
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: nomeAnimal(animal),
          headerRight: editarCadastros
            ? () => (
                <Pressable onPress={() => router.push({ pathname: '/animal/form', params: { id: animal.id } })} hitSlop={8} style={{ paddingHorizontal: 8 }} accessibilityLabel="Editar">
                  <Icon name="pencil-outline" color={C.primaryDark} />
                </Pressable>
              )
            : undefined,
        }}
      />

      <Card style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xl }}>
        <AvatarAnimal animal={animal} tamanho={96} />
        <Txt v="h1" style={{ textAlign: 'center' }}>
          {animal.nome ?? `Brinco ${animal.brinco}`}
        </Txt>
        <Txt v="muted">{animal.nome ? `Brinco ${animal.brinco}` : CATEGORIAS_GADO[animal.categoria].label}</Txt>
        <Row wrap gap={6} style={{ justifyContent: 'center' }}>
          <Tag text={CATEGORIAS_GADO[animal.categoria].label} />
          {animal.raca ? <Tag text={animal.raca} /> : null}
          <Tag text={APTIDOES[animal.aptidao]} />
          {pasto ? <Tag text={pasto} /> : null}
        </Row>
        {sit !== 'ativo' ? <Badge text={sit === 'vendido' ? 'Vendido' : 'Morto'} cor={C.danger} /> : null}
      </Card>

      <StatRow
        itens={[
          { valor: fmtIdadeGado(idadeMeses(animal)), label: 'Idade', icone: 'cake-variant-outline' },
          { valor: peso ? `${fmtNum(peso)} kg` : '—', label: peso ? `${fmtNum(arrobas(peso), 1)} @ vivo` : 'Peso', icone: 'scale-balance' },
          { valor: ganho === null ? '—' : `${fmtNum(ganho * 1000)} g`, label: 'Ganho/dia', icone: 'trending-up' },
        ]}
      />

      {g ? (
        <Card style={{ gap: S.lg }}>
          <Row gap={S.lg}>
            <Anel p={Math.min(1, g.dia / GESTACAO_DIAS)} tamanho={96}>
              <Txt style={{ color: '#F3E3B8', fontFamily: F.extrabold, fontSize: 20 }}>{fmtNum(Math.min(100, (g.dia / GESTACAO_DIAS) * 100))}%</Txt>
            </Anel>
            <View style={{ flex: 1, gap: 4 }}>
              <Txt v="kicker">{g.confirmada ? 'Prenhe' : 'Aguardando diagnóstico'}</Txt>
              <Txt v="h2">
                Dia {Math.min(g.dia, GESTACAO_DIAS)}
                <Txt v="muted"> /{GESTACAO_DIAS}</Txt>
              </Txt>
              <Txt style={{ color: C.primary, fontFamily: F.semibold }}>
                {g.faltam > 0 ? `Faltam ${g.faltam} dias · pare ${fmtDataCurta(g.previsao)}` : 'Parto a qualquer momento'}
              </Txt>
            </View>
          </Row>
          <Aviso kicker={faseGestacao(g).titulo} title="O que fazer agora" text={faseGestacao(g).texto} icon="information-outline" cor={C.primary} bg={C.primarySoft} />
          <View>
            {calendarioGestacao(g).map((m, i) => {
              const passou = m.data < hoje();
              return (
                <Row key={m.titulo} gap={S.md} style={[{ paddingVertical: S.md }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <IconBox name={passou ? 'check' : m.icone} cor={passou ? C.primary : C.terra} bg={passou ? C.primarySoft : C.terraSoft} size={40} />
                  <View style={{ flex: 1 }}>
                    <Txt style={[{ fontFamily: F.semibold }, passou && { color: C.muted }]}>{m.titulo}</Txt>
                    <Txt v="small">{m.texto}</Txt>
                  </View>
                  <Txt v="small" style={{ fontFamily: F.semibold }}>
                    {fmtDataCurta(m.data)}
                  </Txt>
                </Row>
              );
            })}
          </View>
          <Row gap={S.sm}>
            {!g.confirmada ? <Button title="Diagnóstico" small variant="secondary" icon="stethoscope" onPress={() => registrar('diagnostico')} /> : null}
            <Button title="Registrar parto" small variant="terra" icon="baby-bottle-outline" onPress={() => registrar('parto')} />
          </Row>
        </Card>
      ) : null}

      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { value: 'resumo', label: 'Resumo' },
          { value: 'pesagens', label: 'Pesagens' },
          { value: 'historico', label: 'Histórico' },
        ]}
      />

      {aba === 'resumo' ? (
        <View style={{ gap: S.lg }}>
          {sit === 'ativo' ? (
            <View style={{ gap: S.md }}>
              <Txt v="h2">Registrar</Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
                {acoes.map((t) => {
                  const cfg = TIPOS_EVENTO_GADO[t];
                  return (
                    <Card key={t} onPress={() => registrar(t)} style={{ flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: S.md, paddingHorizontal: S.sm }}>
                      <IconBox name={cfg.icone} cor={cfg.cor} bg={cfg.cor + '1A'} />
                      <Txt v="small" style={{ color: C.text, fontFamily: F.semibold, textAlign: 'center' }} numberOfLines={2}>
                        {cfg.label}
                      </Txt>
                    </Card>
                  );
                })}
              </View>
            </View>
          ) : null}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Linha primeira icon="calendar-blank-outline" title="Nascimento" subtitle={animal.dataNascimento ? fmtData(animal.dataNascimento) : 'Não informado'} />
            <Linha
              icon={animal.origem === 'nascido' ? 'home-heart' : 'cash'}
              title={animal.origem === 'nascido' ? 'Nasceu na fazenda' : 'Comprado'}
              subtitle={[fmtData(animal.dataEntrada), animal.valorCompra ? fmtMoeda(animal.valorCompra) : undefined].filter(Boolean).join(' · ')}
            />
            {mae ? <Linha icon="cow" iconColor={C.terra} title="Mãe" subtitle={nomeAnimal(mae)} onPress={() => abrirAnimal(mae.id)} /> : null}
            {filhos.map((f) => (
              <Linha key={f.id} icon="baby-face-outline" iconColor={C.teal} title="Cria" subtitle={`${nomeAnimal(f)} · ${CATEGORIAS_GADO[f.categoria].label}`} onPress={() => abrirAnimal(f.id)} />
            ))}
            {animal.observacoes ? <Linha icon="note-text-outline" iconColor={C.muted} title="Observações" subtitle={animal.observacoes} /> : null}
          </Card>
        </View>
      ) : null}

      {aba === 'pesagens' ? (
        <View style={{ gap: S.lg }}>
          <Button title="Registrar pesagem" icon="scale-balance" onPress={() => registrar('pesagem')} />
          {pes.length === 0 ? (
            <Empty icon="scale-balance" title="Nenhuma pesagem" text="Pese de tempos em tempos para acompanhar o ganho de peso." />
          ) : (
            <>
              <Card>
                <BarChart dados={pes.slice(-8).map((p) => ({ rotulo: fmtDataCurta(p.data), valor: p.kg }))} />
              </Card>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {[...pes].reverse().map((p, i, arr) => {
                  const ant = arr[i + 1];
                  const dif = ant ? p.kg - ant.kg : null;
                  return (
                    <Linha
                      key={p.data + i}
                      primeira={i === 0}
                      icon="scale-balance"
                      iconColor="#5D4037"
                      title={`${fmtQtd(p.kg)} kg · ${fmtNum(arrobas(p.kg), 1)} @`}
                      subtitle={`${rotuloDia(p.data)}${dif !== null ? ` · ${dif >= 0 ? '+' : ''}${fmtQtd(dif)} kg` : ' · peso inicial'}`}
                    />
                  );
                })}
              </Card>
            </>
          )}
        </View>
      ) : null}

      {aba === 'historico' ? (
        <View style={{ gap: S.md }}>
          <Button title="Anotar" icon="plus" variant="secondary" onPress={() => registrar('nota')} />
          {evs.length === 0 ? (
            <Empty icon="history" title="Nada registrado" text="Pesagens, vacinas, coberturas e partos aparecem aqui." />
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {evs.map((e, i) => {
                const cfg = TIPOS_EVENTO_GADO[e.tipo];
                return (
                  <Linha
                    key={e.id}
                    primeira={i === 0}
                    icon={cfg.icone}
                    iconColor={cfg.cor}
                    title={cfg.label}
                    subtitle={[rotuloDia(e.data), descreverEventoGado(e)].filter(Boolean).join(' · ')}
                    onPress={
                      apagar
                        ? async () => {
                            const ok = await confirmar(
                              'Excluir registro?',
                              e.itemId ? 'A dose usada volta para o estoque.' : 'Essa ação não pode ser desfeita.',
                              'Excluir',
                            );
                            if (ok) excluirEvento(e.id);
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
      ) : null}
    </Screen>
  );
}
