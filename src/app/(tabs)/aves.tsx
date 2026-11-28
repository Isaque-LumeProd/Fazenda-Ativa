import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ChocadaItem } from '@/components/chocada-card';
import { GalinheirosLista } from '@/components/galinheiros-lista';
import { Button, Cabecalho, Empty, Screen, Section, Segmented, StatRow } from '@/components/ui';
import { S } from '@/constants/theme';
import { avesAtuais } from '@/lib/calc';
import { contarOvos } from '@/lib/chocada';
import { fmtNum } from '@/lib/format';
import { useStore } from '@/lib/store';

type Aba = 'chocadas' | 'galinheiros';

export default function Aves() {
  const params = useLocalSearchParams<{ aba?: Aba }>();
  const [aba, setAba] = useState<Aba>(params.aba ?? 'chocadas');
  const chocadas = useStore((s) => s.chocadas);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);

  const ativas = chocadas.filter((c) => !c.encerrada).sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
  const encerradas = chocadas.filter((c) => c.encerrada).sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  const incubando = ativas.reduce((s, c) => s + c.ovos.filter((o) => o.status !== 'removido' && o.status !== 'infertil').length, 0);
  const nascidos = chocadas.reduce((s, c) => s + contarOvos(c).nascido, 0);
  const aves = lotes.filter((l) => l.ativo).reduce((s, l) => s + avesAtuais(l, manejos), 0);

  return (
    <Screen topo>
      <Cabecalho kicker="Avicultura" title="Suas aves" />
      <StatRow
        itens={[
          { valor: fmtNum(ativas.length), label: 'Chocadas' },
          { valor: fmtNum(incubando), label: 'Ovos' },
          { valor: fmtNum(nascidos), label: 'Nascidos' },
          { valor: fmtNum(aves), label: 'No plantel' },
        ]}
      />
      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { value: 'chocadas', label: 'Chocadas' },
          { value: 'galinheiros', label: 'Galinheiros' },
        ]}
      />

      {aba === 'chocadas' ? (
        <View style={{ gap: S.lg }}>
          <Button title="Nova chocada" icon="plus" variant="terra" onPress={() => router.push('/chocada/form')} />
          {ativas.length === 0 && encerradas.length === 0 ? (
            <Empty
              icon="egg-outline"
              title="Nenhuma chocada ainda"
              text="Cadastre os ovos que foram para a chocadeira e o app monta o calendário: viragem, ovoscopia, fase final e nascimento."
            />
          ) : null}
          {ativas.length > 0 ? (
            <Section title="Em andamento">
              {ativas.map((c) => (
                <ChocadaItem key={c.id} chocada={c} />
              ))}
            </Section>
          ) : null}
          {encerradas.length > 0 ? (
            <Section title="Encerradas">
              {encerradas.map((c) => (
                <ChocadaItem key={c.id} chocada={c} />
              ))}
            </Section>
          ) : null}
        </View>
      ) : (
        <GalinheirosLista />
      )}
    </Screen>
  );
}
