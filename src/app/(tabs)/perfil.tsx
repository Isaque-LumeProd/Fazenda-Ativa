import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Switch, View } from 'react-native';

import { Button, Cabecalho, Field, Grupo, Icon, Linha, Row, Screen, Sheet, StatRow, Txt } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { avesAtuais } from '@/lib/calc';
import { contarOvos } from '@/lib/chocada';
import { useConta } from '@/lib/conta';
import { avisar } from '@/lib/dialog';
import { fmtNum, fmtPct } from '@/lib/format';
import { ativos } from '@/lib/gado';
import { desligarLembretes, lembretesDisponiveis, pedirPermissao } from '@/lib/lembretes';
import { usePrefs, type Lembretes } from '@/lib/prefs';
import { sequenciaDeCuidado } from '@/lib/sequencia';
import { useStore } from '@/lib/store';

const ITENS_LEMBRETE: { chave: keyof Lembretes; titulo: string; sub: string }[] = [
  { chave: 'viragem', titulo: 'Virar ovos', sub: 'Nos horários de cada chocada manual' },
  { chave: 'umidade', titulo: 'Registrar umidade', sub: 'Às 9h, enquanto a chocada estiver ativa' },
  { chave: 'ovoscopia', titulo: 'Ovoscopia', sub: 'Nos dias certos de cada espécie' },
  { chave: 'faseFinal', titulo: 'Fase final', sub: 'No dia de parar a viragem' },
  { chave: 'nascimento', titulo: 'Nascimento', sub: '2 dias antes e no dia' },
  { chave: 'tarefas', titulo: 'Tarefas da rotina', sub: 'No horário de cada tarefa' },
  { chave: 'gado', titulo: 'Gado', sub: 'Reforço de vacinas, diagnóstico e partos' },
];

