import { addDias, hoje } from './dates';
import { novoId } from './format';
import type { Galinheiro, ItemEstoque, Lote, Manejo, Tarefa } from './types';

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

  const item = (i: Omit<ItemEstoque, 'id' | 'criadoEm'>): ItemEstoque => ({ ...i, id: novoId(), criadoEm: agora });
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

  return {
    galinheiros: [g1, g2, g3],
    lotes: [poedeiras, caipiras, frangos, pintinhos],
    manejos,
    itens: [racaoPostura, racaoCresc, racaoInicial, vitamina, vacina, cal],
    movimentos: [],
    tarefas,
  };
}
