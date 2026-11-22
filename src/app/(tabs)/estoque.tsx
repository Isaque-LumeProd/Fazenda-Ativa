import { router } from 'expo-router';
import { View } from 'react-native';

import { Badge, Button, Card, Empty, ListItem, Row, Screen, Section, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { consumoDaRacao, consumoTotalKg, custoRacaoDia, estoqueRacaoKg, sacosRestantes } from '@/lib/calc';
import { CATEGORIAS_ITEM } from '@/lib/constants';
import { fmtMoeda, fmtNum, fmtQtd } from '@/lib/format';
import { useItens } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import type { CategoriaItem } from '@/lib/types';

const ORDEM: CategoriaItem[] = ['racao', 'vitamina', 'vacina', 'medicamento', 'outros'];

export default function Estoque() {
  const itens = useItens();
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const { editarCadastros } = usePermissoes();

  const racaoKg = estoqueRacaoKg(itens);
  const consumoKg = consumoTotalKg(lotes, manejos);
  const dias = consumoKg > 0 ? racaoKg / consumoKg : null;
  const custoDia = custoRacaoDia(itens, lotes, manejos);

  return (
    <Screen footer={editarCadastros ? <Button title="Novo item" icon="plus" onPress={() => router.push('/estoque/form')} /> : undefined}>
      <Card style={{ gap: S.sm, backgroundColor: C.primarySoft, borderColor: C.primarySoft }}>
        <Txt v="label" style={{ color: C.primaryDark }}>
          Previsão de ração
        </Txt>
        <Txt v="h2" style={{ color: C.primaryDark }}>
          {dias === null ? `${fmtNum(racaoKg)} kg` : `${fmtNum(dias)} dias`}
        </Txt>
        <Txt v="small" style={{ color: C.primaryDark }}>
          {fmtNum(racaoKg)} kg em estoque · consumo estimado de {fmtNum(consumoKg, 1)} kg/dia ({fmtNum(consumoKg * 7)} kg/semana)
        </Txt>
        {custoDia > 0 && (
          <Row gap={S.lg} wrap>
            <Txt style={{ color: C.primaryDark, fontWeight: '700' }}>{fmtMoeda(custoDia)}/dia</Txt>
            <Txt style={{ color: C.primaryDark, fontWeight: '700' }}>{fmtMoeda(custoDia * 30)}/mês</Txt>
          </Row>
        )}
        <Button
          title="Baixar trato do dia"
          icon="check-all"
          small
          style={{ alignSelf: 'flex-start' }}
          onPress={() => router.push('/campo')}
        />
      </Card>

      {itens.length === 0 ? (
        <Empty icon="package-variant" title="Estoque vazio" text="Cadastre ração, vitaminas, vacinas e medicamentos." />
      ) : (
        ORDEM.map((cat) => {
          const daCategoria = itens.filter((i) => i.categoria === cat);
          if (daCategoria.length === 0) return null;
          return (
            <Section key={cat} title={CATEGORIAS_ITEM[cat].label}>
              {daCategoria.map((i) => {
                const uso = cat === 'racao' ? consumoDaRacao(i, lotes, manejos) : null;
                const sacos = sacosRestantes(i);
                const baixo = i.quantidade <= i.estoqueMinimo || (uso?.dias != null && uso.dias <= 5);
                const subtitulo = uso
                  ? [
                      uso.dias !== null ? `Dura ~${fmtNum(uso.dias)} dias` : 'Nenhum lote vinculado',
                      uso.kgDia > 0 ? `${fmtNum(uso.kgDia, 1)} kg/dia` : undefined,
                      sacos !== null ? `${fmtNum(sacos, 1)} sacos` : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `Mínimo: ${fmtQtd(i.estoqueMinimo)} ${i.unidade}`;
                return (
                  <ListItem
                    key={i.id}
                    icon={CATEGORIAS_ITEM[cat].icone}
                    iconColor={CATEGORIAS_ITEM[cat].cor}
                    title={i.nome}
                    subtitle={subtitulo}
                    onPress={() => router.push({ pathname: '/estoque/[id]', params: { id: i.id } })}
                    right={
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Txt style={{ fontWeight: '700', color: baixo ? C.danger : C.text }}>
                          {fmtQtd(i.quantidade)} {i.unidade}
                        </Txt>
                        {baixo ? <Badge text="Baixo" cor={C.danger} /> : null}
                      </View>
                    }
                  />
                );
              })}
            </Section>
          );
        })
      )}
    </Screen>
  );
}
