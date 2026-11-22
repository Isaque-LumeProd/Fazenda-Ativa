import { View } from 'react-native';

import { C, S } from '@/constants/theme';
import { planoTrato } from '@/lib/calc';
import { confirmar } from '@/lib/dialog';
import { fmtNum } from '@/lib/format';
import { useItens } from '@/lib/hooks';
import { useStore } from '@/lib/store';

import { Badge, Button, Card, Progress, Row, Txt } from './ui';

/** Planejamento e baixa do trato (ração) de hoje para todos os lotes */
export function TratoCard({ grande = false }: { grande?: boolean }) {
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const itens = useItens();
  const baixar = useStore((s) => s.baixarTrato);

  const plano = planoTrato(lotes, manejos, itens);
  if (plano.linhas.length === 0) return null;

  const comRacao = plano.linhas.filter((l) => l.item);
  // Diferenças menores que 100 g por lote contam como servido (arredondamento)
  const falta = (l: (typeof comRacao)[number]) => {
    const f = l.kgDia - l.servidoKg;
    return f < 0.1 ? 0 : f;
  };
  const faltaKg = comRacao.reduce((s, l) => s + falta(l), 0);
  const meioKg = comRacao.reduce((s, l) => s + Math.min(l.kgDia / 2, falta(l)), 0);
  const concluido = faltaKg === 0 && comRacao.length > 0;

  async function onBaixar(modo: 'meio' | 'restante') {
    const kg = modo === 'meio' ? meioKg : faltaKg;
    const ok = await confirmar(
      modo === 'meio' ? 'Baixar meio trato?' : 'Baixar trato do dia?',
      `Serão descontados ${fmtNum(kg, 1)} kg de ração do estoque, divididos entre ${comRacao.length} lote(s).`,
      'Baixar',
    );
    if (ok) baixar(modo);
  }

  return (
    <Card style={{ gap: S.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="h3">Trato de hoje</Txt>
        {concluido ? <Badge text="✓ Concluído" /> : <Badge text={`Falta ${fmtNum(faltaKg, 1)} kg`} cor={C.warning} />}
      </Row>
      <View style={{ gap: S.xs }}>
        <Txt v="small">
          Servido {fmtNum(plano.servidoKg, 1)} de {fmtNum(plano.totalKg, 1)} kg · manhã {fmtNum(plano.totalKg / 2, 1)} kg + tarde{' '}
          {fmtNum(plano.totalKg / 2, 1)} kg
        </Txt>
        <Progress valor={plano.totalKg > 0 ? plano.servidoKg / plano.totalKg : 0} />
      </View>
      <View style={{ gap: 4 }}>
        {plano.linhas.map((l) => (
          <Row key={l.lote.id} style={{ justifyContent: 'space-between' }}>
            <Txt v="small" style={{ flex: 1, color: C.text }} numberOfLines={1}>
              {l.lote.nome}
              <Txt v="small"> · {l.item?.nome ?? 'sem ração vinculada'}</Txt>
            </Txt>
            <Txt v="small" style={{ fontWeight: '600', color: l.servidoKg >= l.kgDia - 0.1 ? C.primary : C.text }}>
              {fmtNum(l.kgDia - l.servidoKg < 0.1 ? l.kgDia : l.servidoKg, 1)}/{fmtNum(l.kgDia, 1)} kg
            </Txt>
          </Row>
        ))}
      </View>
      {plano.semRacao.length > 0 && (
        <Txt v="small" style={{ color: C.warning }}>
          {plano.semRacao.length} lote(s) sem ração vinculada não entram na baixa automática. Edite o lote para escolher a ração.
        </Txt>
      )}
      {!concluido && comRacao.length > 0 && (
        <View style={{ gap: S.sm, flexDirection: grande ? 'column' : 'row', flexWrap: 'wrap' }}>
          {meioKg < faltaKg - 0.05 && (
            <Button
              title={`Meio trato (${fmtNum(meioKg, 1)} kg)`}
              icon="weather-sunny"
              variant="secondary"
              small={!grande}
              style={grande ? undefined : { flexGrow: 1 }}
              onPress={() => onBaixar('meio')}
            />
          )}
          <Button
            title={plano.servidoKg > 0 ? `Completar trato (${fmtNum(faltaKg, 1)} kg)` : `Trato completo (${fmtNum(faltaKg, 1)} kg)`}
            icon="check-all"
            small={!grande}
            style={grande ? undefined : { flexGrow: 1 }}
            onPress={() => onBaixar('restante')}
          />
        </View>
      )}
    </Card>
  );
}
