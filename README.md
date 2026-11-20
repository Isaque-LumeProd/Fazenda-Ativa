# Fazenda Ativa: gestão de avicultura

App para iPhone e computador (navegador) que organiza galinheiros, lotes de aves, ração, água, vitaminas, vacinas, coleta de ovos, mortalidade e tarefas da rotina.

Feito com **Expo (React Native) + Expo Router**. Os dados ficam salvos no próprio aparelho e o app funciona sem internet.

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
    (tabs)/            abas: Início, Galinheiros, Registros, Estoque, Tarefas
    galinheiro/        detalhe e formulário de galinheiro
    lote/              detalhe e formulário de lote
    manejo/novo.tsx    registrar manejo
    estoque/           detalhe e formulário de item
    tarefa/form.tsx    criar/editar tarefa
    config.tsx         configurações
  components/          componentes visuais reutilizáveis
  lib/
    types.ts           modelo de dados
    store.ts           estado + persistência offline (zustand + AsyncStorage)
    calc.ts            regras de negócio (aves atuais, consumo, postura…)
    constants.ts       tipos de ave, tipos de manejo, categorias
    seed.ts            dados de exemplo
```

## Verificação

```bash
npx tsc --noEmit
npx expo lint
```
