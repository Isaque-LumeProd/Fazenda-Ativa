# Fazenda Ativa: aves, chocadas e gado

App para iPhone e computador (navegador) que organiza:

- **Chocadas** (incubação): calendário automático por espécie (galinha, codorna, pato, ganso, peru e mais), viragem, ovoscopia com bandeja de ovos, temperatura e umidade com a faixa ideal, imprevistos com o passo a passo e o "ovo por dentro" dia a dia.
- **Aves**: galinheiros, lotes, ração, água, vitaminas, vacinas, coleta de ovos, mortalidade e trato do dia.
- **Gado**: rebanho com brinco, peso e ganho diário, vacinas e vermífugos com próxima dose, coberturas/inseminações com calendário da gestação até o parto.
- **Rotina**: tela Hoje com "Seu cuidado de hoje", sequência de dias de cuidado e lembretes no celular.
- **Guia do criador**: incubação por espécie, 50 raças de aves e bovinos e cuidados com pintinhos e bezerros.

O visual segue o estilo do app ChocaFácil: fundo creme, verdes de mato, terracota no botão principal e fonte Inter.

Feito com **Expo (React Native) + Expo Router**. O app funciona sem internet e, com a nuvem ligada (Supabase), sincroniza os dados entre o dono e os funcionários da fazenda. Veja como ligar em [docs/NUVEM.md](docs/NUVEM.md); sem essa configuração, os dados ficam só no aparelho.

As telas e o modelo de dados estão descritos em [docs/TELAS.md](docs/TELAS.md).

## Rodar

```bash
npm install
npx expo start
```

- **Computador:** aperte `w` no terminal (ou rode `npx expo start --web`) e o app abre no navegador em http://localhost:8081
- **iPhone:** instale o app **Expo Go** pela App Store e escaneie o QR code que aparece no terminal com a câmera. O iPhone e o computador precisam estar na mesma rede Wi-Fi.

Na primeira vez, toque em **"Ver com dados de exemplo"** para explorar o app com uma fazenda fictícia.

## Estrutura

```
src/
  app/                 telas (cada arquivo é uma rota)
    (tabs)/            abas: Hoje, Aves, + Nova, Gado, Perfil
    chocada/           chocada (ovo, calendário, ovoscopia, histórico) e formulário
    animal/            ficha do animal e cadastro
    gado/evento.tsx    registrar no gado (um ou vários animais)
    guia/              guia do criador (incubação, raças, filhotes)
    registros.tsx      histórico de manejo das aves
    tarefas.tsx        tarefas da rotina
    galinheiro/        detalhe e formulário de galinheiro
    lote/              detalhe e formulário de lote
    manejo/novo.tsx    registrar manejo
    estoque/           lista, detalhe e formulário de item
    tarefa/form.tsx    criar/editar tarefa
    config.tsx         configurações
  components/          componentes visuais reutilizáveis
  lib/
    types.ts           modelo de dados
    store.ts           estado + persistência offline (zustand + AsyncStorage)
    calc.ts            regras de negócio (aves atuais, consumo, postura…)
    chocada.ts         espécies, calendário, fases do ovo, tarefas do dia, imprevistos
    gado.ts            peso, ganho diário, gestação, doses pendentes
    guia.ts            conteúdo do guia do criador
    lembretes.ts       notificações locais (expo-notifications)
    prefs.ts           preferências do aparelho (nome, lembretes)
    constants.ts       tipos de ave, tipos de manejo, categorias
    seed.ts            dados de exemplo
```

## Verificação

```bash
npx tsc --noEmit
npx expo lint
npm run test:nuvem   # regras de permissão + sincronização (Postgres em memória)
```
