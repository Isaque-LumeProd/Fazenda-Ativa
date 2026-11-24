# Fazenda Ativa — Avicultura (MVP)

## Navegação

Barra inferior com 5 abas + telas empilhadas por cima.

| Aba | Rota | O que mostra |
|---|---|---|
| **Início** | `/` | Resumo do dia: total de aves, ovos hoje, ração em estoque (e para quantos dias dá), mortalidade da semana, alertas, atalhos rápidos, tarefas de hoje, gráfico de ovos (7 dias), ocupação dos galinheiros |
| **Galinheiros** | `/galinheiros` | Lista de galinheiros com capacidade, ocupação e lotes |
| **Registros** | `/manejo` | Histórico de todo o manejo, com filtro por tipo |
| **Estoque** | `/estoque` | Ração, vitaminas, vacinas, medicamentos e outros; alerta de estoque baixo; previsão de duração da ração |
| **Tarefas** | `/tarefas` | Rotina recorrente (água, ração, vitamina, vacina, limpeza…): atrasadas, hoje e próximas |

### Telas empilhadas

| Tela | Rota |
|---|---|
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

## Próximas etapas

Já prontos: login e sincronização na nuvem (Supabase), com vários usuários por fazenda. Ligar a um projeto real e publicar com EAS: veja [docs/NUVEM.md](NUVEM.md).

1. Notificações de tarefas no iPhone
2. Financeiro (custo da ração por dúzia de ovos, receita de vendas)
3. Relatórios em PDF