export default function Perfil() {
  const chocadas = useStore((s) => s.chocadas);
  const manejos = useStore((s) => s.manejos);
  const eventosChocada = useStore((s) => s.eventosChocada);
  const eventosGado = useStore((s) => s.eventosGado);
  const animais = useStore((s) => s.animais);
  const lotes = useStore((s) => s.lotes);
  const tarefas = useStore((s) => s.tarefas);
  const fazenda = useConta((s) => s.fazenda);
  const nome = usePrefs((s) => s.nome);
  const lembretesAtivos = usePrefs((s) => s.lembretesAtivos);
  const lembretes = usePrefs((s) => s.lembretes);
  const definir = usePrefs((s) => s.definir);
  const [painel, setPainel] = useState<null | 'nome' | 'lembretes'>(null);
  const [nomeTxt, setNomeTxt] = useState(nome);
  const [rascunho, setRascunho] = useState<Lembretes>(lembretes);

  const ovos = chocadas.reduce((s, c) => s + c.ovos.length, 0);
  const n = chocadas.reduce(
    (acc, c) => {
      const k = contarOvos(c);
      return { nascidos: acc.nascidos + k.nascido, ferteis: acc.ferteis + k.fertil + k.nascido + k.morto + k.duvidoso };
    },
    { nascidos: 0, ferteis: 0 },
  );
  const seq = sequenciaDeCuidado({ manejos, eventosChocada, eventosGado });
  const aves = lotes.filter((l) => l.ativo).reduce((s, l) => s + avesAtuais(l, manejos), 0);

  async function ativar() {
    if (!lembretesDisponiveis) {
      avisar('Lembretes', 'Os lembretes funcionam no app do celular (iPhone ou Android). No navegador eles não tocam.');
      definir({ lembretes: rascunho });
      setPainel(null);
      return;
    }
    const ok = await pedirPermissao();
    if (!ok) {
      avisar('Permissão negada', 'Para receber os lembretes, permita as notificações do Fazenda Ativa nos Ajustes do celular.');
      return;
    }
    definir({ lembretes: rascunho, lembretesAtivos: true });
    setPainel(null);
  }

  return (
    <Screen topo>
      <Cabecalho
        kicker="Seu perfil"
        title={nome ? nome.split(' ')[0] : 'Seu perfil'}
        subtitle={fazenda?.nome}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.terraSoft, borderRadius: R.pill, paddingHorizontal: S.md, paddingVertical: S.sm, borderWidth: 1, borderColor: '#EFD2C6' }}>
            <Icon name="fire" size={18} color={C.terra} />
            <Txt style={{ fontFamily: F.bold }}>
              {seq} {seq === 1 ? 'dia' : 'dias'}
            </Txt>
          </View>
        }
      />

      <StatRow
        itens={[
          { valor: fmtNum(chocadas.length), label: 'Chocadas' },
          { valor: fmtNum(ovos), label: 'Ovos' },
          { valor: fmtNum(n.nascidos), label: 'Nascidos' },
          { valor: n.ferteis > 0 && n.nascidos > 0 ? fmtPct(n.nascidos / n.ferteis) : '—', label: 'Eclosão' },
        ]}
      />
      <StatRow
        itens={[
          { valor: fmtNum(aves), label: 'Aves' },
          { valor: fmtNum(ativos(animais, eventosGado).length), label: 'Cabeças' },
          { valor: fmtNum(tarefas.filter((t) => t.ativa).length), label: 'Tarefas' },
        ]}
      />

      <View style={{ gap: S.md }}>
        <Txt v="h2">Sua fazenda</Txt>
        <Grupo>
          <Linha primeira icon="clipboard-text-outline" title="Registros das aves" subtitle="Ovos, ração, água, vacinas, mortalidade" onPress={() => router.push('/registros')} />
          <Linha icon="package-variant" title="Estoque" subtitle="Ração, vacinas, medicamentos" onPress={() => router.push('/estoque')} />
          <Linha icon="calendar-check" title="Tarefas da rotina" subtitle="Água, ração, limpeza, vitaminas" onPress={() => router.push('/tarefas')} />
          <Linha icon="account-hard-hat" title="Modo Campo" subtitle="Tela simples para o funcionário" onPress={() => router.push('/campo')} />
        </Grupo>
      </View>

      <View style={{ gap: S.md }}>
        <Txt v="h2">Guia do criador</Txt>
        <Grupo>
          <Linha primeira icon="egg-outline" iconColor={C.ouro} title="Incubação por espécie" subtitle="Dias, temperatura, umidade e ovoscopia" onPress={() => router.push('/guia/incubacao')} />
          <Linha icon="book-open-variant" iconColor={C.ouro} title="Raças" subtitle="Aves e bovinos: origem, peso, produção" onPress={() => router.push('/guia/racas')} />
          <Linha icon="baby-face-outline" iconColor={C.ouro} title="Cuidados com os filhotes" subtitle="Pintinhos e bezerros recém-nascidos" onPress={() => router.push('/guia/pintinhos')} />
        </Grupo>
      </View>

      <View style={{ gap: S.md }}>
        <Txt v="h2">Preferências</Txt>
        <Grupo>
          <Linha
            primeira
            icon="account-outline"
            title="Seu nome"
            subtitle={nome || 'Não informado'}
            onPress={() => {
              setNomeTxt(nome);
              setPainel('nome');
            }}
          />
          <Linha
            icon="bell-outline"
            title="Lembretes"
            subtitle={lembretesAtivos ? 'Ativados' : Platform.OS === 'web' ? 'Só no celular' : 'Desativados'}
            onPress={() => {
              setRascunho(lembretes);
              setPainel('lembretes');
            }}
          />
          <Linha icon="cog-outline" title="Conta e configurações" subtitle="Nuvem, equipe, dados de exemplo" onPress={() => router.push('/config')} />
        </Grupo>
      </View>

      <Sheet
        visible={painel === 'nome'}
        onClose={() => setPainel(null)}
        title="Seu nome"
        footer={
          <Button
            title="Salvar"
            icon="check"
            onPress={() => {
              definir({ nome: nomeTxt.trim() });
              setPainel(null);
            }}
          />
        }>
        <Field value={nomeTxt} onChangeText={setNomeTxt} placeholder="Como quer ser chamado" autoCapitalize="words" hint="Aparece na saudação da tela Hoje." />
      </Sheet>

      <Sheet
        visible={painel === 'lembretes'}
        onClose={() => setPainel(null)}
        title="Lembretes"
        footer={
          <>
            <Button title={lembretesAtivos ? 'Salvar lembretes' : 'Ativar lembretes'} icon="check" onPress={ativar} />
            {lembretesAtivos ? (
              <Button
                title="Desligar todos"
                variant="ghost"
                onPress={() => {
                  definir({ lembretesAtivos: false });
                  void desligarLembretes();
                  setPainel(null);
                }}
              />
            ) : null}
          </>
        }>
        {ITENS_LEMBRETE.map((it, i) => (
          <Row key={it.chave} gap={S.md} style={[{ paddingVertical: S.sm }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: S.md }]}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontFamily: F.semibold, fontSize: 17 }}>{it.titulo}</Txt>
              <Txt v="small">{it.sub}</Txt>
            </View>
            <Switch
              value={rascunho[it.chave]}
              onValueChange={(v) => setRascunho({ ...rascunho, [it.chave]: v })}
              trackColor={{ true: '#9FD3C7', false: '#E6E2D6' }}
              thumbColor={rascunho[it.chave] ? C.teal : '#fff'}
            />
          </Row>
        ))}
      </Sheet>
    </Screen>
  );
}
