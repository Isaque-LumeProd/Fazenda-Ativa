import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { textoSync } from '@/components/sync-status';
import { Badge, Banner, Button, Card, Icon, ListItem, Row, Screen, Section, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import {
  listarMembros,
  querConectar,
  removerMembro,
  sair,
  trocarCodigo,
  useConta,
  usePermissoes,
  type Membro,
} from '@/lib/conta';
import { avisar, confirmar } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { msgErro, nuvemConfigurada } from '@/lib/supabase';
import { sincronizar, useSyncStatus } from '@/lib/sync';

export default function Config() {
  const conectado = useConta((s) => s.modo === 'nuvem' && !!s.fazenda);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Configurações' }} />
      {conectado ? <SecaoFazenda /> : <SecaoSemConta />}
      <SecaoDados conectado={conectado} />
      <Txt v="small" style={{ textAlign: 'center' }}>
        Fazenda Ativa · versão 0.2
      </Txt>
    </Screen>
  );
}

// ------------------------------------------------------------------ conectado

function SecaoFazenda() {
  const fazenda = useConta((s) => s.fazenda)!;
  const email = useConta((s) => s.email);
  const userId = useConta((s) => s.userId);
  const { dono } = usePermissoes();
  const estado = useSyncStatus((s) => s.estado);
  const ultima = useSyncStatus((s) => s.ultima);
  const aviso = useSyncStatus((s) => s.aviso);
  const pendentes = useStore((s) => Object.keys(s.sync.pendentes).length);
  const [membros, setMembros] = useState<Membro[] | null>(null);
  const status = textoSync(estado, pendentes);

  const carregarMembros = useCallback(() => {
    listarMembros()
      .then(setMembros)
      .catch(() => setMembros(null));
  }, []);
  useEffect(carregarMembros, [carregarMembros]);

  async function novoCodigo() {
    if (!(await confirmar('Trocar código?', 'O código atual deixa de funcionar. Quem já entrou continua na fazenda.', 'Trocar'))) return;
    try {
      await trocarCodigo();
    } catch (e) {
      avisar('Não foi possível trocar', msgErro(e));
    }
  }

  async function remover(m: Membro) {
    if (!(await confirmar('Remover da fazenda?', `${m.nome || 'Esta pessoa'} não vai mais ver nem registrar dados desta fazenda.`, 'Remover'))) return;
    try {
      await removerMembro(m.userId);
      carregarMembros();
    } catch (e) {
      avisar('Não foi possível remover', msgErro(e));
    }
  }

  async function onSair() {
    const msg =
      pendentes > 0
        ? `Ainda há ${pendentes} alterações que não foram enviadas e serão perdidas. Conecte-se à internet antes de sair, se puder.`
        : 'Os dados continuam salvos na nuvem. Para ver de novo, é só entrar com seu e-mail.';
    if (await confirmar('Sair da conta?', msg, 'Sair')) await sair();
  }

  return (
    <>
      <Section title="Fazenda">
        <Card style={{ gap: S.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Txt v="h3">{fazenda.nome}</Txt>
              <Txt v="small">{email}</Txt>
            </View>
            <Badge text={fazenda.papel === 'dono' ? 'Dono' : 'Funcionário'} />
          </Row>
          <Row>
            <Icon name={status.icone} color={status.cor} size={20} />
            <Txt style={{ color: status.cor, flex: 1 }}>{status.texto}</Txt>
          </Row>
          {ultima ? (
            <Txt v="small">
              Última sincronização: {new Date(ultima).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </Txt>
          ) : null}
          {aviso ? <Banner icon="alert-outline" tipo="warning" text={aviso} onPress={() => useSyncStatus.setState({ aviso: null })} /> : null}
          <Button
            title="Sincronizar agora"
            icon="cloud-sync-outline"
            variant="secondary"
            small
            disabled={estado === 'sincronizando'}
            onPress={() => void sincronizar()}
          />
        </Card>
      </Section>

      {dono && fazenda.codigoConvite ? (
        <Section title="Convidar funcionários">
          <Card style={{ gap: S.md }}>
            <Txt v="muted">
              O funcionário instala o app, cria a conta e escolhe &quot;Tenho um convite&quot;. Depois digita este código:
            </Txt>
            <Txt v="h1" style={{ textAlign: 'center', letterSpacing: 6, color: C.primary }} >
              {fazenda.codigoConvite}
            </Txt>
            <Txt v="small">
              Funcionários registram manejos, trato, compras e tarefas. Só o dono cadastra, edita ou apaga galinheiros, lotes e
              itens de estoque.
            </Txt>
            <Button title="Trocar código" variant="ghost" small icon="refresh" onPress={novoCodigo} />
          </Card>
        </Section>
      ) : null}

      <Section title="Equipe">
        <Card style={{ gap: 0, paddingVertical: S.xs }}>
          {membros === null ? (
            <Txt v="muted" style={{ padding: S.sm }}>
              Conecte-se à internet para ver a equipe.
            </Txt>
          ) : (
            membros.map((m) => (
              <ListItem
                key={m.userId}
                icon={m.papel === 'dono' ? 'account-tie' : 'account'}
                title={`${m.nome || 'Sem nome'}${m.userId === userId ? ' (você)' : ''}`}
                subtitle={m.papel === 'dono' ? 'Dono' : 'Funcionário'}
                right={
                  dono && m.papel !== 'dono' ? (
                    <Button title="Remover" variant="ghost" small onPress={() => void remover(m)} />
                  ) : undefined
                }
              />
            ))
          )}
        </Card>
      </Section>

      <Button title="Sair da conta" variant="danger" icon="logout" onPress={() => void onSair()} />
    </>
  );
}

// ------------------------------------------------------------------ sem conta

function SecaoSemConta() {
  if (!nuvemConfigurada) {
    return (
      <Section title="Nuvem">
        <Card>
          <Txt v="muted">
            Os dados ficam salvos neste aparelho e funcionam sem internet. A sincronização na nuvem ainda não foi configurada
            nesta instalação do app.
          </Txt>
        </Card>
      </Section>
    );
  }
  return (
    <Section title="Nuvem">
      <Card style={{ gap: S.md }}>
        <Txt v="muted">
          Você está usando o app sem conta: os dados ficam só neste aparelho. Crie uma conta para guardar tudo na nuvem e
          compartilhar com seus funcionários. Os dados que você já cadastrou podem ser enviados.
        </Txt>
        <Button title="Criar conta ou entrar" icon="cloud-upload-outline" onPress={querConectar} />
      </Card>
    </Section>
  );
}

// ------------------------------------------------------------------ dados

function SecaoDados({ conectado }: { conectado: boolean }) {
  const carregarExemplo = useStore((s) => s.carregarExemplo);
  const limparTudo = useStore((s) => s.limparTudo);
  const temDados = useStore((s) => s.galinheiros.length > 0 || s.itens.length > 0);

  // Na nuvem, carregar exemplo ou apagar tudo afetaria todos da fazenda: só disponível sem conta.
  if (conectado) return null;

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
    <Section title="Dados deste aparelho">
      <Card style={{ gap: S.md }}>
        <Button title="Carregar dados de exemplo" variant="secondary" icon="database-import" onPress={exemplo} />
        <Button title="Apagar todos os dados" variant="danger" icon="trash-can-outline" onPress={apagar} />
      </Card>
    </Section>
  );
}
