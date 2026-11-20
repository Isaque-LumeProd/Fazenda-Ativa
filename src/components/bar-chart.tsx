import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { fmtNum } from '@/lib/format';

import { Txt } from './ui';

export function BarChart({
  dados,
  cor = C.egg,
  altura = 120,
}: {
  dados: { rotulo: string; valor: number }[];
  cor?: string;
  altura?: number;
}) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, height: altura + 40 }}>
      {dados.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Txt v="small" style={{ fontSize: 11 }}>
            {d.valor ? fmtNum(d.valor) : ''}
          </Txt>
          <View
            style={{
              width: '70%',
              maxWidth: 40,
              height: Math.max(2, (d.valor / max) * altura),
              backgroundColor: i === dados.length - 1 ? cor : cor + '99',
              borderRadius: 6,
            }}
          />
          <Txt v="small" style={{ fontSize: 11 }}>
            {d.rotulo}
          </Txt>
        </View>
      ))}
    </View>
  );
}
