import { Stack } from 'expo-router';
import { View } from 'react-native';

import { irParaRegistro, ManejoItem } from '@/components/manejo-item';
import { precisaFormulario } from '@/components/tarefa-item';
import { TratoCard } from '@/components/trato-card';
import { Badge, Button, Card, Icon, Row, Screen, Section, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { ordenarManejos, statusTarefa } from '@/lib/calc';
import { TIPOS_MANEJO } from '@/lib/constants';
import { diaSemana, fmtData, hoje } from '@/lib/dates';
import { useStore } from '@/lib/store';
import type { Tarefa, TipoManejo } from '@/lib/types';

const RAPIDOS: TipoManejo[] = ['ovos', 'agua', 'mortalidade', 'limpeza'];

export default function ModoCampo() {
  const tarefas = useStore((s) => s.tarefas);
  const manejos = useStore((s) => s.manejos);

  const pendentes = tarefas
    .filter((t) => t.ativa && statusTarefa(t) !== 'futura')
    .sort((a, b) => {
      const pa = statusTarefa(a) === 'atrasada' ? 0 : 1;
      const pb = statusTarefa(b) === 'atrasada' ? 0 : 1;
      return pa - pb || (a.horario ?? '99').localeCompare(b.horario ?? '99');
    });
  const feitosHoje = ordenarManejos(manejos.filter((m) => m.data === hoje()));

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Modo Campo' }} />

      <Card style={{ backgroundColor: C.primary, borderColor: C.primary, gap: S.xs }}>
        <Txt v="h2" style={{ color: '#fff' }}>
          {pendentes.length === 0 ? 'Tudo em dia! ✅' : `${pendentes.length} tarefa(s) para fazer`}
        </Txt>
        <Txt style={{ color: '#E8F5E9' }}>
          {diaSemana(hoje())}, {fmtData(hoje())} · toque no botão verde quando terminar cada tarefa
        </Txt>
      </Card>

      <TratoCard grande />

      {pendentes.length > 0 && (
        <Section title="Tarefas">
          {pendentes.map((t) => (
            <CampoTarefa key={t.id} tarefa={t} />
          ))}
        </Section>
      )}

      <Section title="Registrar">
        <Row wrap gap={S.sm}>
          {RAPIDOS.map((tipo) => (
            <Button
              key={tipo}
              title={TIPOS_MANEJO[tipo].label}
              icon={TIPOS_MANEJO[tipo].icone}
              variant="secondary"
              style={{ flexGrow: 1, flexBasis: 150, minHeight: 56 }}
              onPress={() => irParaRegistro({ tipo })}
            />
          ))}
        </Row>
      </Section>

      <Section title={`Feito hoje (${feitosHoje.length})`}>
        {feitosHoje.length === 0 ? (
          <Txt v="muted">Nada registrado hoje ainda.</Txt>
        ) : (
          feitosHoje.map((m) => <ManejoItem key={m.id} manejo={m} />)
        )}
      </Section>
    </Screen>
  );
}

function CampoTarefa({ tarefa }: { tarefa: Tarefa }) {
  const lote = useStore((s) => s.lotes.find((l) => l.id === tarefa.loteId));
  const galinheiro = useStore((s) => s.galinheiros.find((g) => g.id === tarefa.galinheiroId));
  const item = useStore((s) => s.itens.find((i) => i.id === tarefa.itemId));
  const concluir = useStore((s) => s.concluirTarefa);
  const cfg = TIPOS_MANEJO[tarefa.tipoManejo];
  const atrasada = statusTarefa(tarefa) === 'atrasada';

  function feito() {
    if (precisaFormulario(tarefa)) {
      irParaRegistro({ tipo: tarefa.tipoManejo, loteId: tarefa.loteId, galinheiroId: tarefa.galinheiroId, tarefaId: tarefa.id });
    } else {
      concluir(tarefa.id);
    }
  }

  return (
    <Card style={[{ gap: S.md }, atrasada && { borderColor: C.danger, borderWidth: 2 }]}>
      <Row gap={S.md}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: cfg.cor + '1A',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Icon name={cfg.icone} color={cfg.cor} size={26} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {atrasada ? <Badge text="Atrasada" cor={C.danger} /> : null}
          <Txt v="h3">{tarefa.titulo}</Txt>
          <Txt v="small">
            {[
              tarefa.horario,
              lote?.nome ?? galinheiro?.nome,
              item && tarefa.quantidadePadrao ? `${tarefa.quantidadePadrao} ${item.unidade} de ${item.nome}` : undefined,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Txt>
        </View>
      </Row>
      <Button
        title={precisaFormulario(tarefa) ? 'Registrar' : 'Feito'}
        icon={precisaFormulario(tarefa) ? 'pencil' : 'check'}
        style={{ minHeight: 56 }}
        onPress={feito}
      />
    </Card>
  );
}
