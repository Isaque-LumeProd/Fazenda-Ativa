import { router } from 'expo-router';

import { TarefaItem } from '@/components/tarefa-item';
import { Button, Empty, Screen, Section } from '@/components/ui';
import { statusTarefa } from '@/lib/calc';
import { useStore } from '@/lib/store';
import type { Tarefa } from '@/lib/types';

function ordenar(a: Tarefa, b: Tarefa) {
  return a.proximaData === b.proximaData
    ? (a.horario ?? '99').localeCompare(b.horario ?? '99')
    : a.proximaData.localeCompare(b.proximaData);
}

export default function Tarefas() {
  const tarefas = useStore((s) => s.tarefas);
  const ativas = tarefas.filter((t) => t.ativa).sort(ordenar);
  const pausadas = tarefas.filter((t) => !t.ativa);

  const grupos = [
    { titulo: 'Atrasadas', lista: ativas.filter((t) => statusTarefa(t) === 'atrasada') },
    { titulo: 'Hoje', lista: ativas.filter((t) => statusTarefa(t) === 'hoje') },
    { titulo: 'Próximas', lista: ativas.filter((t) => statusTarefa(t) === 'futura') },
    { titulo: 'Pausadas', lista: pausadas },
  ];

  return (
    <Screen footer={<Button title="Nova tarefa" icon="plus" onPress={() => router.push('/tarefa/form')} />}>
      {tarefas.length === 0 ? (
        <Empty
          icon="calendar-check"
          title="Nenhuma tarefa"
          text="Crie rotinas como trocar a água todo dia ou dar vitamina a cada 7 dias."
        />
      ) : (
        grupos.map((g) =>
          g.lista.length === 0 ? null : (
            <Section key={g.titulo} title={`${g.titulo} (${g.lista.length})`}>
              {g.lista.map((t) => (
                <TarefaItem key={t.id} tarefa={t} />
              ))}
            </Section>
          ),
        )
      )}
    </Screen>
  );
}
