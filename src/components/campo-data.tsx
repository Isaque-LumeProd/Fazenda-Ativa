import { View } from 'react-native';

import { S } from '@/constants/theme';
import { addDias, fmtData, hoje } from '@/lib/dates';

import { Chip, Field, Row, Txt } from './ui';

/** Data em texto dd/mm/aaaa com atalhos "Hoje" e "Ontem" */
export function CampoData({
  label,
  value,
  onChange,
  erro,
}: {
  label?: string;
  value: string;
  onChange: (t: string) => void;
  erro?: string;
}) {
  const h = fmtData(hoje());
  const o = fmtData(addDias(hoje(), -1));
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <Row gap={S.sm}>
        <Chip label="Hoje" ativo={value === h} escuro onPress={() => onChange(h)} />
        <Chip label="Ontem" ativo={value === o} escuro onPress={() => onChange(o)} />
        <View style={{ flex: 1 }}>
          <Field value={value} onChangeText={onChange} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" erro={erro} />
        </View>
      </Row>
    </View>
  );
}
