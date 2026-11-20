import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chips, Empty, Grid, ListItem, Row, Screen, Section, Stat, Txt, Field } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { consumoDaRacao, sacosRestantes } from '@/lib/calc';
import { CATEGORIAS_ITEM } from '@/lib/constants';
import { rotuloDia } from '@/lib/dates';
import { avisar, confirmar } from '@/lib/dialog';
import { fmtMoeda, fmtNum, fmtQtd, numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';

type Acao = 'compra' | 'ajuste';

export default function ItemDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useStore((s) => s.itens.find((i) => i.id === id));
  const todosMov = useStore((s) => s.movimentos);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const entrada = useStore((s) => s.entradaEstoque);
  const ajustar = useStore((s) => s.ajustarEstoque);
  const excluir = useStore((s) => s.excluirItem);

  const [acao, setAcao] = useState<Acao>('compra');
  const [qtd, setQtd] = useState('');
  const [valor, setValor] = useState('');
  const [emSacos, setEmSacos] = useState(true);

  if (!item) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Item' }} />
        <Empty icon="package-variant" title="Item não encontrado" />
      </Screen>
    );
  }

  const cat = CATEGORIAS_ITEM[item.categoria];
  const movimentos = todosMov
    .filter((m) => m.itemId === item.id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, 30);

  const uso = item.categoria === 'racao' ? consumoDaRacao(item, lotes, manejos) : null;
  const sacos = sacosRestantes(item);
  const podeSaco = !!item.pesoSacoKg && item.unidade === 'kg';

  function aplicar() {
    const digitado = parseNum(qtd);
    const n = digitado !== null && emSacos && podeSaco && acao === 'compra' ? digitado * item!.pesoSacoKg! : digitado;
    if (n === null || n < 0 || (acao === 'compra' && n === 0)) {
      avisar('Quantidade inválida', 'Informe um número válido.');
      return;
    }
    if (acao === 'compra') entrada(item!.id, n, parseNum(valor) ?? undefined);
    else ajustar(item!.id, n);
    setQtd('');
    setValor('');
  }

  async function onExcluir() {
    const ok = await confirmar('Excluir item?', 'O histórico de movimentações deste item será apagado.', 'Excluir');
    if (ok) {
      excluir(item!.id);
      voltar();
    }
  }

  const baixo = item.quantidade <= item.estoqueMinimo;

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: item.nome,
          headerRight: () => (
            <Button
              title="Editar"
              variant="ghost"
              small
              onPress={() => router.push({ pathname: '/estoque/form', params: { id: item.id } })}
            />
          ),
        }}
      />

      <Grid>
        <Stat
          label="Em estoque"
          valor={`${fmtQtd(item.quantidade)} ${item.unidade}`}
          icone={cat.icone}
          cor={baixo ? C.danger : cat.cor}
          detalhe={[
            sacos !== null ? `${fmtNum(sacos, 1)} sacos de ${fmtQtd(item.pesoSacoKg!)} kg` : undefined,
            baixo ? 'Abaixo do mínimo!' : `Mínimo: ${fmtQtd(item.estoqueMinimo)} ${item.unidade}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        {item.custoUnitario ? (
          <Stat
            label="Valor em estoque"
            valor={fmtMoeda(item.quantidade * item.custoUnitario)}
            icone="cash"
            detalhe={`${fmtMoeda(item.custoUnitario)} por ${item.unidade}`}
          />
        ) : null}
        {uso && uso.dias !== null ? (
          <Stat
            label="Duração estimada"
            valor={`${fmtNum(uso.dias)} dias`}
            icone="calendar"
            cor={uso.dias <= 5 ? C.danger : C.info}
            detalhe={`${fmtNum(uso.kgDia, 1)} kg/dia · ${fmtNum(uso.kgDia * 7)} kg/semana`}
          />
        ) : null}
        {uso && uso.custoDia > 0 ? (
          <Stat
            label="Custo desta ração"
            valor={`${fmtMoeda(uso.custoDia)}/dia`}
            icone="cash"
            cor="#8D6E63"
            detalhe={`${fmtMoeda(uso.custoDia * 30)} por mês`}
          />
        ) : null}
      </Grid>

      {uso && (
        <Section title="Lotes que comem esta ração">
          {uso.vinculados.length === 0 ? (
            <Txt v="muted">Nenhum lote vinculado. Edite um lote e escolha esta ração para calcular a duração.</Txt>
          ) : (
            uso.vinculados.map((v) => (
              <ListItem
                key={v.lote.id}
                icon="bird"
                title={v.lote.nome}
                subtitle={`${fmtNum(v.aves)} aves · ${fmtNum(v.kgDia, 1)} kg/dia (${fmtNum(v.lote.consumoDiarioG)} g/ave)`}
                onPress={() => router.push({ pathname: '/lote/[id]', params: { id: v.lote.id } })}
              />
            ))
          )}
        </Section>
      )}

      <Card style={{ gap: S.md }}>
        <Chips
          options={[
            { value: 'compra' as const, label: 'Registrar compra', icon: 'cart-plus' as const },
            { value: 'ajuste' as const, label: 'Ajustar (contagem)', icon: 'pencil' as const },
          ]}
          value={acao}
          onChange={setAcao}
        />
        {acao === 'compra' && podeSaco && (
          <Chips
            options={[
              { value: 'sacos' as const, label: `Em sacos (${fmtQtd(item.pesoSacoKg!)} kg)` },
              { value: 'kg' as const, label: 'Em kg' },
            ]}
            value={emSacos ? 'sacos' : 'kg'}
            onChange={(v) => setEmSacos(v === 'sacos')}
          />
        )}
        <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Field
              label={acao === 'compra' ? 'Quantidade comprada' : 'Quantidade contada'}
              value={qtd}
              onChangeText={setQtd}
              keyboardType="decimal-pad"
              suffix={acao === 'compra' && podeSaco && emSacos ? 'sacos' : item.unidade}
              hint={
                acao === 'compra' && podeSaco && emSacos && parseNum(qtd)
                  ? `= ${fmtQtd(parseNum(qtd)! * item.pesoSacoKg!)} kg`
                  : undefined
              }
            />
          </View>
          {acao === 'compra' && (
            <View style={{ flex: 1 }}>
              <Field label="Valor pago (opcional)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" suffix="R$" />
            </View>
          )}
        </Row>
        {acao === 'ajuste' && (
          <Button
            title={`Preencher com atual (${numParaTexto(item.quantidade)})`}
            variant="ghost"
            small
            onPress={() => setQtd(numParaTexto(item.quantidade))}
          />
        )}
        <Button title={acao === 'compra' ? 'Adicionar ao estoque' : 'Salvar contagem'} icon="check" onPress={aplicar} />
      </Card>

      <Section title="Movimentações">
        {movimentos.length === 0 ? (
          <Txt v="muted">Nenhuma movimentação ainda.</Txt>
        ) : (
          movimentos.map((m) => (
            <ListItem
              key={m.id}
              icon={m.tipo === 'entrada' ? 'arrow-down-bold' : m.tipo === 'saida' ? 'arrow-up-bold' : 'pencil'}
              iconColor={m.quantidade >= 0 ? C.primary : C.warning}
              title={`${m.quantidade >= 0 ? '+' : ''}${fmtQtd(m.quantidade)} ${item.unidade}`}
              subtitle={[
                rotuloDia(m.data),
                m.tipo === 'entrada' ? 'Compra' : m.tipo === 'saida' ? 'Uso no manejo' : 'Ajuste de contagem',
                m.custoTotal ? fmtMoeda(m.custoTotal) : undefined,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          ))
        )}
      </Section>

      <Button title="Excluir item" variant="danger" icon="trash-can-outline" onPress={onExcluir} />
    </Screen>
  );
}
