# Dados na nuvem (Supabase)

Com a nuvem ligada, cada pessoa entra com e-mail e senha e todos da fazenda veem os mesmos dados, no celular e no computador. O app continua funcionando **sem internet**: tudo é salvo no aparelho e enviado quando a conexão volta.

## Como funciona

| Quem | Pode fazer |
| --- | --- |
| **Dono** (quem cria a fazenda) | Tudo: cadastrar, editar e apagar galinheiros, lotes, itens, registros e tarefas; convidar e remover funcionários |
| **Funcionário** (entra com código de convite) | Registrar manejos, trato do dia, compras, ajustes de estoque, concluir/criar tarefas, cuidar das chocadas (viragem, umidade, ovoscopia) e registrar eventos do gado (pesagem, vacina…). Não apaga nada e não altera galinheiros, lotes, itens nem o cadastro dos animais |

Essas regras são garantidas **no servidor** (arquivo [`supabase/schema.sql`](../supabase/schema.sql)), não só escondendo botões no app.

- **Sem internet:** o ícone de nuvem no topo da tela Início fica laranja e as alterações esperam na fila. Ao reconectar, elas são enviadas sozinhas.
- **Duas pessoas mexendo ao mesmo tempo:** cada registro vale pela última alteração que chegou ao servidor. O **estoque nunca se perde**: o saldo é a soma das movimentações (compras, baixas e ajustes), então duas baixas feitas ao mesmo tempo em aparelhos diferentes somam corretamente.
- **Tempo real:** quando alguém registra algo, os outros aparelhos abertos recebem em poucos segundos.

## Passo a passo para ligar (uma vez só, cerca de 10 minutos)

### 1. Criar o projeto no Supabase

1. Crie uma conta grátis em [supabase.com](https://supabase.com) e clique em **New project**.
2. Escolha um nome (ex.: `fazenda-ativa`), crie uma senha forte para o banco e guarde-a. Em região, escolha **South America (São Paulo)**.
3. Espere o projeto ficar pronto (1 ou 2 minutos).

### 2. Criar as tabelas e regras

1. No menu da esquerda, abra **SQL Editor** → **New query**.
2. Cole o conteúdo inteiro de [`supabase/schema.sql`](../supabase/schema.sql) e clique em **Run**. Deve aparecer "Success". **Quem já tinha o banco criado** precisa rodar o arquivo de novo uma vez: ele libera as coleções novas (chocadas e gado) sem apagar nada.

### 3. Ajustar o login

Em **Authentication → Sign In / Providers → Email**:

- **Confirm email**: se ficar **ligado**, cada pessoa precisa clicar no link enviado por e-mail antes de entrar. Para funcionários sem e-mail no celular, é mais simples **desligar**.
- O plano grátis envia poucos e-mails por hora. Se for manter a confirmação ligada com muitos usuários, configure um SMTP próprio em **Authentication → Emails**.

### 4. Ligar o app ao projeto

1. Em **Project Settings → API Keys**, copie a **Publishable key** (começa com `sb_publishable_`). Em **Project Settings → Data API** (ou na página inicial do projeto), copie a **Project URL**.
2. Na pasta do projeto, copie o arquivo `.env.example` para `.env.local` e cole os dois valores:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```

3. Reinicie o app (`npx expo start`). Por enquanto a tela de login não aparece na abertura: o app abre direto, e a conta fica em **Configurações → Criar conta ou entrar**.

> O `.env.local` não vai para o Git. Para publicar (EAS), as mesmas variáveis precisam ser cadastradas no EAS.

## Publicar com EAS

O projeto já tem o `eas.json` com três perfis: `development` (app de desenvolvimento), `preview` (instalação interna para testes) e `production` (loja).

1. Crie uma conta grátis em [expo.dev](https://expo.dev) e rode na pasta do projeto:

   ```powershell
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

2. Cadastre as variáveis do Supabase no EAS, uma vez para cada ambiente (`development`, `preview` e `production`). Cada perfil de build usa o ambiente de mesmo nome:

   ```powershell
   npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://SEU-PROJETO.supabase.co --environment preview --visibility plaintext
   npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_... --environment preview --visibility plaintext
   ```

   Repita trocando `--environment preview` por `production` e por `development`. Esses valores entram no app no momento do build. Se mudarem, gere um build novo.

3. Gere o build:

   ```powershell
   npx eas-cli@latest build --profile preview --platform ios
   npx eas-cli@latest build --profile production --platform ios
   ```

   iPhone para uso real ou App Store exige conta do Apple Developer (paga). Para Android, o Google Play exige uma taxa única.

### 5. Primeiro uso

1. **Dono:** crie a conta, escolha **"Sou o dono"** e dê o nome da fazenda. Se você já tinha dados no aparelho, deixe ligado **"Enviar os dados deste aparelho"**.
2. Em **Configurações** aparece o **código de convite** (6 letras). Passe para os funcionários.
3. **Funcionário:** instala o app, cria a conta, escolhe **"Tenho um convite"** e digita o código.

## Perguntas comuns

**Esqueci a senha.** Por enquanto, o dono resolve pelo painel: **Authentication → Users**, encontre o e-mail e use **Send password recovery** ou exclua o usuário para ele se cadastrar de novo. (Uma tela de "esqueci a senha" dentro do app fica para uma próxima versão.)

**Um funcionário saiu da fazenda.** Em **Configurações → Equipe**, toque em **Remover**. Ele perde o acesso na hora.

**O código de convite vazou.** Em **Configurações**, toque em **Trocar código**. Quem já entrou continua; o código antigo para de funcionar.

**Quero usar sem conta.** Basta usar o app normalmente: os dados ficam no aparelho. Para conectar depois, vá em **Configurações → Criar conta ou entrar**, e os dados do aparelho podem ser enviados.

## Para desenvolvedores

- Código: `src/lib/supabase.ts` (cliente), `src/lib/conta.ts` (login, fazenda, convites), `src/lib/sync.ts` (fila de envio, download por `rev`, tempo real) e `src/app/conta.tsx` (telas).
- Banco: uma tabela genérica `registros` (`fazenda_id`, `colecao`, `id`, `dados jsonb`, `excluido`, `rev`). Exclusão vira `excluido = true` para que todos os aparelhos fiquem sabendo. `rev` vem de uma sequência e muda a cada gravação; o app baixa `rev > último recebido`, revendo as últimas 100 revisões para não perder gravações que terminaram fora de ordem.
- Testes: `npm run test:nuvem` roda as regras de permissão e simula dono e funcionário sincronizando (com e sem internet) contra um Postgres em memória (PGlite) que usa o `schema.sql` real.
