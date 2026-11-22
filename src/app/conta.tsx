import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { Banner, Button, Card, Chips, Field, Icon, Row, Screen, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import {
  buscarMinhaFazenda,
  cadastrar,
  conectar,
  criarFazenda,
  entrar,
  entrarComCodigo,
  sair,
  usarSemConta,
  useConta,
  type Fazenda,
} from '@/lib/conta';
import { avisar, confirmar } from '@/lib/dialog';
import { msgErro } from '@/lib/supabase';
import { temDadosLocais } from '@/lib/sync';

export default function Conta() {
  const userId = useConta((s) => s.userId);
  return (
    <Screen>
      <Stack.Screen options={{ title: userId ? 'Sua fazenda' : 'Entrar', headerBackVisible: false }} />
      <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.lg }}>
        <View style={{ backgroundColor: C.primarySoft, borderRadius: 999, padding: S.lg }}>
          <Icon name="barn" size={40} color={C.primary} />
        </View>
        <Txt v="h1">Fazenda Ativa</Txt>
      </View>
      {userId ? <PassoFazenda /> : <PassoLogin />}
    </Screen>
  );
}

// ------------------------------------------------------------------ login / cadastro

function PassoLogin() {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    setInfo(null);
    if (!email.trim() || !senha) return setErro('Preencha e-mail e senha.');
    if (modo === 'criar' && !nome.trim()) return setErro('Informe seu nome.');
    if (modo === 'criar' && senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    try {
      if (modo === 'entrar') await entrar(email, senha);
      else if (await cadastrar(nome, email, senha)) {
        setInfo('Conta criada! Abra o link que enviamos para o seu e-mail e depois toque em "Entrar".');
        setModo('entrar');
      }
    } catch (e) {
      setErro(msgErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function semConta() {
    const ok = await confirmar(
      'Usar sem conta?',
      'Os dados ficam só neste aparelho e não são compartilhados com funcionários. Você pode criar a conta depois em Configurações.',
      'Usar sem conta',
    );
    if (ok) usarSemConta();
  }

  return (
    <View style={{ gap: S.lg }}>
      <Chips
        options={[
          { value: 'entrar', label: 'Já tenho conta' },
          { value: 'criar', label: 'Criar conta' },
        ]}
        value={modo}
        onChange={(m) => {
          setModo(m);
          setErro(null);
        }}
      />
      {info ? <Banner icon="email-check-outline" tipo="info" text={info} /> : null}
      {modo === 'criar' && <Field label="Seu nome" value={nome} onChangeText={setNome} placeholder="Ex.: João" autoComplete="name" />}
      <Field
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="voce@email.com"
      />
      <Field
        label="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
        hint={modo === 'criar' ? 'Mínimo de 6 caracteres.' : undefined}
      />
      {erro ? <Banner icon="alert-circle-outline" tipo="danger" text={erro} /> : null}
      <Button
        title={enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        icon={modo === 'entrar' ? 'login' : 'account-plus'}
        onPress={enviar}
        disabled={enviando}
      />
      <Card style={{ gap: S.sm }}>
        <Txt v="muted">
          Com a conta, os dados ficam guardados na nuvem e aparecem no celular e no computador de todos da fazenda. O app
          continua funcionando sem internet e envia tudo quando a conexão voltar.
        </Txt>
        <Button title="Usar sem conta (só neste aparelho)" variant="secondary" small onPress={semConta} />
      </Card>
    </View>
  );
}

// ------------------------------------------------------------------ criar ou entrar na fazenda

/** Dono pode levar os dados que já estão no aparelho; funcionário recebe só os da fazenda. */
async function perguntarSeEnvia(f: Fazenda): Promise<boolean> {
  if (!temDadosLocais()) return false;
  if (f.papel !== 'dono') {
    avisar('Dados deste aparelho', `Os dados que estavam só neste aparelho serão trocados pelos da fazenda "${f.nome}".`);
    return false;
  }
  return confirmar(
    'Enviar dados deste aparelho?',
    `Este aparelho tem dados que ainda não estão na fazenda "${f.nome}". Enviar para a nuvem? (Se cancelar, eles serão apagados deste aparelho.)`,
    'Enviar',
  );
}


function PassoFazenda() {
  const email = useConta((s) => s.email);
  const [procurando, setProcurando] = useState(true);
  const [modo, setModo] = useState<'criar' | 'codigo'>('criar');
  const [nomeFazenda, setNomeFazenda] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviarLocais, setEnviarLocais] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dadosLocais = temDadosLocais();

  // Já participa de uma fazenda (ex.: entrou em outro aparelho)? Conecta direto.
  useEffect(() => {
    let ativo = true;
    buscarMinhaFazenda()
      .then(async (f) => {
        if (!ativo || !f) return;
        conectar(f, await perguntarSeEnvia(f));
      })
      .catch((e) => ativo && setErro(msgErro(e)))
      .finally(() => ativo && setProcurando(false));
    return () => {
      ativo = false;
    };
  }, []);

  async function onCriar() {
    setErro(null);
    if (!nomeFazenda.trim()) return setErro('Dê um nome para a fazenda.');
    setEnviando(true);
    try {
      const f = await criarFazenda(nomeFazenda);
      conectar(f, enviarLocais);
    } catch (e) {
      setErro(msgErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function onEntrar() {
    setErro(null);
    if (codigo.trim().length < 4) return setErro('Digite o código de convite que o dono da fazenda passou.');
    if (dadosLocais && !(await confirmar('Trocar dados?', 'Os dados que estão só neste aparelho serão trocados pelos da fazenda.', 'Continuar'))) {
      return;
    }
    setEnviando(true);
    try {
      conectar(await entrarComCodigo(codigo), false);
    } catch (e) {
      setErro(msgErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (procurando) {
    return (
      <View style={{ alignItems: 'center', gap: S.md, padding: S.xl }}>
        <ActivityIndicator color={C.primary} />
        <Txt v="muted">Procurando sua fazenda…</Txt>
      </View>
    );
  }

  return (
    <View style={{ gap: S.lg }}>
      <Txt v="muted" style={{ textAlign: 'center' }}>
        Conectado como {email}
      </Txt>
      <Chips
        options={[
          { value: 'criar', label: 'Sou o dono', icon: 'barn' },
          { value: 'codigo', label: 'Tenho um convite', icon: 'ticket-confirmation-outline' },
        ]}
        value={modo}
        onChange={(m) => {
          setModo(m);
          setErro(null);
        }}
      />
      {modo === 'criar' ? (
        <>
          <Field label="Nome da fazenda" value={nomeFazenda} onChangeText={setNomeFazenda} placeholder="Ex.: Sítio Boa Vista" />
          {dadosLocais && (
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: S.md }}>
                  <Txt>Enviar os dados deste aparelho</Txt>
                  <Txt v="small">Galinheiros, lotes, registros, estoque e tarefas que você já cadastrou.</Txt>
                </View>
                <Switch value={enviarLocais} onValueChange={setEnviarLocais} trackColor={{ true: C.primary }} />
              </Row>
            </Card>
          )}
          {erro ? <Banner icon="alert-circle-outline" tipo="danger" text={erro} /> : null}
          <Button title={enviando ? 'Criando…' : 'Criar fazenda'} icon="check" onPress={onCriar} disabled={enviando} />
          <Txt v="small" style={{ textAlign: 'center' }}>
            Depois você recebe um código para convidar seus funcionários.
          </Txt>
        </>
      ) : (
        <>
          <Field
            label="Código de convite"
            value={codigo}
            onChangeText={(t) => setCodigo(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="Ex.: K7M2QX"
            hint="Peça ao dono da fazenda. Ele encontra o código em Configurações."
          />
          {erro ? <Banner icon="alert-circle-outline" tipo="danger" text={erro} /> : null}
          <Button title={enviando ? 'Entrando…' : 'Entrar na fazenda'} icon="login" onPress={onEntrar} disabled={enviando} />
        </>
      )}
      <Button title="Sair da conta" variant="ghost" small onPress={() => void sair()} />
    </View>
  );
}
