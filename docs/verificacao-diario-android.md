# Diário no Android

## Executar o development build

Inicie a API na porta `3333` com PostgreSQL local e `GEMINI_ENABLED=false`. Se usar o exemplo Docker do [guia do backend](inicializacao-backend.md#teste-local-com-dados-fictícios), use `postgresql://entrenoites:senha-ficticia-local@127.0.0.1:55432/entrenoites_teste` como `DATABASE_URL` ao inicializar e rodar a API. Abra um emulador do Android Studio e configure o Android SDK e o JDK 17 no terminal.

No PowerShell, a partir da raiz do repositório, execute os comandos abaixo com Node 22 e npm 10.

```powershell
Set-Location mobile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run typecheck
npm run android
```

O valor `http://10.0.2.2:3333/v1` em `mobile/.env` aponta para a API no host a partir do emulador. Para abrir um development build já instalado, inicie o Metro com `npm start` dentro de `mobile`.

## Dados para repetir o fluxo

1. Crie uma conta fictícia, entre e aceite o termo. Na Home, toque em **Registrar minha primeira noite**.
2. Use o fuso `America/Sao_Paulo`. Preencha **Deitou** em `16/11/2024 23:00`, **Adormeceu** em `16/11/2024 23:30` e **Acordou** em `17/11/2024 07:00`.
3. Selecione qualidade 3, informe 20 minutos acordado e 1 despertar e marque **Não** para ansiedade. A estimativa deve ser `7h10`. Salve e confira as duas datas e o offset `UTC-03:00` no detalhe.
4. Volte à Home, abra o histórico e reabra a noite. Edite a qualidade para 5 e confira a atualização no detalhe. No histórico, aplique qualidade 2 para ver a lista vazia e qualidade 5 para recuperar o registro.
5. Reabra a noite e cancele a confirmação de exclusão. A noite deve continuar no detalhe. Confirme a exclusão e confira que o histórico voltou sem resultados, com o filtro preservado.
6. Para verificar persistência, grave uma noite, reinicie somente a API e reabra a noite pelo histórico com o mesmo PostgreSQL em execução.

## Resultado da verificação

Em 18/11/2026, o development build foi compilado, instalado e executado no emulador `Medium_Phone_API_37.0` (x86_64), conectado à API real com PostgreSQL local. O roteiro de cadastro, login, aceite, criação, reabertura, edição, filtro e exclusão passou. O Android também confirmou o aviso ao sair com alterações, o erro de campo ao informar zero despertares com 20 minutos acordado e a preservação do filtro de qualidade 5 depois de apagar.

Com duas noites fictícias, a Home mostrou a contagem, o período e o atalho para a mais recente. Em uma edição concorrente, o Android exibiu o conflito, consultou a versão atual e salvou a qualidade escolhida no rascunho após confirmação.

Para a verificação de persistência, a API foi reiniciada após criar a noite. A saúde da nova instância retornou `200` e o Android reabriu o registro de `430` minutos pelo histórico. O PostgreSQL permaneceu em execução.

No teste do cliente HTTP contra a API, foram exercitados paginação, distinção entre `null`, `0` e `false`, consulta por UUID antes do reenvio, conflito de versão e `If-Match`. `npm run typecheck` e `npx expo install --check` passaram.
