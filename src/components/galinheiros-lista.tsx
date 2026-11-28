import { router } from 'expo-router';

import { View } from 'react-native';

import { Badge, Button, Card, Empty, Progress, Row, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { avesAtuais, avesPorGalinheiro } from '@/lib/calc';
import { TIPOS_AVE } from '@/lib/constants';
import { fmtNum } from '@/lib/format';
import { useStore } from '@/lib/store';

export function GalinheirosLista() {
  const galinheiros = useStore((s) => s.galinheiros);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const { editarCadastros } = usePermissoes();

  return (
    <View style={{ gap: S.md }}>
      {editarCadastros ? <Button title="Novo galinheiro" icon="plus" variant="secondary" onPress={() => router.push('/galinheiro/form')} /> : null}
      {galinheiros.length === 0 ? (
        <Empty icon="barn" title="Nenhum galinheiro ainda" text="Cadastre o primeiro para começar a organizar seus lotes." />
      ) : (
        galinheiros.map((g) => {
          const aves = avesPorGalinheiro(g.id, lotes, manejos);
          const ocup = g.capacidade > 0 ? aves / g.capacidade : 0;
          const doGalinheiro = lotes.filter((l) => l.galinheiroId === g.id && l.ativo);
          return (
            <Card
              key={g.id}
              style={{ gap: S.sm }}
              onPress={() => router.push({ pathname: '/galinheiro/[id]', params: { id: g.id } })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt v="h3" style={{ flex: 1 }} numberOfLines={1}>
                  {g.nome}
                </Txt>
                <Badge
                  text={`${fmtNum(ocup * 100)}% ocupado`}
                  cor={ocup > 1 ? C.danger : ocup > 0.9 ? C.warning : C.primary}
                />
              </Row>
              <Txt v="muted">
                {fmtNum(aves)} aves · capacidade {fmtNum(g.capacidade)}
              </Txt>
              <Progress valor={ocup} cor={ocup > 1 ? C.danger : ocup > 0.9 ? C.warning : C.primary} />
              {doGalinheiro.length > 0 ? (
                <Row wrap gap={S.xs}>
                  {doGalinheiro.map((l) => (
                    <Badge
                      key={l.id}
                      text={`${l.nome} · ${fmtNum(avesAtuais(l, manejos))} ${TIPOS_AVE[l.tipo].label.toLowerCase()}`}
                      cor={C.muted}
                      bg={C.bg}
                    />
                  ))}
                </Row>
              ) : (
                <Txt v="small">Sem lotes ativos</Txt>
              )}
            </Card>
          );
        })
      )}
    </View>
  );
}
