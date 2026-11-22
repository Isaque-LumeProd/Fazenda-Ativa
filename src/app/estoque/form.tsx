import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, Chips, Field, Screen } from '@/components/ui';
import { CATEGORIAS_ITEM, UNIDADES } from '@/lib/constants';
import { numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useItem } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import type { CategoriaItem, Unidade } from '@/lib/types';

const UNIDADE_PADRAO: Record<CategoriaItem, Unidade> = {
  racao: 'kg',
  vitamina: 'ml',
  vacina: 'doses',
  medicamento: 'ml',
  outros: 'un',
};

export default function ItemForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useItem(id);
  const bruto = useStore((s) => s.itens.find((i) => i.id === id));
  const salvar = useStore((s) => s.salvarItem);

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [categoria, setCategoria] = useState<CategoriaItem>(existente?.categoria ?? 'racao');
  const [unidade, setUnidade] = useState<Unidade>(existente?.unidade ?? 'kg');
  const [qtd, setQtd] = useState(numParaTexto(existente?.quantidade));
  const [minimo, setMinimo] = useState(numParaTexto(existente?.estoqueMinimo));
  const [custo, setCusto] = useState(numParaTexto(existente?.custoUnitario));
  const [saco, setSaco] = useState(numParaTexto(existente?.pesoSacoKg));
  const [tentou, setTentou] = useState(false);
  const usaSaco = categoria === 'racao' && unidade === 'kg';

  const nQtd = parseNum(qtd) ?? 0;
  const nMin = parseNum(minimo) ?? 0;
  const nCusto = parseNum(custo) ?? undefined;
  const erroNome = !nome.trim() ? 'Informe um nome' : undefined;

  function onSalvar() {
    setTentou(true);
    if (erroNome) return;
    salvar({
      id: existente?.id,
      nome: nome.trim(),
      categoria,
      unidade,
      quantidadeInicial: existente ? undefined : nQtd,
      estoqueMinimo: nMin,
      // Se o custo mudou na tela, ele passa a valer a partir de agora (até a próxima compra com valor)
      ...(nCusto !== existente?.custoUnitario
        ? { custoUnitario: nCusto, custoInformadoEm: new Date().toISOString() }
        : { custoUnitario: bruto?.custoUnitario, custoInformadoEm: bruto?.custoInformadoEm }),
      pesoSacoKg: usaSaco ? (parseNum(saco) ?? undefined) : undefined,
    });
    voltar();
  }

  return (
    <Screen footer={<Button title="Salvar" icon="check" onPress={onSalvar} />}>
      <Stack.Screen options={{ title: existente ? 'Editar item' : 'Novo item de estoque' }} />
      <Chips
        label="Categoria"
        options={(Object.keys(CATEGORIAS_ITEM) as CategoriaItem[]).map((c) => ({
          value: c,
          label: CATEGORIAS_ITEM[c].label,
          icon: CATEGORIAS_ITEM[c].icone,
          cor: CATEGORIAS_ITEM[c].cor,
        }))}
        value={categoria}
        onChange={(c) => {
          setCategoria(c);
          if (!existente) setUnidade(UNIDADE_PADRAO[c]);
        }}
      />
      <Field
        label="Nome"
        value={nome}
        onChangeText={setNome}
        placeholder={categoria === 'racao' ? 'Ex.: Ração postura' : 'Ex.: Vitamina AD3E'}
        erro={tentou ? erroNome : undefined}
      />
      <Chips label="Unidade" options={UNIDADES.map((u) => ({ value: u, label: u }))} value={unidade} onChange={setUnidade} />
      {usaSaco && (
        <Field
          label="Peso do saco (opcional)"
          value={saco}
          onChangeText={setSaco}
          keyboardType="decimal-pad"
          suffix="kg"
          hint="Ex.: 25 ou 40. Permite ver o estoque em sacos e registrar compras por saco."
        />
      )}
      {!existente && (
        <Field label="Quantidade atual" value={qtd} onChangeText={setQtd} keyboardType="decimal-pad" suffix={unidade} />
      )}
      <Field
        label="Estoque mínimo"
        value={minimo}
        onChangeText={setMinimo}
        keyboardType="decimal-pad"
        suffix={unidade}
        hint="Você recebe um alerta quando o estoque chegar nesse valor."
      />
      <Field
        label="Custo por unidade (opcional)"
        value={custo}
        onChangeText={setCusto}
        keyboardType="decimal-pad"
        suffix={`R$/${unidade}`}
      />
    </Screen>
  );
}
