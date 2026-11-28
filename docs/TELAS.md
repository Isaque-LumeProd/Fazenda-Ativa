# Fazenda Ativa: aves, chocadas e gado

## Navegação

Barra inferior com 4 abas e o botão terracota **+ Nova** no meio (abre um menu: nova chocada, registrar nas aves, registrar no gado, cadastrar animal, nova tarefa).

| Aba | Rota | O que mostra |
|---|---|---|
| **Hoje** | `/` | Data, saudação, sequência de dias de cuidado (🔥), cartão da chocada (ovo, dia X/N, fase, umidade, próxima virada, nascimento), **Seu cuidado de hoje** (viragens, umidade, ovoscopia, tarefas da rotina e doses do gado, com caixinha de marcar), alertas, resumo da fazenda, trato do dia, atalhos e gráfico de ovos |
| **Aves** | `/aves` | Números (chocadas, ovos, nascidos, plantel) e abas **Chocadas** (em andamento / encerradas) e **Galinheiros** |
| **Gado** | `/gado` | Números do rebanho e abas **Animais** (busca, filtros por categoria e pasto), **Gestações** (anel de progresso até o parto) e **Sanidade** (próximas doses e últimas aplicações) |
| **Perfil** | `/perfil` | Estatísticas (chocadas, ovos, nascidos, eclosão, aves, cabeças), atalhos para Registros, Estoque, Tarefas e Modo Campo, Guia do criador e preferências (nome, lembretes, conta) |

### Telas empilhadas

| Tela | Rota |
|---|---|
| Chocada: cabeçalho escuro com o ovo do dia, seletor de dias, abas Resumo (viragem "Virei", temperatura, umidade, próximo marco, imprevistos, fase, calendário, encerrar), Ovoscopia (bandeja de ovos) e Histórico | `/chocada/[id]` |
| Nova / editar chocada (passos numerados: nome, espécie, ovos, data, tipo de chocadeira, horários de viragem) | `/chocada/form?id=` |
| Ficha do animal (idade, peso, ganho/dia, gestação com calendário, registrar, pesagens, histórico) | `/animal/[id]` |
| Cadastrar / editar animal | `/animal/form?id=` |
| Registrar no gado (pesagem, vacina, vermífugo, medicamento, cobertura, inseminação, diagnóstico, parto, secagem, troca de pasto, venda, morte, anotação) | `/gado/evento?tipo=&animalId=` |
| Guia do criador · Incubação por espécie · Raças · Cuidados com os filhotes | `/guia`, `/guia/incubacao`, `/guia/racas?grupo=`, `/guia/pintinhos` |
| Registros das aves (histórico de manejo) | `/registros` |
| Estoque | `/estoque` |
| Tarefas da rotina | `/tarefas` |
| Detalhe do galinheiro (lotes, últimos registros) | `/galinheiro/[id]` |
| Cadastrar / editar galinheiro | `/galinheiro/form?id=` |
| Detalhe do lote (aves atuais, idade, consumo, postura, mortalidade, histórico) | `/lote/[id]` |
| Cadastrar / editar lote | `/lote/form?id=&galinheiroId=` |
| Registrar manejo | `/manejo/novo?tipo=&loteId=&galinheiroId=&tarefaId=` |
| Detalhe do item de estoque (compra, ajuste, movimentações) | `/estoque/[id]` |
| Cadastrar / editar item de estoque | `/estoque/form?id=` |
| Cadastrar / editar tarefa | `/tarefa/form?id=` |
| Configurações (fazenda, código de convite, equipe, sincronização, sair; sem conta: dados de exemplo e apagar dados) | `/config` |
| Entrar / criar conta e criar ou entrar na fazenda (só aparece com a nuvem ligada) | `/conta` |
| **Modo Campo** (tela simples para o funcionário: trato do dia, tarefas com botões grandes, registros rápidos, feito hoje) | `/campo` |

## Modelo de dados

