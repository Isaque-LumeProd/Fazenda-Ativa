import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarAnimal } from '@/components/animal-card';
import { CampoData } from '@/components/campo-data';
import { Button, Card, Chip, Empty, Field, Icon, IconBox, Passo, Row, Screen, Txt } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { addDias, brParaYMD, fmtData, fmtDataCurta, hoje } from '@/lib/dates';
import { fmtQtd, parseNum } from '@/lib/format';
import {
  ativos,
  CATEGORIAS_GADO,
  EVENTOS_EM_LOTE,
  nomeAnimal,
  ORDEM_EVENTOS_GADO,
  pastoAtual,
  pesoAtual,
  TIPOS_EVENTO_GADO,
} from '@/lib/gado';
import { useItens } from '@/lib/hooks';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { Sexo, TipoEventoGado } from '@/lib/types';

const PROXIMAS: { label: string; dias: number | null }[] = [
  { label: 'Sem reforço', dias: null },
  { label: '21 dias', dias: 21 },
  { label: '30 dias', dias: 30 },
  { label: '6 meses', dias: 182 },
  { label: '1 ano', dias: 365 },
];

export default function EventoGadoForm() {
  const params = useLocalSearchParams<{ tipo?: TipoEventoGado; animalId?: string }>();
  const animais = useStore((s) => s.animais);
  const eventos = useStore((s) => s.eventosGado);
  const registrar = useStore((s) => s.registrarEventoGado);
  const salvarAnimal = useStore((s) => s.salvarAnimal);
  const itens = useItens();
  const { editarCadastros } = usePermissoes();

  const vivos = ativos(animais, eventos).sort((a, b) => a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }));
  const fixo = params.animalId ? animais.find((a) => a.id === params.animalId) : undefined;

  const [tipo, setTipo] = useState<TipoEventoGado>(params.tipo && TIPOS_EVENTO_GADO[params.tipo] ? params.tipo : 'pesagem');
  const [sel, setSel] = useState<string[]>(fixo ? [fixo.id] : []);
  const [pastoFiltro, setPastoFiltro] = useState<string | null>(null);
  const [data, setData] = useState(fmtData(hoje()));
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [itemId, setItemId] = useState<string | undefined>();
  const [produto, setProduto] = useState('');
  const [dose, setDose] = useState('');
  const [proxDias, setProxDias] = useState<number | null>(null);
  const [reprodutor, setReprodutor] = useState('');
  const [resultado, setResultado] = useState<'prenhe' | 'vazia'>('prenhe');
  const [novoPasto, setNovoPasto] = useState('');
  const [valor, setValor] = useState('');
  const [obs, setObs] = useState('');
  const [bezerroSexo, setBezerroSexo] = useState<Sexo>('F');
  const [bezerroBrinco, setBezerroBrinco] = useState('');
  const [bezerroPeso, setBezerroPeso] = useState('');
  const [tentou, setTentou] = useState(false);

  const cfg = TIPOS_EVENTO_GADO[tipo];
  const emLote = !fixo && EVENTOS_EM_LOTE.includes(tipo);
  const candidatos = vivos.filter((a) => !cfg.soFemea || a.sexo === 'F');
  const pastos = [...new Set(candidatos.map((a) => pastoAtual(a, eventos)).filter((p): p is string => !!p))].sort();
  const visiveis = candidatos.filter((a) => !pastoFiltro || pastoAtual(a, eventos) === pastoFiltro);
  const escolhidos = sel.filter((id) => candidatos.some((a) => a.id === id) || id === fixo?.id);
  const dataYMD = brParaYMD(data);
  const produtos = itens.filter((i) => (tipo === 'vacina' ? i.categoria === 'vacina' : tipo === 'medicamento' || tipo === 'vermifugo' ? i.categoria === 'medicamento' || i.categoria === 'outros' : false));
  const item = itens.find((i) => i.id === itemId);
  const touros = vivos.filter((a) => a.categoria === 'touro');

  const erros = {
    animais: escolhidos.length === 0 ? 'Escolha pelo menos um animal' : undefined,
    data: !dataYMD ? 'Data inválida' : dataYMD > hoje() ? 'Data no futuro' : undefined,
    peso: tipo === 'pesagem' && escolhidos.some((id) => !(parseNum(pesos[id] ?? '')! > 0)) ? 'Informe o peso de cada animal' : undefined,
    produto: cfg.produto && !itemId && !produto.trim() ? 'Escolha ou digite o produto' : undefined,
    pasto: tipo === 'pasto' && !novoPasto.trim() ? 'Informe o pasto' : undefined,
    bezerro: tipo === 'parto' && editarCadastros && bezerroBrinco.trim() && animais.some((a) => a.brinco.trim().toLowerCase() === bezerroBrinco.trim().toLowerCase()) ? 'Já existe esse brinco' : undefined,
  };
  const valido = !Object.values(erros).some(Boolean);

  function trocarTipo(t: TipoEventoGado) {
    setTipo(t);
    setItemId(undefined);
    if (!fixo && !EVENTOS_EM_LOTE.includes(t)) setSel(sel.slice(0, 1));
  }

  function alternar(id: string) {
    if (fixo) return;
    if (!emLote) setSel([id]);
    else setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  }

  function salvar() {
    setTentou(true);
    if (!valido || !dataYMD) return;
    const proxima = proxDias ? addDias(dataYMD, proxDias) : undefined;
    for (const animalId of escolhidos) {
      let bezerroId: string | undefined;
      if (tipo === 'parto' && editarCadastros) {
        const mae = animais.find((a) => a.id === animalId);
        bezerroId = salvarAnimal({
          brinco: bezerroBrinco.trim() || `${mae?.brinco ?? ''}-${dataYMD.slice(2, 4)}${dataYMD.slice(5, 7)}`,
          sexo: bezerroSexo,
          categoria: bezerroSexo === 'F' ? 'bezerra' : 'bezerro',
          raca: mae?.raca,
          aptidao: mae?.aptidao ?? 'corte',
          dataNascimento: dataYMD,
          dataEntrada: dataYMD,
          origem: 'nascido',
          pesoEntradaKg: parseNum(bezerroPeso) ?? undefined,
          maeId: animalId,
          pasto: mae ? pastoAtual(mae, eventos) : undefined,
        });
      }
      registrar({
        animalId,
        tipo,
        data: dataYMD,
        pesoKg: tipo === 'pesagem' ? (parseNum(pesos[animalId] ?? '') ?? undefined) : tipo === 'venda' ? (parseNum(pesos[animalId] ?? '') ?? undefined) : undefined,
        itemId: cfg.produto ? itemId : undefined,
        produto: cfg.produto ? (item?.nome ?? (produto.trim() || undefined)) : undefined,
        quantidade: cfg.produto && itemId ? (parseNum(dose) ?? undefined) : undefined,
        proximaData: cfg.produto ? proxima : undefined,
        reprodutor: tipo === 'cobertura' || tipo === 'inseminacao' ? reprodutor.trim() || undefined : undefined,
        resultado: tipo === 'diagnostico' ? resultado : undefined,
        pasto: tipo === 'pasto' ? novoPasto.trim() : undefined,
        valor: tipo === 'venda' ? (parseNum(valor) ?? undefined) : undefined,
        bezerroId,
        observacao: obs.trim() || undefined,
      });
    }
    if (fixo) voltar();
    else if (escolhidos.length === 1) router.replace({ pathname: '/animal/[id]', params: { id: escolhidos[0] } });
    else voltar();
  }

  if (vivos.length === 0 && !fixo) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Registrar no gado' }} />
        <Empty
          icon="cow"
          title="Nenhum animal no rebanho"
          text="Cadastre os animais primeiro."
          action={editarCadastros ? <Button title="Cadastrar animal" icon="plus" onPress={() => router.replace('/animal/form')} /> : undefined}
        />
      </Screen>
    );
  }

  // passos numerados: sem o passo "Qual animal?" quando o animal já veio da ficha
  const nData = fixo ? 2 : 3;
  return (
    <Screen
      footer={
        <Button
          title={escolhidos.length > 1 ? `Registrar para ${escolhidos.length} animais` : 'Registrar'}
          icon="check"
          variant="dark"
          onPress={salvar}
          disabled={tentou && !valido}
        />
      }>
      <Stack.Screen options={{ title: fixo ? nomeAnimal(fixo) : 'Registrar no gado' }} />

      <Passo n={1} title="O que aconteceu?">
        <View style={s.tipos}>
          {ORDEM_EVENTOS_GADO.filter((t) => !fixo || !TIPOS_EVENTO_GADO[t].soFemea || fixo.sexo === 'F').map((t) => {
            const c = TIPOS_EVENTO_GADO[t];
            const ativo = t === tipo;
            return (
              <Pressable key={t} onPress={() => trocarTipo(t)} style={[s.tipo, ativo && s.tipoAtivo]} accessibilityRole="radio" accessibilityState={{ selected: ativo }}>
                <IconBox name={c.icone} cor={c.cor} bg={ativo ? C.card : c.cor + '14'} size={40} />
                <Txt style={[{ fontFamily: F.semibold, fontSize: 13, textAlign: 'center' }, ativo && { color: C.primaryDark }]} numberOfLines={2}>
                  {c.label}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </Passo>

      {fixo ? null : (
        <Passo n={2} title={emLote ? 'Quais animais?' : 'Qual animal?'} subtitle={cfg.soFemea ? 'Só fêmeas' : emLote ? 'Toque para marcar um ou vários' : undefined}>
          {pastos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              <Chip label="Todos os pastos" escuro ativo={!pastoFiltro} onPress={() => setPastoFiltro(null)} />
              {pastos.map((p) => (
                <Chip key={p} label={p} escuro icon="grass" ativo={pastoFiltro === p} onPress={() => setPastoFiltro(p)} />
              ))}
            </ScrollView>
          ) : null}
          {emLote && visiveis.length > 1 ? (
            <Row gap={S.sm}>
              <Button title="Marcar todos" small variant="secondary" onPress={() => setSel([...new Set([...sel, ...visiveis.map((a) => a.id)])])} />
              {sel.length ? <Button title="Limpar" small variant="ghost" onPress={() => setSel([])} /> : null}
            </Row>
          ) : null}
          <View style={{ gap: S.sm }}>
            {visiveis.map((a) => {
              const marcado = sel.includes(a.id);
              return (
                <Pressable key={a.id} onPress={() => alternar(a.id)} style={[s.animal, marcado && s.tipoAtivo]}>
                  <AvatarAnimal animal={a} tamanho={40} />
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: F.semibold }}>{nomeAnimal(a)}</Txt>
                    <Txt v="small">{[CATEGORIAS_GADO[a.categoria].label, pastoAtual(a, eventos)].filter(Boolean).join(' · ')}</Txt>
                  </View>
                  <View style={[s.check, marcado && s.checkOn]}>{marcado ? <Icon name="check" size={18} color="#fff" /> : null}</View>
                </Pressable>
              );
            })}
            {visiveis.length === 0 ? <Txt v="muted">Nenhum animal{cfg.soFemea ? ' fêmea' : ''} neste filtro.</Txt> : null}
          </View>
          {tentou && erros.animais ? <Txt v="small" style={{ color: C.danger }}>{erros.animais}</Txt> : null}
        </Passo>
      )}

      <Passo n={nData} title="Quando?">
        <CampoData value={data} onChange={setData} erro={tentou ? erros.data : undefined} />
      </Passo>

      <Passo n={nData + 1} title="Detalhes">
        {tipo === 'pesagem' || tipo === 'venda' ? (
          <View style={{ gap: S.sm }}>
            {escolhidos.length === 0 ? <Txt v="muted">Escolha os animais acima.</Txt> : null}
            {escolhidos.map((id) => {
              const a = animais.find((x) => x.id === id)!;
              const ant = pesoAtual(a, eventos);
              return (
                <Field
                  key={id}
                  label={`${nomeAnimal(a)}${ant ? ` (último: ${fmtQtd(ant)} kg)` : ''}`}
                  value={pesos[id] ?? ''}
                  onChangeText={(t) => setPesos({ ...pesos, [id]: t })}
                  keyboardType="decimal-pad"
                  suffix="kg"
                  placeholder={tipo === 'venda' ? 'Peso na venda (opcional)' : 'Peso'}
                />
              );
            })}
            {tentou && erros.peso ? <Txt v="small" style={{ color: C.danger }}>{erros.peso}</Txt> : null}
          </View>
        ) : null}

        {cfg.produto ? (
          <View style={{ gap: S.md }}>
            {produtos.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Txt v="label">Do estoque (dá baixa automática)</Txt>
                <Row wrap gap={S.sm}>
                  {produtos.map((i) => (
                    <Chip key={i.id} label={`${i.nome} (${fmtQtd(i.quantidade)} ${i.unidade})`} ativo={itemId === i.id} onPress={() => setItemId(itemId === i.id ? undefined : i.id)} />
                  ))}
                </Row>
              </View>
            ) : null}
            {itemId ? (
              <Field label="Dose por animal" value={dose} onChangeText={setDose} keyboardType="decimal-pad" suffix={item?.unidade} placeholder="Ex: 5" hint={escolhidos.length > 1 && parseNum(dose) ? `Total: ${fmtQtd(parseNum(dose)! * escolhidos.length)} ${item?.unidade}` : undefined} />
            ) : (
              <Field label="Produto" value={produto} onChangeText={setProduto} placeholder={tipo === 'vacina' ? 'Ex: Aftosa, Clostridioses, Brucelose' : 'Ex: Ivermectina'} erro={tentou ? erros.produto : undefined} />
            )}
            <View style={{ gap: 6 }}>
              <Txt v="label">Próxima dose / reforço</Txt>
              <Row wrap gap={S.sm}>
                {PROXIMAS.map((p) => (
                  <Chip key={p.label} label={p.label} ativo={proxDias === p.dias} onPress={() => setProxDias(p.dias)} />
                ))}
              </Row>
              {proxDias && dataYMD ? <Txt v="small">Lembrete em {fmtDataCurta(addDias(dataYMD, proxDias))}</Txt> : null}
            </View>
          </View>
        ) : null}

        {tipo === 'cobertura' || tipo === 'inseminacao' ? (
          <View style={{ gap: S.sm }}>
            <Field label={tipo === 'inseminacao' ? 'Sêmen / touro' : 'Touro'} value={reprodutor} onChangeText={setReprodutor} placeholder="Ex: Touro 007" />
            {touros.length > 0 ? (
              <Row wrap gap={S.sm}>
                {touros.map((t) => (
                  <Chip key={t.id} label={nomeAnimal(t)} icon="cow" ativo={reprodutor === nomeAnimal(t)} onPress={() => setReprodutor(nomeAnimal(t))} />
                ))}
              </Row>
            ) : null}
            <Card flat>
              <Txt v="small">O app calcula o parto para {dataYMD ? fmtDataCurta(addDias(dataYMD, 283)) : '—'} (283 dias) e avisa do diagnóstico, da secagem e do pré-parto.</Txt>
            </Card>
          </View>
        ) : null}

        {tipo === 'diagnostico' ? (
          <Row gap={S.sm}>
            <Chip label="Prenhe" icon="check" ativo={resultado === 'prenhe'} onPress={() => setResultado('prenhe')} />
            <Chip label="Vazia" icon="close" ativo={resultado === 'vazia'} onPress={() => setResultado('vazia')} />
          </Row>
        ) : null}

        {tipo === 'parto' ? (
          editarCadastros ? (
            <View style={{ gap: S.sm }}>
              <Txt v="label">A cria (é cadastrada no rebanho)</Txt>
              <Row gap={S.sm}>
                <Chip label="Bezerra" icon="gender-female" ativo={bezerroSexo === 'F'} onPress={() => setBezerroSexo('F')} />
                <Chip label="Bezerro" icon="gender-male" ativo={bezerroSexo === 'M'} onPress={() => setBezerroSexo('M')} />
              </Row>
              <Field label="Brinco da cria (opcional)" value={bezerroBrinco} onChangeText={setBezerroBrinco} placeholder="Deixe vazio para gerar" erro={tentou ? erros.bezerro : undefined} />
              <Field label="Peso ao nascer (opcional)" value={bezerroPeso} onChangeText={setBezerroPeso} keyboardType="decimal-pad" suffix="kg" />
            </View>
          ) : (
            <Txt v="small">O dono da fazenda cadastra a cria depois.</Txt>
          )
        ) : null}

        {tipo === 'pasto' ? (
          <View style={{ gap: S.sm }}>
            <Field label="Novo pasto" value={novoPasto} onChangeText={setNovoPasto} placeholder="Ex: Pasto da Represa" erro={tentou ? erros.pasto : undefined} />
            {pastos.length > 0 ? (
              <Row wrap gap={S.sm}>
                {pastos.map((p) => (
                  <Chip key={p} label={p} icon="grass" ativo={novoPasto === p} onPress={() => setNovoPasto(p)} />
                ))}
              </Row>
            ) : null}
          </View>
        ) : null}

        {tipo === 'venda' ? <Field label="Valor da venda" value={valor} onChangeText={setValor} keyboardType="decimal-pad" suffix="R$" /> : null}

        <Field
          label={tipo === 'morte' ? 'Causa' : tipo === 'nota' ? 'Anotação' : 'Observação (opcional)'}
          value={obs}
          onChangeText={setObs}
          multiline
          placeholder={tipo === 'morte' ? 'Ex: picada de cobra, tristeza parasitária' : undefined}
        />
      </Passo>
    </Screen>
  );
}

const s = StyleSheet.create({
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tipo: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: S.md,
    paddingHorizontal: 4,
    borderRadius: R.md + 2,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  tipoAtivo: { backgroundColor: C.primarySoft, borderColor: C.primary },
  animal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.sm,
    paddingRight: S.md,
    borderRadius: R.md + 2,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  check: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: '#D5CFC1', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
});
