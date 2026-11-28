import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { AnimalItem, GestacaoCard } from '@/components/animal-card';
import { Button, Cabecalho, Card, Chip, Empty, Icon, Linha, Row, Screen, Section, Segmented, StatRow, Txt } from '@/components/ui';
import { C, F, R, S } from '@/constants/theme';
import { usePermissoes } from '@/lib/conta';
import { rotuloDia } from '@/lib/dates';
import { fmtNum } from '@/lib/format';
import { ativos, cuidadosGado, gestacoes, nomeAnimal, pastoAtual, pesoAtual, TIPOS_EVENTO_GADO } from '@/lib/gado';
import { useStore } from '@/lib/store';
import type { CategoriaGado } from '@/lib/types';

type Aba = 'animais' | 'gestacoes' | 'sanidade';
type Filtro = 'todos' | 'femeas' | 'bezerros' | 'machos' | 'fora';

const FILTROS: { value: Filtro; label: string; cats?: CategoriaGado[] }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'femeas', label: 'Vacas e novilhas', cats: ['vaca', 'novilha'] },
  { value: 'bezerros', label: 'Bezerros', cats: ['bezerro', 'bezerra'] },
  { value: 'machos', label: 'Touros e bois', cats: ['touro', 'boi', 'garrote'] },
  { value: 'fora', label: 'Vendidos / mortos' },
];

