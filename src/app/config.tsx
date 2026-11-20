import { router, Stack } from 'expo-router';

import { Button, Card, Screen, Section, Txt } from '@/components/ui';
import { S } from '@/constants/theme';
import { confirmar } from '@/lib/dialog';
import { useStore } from '@/lib/store';

export default function Config() {
  const carregarExemplo = useStore((s) => s.carregarExemplo);
  const limparTudo = useStore((s) => s.limparTudo);
  const temDados = useStore((s) => s.galinheiros.length > 0 || s.itens.length > 0);

  async function exemplo() {
    if (temDados && !(await confirmar('Substituir dados?', 'Seus dados atuais serão trocados pelos dados de exemplo.', 'Substituir'))) {
      return;
    }
    carregarExemplo();
    router.dismissTo('/');
  }

  async function apagar() {
    if (await confirmar('Apagar tudo?', 'Todos os galinheiros, lotes, registros, estoque e tarefas serão apagados.', 'Apagar')) {
      limparTudo();
      router.dismissTo('/');
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Configurações' }} />
      <Section title="Dados">
        <Card style={{ gap: S.md }}>
          <Txt v="muted">
            Os dados ficam salvos neste aparelho e funcionam sem internet. A sincronização na nuvem entre iPhone e computador
            chega na próxima versão.
          </Txt>
          <Button title="Carregar dados de exemplo" variant="secondary" icon="database-import" onPress={exemplo} />
          <Button title="Apagar todos os dados" variant="danger" icon="trash-can-outline" onPress={apagar} />
        </Card>
      </Section>
      <Txt v="small" style={{ textAlign: 'center' }}>
        Fazenda Ativa · versão 0.1 (MVP avicultura)
      </Txt>
    </Screen>
  );
}
