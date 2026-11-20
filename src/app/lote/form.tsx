import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chips, Field, Row, Screen, Txt } from '@/components/ui';
import { S } from '@/constants/theme';
import { TIPOS_AVE } from '@/lib/constants';
import { brParaYMD, fmtData, hoje } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { TipoAve } from '@/lib/types';

export default function LoteForm() {
  const params = useLocalSearchParams<{ id?: string; galinheiroId?: string }>();
  const existente = useStore((s) => s.lotes.find((l) => l.id === params.id));
  const galinheiros = useStore((s) => s.galinheiros);
  const todosItens = useStore((s) => s.itens);
  const racoes = todosItens.filter((i) => i.categoria === 'racao');
  const salvar = useStore((s) => s.salvarLote);
  const excluir = useStore((s) => s.excluirLote);

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [galinheiroId, setGalinheiroId] = useState(
    existente?.galinheiroId ?? params.galinheiroId ?? galinheiros[0]?.id,
  );
  const [tipo, setTipo] = useState<TipoAve>(existente?.tipo ?? 'poedeira');
  const [raca, setRaca] = useState(existente?.raca ?? '');
  const [qtd, setQtd] = useState(numParaTexto(existente?.quantidadeInicial));
  const [data, setData] = useState(fmtData(existente?.dataEntrada ?? hoje()));
  const [idade, setIdade] = useState(numParaTexto(existente?.idadeEntradaDias ?? 1));
  const [consumo, setConsumo] = useState(numParaTexto(existente?.consumoDiarioG ?? TIPOS_AVE.poedeira.consumoG));
  const [racaoId, setRacaoId] = useState(existente?.racaoId ?? (racoes.length === 1 ? racoes[0].id : undefined));
  const [tentou, setTentou] = useState(false);

  const nQtd = parseNum(qtd);
  const nIdade = parseNum(idade);
  const nConsumo = parseNum(consumo);
  const ymd = brParaYMD(data);
  const erros = {
    nome: !nome.trim() ? 'Informe um nome' : undefined,
    galinheiro: !galinheiroId ? 'Escolha o galinheiro' : undefined,
    qtd: nQtd === null || nQtd < 0 ? 'Informe a quantidade' : undefined,
    data: !ymd ? 'Use o formato dd/mm/aaaa' : undefined,
    idade: nIdade === null || nIdade < 0 ? 'Informe a idade' : undefined,
    consumo: nConsumo === null || nConsumo <= 0 ? 'Informe o consumo' : undefined,
  };
  const temErro = Object.values(erros).some(Boolean);

  function trocarTipo(t: TipoAve) {
    setTipo(t);
    setConsumo(numParaTexto(TIPOS_AVE[t].consumoG));
  }

  function onSalvar() {
    setTentou(true);
    if (temErro) return;
    salvar({
      id: existente?.id,
      nome: nome.trim(),
      galinheiroId: galinheiroId!,
      tipo,
      raca: raca.trim() || undefined,
      quantidadeInicial: Math.round(nQtd!),
      dataEntrada: ymd!,
      idadeEntradaDias: Math.round(nIdade!),
      consumoDiarioG: nConsumo!,
      racaoId: racoes.some((r) => r.id === racaoId) ? racaoId : undefined,
      ativo: existente?.ativo ?? true,
    });
    voltar();
  }

  async function onExcluir() {
    if (!existente) return;
    const ok = await confirmar('Excluir lote?', 'Todos os registros deste lote também serão apagados.', 'Excluir');
    if (ok) {
      excluir(existente.id);
      router.dismissTo({ pathname: '/galinheiro/[id]', params: { id: existente.galinheiroId } });
    }
  }

  function alternarAtivo() {
    if (!existente) return;
    salvar({ ...existente, ativo: !existente.ativo });
    voltar();
  }

  if (galinheiros.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Novo lote' }} />
        <Txt v="muted">Cadastre um galinheiro antes de criar lotes.</Txt>
        <Button title="Cadastrar galinheiro" onPress={() => router.replace('/galinheiro/form')} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={{ gap: S.sm }}>
          <Button title="Salvar" icon="check" onPress={onSalvar} />
          {existente ? (
            <Row gap={S.sm}>
              <Button
                title={existente.ativo ? 'Encerrar lote' : 'Reativar lote'}
                variant="secondary"
                small
                style={{ flex: 1 }}
                onPress={alternarAtivo}
              />
              <Button title="Excluir" variant="danger" small style={{ flex: 1 }} onPress={onExcluir} />
            </Row>
          ) : null}
        </View>
      }>
      <Stack.Screen options={{ title: existente ? 'Editar lote' : 'Novo lote' }} />
      <Field label="Nome do lote" value={nome} onChangeText={setNome} placeholder="Ex.: Poedeiras Lote A" erro={tentou ? erros.nome : undefined} />
      <Chips
        label="Galinheiro"
        options={galinheiros.map((g) => ({ value: g.id, label: g.nome, icon: 'barn' as const }))}
        value={galinheiroId}
        onChange={setGalinheiroId}
      />
      <Chips
        label="Tipo de ave"
        options={(Object.keys(TIPOS_AVE) as TipoAve[]).map((t) => ({ value: t, label: TIPOS_AVE[t].label }))}
        value={tipo}
        onChange={trocarTipo}
      />
      <Field label="Raça / linhagem (opcional)" value={raca} onChangeText={setRaca} placeholder="Ex.: Isa Brown, Embrapa 051, Cobb" />
      <Field
        label={existente ? 'Quantidade inicial' : 'Quantidade de aves'}
        value={qtd}
        onChangeText={setQtd}
        keyboardType="number-pad"
        suffix="aves"
        hint={
          existente
            ? 'Mortes, vendas, entradas e transferências são somadas pelos registros de manejo.'
            : 'Pode ser 0 se as aves vão chegar por transferência de outro lote.'
        }
        erro={tentou ? erros.qtd : undefined}
      />
      <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Data de entrada" value={data} onChangeText={setData} placeholder="dd/mm/aaaa" erro={tentou ? erros.data : undefined} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Idade na entrada" value={idade} onChangeText={setIdade} keyboardType="number-pad" suffix="dias" erro={tentou ? erros.idade : undefined} />
        </View>
      </Row>
      <Field
        label="Consumo de ração"
        value={consumo}
        onChangeText={setConsumo}
        keyboardType="decimal-pad"
        suffix="g/ave/dia"
        hint="Preenchido com uma média de referência para o tipo de ave. Ajuste conforme a idade e o fabricante da ração."
        erro={tentou ? erros.consumo : undefined}
      />
      {racoes.length > 0 ? (
        <Chips
          label="Ração que este lote come"
          options={racoes.map((r) => ({ value: r.id, label: r.nome, icon: 'sack' as const, cor: '#8D6E63' }))}
          value={racaoId}
          onChange={(v) => setRacaoId(v === racaoId ? undefined : v)}
        />
      ) : (
        <Txt v="small">Cadastre a ração na aba Estoque para vincular ao lote e calcular a duração e o trato do dia.</Txt>
      )}
    </Screen>
  );
}