export default function Gado() {
  const animais = useStore((s) => s.animais);
  const eventos = useStore((s) => s.eventosGado);
  const { editarCadastros } = usePermissoes();
  const [aba, setAba] = useState<Aba>('animais');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [busca, setBusca] = useState('');
  const [pasto, setPasto] = useState<string | null>(null);

  const vivos = ativos(animais, eventos);
  const idsVivos = new Set(vivos.map((a) => a.id));
  const gest = gestacoes(animais, eventos);
  const bezerros = vivos.filter((a) => a.categoria === 'bezerro' || a.categoria === 'bezerra').length;
  const pesos = vivos.map((a) => pesoAtual(a, eventos)).filter((p): p is number => p !== null);
  const pesoMedio = pesos.length ? pesos.reduce((s, p) => s + p, 0) / pesos.length : null;
  const pastos = [...new Set(vivos.map((a) => pastoAtual(a, eventos)).filter((p): p is string => !!p))].sort();

  const cfgFiltro = FILTROS.find((f) => f.value === filtro)!;
  const termo = busca.trim().toLowerCase();
  const lista = animais
    .filter((a) => (filtro === 'fora' ? !idsVivos.has(a.id) : idsVivos.has(a.id)))
    .filter((a) => !cfgFiltro.cats || cfgFiltro.cats.includes(a.categoria))
    .filter((a) => !pasto || pastoAtual(a, eventos) === pasto)
    .filter((a) => !termo || [a.brinco, a.nome, a.raca].some((x) => x?.toLowerCase().includes(termo)))
    .sort((a, b) => a.brinco.localeCompare(b.brinco, 'pt-BR', { numeric: true }));

  const doses = cuidadosGado(animais, eventos, 30);
  const recentes = eventos
    .filter((e) => ['vacina', 'vermifugo', 'medicamento'].includes(e.tipo))
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 15);

  return (
    <Screen topo>
      <Cabecalho
        kicker="Pecuária"
        title="Seu rebanho"
        right={
          editarCadastros ? (
            <Button title="Animal" icon="plus" small variant="terra" onPress={() => router.push('/animal/form')} />
          ) : undefined
        }
      />
      <StatRow
        itens={[
          { valor: fmtNum(vivos.length), label: 'Cabeças' },
          { valor: fmtNum(gest.length), label: 'Gestações' },
          { valor: fmtNum(bezerros), label: 'Bezerros' },
          { valor: pesoMedio ? `${fmtNum(pesoMedio)}` : '—', label: 'Kg médio' },
        ]}
      />
      <Segmented
        value={aba}
        onChange={setAba}
        options={[
          { value: 'animais', label: 'Animais' },
          { value: 'gestacoes', label: 'Gestações' },
          { value: 'sanidade', label: 'Sanidade' },
        ]}
      />

      {animais.length === 0 ? (
        <Empty
          icon="cow"
          title="Nenhum animal cadastrado"
          text="Cadastre vacas, novilhas, bezerros e touros para acompanhar peso, vacinas, coberturas e partos."
          action={
            editarCadastros ? (
              <Button title="Cadastrar animal" icon="plus" variant="terra" onPress={() => router.push('/animal/form')} style={{ alignSelf: 'stretch', marginTop: S.sm }} />
            ) : undefined
          }
        />
      ) : null}

      {aba === 'animais' && animais.length > 0 ? (
        <View style={{ gap: S.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.lg, borderWidth: 1, borderColor: C.border, paddingHorizontal: S.lg }}>
            <Icon name="magnify" size={24} color={C.muted} />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar brinco, nome ou raça"
              placeholderTextColor="#9AA096"
              style={{ flex: 1, fontSize: 16, paddingVertical: 14, fontFamily: F.regular, color: C.text }}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
            {FILTROS.map((f) => (
              <Chip key={f.value} label={f.label} escuro ativo={filtro === f.value} onPress={() => setFiltro(f.value)} />
            ))}
          </ScrollView>
          {pastos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
              {pastos.map((p) => (
                <Chip key={p} label={p} icon="grass" ativo={pasto === p} onPress={() => setPasto(pasto === p ? null : p)} />
              ))}
            </ScrollView>
          ) : null}
          <Txt v="muted">
            {lista.length} {lista.length === 1 ? 'animal' : 'animais'}
          </Txt>
          {lista.map((a) => (
            <AnimalItem key={a.id} animal={a} />
          ))}
          <Button title="Registrar no rebanho" icon="clipboard-pulse-outline" variant="secondary" onPress={() => router.push('/gado/evento')} />
        </View>
      ) : null}

      {aba === 'gestacoes' && animais.length > 0 ? (
        <View style={{ gap: S.md }}>
          {gest.length === 0 ? (
            <Empty icon="heart-outline" title="Nenhuma gestação em andamento" text="Registre uma cobertura ou inseminação e o app monta o calendário até o parto." />
          ) : (
            gest.map((g) => <GestacaoCard key={g.vaca.id} g={g} />)
          )}
          <Button
            title="Registrar cobertura / inseminação"
            icon="heart-outline"
            variant="secondary"
            onPress={() => router.push({ pathname: '/gado/evento', params: { tipo: 'cobertura' } })}
          />
        </View>
      ) : null}

      {aba === 'sanidade' && animais.length > 0 ? (
        <View style={{ gap: S.xl }}>
          <Button
            title="Vacinar / vermifugar o rebanho"
            icon="needle"
            onPress={() => router.push({ pathname: '/gado/evento', params: { tipo: 'vacina' } })}
          />
          <Section title="Próximos 30 dias" subtitle="Reforços, doses e marcos das gestações">
            {doses.length === 0 ? (
              <Card>
                <Txt v="muted">Nada marcado. Ao registrar uma vacina, informe a próxima dose para receber o lembrete.</Txt>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {doses.map((d, i) => {
                  const cfg = TIPOS_EVENTO_GADO[d.tipo];
                  return (
                    <Linha
                      key={d.id}
                      primeira={i === 0}
                      icon={cfg.icone}
                      iconColor={cfg.cor}
                      title={d.titulo}
                      subtitle={`${d.detalhe} · ${d.atrasado ? 'atrasada desde ' : ''}${rotuloDia(d.data)}`}
                      onPress={() => router.push({ pathname: '/animal/[id]', params: { id: d.animalId } })}
                      right={d.atrasado ? <Icon name="clock-alert-outline" size={20} color={C.danger} /> : undefined}
                    />
                  );
                })}
              </Card>
            )}
          </Section>
          <Section title="Últimas aplicações">
            {recentes.length === 0 ? (
              <Card>
                <Txt v="muted">Nenhuma vacina, vermífugo ou medicamento registrado.</Txt>
              </Card>
            ) : (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {recentes.map((e, i) => {
                  const cfg = TIPOS_EVENTO_GADO[e.tipo];
                  const a = animais.find((x) => x.id === e.animalId);
                  return (
                    <Linha
                      key={e.id}
                      primeira={i === 0}
                      icon={cfg.icone}
                      iconColor={cfg.cor}
                      title={`${cfg.label}${e.produto ? `: ${e.produto}` : ''}`}
                      subtitle={`${nomeAnimal(a)} · ${rotuloDia(e.data)}`}
                      onPress={a ? () => router.push({ pathname: '/animal/[id]', params: { id: a.id } }) : undefined}
                    />
                  );
                })}
              </Card>
            )}
          </Section>
          <Row>
            <Button title="Guia de raças bovinas" icon="book-open-variant" variant="ghost" onPress={() => router.push({ pathname: '/guia/racas', params: { grupo: 'bovinos' } })} />
          </Row>
        </View>
      ) : null}
    </Screen>
  );
}
