import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Field, Screen } from '@/components/ui';
import { S } from '@/constants/theme';
import { confirmar } from '@/lib/dialog';
import { numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import { View } from 'react-native';

export default function GalinheiroForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useStore((s) => s.galinheiros.find((g) => g.id === id));
  const salvar = useStore((s) => s.salvarGalinheiro);
  const excluir = useStore((s) => s.excluirGalinheiro);

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [capacidade, setCapacidade] = useState(numParaTexto(existente?.capacidade));
  const [obs, setObs] = useState(existente?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);

  const cap = parseNum(capacidade);
  const erroNome = !nome.trim() ? 'Informe um nome' : undefined;
  const erroCap = cap === null || cap <= 0 ? 'Informe a capacidade' : undefined;

  function onSalvar() {
    setTentou(true);
    if (erroNome || erroCap) return;
    salvar({ id: existente?.id, nome: nome.trim(), capacidade: cap!, observacoes: obs.trim() || undefined });
    voltar();
  }

  async function onExcluir() {
    if (!existente) return;
    const ok = await confirmar(
      'Excluir galinheiro?',
      'Os lotes, registros e tarefas deste galinheiro também serão excluídos.',
      'Excluir',
    );
    if (ok) {
      excluir(existente.id);
      router.dismissTo('/aves');
    }
  }

  return (
    <Screen
      footer={
        <View style={{ gap: S.sm }}>
          <Button title="Salvar" icon="check" onPress={onSalvar} />
          {existente ? <Button title="Excluir galinheiro" variant="danger" icon="trash-can-outline" onPress={onExcluir} /> : null}
        </View>
      }>
      <Stack.Screen options={{ title: existente ? 'Editar galinheiro' : 'Novo galinheiro' }} />
      <Field label="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Galinheiro 1" erro={tentou ? erroNome : undefined} />
      <Field
        label="Capacidade"
        value={capacidade}
        onChangeText={setCapacidade}
        keyboardType="number-pad"
        suffix="aves"
        hint="Quantas aves cabem com conforto. Referência: 5–7 galinhas/m² em piso."
        erro={tentou ? erroCap : undefined}
      />
      <Field label="Observações" value={obs} onChangeText={setObs} multiline placeholder="Tamanho, bebedouros, comedouros…" />
    </Screen>
  );
}
