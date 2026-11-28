import { useState } from 'react';
import { View } from 'react-native';

import { Card, IconBox, Linha, Passos, Row, Screen, Section, Sheet, Txt } from '@/components/ui';
import { C, F, S } from '@/constants/theme';
import { ESPECIES, IMPREVISTOS, ORDEM_ESPECIES, type Imprevisto } from '@/lib/chocada';
import { fmtNum } from '@/lib/format';

export default function Incubacao() {
  const [sel, setSel] = useState<Imprevisto | null>(null);
  return (
    <Screen>
      <Txt v="muted">
        Referências para chocadeira de ar forçado. Siga também o manual da sua chocadeira: alguns modelos pedem valores um pouco diferentes.
      </Txt>
      <Section title="Cada espécie com seu tempo certo">
        {ORDEM_ESPECIES.filter((e) => e !== 'outra').map((id) => {
          const e = ESPECIES[id];
          return (
            <Card key={id} style={{ gap: S.md }}>
              <Row gap={S.md}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.areia, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 30 }}>{e.emoji}</Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt v="h3">{e.label}</Txt>
                  <Txt v="small">Ovoscopia nos dias {e.ovoscopias.join(' e ')} · fase final no dia {e.faseFinal}</Txt>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Txt style={{ fontFamily: F.black, fontSize: 30, color: C.primary }}>{e.dias}</Txt>
                  <Txt v="small">dias</Txt>
                </View>
              </Row>
              <Row gap={S.sm}>
                <Info titulo="Temperatura" valor={`${fmtNum(e.temp[0], 1)}–${fmtNum(e.temp[1], 1)} °C`} />
                <Info titulo="Umidade" valor={`${e.umid[0]}–${e.umid[1]}%`} />
                <Info titulo="Fase final" valor={`${e.umidFinal[0]}–${e.umidFinal[1]}%`} />
              </Row>
            </Card>
          );
        })}
      </Section>
      <Section title="Regras de ouro">
        <Card>
          <Passos
            itens={[
              'Ligue a chocadeira 24 horas antes e confira a temperatura com um termômetro confiável.',
              'Use ovos limpos, sem rachaduras, com até 7 dias de postura, guardados com a ponta fina para baixo.',
              'Vire os ovos pelo menos 3 vezes ao dia (número ímpar) até a fase final.',
              'Na fase final, pare de virar, aumente a umidade e não abra a chocadeira.',
              'Retire os ovos claros na ovoscopia: ovo podre pode estourar e contaminar os outros.',
            ]}
          />
        </Card>
      </Section>
      <Section title="Imprevistos">
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {IMPREVISTOS.map((i, k) => (
            <Linha key={i.id} primeira={k === 0} icon={i.icone} iconColor={C.warning} title={i.titulo} onPress={() => setSel(i)} />
          ))}
        </Card>
      </Section>
      <Sheet visible={!!sel} onClose={() => setSel(null)} title="O que fazer agora">
        {sel ? (
          <>
            <Row gap={S.md}>
              <IconBox name={sel.icone} cor={C.warning} bg={C.warningSoft} />
              <Txt v="h3" style={{ flex: 1 }}>
                {sel.titulo}
              </Txt>
            </Row>
            <Passos itens={sel.passos} />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}

function Info({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.field, borderRadius: 12, padding: S.sm, borderWidth: 1, borderColor: C.border }}>
      <Txt v="small" style={{ fontSize: 12 }}>
        {titulo}
      </Txt>
      <Txt style={{ fontFamily: F.bold, fontSize: 15 }}>{valor}</Txt>
    </View>
  );
}
