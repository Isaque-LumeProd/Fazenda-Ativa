import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { CampoData } from '@/components/campo-data';
import { Button, Chip, Chips, Field, Passo, Row, Screen, Txt } from '@/components/ui';
import { C, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { brParaYMD, fmtData, hoje } from '@/lib/dates';
import { confirmar } from '@/lib/dialog';
import { numParaTexto, parseNum } from '@/lib/format';
import { APTIDOES, ativos, CATEGORIAS_GADO, nomeAnimal, ORDEM_CATEGORIAS, pastoAtual } from '@/lib/gado';
import { RACAS_BOVINAS } from '@/lib/guia';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { Aptidao, CategoriaGado, Sexo } from '@/lib/types';

export default function AnimalForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useStore((s) => s.animais.find((a) => a.id === id));
  const animais = useStore((s) => s.animais);
  const eventos = useStore((s) => s.eventosGado);
  const salvar = useStore((s) => s.salvarAnimal);
  const excluir = useStore((s) => s.excluirAnimal);
  const { editarCadastros, apagar } = usePermissoes();

  const [brinco, setBrinco] = useState(existente?.brinco ?? '');
  const [nome, setNome] = useState(existente?.nome ?? '');
  const [sexo, setSexo] = useState<Sexo>(existente?.sexo ?? 'F');
  const [categoria, setCategoria] = useState<CategoriaGado>(existente?.categoria ?? 'vaca');
  const [raca, setRaca] = useState(existente?.raca ?? '');
  const [aptidao, setAptidao] = useState<Aptidao>(existente?.aptidao ?? 'corte');
  const [nasc, setNasc] = useState(existente?.dataNascimento ? fmtData(existente.dataNascimento) : '');
  const [origem, setOrigem] = useState<'nascido' | 'comprado'>(existente?.origem ?? 'comprado');
  const [entrada, setEntrada] = useState(fmtData(existente?.dataEntrada ?? hoje()));
  const [peso, setPeso] = useState(numParaTexto(existente?.pesoEntradaKg));
  const [valor, setValor] = useState(numParaTexto(existente?.valorCompra));
  const [pasto, setPasto] = useState(existente?.pasto ?? '');
  const [maeId, setMaeId] = useState<string | undefined>(existente?.maeId);
  const [obs, setObs] = useState(existente?.observacoes ?? '');
  const [tentou, setTentou] = useState(false);

  const nascYMD = nasc.trim() ? brParaYMD(nasc) : undefined;
  const entradaYMD = brParaYMD(entrada);
  const duplicado = animais.some((a) => a.id !== existente?.id && a.brinco.trim().toLowerCase() === brinco.trim().toLowerCase());
  const erros = {
    brinco: !brinco.trim() ? 'Informe o brinco ou número' : duplicado ? 'Já existe um animal com esse brinco' : undefined,
    nasc: nascYMD === null ? 'Data inválida' : nascYMD && nascYMD > hoje() ? 'Data no futuro' : undefined,
    entrada: !entradaYMD ? 'Data inválida' : undefined,
    peso: peso.trim() && !(parseNum(peso)! > 0) ? 'Peso inválido' : undefined,
  };
  const valido = !Object.values(erros).some(Boolean);
  const vacas = ativos(animais, eventos).filter((a) => a.sexo === 'F' && a.id !== existente?.id && (a.categoria === 'vaca' || a.categoria === 'novilha'));
  const pastos = [...new Set(ativos(animais, eventos).map((a) => pastoAtual(a, eventos)).filter((p): p is string => !!p))];

  if (!editarCadastros) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Animal' }} />
        <Txt v="muted">Só o dono da fazenda pode cadastrar ou editar animais.</Txt>
      </Screen>
    );
  }

  function trocarSexo(s: Sexo) {
    setSexo(s);
    if (CATEGORIAS_GADO[categoria].sexo !== s) setCategoria(s === 'F' ? 'vaca' : 'boi');
  }

  function gravar() {
    setTentou(true);
    if (!valido || !entradaYMD) return;
    const novoId = salvar({
      id: existente?.id,
      brinco: brinco.trim(),
      nome: nome.trim() || undefined,
      sexo,
      categoria,
      raca: raca.trim() || undefined,
      aptidao,
      dataNascimento: nascYMD ?? undefined,
      dataEntrada: entradaYMD,
      origem,
      pesoEntradaKg: parseNum(peso) ?? undefined,
      valorCompra: origem === 'comprado' ? (parseNum(valor) ?? undefined) : undefined,
      maeId,
      pasto: pasto.trim() || undefined,
      observacoes: obs.trim() || undefined,
    });
    if (existente) voltar();
    else router.replace({ pathname: '/animal/[id]', params: { id: novoId } });
  }

  return (
    <Screen footer={<Button title={existente ? 'Salvar alterações' : 'Cadastrar animal'} icon="check" variant="dark" onPress={gravar} disabled={tentou && !valido} />}>
      <Stack.Screen options={{ title: existente ? 'Editar animal' : 'Novo animal' }} />

      <Passo n={1} title="Identificação">
        <Field label="Brinco / número" value={brinco} onChangeText={setBrinco} placeholder="Ex: 012" erro={tentou ? erros.brinco : undefined} />
        <Field label="Nome (opcional)" value={nome} onChangeText={setNome} placeholder="Ex: Mimosa" />
      </Passo>

      <Passo n={2} title="Sexo e categoria">
        <Row gap={S.sm}>
          <Chip label="Fêmea" icon="gender-female" ativo={sexo === 'F'} onPress={() => trocarSexo('F')} />
          <Chip label="Macho" icon="gender-male" ativo={sexo === 'M'} onPress={() => trocarSexo('M')} />
        </Row>
        <Chips
          options={ORDEM_CATEGORIAS.filter((c) => CATEGORIAS_GADO[c].sexo === sexo).map((c) => ({ value: c, label: CATEGORIAS_GADO[c].label }))}
          value={categoria}
          onChange={setCategoria}
          escuro
        />
      </Passo>

      <Passo n={3} title="Raça e aptidão">
        <Field value={raca} onChangeText={setRaca} placeholder="Ex: Nelore, Girolando, Mestiço" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
          {RACAS_BOVINAS.map((r) => (
            <Chip key={r} label={r} ativo={raca === r} onPress={() => setRaca(r)} />
          ))}
        </ScrollView>
        <Chips label="Aptidão" options={(Object.keys(APTIDOES) as Aptidao[]).map((a) => ({ value: a, label: APTIDOES[a] }))} value={aptidao} onChange={setAptidao} escuro />
      </Passo>

      <Passo n={4} title="Origem">
        <Row gap={S.sm}>
          <Chip label="Comprado" icon="cash" ativo={origem === 'comprado'} onPress={() => setOrigem('comprado')} />
          <Chip label="Nasceu na fazenda" icon="home-heart" ativo={origem === 'nascido'} onPress={() => setOrigem('nascido')} />
        </Row>
        <CampoData label={origem === 'comprado' ? 'Data da compra / entrada' : 'Data de entrada no rebanho'} value={entrada} onChange={setEntrada} erro={tentou ? erros.entrada : undefined} />
        <Field label="Data de nascimento (se souber)" value={nasc} onChangeText={setNasc} placeholder="dd/mm/aaaa" keyboardType="numbers-and-punctuation" erro={tentou ? erros.nasc : undefined} />
        <Field label="Peso na entrada" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" suffix="kg" placeholder="Ex: 320" erro={tentou ? erros.peso : undefined} />
        {origem === 'comprado' ? <Field label="Valor pago (opcional)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" suffix="R$" /> : null}
      </Passo>

      <Passo n={5} title="Onde fica e família">
        <Field label="Pasto / piquete" value={pasto} onChangeText={setPasto} placeholder="Ex: Pasto da Represa" />
        {pastos.length > 0 ? (
          <Row wrap gap={S.sm}>
            {pastos.map((p) => (
              <Chip key={p} label={p} icon="grass" ativo={pasto === p} onPress={() => setPasto(p)} />
            ))}
          </Row>
        ) : null}
        {vacas.length > 0 ? (
          <View style={{ gap: 6 }}>
            <Txt v="label">Mãe (opcional)</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              {vacas.map((v) => (
                <Chip key={v.id} label={nomeAnimal(v)} ativo={maeId === v.id} onPress={() => setMaeId(maeId === v.id ? undefined : v.id)} />
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Field label="Observações" value={obs} onChangeText={setObs} multiline placeholder="Marcas, temperamento, histórico…" />
      </Passo>

      {existente && apagar ? (
        <Button
          title="Excluir animal"
          icon="trash-can-outline"
          variant="danger"
          onPress={async () => {
            const ok = await confirmar(
              'Excluir animal?',
              'Todo o histórico dele (pesagens, vacinas, partos) será apagado. Para tirar do rebanho sem apagar, registre uma venda ou morte.',
              'Excluir',
            );
            if (ok) {
              excluir(existente.id);
              router.dismissTo('/gado');
            }
          }}
        />
      ) : null}
      <Txt v="small" style={{ color: C.muted, textAlign: 'center' }}>
        Venda e morte são registradas como eventos, para manter o histórico.
      </Txt>
    </Screen>
  );
}
