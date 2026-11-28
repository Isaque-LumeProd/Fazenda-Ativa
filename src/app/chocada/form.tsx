import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CampoData } from '@/components/campo-data';
import { Button, Card, Chip, Field, Icon, IconBox, Passo, Row, Screen, Stepper, Txt } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { CHOCADEIRAS, ESPECIES, HORARIOS_PADRAO, ORDEM_ESPECIES } from '@/lib/chocada';
import { addDias, brParaYMD, fmtData, fmtDataCurta, hoje } from '@/lib/dates';
import { voltar } from '@/lib/nav';
import { useStore } from '@/lib/store';
import type { EspecieId, TipoChocadeira } from '@/lib/types';

const HORAS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

export default function ChocadaForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existente = useStore((s) => s.chocadas.find((c) => c.id === id));
  const salvar = useStore((s) => s.salvarChocada);
  const definirQtd = useStore((s) => s.definirQtdOvos);

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [especie, setEspecie] = useState<EspecieId>(existente?.especie ?? 'galinha');
  const [diasCustom, setDiasCustom] = useState(existente?.diasCustom ? String(existente.diasCustom) : '');
  const [ovos, setOvos] = useState(existente?.ovos.length ?? 12);
  const [data, setData] = useState(fmtData(existente?.dataInicio ?? hoje()));
  const [tipo, setTipo] = useState<TipoChocadeira>(existente?.tipoChocadeira ?? 'automatica');
  const [horarios, setHorarios] = useState<string[]>(existente?.horariosViragem ?? HORARIOS_PADRAO);
  const [tentou, setTentou] = useState(false);

  const dataYMD = brParaYMD(data);
  const dias = especie === 'outra' ? parseInt(diasCustom, 10) : ESPECIES[especie].dias;
  const erros = {
    nome: !nome.trim() ? 'Dê um nome para a chocada' : undefined,
    data: !dataYMD ? 'Data inválida' : dataYMD > hoje() ? 'A data não pode ser no futuro' : undefined,
    dias: especie === 'outra' && !(dias >= 5 && dias <= 60) ? 'Informe de 5 a 60 dias' : undefined,
    ovos: ovos < 1 ? 'Pelo menos 1 ovo' : undefined,
  };
  const valido = !Object.values(erros).some(Boolean);

  function criar() {
    setTentou(true);
    if (!valido || !dataYMD) return;
    const novoId = salvar({
      id: existente?.id,
      nome: nome.trim(),
      especie,
      diasCustom: especie === 'outra' ? dias : undefined,
      dataInicio: dataYMD,
      tipoChocadeira: tipo,
      horariosViragem: tipo === 'manual' ? [...horarios].sort() : existente?.horariosViragem ?? HORARIOS_PADRAO,
      ovos: existente?.ovos ?? Array.from({ length: ovos }, () => ({ status: 'na' as const })),
      encerrada: existente?.encerrada ?? false,
      dataEncerramento: existente?.dataEncerramento,
      loteDestinoId: existente?.loteDestinoId,
      observacoes: existente?.observacoes,
    });
    if (existente && existente.ovos.length !== ovos) definirQtd(existente.id, ovos);
    if (existente) voltar();
    else router.replace({ pathname: '/chocada/[id]', params: { id: novoId } });
  }

  return (
    <Screen
      footer={
        <Button
          title={existente ? 'Salvar alterações' : 'Criar chocada'}
          icon="check"
          variant="dark"
          onPress={criar}
          disabled={tentou && !valido}
        />
      }>
      <Stack.Screen options={{ title: existente ? 'Editar chocada' : 'Nova chocada' }} />

      <Passo n={1} title="Nome da chocada">
        <Field value={nome} onChangeText={setNome} placeholder="Ex: Caipiras do Sítio" erro={tentou ? erros.nome : undefined} />
      </Passo>

      <Passo n={2} title="Quais aves?" subtitle="Cada espécie tem o seu tempo de incubação">
        <View style={s.grade}>
          {ORDEM_ESPECIES.map((e) => {
            const cfg = ESPECIES[e];
            const ativo = e === especie;
            return (
              <Pressable
                key={e}
                onPress={() => setEspecie(e)}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativo }}
                style={({ pressed }) => [s.especie, ativo && s.especieAtiva, pressed && { opacity: 0.7 }]}>
                {ativo ? (
                  <View style={s.marcado}>
                    <Icon name="check" size={14} color="#fff" />
                  </View>
                ) : null}
                <View style={s.emoji}>
                  <Txt style={{ fontSize: 34 }}>{cfg.emoji}</Txt>
                </View>
                <Txt style={[{ fontFamily: F.semibold, fontSize: 15, textAlign: 'center' }, ativo && { color: C.primaryDark }]} numberOfLines={1}>
                  {cfg.label}
                </Txt>
                <Txt v="small" style={{ fontSize: 13 }}>
                  {e === 'outra' ? 'personalizada' : `${cfg.dias} dias`}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        {especie === 'outra' ? (
          <Field
            label="Dias de incubação"
            value={diasCustom}
            onChangeText={setDiasCustom}
            keyboardType="number-pad"
            suffix="dias"
            erro={tentou ? erros.dias : undefined}
          />
        ) : null}
      </Passo>

      <Passo n={3} title="Quantos ovos?">
        <Stepper value={ovos} onChange={setOvos} min={1} max={500} />
        {existente && ovos < existente.ovos.length ? (
          <Txt v="small" style={{ textAlign: 'center', color: C.danger }}>
            Os últimos {existente.ovos.length - ovos} ovos da bandeja serão removidos.
          </Txt>
        ) : null}
      </Passo>

      <Passo n={4} title="Quando foram para a chocadeira?" subtitle="Esse é o dia 1 da incubação">
        <CampoData value={data} onChange={setData} erro={tentou ? erros.data : undefined} />
      </Passo>

      <Passo n={5} title="Como vão chocar?">
        <View style={{ gap: S.sm }}>
          {(Object.keys(CHOCADEIRAS) as TipoChocadeira[]).map((t) => {
            const cfg = CHOCADEIRAS[t];
            const ativo = t === tipo;
            return (
              <Pressable
                key={t}
                onPress={() => setTipo(t)}
                accessibilityRole="radio"
                accessibilityState={{ selected: ativo }}
                style={[s.opcao, ativo && s.especieAtiva]}>
                <IconBox name={cfg.icone} cor={ativo ? C.primaryDark : C.muted} bg={ativo ? C.card : C.field} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontFamily: F.semibold, fontSize: 16 }}>{cfg.label}</Txt>
                  <Txt v="small">{cfg.detalhe}</Txt>
                </View>
                <View style={[s.radio, ativo && s.radioAtivo]}>{ativo ? <View style={s.radioDot} /> : null}</View>
              </Pressable>
            );
          })}
        </View>
      </Passo>

      {tipo === 'manual' ? (
        <Passo n={6} title="Horários de viragem" subtitle="Vire pelo menos 3 vezes ao dia, sempre em número ímpar">
          <Row wrap gap={S.sm}>
            {HORAS.map((h) => (
              <Chip
                key={h}
                label={h.replace(':00', 'h')}
                ativo={horarios.includes(h)}
                onPress={() => setHorarios(horarios.includes(h) ? horarios.filter((x) => x !== h) : [...horarios, h])}
              />
            ))}
          </Row>
          {horarios.length === 0 ? (
            <Txt v="small" style={{ color: C.danger }}>
              Escolha pelo menos um horário.
            </Txt>
          ) : null}
        </Passo>
      ) : null}

      {dataYMD && dias > 0 && !erros.dias ? (
        <Card flat style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <IconBox name="calendar-heart" cor={C.terra} bg={C.terraSoft} />
          <View style={{ flex: 1 }}>
            <Txt style={{ fontFamily: F.semibold }}>Nascimento previsto em {fmtDataCurta(addDias(dataYMD, dias - 1))}</Txt>
            <Txt v="small">O app monta o calendário de viragem, ovoscopia e fase final.</Txt>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  especie: {
    flexBasis: '31%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: S.md,
    paddingHorizontal: 4,
    borderRadius: R.md + 2,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  especieAtiva: { backgroundColor: C.primarySoft, borderColor: C.primary },
  marcado: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.areia, alignItems: 'center', justifyContent: 'center' },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.md,
    borderRadius: R.md + 2,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.field,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CFC9BB', alignItems: 'center', justifyContent: 'center' },
  radioAtivo: { borderColor: C.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.primary },
});
