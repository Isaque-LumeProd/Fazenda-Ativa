import { addDias, hoje } from './dates';
import { novoId } from './format';
import type {
  Animal,
  Chocada,
  EventoChocada,
  EventoGado,
  Galinheiro,
  ItemEstoque,
  Lote,
  Manejo,
  MovEstoque,
  OvoChocada,
  Tarefa,
} from './types';

/** Dados fictícios para demonstração */
export function gerarExemplo() {
  const h = hoje();
  const agora = new Date().toISOString();

  const g1: Galinheiro = { id: novoId(), nome: 'Galinheiro 1 – Postura', capacidade: 300, criadoEm: agora };
  const g2: Galinheiro = { id: novoId(), nome: 'Galpão 2 – Corte', capacidade: 500, criadoEm: agora };
  const g3: Galinheiro = { id: novoId(), nome: 'Pinteiro', capacidade: 200, criadoEm: agora };

  const poedeiras: Lote = {
    id: novoId(),
    nome: 'Poedeiras Lote A',
    galinheiroId: g1.id,
    tipo: 'poedeira',
    raca: 'Isa Brown',
    quantidadeInicial: 250,
    dataEntrada: addDias(h, -60),
    idadeEntradaDias: 120,
    consumoDiarioG: 115,
    ativo: true,
    criadoEm: agora,
  };
  const caipiras: Lote = {
    id: novoId(),
    nome: 'Caipiras do quintal',
    galinheiroId: g1.id,
    tipo: 'caipira',
    raca: 'Embrapa 051',
    quantidadeInicial: 30,
    dataEntrada: addDias(h, -200),
    idadeEntradaDias: 90,
    consumoDiarioG: 100,
    ativo: true,
    criadoEm: agora,
  };
  const frangos: Lote = {
    id: novoId(),
    nome: 'Frangos Lote 1',
    galinheiroId: g2.id,
    tipo: 'corte',
    raca: 'Cobb 500',
    quantidadeInicial: 400,
    dataEntrada: addDias(h, -21),
    idadeEntradaDias: 1,
    consumoDiarioG: 120,
    ativo: true,
    criadoEm: agora,
  };
  const pintinhos: Lote = {
    id: novoId(),
    nome: 'Pintinhos caipira',
    galinheiroId: g3.id,
    tipo: 'pintinho',
    quantidadeInicial: 120,
    dataEntrada: addDias(h, -6),
    idadeEntradaDias: 1,
    consumoDiarioG: 30,
    ativo: true,
    criadoEm: agora,
  };

  const movimentos: MovEstoque[] = [];
  const item = ({ quantidade, ...i }: Omit<ItemEstoque, 'id' | 'criadoEm'> & { quantidade: number }): ItemEstoque => {
    const id = novoId();
    movimentos.push({ id: novoId(), itemId: id, tipo: 'ajuste', quantidade, data: addDias(h, -30), criadoEm: agora });
    return { ...i, id, criadoEm: agora };
  };
  const racaoPostura = item({ nome: 'Ração postura', categoria: 'racao', unidade: 'kg', quantidade: 480, estoqueMinimo: 150, custoUnitario: 2.4, pesoSacoKg: 40 });
  const racaoCresc = item({ nome: 'Ração crescimento (corte)', categoria: 'racao', unidade: 'kg', quantidade: 260, estoqueMinimo: 200, custoUnitario: 2.6, pesoSacoKg: 40 });
  const racaoInicial = item({ nome: 'Ração inicial (pintinho)', categoria: 'racao', unidade: 'kg', quantidade: 25, estoqueMinimo: 30, custoUnitario: 3.1, pesoSacoKg: 25 });
  const vitamina = item({ nome: 'Vitamina AD3E', categoria: 'vitamina', unidade: 'ml', quantidade: 800, estoqueMinimo: 200, custoUnitario: 0.09 });
  const vacina = item({ nome: 'Vacina Newcastle', categoria: 'vacina', unidade: 'doses', quantidade: 1000, estoqueMinimo: 200 });
  const cal = item({ nome: 'Cal virgem (limpeza)', categoria: 'outros', unidade: 'kg', quantidade: 20, estoqueMinimo: 5 });

  poedeiras.racaoId = racaoPostura.id;
  caipiras.racaoId = racaoPostura.id;
  frangos.racaoId = racaoCresc.id;
  pintinhos.racaoId = racaoInicial.id;

  const manejos: Manejo[] = [];
  const add = (m: Omit<Manejo, 'id' | 'criadoEm'>) =>
    manejos.push({ ...m, id: novoId(), criadoEm: new Date(Date.now() - manejos.length * 1000).toISOString() });

  const ovosBase = [212, 218, 205, 221, 216, 224, 209, 219, 226, 214, 220, 217, 223, 0];
  ovosBase.forEach((qtd, i) => {
    const data = addDias(h, i - (ovosBase.length - 1));
    if (qtd) add({ tipo: 'ovos', data, loteId: poedeiras.id, galinheiroId: g1.id, quantidade: qtd, quebrados: i % 3 });
    if (qtd) add({ tipo: 'ovos', data, loteId: caipiras.id, galinheiroId: g1.id, quantidade: 14 + (i % 5) });
  });
  add({ tipo: 'mortalidade', data: addDias(h, -2), loteId: frangos.id, galinheiroId: g2.id, quantidade: 3, observacao: 'Calor' });
  add({ tipo: 'mortalidade', data: addDias(h, -5), loteId: pintinhos.id, galinheiroId: g3.id, quantidade: 2 });
  add({ tipo: 'mortalidade', data: addDias(h, -9), loteId: poedeiras.id, galinheiroId: g1.id, quantidade: 1 });
  add({ tipo: 'venda', data: addDias(h, -30), loteId: caipiras.id, galinheiroId: g1.id, quantidade: 4, valor: 160 });
  add({ tipo: 'vacina', data: addDias(h, -14), loteId: frangos.id, galinheiroId: g2.id, itemId: vacina.id, quantidade: 400, observacao: 'Newcastle 1ª dose' });
  add({ tipo: 'vitamina', data: addDias(h, -3), loteId: frangos.id, galinheiroId: g2.id, itemId: vitamina.id, quantidade: 100 });
  add({ tipo: 'pesagem', data: addDias(h, -1), loteId: frangos.id, galinheiroId: g2.id, pesoMedioG: 980 });
  add({ tipo: 'limpeza', data: addDias(h, -4), galinheiroId: g1.id, observacao: 'Troca da cama' });
  for (let i = 1; i <= 3; i++) {
    add({ tipo: 'racao', data: addDias(h, -i), loteId: poedeiras.id, galinheiroId: g1.id, itemId: racaoPostura.id, quantidade: 29 });
    add({ tipo: 'racao', data: addDias(h, -i), loteId: frangos.id, galinheiroId: g2.id, itemId: racaoCresc.id, quantidade: 46 });
    add({ tipo: 'agua', data: addDias(h, -i), galinheiroId: g1.id });
    add({ tipo: 'agua', data: addDias(h, -i), galinheiroId: g2.id });
  }

  const tarefa = (t: Omit<Tarefa, 'id' | 'criadoEm' | 'ativa'>): Tarefa => ({ ...t, id: novoId(), ativa: true, criadoEm: agora });
  const tarefas: Tarefa[] = [
    tarefa({ titulo: 'Trocar água – Galinheiro 1', tipoManejo: 'agua', galinheiroId: g1.id, frequenciaDias: 1, horario: '07:00', proximaData: h }),
    tarefa({ titulo: 'Trocar água – Galpão 2', tipoManejo: 'agua', galinheiroId: g2.id, frequenciaDias: 1, horario: '07:15', proximaData: h }),
    tarefa({ titulo: 'Coletar ovos', tipoManejo: 'ovos', loteId: poedeiras.id, galinheiroId: g1.id, frequenciaDias: 1, horario: '10:00', proximaData: h }),
    tarefa({ titulo: 'Vitamina na água – frangos', tipoManejo: 'vitamina', loteId: frangos.id, galinheiroId: g2.id, itemId: vitamina.id, quantidadePadrao: 100, frequenciaDias: 7, proximaData: addDias(h, 4) }),
    tarefa({ titulo: 'Reforço Newcastle', tipoManejo: 'vacina', loteId: frangos.id, galinheiroId: g2.id, itemId: vacina.id, quantidadePadrao: 395, frequenciaDias: 21, proximaData: addDias(h, 7) }),
    tarefa({ titulo: 'Limpeza do pinteiro', tipoManejo: 'limpeza', galinheiroId: g3.id, frequenciaDias: 7, proximaData: addDias(h, 2) }),
  ];

  // ---------------------------------------------------------------- chocadas
  const ovos = (n: number, f: (i: number) => OvoChocada['status']): OvoChocada[] =>
    Array.from({ length: n }, (_, i) => ({ status: f(i) }));
  const caipirasSitio: Chocada = {
    id: novoId(),
    nome: 'Caipiras do Sítio',
    especie: 'galinha',
    dataInicio: addDias(h, -8),
    tipoChocadeira: 'manual',
    horariosViragem: ['08:00', '14:00', '20:00'],
    ovos: ovos(12, (i) => (i === 3 || i === 9 ? 'infertil' : i === 6 ? 'duvidoso' : 'fertil')),
    encerrada: false,
    criadoEm: agora,
  };
  const patos: Chocada = {
    id: novoId(),
    nome: 'Patos crioulos',
    especie: 'pato_crioulo',
    dataInicio: addDias(h, -2),
    tipoChocadeira: 'automatica',
    horariosViragem: ['08:00', '14:00', '20:00'],
    ovos: ovos(8, () => 'na'),
    encerrada: false,
    criadoEm: agora,
  };
  const codornas: Chocada = {
    id: novoId(),
    nome: 'Codornas de setembro',
    especie: 'codorna',
    dataInicio: addDias(h, -40),
    tipoChocadeira: 'automatica',
    horariosViragem: ['08:00', '14:00', '20:00'],
    ovos: ovos(30, (i) => (i < 24 ? 'nascido' : i < 27 ? 'infertil' : 'morto')),
    encerrada: true,
    dataEncerramento: addDias(h, -22),
    criadoEm: agora,
  };
  const evC = (e: Omit<EventoChocada, 'id' | 'criadoEm'>): EventoChocada => ({ ...e, id: novoId(), criadoEm: agora });
  const eventosChocada: EventoChocada[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDias(h, -i);
    for (const hora of ['08:00', '14:00', '20:00']) eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'viragem', data: d, hora }));
    eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'umidade', data: d, hora: '09:05', valor: 52 + (i % 3) }));
    eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'temperatura', data: d, hora: '09:06', valor: 37.6 + (i % 2) / 10 }));
  }
  eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'tarefa', chave: 'ovoscopia-7', data: addDias(h, -1), hora: '18:30' }));
  eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'viragem', data: h, hora: '08:02' }));
  eventosChocada.push(evC({ chocadaId: caipirasSitio.id, tipo: 'imprevisto', imprevisto: 'energia', data: addDias(h, -5), hora: '21:40', observacao: 'Voltou em 2 horas' }));
  eventosChocada.push(evC({ chocadaId: patos.id, tipo: 'umidade', data: addDias(h, -1), hora: '09:10', valor: 58 }));

  // ---------------------------------------------------------------- gado
  const animal = (a: Omit<Animal, 'id' | 'criadoEm'>): Animal => ({ ...a, id: novoId(), criadoEm: agora });
  const mimosa = animal({ brinco: '012', nome: 'Mimosa', sexo: 'F', categoria: 'vaca', raca: 'Girolando', aptidao: 'leite', dataNascimento: addDias(h, -6 * 365), dataEntrada: addDias(h, -3 * 365), origem: 'comprado', pesoEntradaKg: 470, valorCompra: 6500, pasto: 'Pasto da Represa' });
  const estrela = animal({ brinco: '027', nome: 'Estrela', sexo: 'F', categoria: 'vaca', raca: 'Nelore', aptidao: 'corte', dataNascimento: addDias(h, -5 * 365), dataEntrada: addDias(h, -2 * 365), origem: 'comprado', pesoEntradaKg: 430, pasto: 'Pasto da Represa' });
  const pintada = animal({ brinco: '031', sexo: 'F', categoria: 'novilha', raca: 'Girolando', aptidao: 'leite', dataNascimento: addDias(h, -22 * 30), dataEntrada: addDias(h, -22 * 30), origem: 'nascido', maeId: mimosa.id, pesoEntradaKg: 32, pasto: 'Piquete 2' });
  const trovao = animal({ brinco: '001', nome: 'Trovão', sexo: 'M', categoria: 'touro', raca: 'Nelore', aptidao: 'corte', dataNascimento: addDias(h, -4 * 365), dataEntrada: addDias(h, -3 * 365), origem: 'comprado', pesoEntradaKg: 620, valorCompra: 12000, pasto: 'Pasto da Represa' });
  const bezerro = animal({ brinco: '045', sexo: 'M', categoria: 'bezerro', raca: 'Nelore', aptidao: 'corte', dataNascimento: addDias(h, -150), dataEntrada: addDias(h, -150), origem: 'nascido', maeId: estrela.id, pesoEntradaKg: 31, pasto: 'Piquete 2' });
  const garrote = animal({ brinco: '039', sexo: 'M', categoria: 'garrote', raca: 'Mestiço / Cruzado', aptidao: 'corte', dataNascimento: addDias(h, -14 * 30), dataEntrada: addDias(h, -200), origem: 'comprado', pesoEntradaKg: 210, valorCompra: 2300, pasto: 'Piquete 2' });
  const evG = (e: Omit<EventoGado, 'id' | 'criadoEm'>): EventoGado => ({ ...e, id: novoId(), criadoEm: agora });
  const eventosGado: EventoGado[] = [
    evG({ animalId: mimosa.id, tipo: 'inseminacao', data: addDias(h, -190), reprodutor: 'Sêmen Gir Leiteiro' }),
    evG({ animalId: mimosa.id, tipo: 'diagnostico', data: addDias(h, -140), resultado: 'prenhe' }),
    evG({ animalId: mimosa.id, tipo: 'pesagem', data: addDias(h, -30), pesoKg: 520 }),
    evG({ animalId: estrela.id, tipo: 'cobertura', data: addDias(h, -20), reprodutor: 'Brinco 001 · Trovão' }),
    evG({ animalId: estrela.id, tipo: 'parto', data: addDias(h, -150), observacao: 'Parto normal' }),
    evG({ animalId: bezerro.id, tipo: 'pesagem', data: addDias(h, -90), pesoKg: 88 }),
    evG({ animalId: bezerro.id, tipo: 'pesagem', data: addDias(h, -30), pesoKg: 142 }),
    evG({ animalId: garrote.id, tipo: 'pesagem', data: addDias(h, -100), pesoKg: 262 }),
    evG({ animalId: garrote.id, tipo: 'pesagem', data: addDias(h, -10), pesoKg: 331 }),
    evG({ animalId: pintada.id, tipo: 'pesagem', data: addDias(h, -15), pesoKg: 318 }),
    evG({ animalId: pintada.id, tipo: 'vacina', data: addDias(h, -400), produto: 'Brucelose (B19)' }),
  ];
  for (const a of [mimosa, estrela, pintada, trovao, bezerro, garrote]) {
    eventosGado.push(evG({ animalId: a.id, tipo: 'vermifugo', data: addDias(h, -90), produto: 'Ivermectina 1%', proximaData: h }));
  }
  eventosGado.push(evG({ animalId: bezerro.id, tipo: 'vacina', data: addDias(h, -25), produto: 'Clostridioses', proximaData: addDias(h, 5) }));

  return {
    chocadas: [caipirasSitio, patos, codornas],
    eventosChocada,
    animais: [mimosa, estrela, pintada, trovao, bezerro, garrote],
    eventosGado,
    galinheiros: [g1, g2, g3],
    lotes: [poedeiras, caipiras, frangos, pintinhos],
    manejos,
    itens: [racaoPostura, racaoCresc, racaoInicial, vitamina, vacina, cal],
    movimentos,
    tarefas,
  };
}
