import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chips, Field, Row, Screen, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { botaOvo } from '@/lib/calc';
import { ORDEM_MANEJO, TIPOS_MANEJO } from '@/lib/constants';
import { brParaYMD, fmtData, hoje } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { fmtQtd, numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useItens } from '@/lib/hooks';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

const FREQUENCIAS = [
  { value: '1', label: 'Todo dia' },
  { value: '2', label: 'A cada 2 dias' },
  { value: '7', label: 'Semanal' },
  { value: '15', label: 'Quinzenal' },
  { value: '30', label: 'Mensal' },
  { value: 'outra', label: 'Outra' },
];

export default function TarefaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useStore((s) => s.tarefas.find((t) => t.id === id));
  const galinheiros = useStore((s) => s.galinheiros);
  const lotes = useStore((s) => s.lotes);
  const itens = useItens();
  const salvar = useStore((s) => s.salvarTarefa);
  const excluir = useStore((s) => s.excluirTarefa);
  const { apagar } = usePermissoes();

  const freqInicial = existente ? String(existente.frequenciaDias) : '1';
  const [tipo, setTipo] = useState<TipoManejo>(existente?.tipoManejo ?? 'agua');
  const [titulo, setTitulo] = useState(existente?.titulo ?? '');
  const [loteId, setLoteId] = useState(existente?.loteId);
  const [galinheiroId, setGalinheiroId] = useState(existente?.galinheiroId);
  const [freq, setFreq] = useState(FREQUENCIAS.some((f) => f.value === freqInicial) ? freqInicial : 'outra');
  const [freqOutra, setFreqOutra] = useState(freqInicial);
  const [horario, setHorario] = useState(existente?.horario ?? '');
  const [proxima, setProxima] = useState(fmtData(existente?.proximaData ?? hoje()));
  const [itemId, setItemId] = useState(existente?.itemId);
  const [qtdPadrao, setQtdPadrao] = useState(numParaTexto(existente?.quantidadePadrao));
  const [tentou, setTentou] = useState(false);

  const cfg = TIPOS_MANEJO[tipo];
  const itensTipo = cfg.item ? itens.filter((i) => i.categoria === cfg.item) : [];
  const item = itensTipo.find((i) => i.id === itemId);
  const lote = lotes.find((l) => l.id === loteId);
  const galinheiro = galinheiros.find((g) => g.id === galinheiroId);

  const nFreq = parseNum(freq === 'outra' ? freqOutra : freq);
  const ymd = brParaYMD(proxima);
  const horarioOk = !horario || /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);
  const tituloFinal = titulo.trim() || `${cfg.label}${lote ? ` – ${lote.nome}` : galinheiro ? ` – ${galinheiro.nome}` : ''}`;

  const erros = {
    alvo:
      cfg.alvo === 'lote' && !loteId
        ? 'Escolha o lote'
        : cfg.alvo === 'galinheiro' && !galinheiroId
          ? 'Escolha o galinheiro'
          : undefined,
    freq: nFreq === null || nFreq < 1 ? 'Informe de quantos em quantos dias' : undefined,
    data: !ymd ? 'Use o formato dd/mm/aaaa' : undefined,
    horario: !horarioOk ? 'Use o formato HH:MM' : undefined,
  };

  function onSalvar() {
    setTentou(true);
    if (Object.values(erros).some(Boolean)) return;
    salvar({
      id: existente?.id,
      titulo: tituloFinal,
      tipoManejo: tipo,
      loteId: cfg.alvo === 'lote' ? loteId : undefined,
      galinheiroId: cfg.alvo === 'lote' ? lote?.galinheiroId : galinheiroId,
      frequenciaDias: Math.round(nFreq!),
      horario: horario || undefined,
      proximaData: ymd!,
      itemId: item?.id,
      quantidadePadrao: item ? (parseNum(qtdPadrao) ?? undefined) : undefined,
      ativa: existente?.ativa ?? true,
    });
    voltar();
  }

  async function onExcluir() {
    if (!existente) return;
    if (await confirmar('Excluir tarefa?', 'Os registros já feitos continuam no histórico.', 'Excluir')) {
      excluir(existente.id);
      voltar();
    }
  }

  function alternar() {
    if (!existente) return;
    salvar({ ...existente, ativa: !existente.ativa });
    voltar();
  }

  return (
    <Screen
      footer={
        <View style={{ gap: S.sm }}>
          <Button title="Salvar tarefa" icon="check" onPress={onSalvar} />
          {existente ? (
            <Row gap={S.sm}>
              <Button title={existente.ativa ? 'Pausar' : 'Reativar'} variant="secondary" small style={{ flex: 1 }} onPress={alternar} />
              {apagar ? <Button title="Excluir" variant="danger" small style={{ flex: 1 }} onPress={onExcluir} /> : null}
            </Row>
          ) : null}
        </View>
      }>
      <Stack.Screen options={{ title: existente ? 'Editar tarefa' : 'Nova tarefa' }} />

      <Chips
        label="Tipo de manejo"
        options={ORDEM_MANEJO.map((t) => ({ value: t, label: TIPOS_MANEJO[t].label, icon: TIPOS_MANEJO[t].icone, cor: TIPOS_MANEJO[t].cor }))}
        value={tipo}
        onChange={(t) => {
          setTipo(t);
          setItemId(undefined);
        }}
      />

      <View style={{ gap: S.xs }}>
        {cfg.alvo === 'lote' ? (
          <Chips
            label="Lote"
            options={lotes.filter((l) => l.ativo && (tipo !== 'ovos' || botaOvo(l))).map((l) => ({ value: l.id, label: l.nome }))}
            value={loteId}
            onChange={setLoteId}
          />
        ) : (
          <Chips
            label="Galinheiro"
            options={galinheiros.map((g) => ({ value: g.id, label: g.nome, icon: 'barn' as const }))}
            value={galinheiroId}
            onChange={setGalinheiroId}
          />
        )}
        {tentou && erros.alvo ? <Txt v="small" style={{ color: C.danger }}>{erros.alvo}</Txt> : null}
      </View>

      <Field label="Título (opcional)" value={titulo} onChangeText={setTitulo} placeholder={tituloFinal} />

      <Chips label="Frequência" options={FREQUENCIAS} value={freq} onChange={setFreq} />
      {freq === 'outra' && (
        <Field label="Repetir a cada" value={freqOutra} onChangeText={setFreqOutra} keyboardType="number-pad" suffix="dias" erro={tentou ? erros.freq : undefined} />
      )}

      <Row gap={S.md} style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Field label="Próxima vez" value={proxima} onChangeText={setProxima} placeholder="dd/mm/aaaa" erro={tentou ? erros.data : undefined} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Horário (opcional)" value={horario} onChangeText={setHorario} placeholder="07:00" erro={tentou ? erros.horario : undefined} />
        </View>
      </Row>

      {cfg.item && itensTipo.length > 0 && (
        <>
          <Chips
            label="Produto do estoque (opcional)"
            options={itensTipo.map((i) => ({ value: i.id, label: `${i.nome} (${fmtQtd(i.quantidade)} ${i.unidade})` }))}
            value={itemId}
            onChange={(v) => setItemId(v === itemId ? undefined : v)}
          />
          {item && (
            <Field
              label="Quantidade a cada vez"
              value={qtdPadrao}
              onChangeText={setQtdPadrao}
              keyboardType="decimal-pad"
              suffix={item.unidade}
              hint="Com a quantidade preenchida, basta tocar em “Feito” e o estoque é baixado automaticamente."
            />
          )}
        </>
      )}
    </Screen>
  );
}