- **Galinheiro**: nome, capacidade, observações
- **Lote**: galinheiro, tipo de ave (poedeira, corte, caipira, pintinho, reprodutor), raça, quantidade inicial, data de entrada, idade na entrada, consumo de ração (g/ave/dia), ativo
- **Manejo**: tipo (ração, água, vitamina, vacina, medicamento, coleta de ovos, mortalidade, venda, entrada de aves, limpeza, pesagem), data, lote/galinheiro, item de estoque, quantidade, ovos quebrados, valor, peso médio, observação
- **Item de estoque**: nome, categoria, unidade, estoque mínimo, custo unitário (informado à mão), peso do saco. O **saldo não é gravado**: é a soma das movimentações (por isso baixas em aparelhos diferentes nunca se sobrescrevem). O custo atual é o da compra mais recente ou o informado à mão, o que for mais novo
- **Movimentação de estoque**: entrada (compra), saída (gerada pelo manejo) ou ajuste
- **Tarefa**: título, tipo de manejo, galinheiro/lote, frequência em dias, horário, próxima data, item e quantidade padrão
- **Chocada**: nome, espécie (ou "outra" com dias informados), data em que os ovos entraram (dia 1), tipo (automática, manual, galinha choca), horários de viragem, bandeja de ovos (estado de cada ovo: N/A, fértil, infértil, duvidoso, removido, nascido, morto; identificação e observação), encerrada, lote que recebeu os nascidos
- **Evento da chocada**: viragem, temperatura, umidade, imprevisto, cuidado feito (ovoscopia, fase final, nascimento) ou anotação, com data e hora
- **Animal (gado)**: brinco, nome, sexo, categoria (bezerra, novilha, vaca, bezerro, garrote, boi, touro), raça, aptidão, nascimento, entrada, origem, peso e valor na entrada, mãe, pasto, observações
- **Evento do gado**: pesagem, vacina, vermífugo, medicamento (com item de estoque e dose, ou nome do produto, e próxima dose), cobertura/inseminação (reprodutor), diagnóstico (prenhe/vazia), parto (cria cadastrada), secagem, troca de pasto, venda, morte, anotação

## Regras de negócio

- Aves atuais do lote = inicial + entradas − mortalidade − vendas
- Idade = idade na entrada + dias desde a entrada
- Consumo diário de ração do lote = aves atuais × g/ave/dia
- Dias de ração = ração em estoque (kg) ÷ consumo diário de todos os lotes ativos
- Registrar manejo com item de estoque dá baixa automática; excluir o registro devolve ao estoque
- Concluir tarefa registra o manejo e reagenda a próxima data (hoje + frequência)
- Taxa de postura = média de ovos/dia (7 dias) ÷ aves do lote
- Cada lote pode ter uma **ração vinculada**. Por ração: consumo/dia dos lotes vinculados, dias de duração, custo/dia e /mês
- **Sacos**: a ração pode ter peso do saco; o estoque aparece em sacos e a compra pode ser feita em sacos
- **Trato do dia**: necessidade de ração de todos os lotes ativos (manhã 50% + tarde 50%). "Meio trato" e "Completar trato" dão baixa no estoque de cada ração, descontando o que já foi servido hoje
- **Transferir / evoluir**: move aves de um lote para outro (ex.: pintinhos → poedeiras). Sai da origem e entra no destino; excluir o registro desfaz

### Chocadas

- Dia da chocada = hoje − data de entrada + 1. Cada espécie tem seus dias, dias de ovoscopia, início da fase final e faixas de temperatura e umidade (`src/lib/chocada.ts`)
- Tarefas do dia: viragem nos horários (só chocadeira manual, até a fase final), umidade às 9h (exceto galinha choca), ovoscopia nos dias certos, aviso da fase final e conferência dos nascimentos
- Encerrar a chocada pode somar os nascidos a um lote existente (registro de entrada) ou criar um lote novo de pintinhos
- Taxa de eclosão = nascidos ÷ ovos férteis

### Gado

- Situação (ativo, vendido, morto) vem dos eventos de venda e morte
- Peso atual = última pesagem (ou peso de entrada); ganho médio diário entre a primeira e a última pesagem; arrobas = kg ÷ 15
- Gestação: última cobertura/inseminação sem parto depois e sem diagnóstico "vazia". Parto previsto em 283 dias, com marcos de retorno ao cio (21), diagnóstico (45), secagem (60 dias antes, vacas de leite/misto) e pré-parto (21 dias antes)
- Doses pendentes: evento com "próxima dose" ainda sem um registro posterior do mesmo tipo e produto
- Vacina, vermífugo e medicamento com item de estoque e dose dão baixa no estoque; excluir o evento devolve

### Lembretes e sequência

- Lembretes no celular (notificações locais) para os próximos 7 dias, reagendados a cada mudança; ligados em Perfil → Lembretes
- Sequência de cuidado: dias seguidos com algum registro (aves, chocadas ou gado)

## Próximas etapas

Já prontos: login e sincronização na nuvem (Supabase), com vários usuários por fazenda. Ligar a um projeto real e publicar com EAS: veja [docs/NUVEM.md](NUVEM.md).

1. Financeiro (custo da ração por dúzia de ovos, receita de vendas de aves e gado)
2. Relatórios em PDF
