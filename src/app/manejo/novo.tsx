import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chips, Field, Row, Screen, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { avesAtuais, botaOvo, consumoDiarioKg } from '@/lib/calc';
import { ORDEM_MANEJO, TIPOS_MANEJO } from '@/lib/constants';
import { addDias, brParaYMD, fmtData, hoje } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { fmtNum, fmtQtd, numParaTexto, parseNum } from '@/lib/format';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { TipoManejo } from '@/lib/types';

const PEDEM_QTD: TipoManejo[] = ['ovos', 'mortalidade', 'venda', 'entrada', 'transferencia'];

export default function NovoManejo() {
  const params = useLocalSearchParams<{ tipo?: TipoManejo; loteId?: string; galinheiroId?: string; tarefaId?: string }>();
  const galinheiros = useStore((s) => s.galinheiros);
  const lotes = useStore((s) => s.lotes);
  const manejos = useStore((s) => s.manejos);
  const itens = useStore((s) => s.itens);
  const tarefa = useStore((s) => s.tarefas.find((t) => t.id === params.tarefaId));
  const registrar = useStore((s) => s.registrarManejo);
  const marcarFeita = useStore((s) => s.marcarTarefaFeita);

  const [tipo, setTipo] = useState<TipoManejo>(params.tipo ?? 'ovos');
  const [loteId, setLoteId] = useState(params.loteId);
  const [galinheiroId, setGalinheiroId] = useState(
    params.galinheiroId ?? lotes.find((l) => l.id === params.loteId)?.galinheiroId,
  );
  const [data, setData] = useState(fmtData(hoje()));
  const [itemId, setItemId] = useState(
    tarefa?.itemId ?? (params.tipo === 'racao' ? lotes.find((l) => l.id === params.loteId)?.racaoId : undefined),
  );
  const [loteDestinoId, setLoteDestinoId] = useState<string>();
  const [qtd, setQtd] = useState(numParaTexto(tarefa?.quantidadePadrao));
  const [quebrados, setQuebrados] = useState('');
  const [valor, setValor] = useState('');
  const [peso, setPeso] = useState('');
  const [obs, setObs] = useState('');
  const [tentou, setTentou] = useState(false);

  const cfg = TIPOS_MANEJO[tipo];
  const lotesAtivos = lotes.filter((l) => (l.ativo && (tipo !== 'ovos' || botaOvo(l))) || l.id === loteId);
  const lote = lotes.find((l) => l.id === loteId);
  const itensTipo = cfg.item ? itens.filter((i) => i.categoria === cfg.item) : [];
  const item = itensTipo.find((i) => i.id === itemId);
  const aves = lote ? avesAtuais(lote, manejos) : 0;

  const ymd = brParaYMD(data);
  const nQtd = parseNum(qtd);
  const nPeso = parseNum(peso);
  const pedeQtd = PEDEM_QTD.includes(tipo) || !!item;

  const erros = {
    alvo:
      cfg.alvo === 'lote' && !loteId
        ? 'Escolha o lote'
        : cfg.alvo === 'galinheiro' && !galinheiroId
          ? 'Escolha o galinheiro'
          : undefined,
    data: !ymd ? 'Use o formato dd/mm/aaaa' : ymd > hoje() ? 'A data não pode ser futura' : undefined,
    qtd: pedeQtd && (nQtd === null || nQtd <= 0)
      ? 'Informe a quantidade'
      : (tipo === 'mortalidade' || tipo === 'venda' || tipo === 'transferencia') && lote && nQtd !== null && nQtd > aves
        ? `O lote tem só ${fmtNum(aves)} aves`
        : undefined,
    destino: tipo === 'transferencia' && !loteDestinoId ? 'Escolha o lote que recebe as aves' : undefined,
    peso: tipo === 'pesagem' && (nPeso === null || nPeso <= 0) ? 'Informe o peso médio' : undefined,
  };
  const temErro = Object.values(erros).some(Boolean);

  function trocarTipo(t: TipoManejo) {
    setTipo(t);
    setItemId(t === 'racao' ? lote?.racaoId : undefined);
    setQtd('');
    setLoteDestinoId(undefined);
  }

  function escolherLote(id: string) {
    const l = lotes.find((x) => x.id === id);
    setLoteId(id);
    setGalinheiroId(l?.galinheiroId);
    if (tipo === 'racao' && l?.racaoId) setItemId(l.racaoId);
    if (loteDestinoId === id) setLoteDestinoId(undefined);
  }

  async function onSalvar() {
    setTentou(true);
    if (temErro) return;
    if (item && nQtd! > item.quantidade) {
      const ok = await confirmar(
        'Estoque insuficiente',
        `Há apenas ${fmtQtd(item.quantidade)} ${item.unidade} de ${item.nome}. Registrar mesmo assim?`,
        'Registrar',
      );
      if (!ok) return;
    }
    registrar({
      tipo,
      data: ymd!,
      loteId: cfg.alvo === 'lote' ? loteId : undefined,
      galinheiroId,
      itemId: item?.id,
      quantidade: pedeQtd ? (nQtd ?? undefined) : undefined,
      quebrados: tipo === 'ovos' ? (parseNum(quebrados) ?? undefined) : undefined,
      valor: tipo === 'venda' ? (parseNum(valor) ?? undefined) : undefined,
      pesoMedioG: tipo === 'pesagem' ? nPeso! : undefined,
      loteDestinoId: tipo === 'transferencia' ? loteDestinoId : undefined,
      observacao: obs.trim() || undefined,
    });
    if (tarefa) marcarFeita(tarefa.id);
    voltar();
  }

  if (galinheiros.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Registrar manejo' }} />
        <Txt v="muted">Cadastre um galinheiro e um lote antes de registrar o manejo.</Txt>
        <Button title="Cadastrar galinheiro" onPress={() => router.replace('/galinheiro/form')} />
      </Screen>
    );
  }

  const sugestaoRacao = tipo === 'racao' && lote ? consumoDiarioKg(lote, aves) : 0;

  return (
    <Screen footer={<Button title="Salvar registro" icon="check" onPress={onSalvar} />}>
      <Stack.Screen options={{ title: tarefa ? tarefa.titulo : 'Registrar manejo' }} />

      {!params.tipo && (
        <Chips
          label="O que foi feito?"
          options={ORDEM_MANEJO.map((t) => ({ value: t, label: TIPOS_MANEJO[t].label, icon: TIPOS_MANEJO[t].icone, cor: TIPOS_MANEJO[t].cor }))}
          value={tipo}
          onChange={trocarTipo}
        />
      )}
      {params.tipo && (
        <Txt v="h2" style={{ color: cfg.cor }}>
          {cfg.label}
        </Txt>
      )}

      {cfg.alvo === 'lote' ? (
        <View style={{ gap: S.xs }}>
          <Chips
            label={tipo === 'transferencia' ? 'De qual lote saem as aves?' : 'Lote'}
            options={lotesAtivos.map((l) => ({
              value: l.id,
              label: `${l.nome} · ${galinheiros.find((g) => g.id === l.galinheiroId)?.nome ?? ''}`,
            }))}
            value={loteId}
            onChange={escolherLote}
          />
          {lotesAtivos.length === 0 && <Txt v="small">Nenhum lote ativo. Cadastre um na aba Galinheiros.</Txt>}
          {tentou && erros.alvo ? <Txt v="small" style={{ color: C.danger }}>{erros.alvo}</Txt> : null}
          {lote ? <Txt v="small">{fmtNum(aves)} aves no lote</Txt> : null}
        </View>
      ) : (
        <View style={{ gap: S.xs }}>
          <Chips
            label="Galinheiro"
            options={galinheiros.map((g) => ({ value: g.id, label: g.nome, icon: 'barn' as const }))}
            value={galinheiroId}
            onChange={setGalinheiroId}
          />
          {tentou && erros.alvo ? <Txt v="small" style={{ color: C.danger }}>{erros.alvo}</Txt> : null}
        </View>
      )}

      {tipo === 'transferencia' && (
        <View style={{ gap: S.xs }}>
          <Chips
            label="Para qual lote? (ex.: pintinhos → poedeiras)"
            options={lotes
              .filter((l) => l.ativo && l.id !== loteId)
              .map((l) => ({
                value: l.id,
                label: `${l.nome} · ${galinheiros.find((g) => g.id === l.galinheiroId)?.nome ?? ''}`,
              }))}
            value={loteDestinoId}
            onChange={setLoteDestinoId}
          />
          {tentou && erros.destino ? <Txt v="small" style={{ color: C.danger }}>{erros.destino}</Txt> : null}
          <Button
            title="Criar lote de destino"
            icon="plus"
            variant="ghost"
            small
            onPress={() => router.push({ pathname: '/lote/form', params: lote ? { galinheiroId: lote.galinheiroId } : {} })}
          />
        </View>
      )}

      <View style={{ gap: S.xs }}>
        <Txt v="label">Data</Txt>
        <Row gap={S.sm}>
          <Button title="Hoje" small variant={data === fmtData(hoje()) ? 'primary' : 'secondary'} onPress={() => setData(fmtData(hoje()))} />
          <Button
            title="Ontem"
            small
            variant={data === fmtData(addDias(hoje(), -1)) ? 'primary' : 'secondary'}
            onPress={() => setData(fmtData(addDias(hoje(), -1)))}
          />
          <View style={{ flex: 1 }}>
            <Field value={data} onChangeText={setData} placeholder="dd/mm/aaaa" erro={tentou ? erros.data : undefined} />
          </View>
        </Row>
      </View>

      {cfg.item && (
        <View style={{ gap: S.xs }}>
          {itensTipo.length > 0 ? (
            <Chips
              label="Produto usado (dá baixa no estoque)"
              options={itensTipo.map((i) => ({ value: i.id, label: `${i.nome} (${fmtQtd(i.quantidade)} ${i.unidade})` }))}
              value={itemId}
              onChange={(v) => setItemId(v === itemId ? undefined : v)}
            />
          ) : (
            <Card>
              <Txt v="small">
                Nenhum produto de “{cfg.label.toLowerCase()}” no estoque. Cadastre na aba Estoque para controlar a baixa
                automática.
              </Txt>
            </Card>
          )}
        </View>
      )}

      {pedeQtd && (
        <Field
          label={item ? `Quantidade usada` : (cfg.qtdLabel ?? 'Quantidade')}
          value={qtd}
          onChangeText={setQtd}
          keyboardType="decimal-pad"
          suffix={item?.unidade ?? (tipo === 'ovos' ? 'ovos' : 'aves')}
          erro={tentou ? erros.qtd : undefined}
        />
      )}
      {sugestaoRacao > 0 && item && (item.unidade === 'kg' || item.unidade === 'g') && (() => {
        const valor = Math.round((item.unidade === 'g' ? sugestaoRacao * 1000 : sugestaoRacao) * 10) / 10;
        return (
          <Button
            title={`Usar consumo diário estimado: ${fmtQtd(valor)} ${item.unidade}`}
            small
            variant="ghost"
            icon="calculator"
            onPress={() => setQtd(numParaTexto(valor))}
          />
        );
      })()}

      {tipo === 'ovos' && (
        <Field label="Ovos quebrados / descartados (opcional)" value={quebrados} onChangeText={setQuebrados} keyboardType="number-pad" suffix="ovos" />
      )}
      {tipo === 'venda' && (
        <Field label="Valor total da venda (opcional)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" suffix="R$" />
      )}
      {tipo === 'pesagem' && (
        <Field
          label="Peso médio por ave"
          value={peso}
          onChangeText={setPeso}
          keyboardType="decimal-pad"
          suffix="g"
          hint="Pese uma amostra de aves e divida pelo número de aves pesadas."
          erro={tentou ? erros.peso : undefined}
        />
      )}

      <Field
        label="Observação (opcional)"
        value={obs}
        onChangeText={setObs}
        multiline
        placeholder={tipo === 'mortalidade' ? 'Causa provável, sintomas…' : 'Alguma anotação?'}
      />
    </Screen>
  );
}
