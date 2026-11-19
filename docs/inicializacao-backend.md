# Inicialização do backend EntreNoites

## API local com PostgreSQL online

Use Node 22, a partir de 22.13, e npm 10. Crie `backend/.env` a partir de `backend/.env.example` e preencha `DATABASE_URL` com a conexão do banco de avaliação. Use a role proprietária das tabelas para inicializar o esquema e executar a API. No Supabase, use a conexão direta ou o *Session pooler* na porta 5432 se sua rede for apenas IPv4. [Conexões do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) · [Conexões do Neon](https://neon.com/docs/connect/connect-from-any-app)

Conexões remotas usam TLS com verificação da identidade do servidor. Se o provedor fornecer uma CA própria, guarde o certificado em `backend/.certs/` e informe o caminho em `sslrootcert` na URL. Mantenha `GEMINI_ENABLED=false` durante este ensaio. [TLS no node-postgres](https://node-postgres.com/features/ssl)

Na primeira configuração, gere o segredo JWT diretamente no `.env`. No PowerShell, a partir da raiz do repositório:

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$jwtEntreNoites = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
(Get-Content .env) -replace '^JWT_SECRET_BASE64=$', "JWT_SECRET_BASE64=$jwtEntreNoites" | Set-Content .env
Remove-Variable jwtEntreNoites
```

Depois de preencher `DATABASE_URL`, execute no mesmo diretório:

```powershell
npm ci
npm run build
npm run db:init
npm start
```

Em outro terminal, execute `curl.exe -i http://127.0.0.1:3333/v1/health`. O resultado esperado é `200` com `{"status":"ok"}`. O `db:init` pode ser executado novamente no mesmo banco e preserva registros existentes.

## Teste local com dados fictícios

Use uma instância PostgreSQL local. Com Docker em execução, este comando cria um banco de teste temporário na porta 55432:

```powershell
docker run --rm --name entrenoites-pg-teste -e POSTGRES_USER=entrenoites -e POSTGRES_PASSWORD=senha-ficticia-local -e POSTGRES_DB=entrenoites_teste -p 127.0.0.1:55432:5432 postgres:18.6@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42
```

Em outro terminal, a partir da raiz:

```powershell
Set-Location backend
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
npm ci
npm run build
npm run test:local
```

A suíte usa PostgreSQL local com a geração de IA desligada. Ela cria um esquema exclusivo em `TEST_DATABASE_URL`, gera um segredo JWT temporário e verifica os contratos HTTP de autenticação, consentimento, diário, relatório e prévia. O esquema da suíte é removido ao término. Para encerrar o banco do exemplo, execute `docker stop entrenoites-pg-teste`.

## Compatibilidade da autenticação

As contas continuam usando o formato `bcrypt-sha384-v1:` do projeto, com sal por senha e custo 12. A atualização da biblioteca JWT para `jose` mantém válidos os tokens HS256 já emitidos com o mesmo segredo, emissor e audiência, enquanto o prazo e a revisão de sessão forem válidos.

## Dados fictícios para demonstração

O arquivo [example-fixtures.json](../database/example-fixtures.json) contém duas contas com registros na mesma data local. Em um banco de demonstração, use os objetos `credenciais` em `/v1/auth/register` e `/v1/auth/login`. Com o token de cada conta, aceite `usuario.consentimento.versaoAtual` em `/v1/users/me/consent` e envie suas `noites` para `/v1/sleep`.

Consulte `/v1/reports/sleep?de=2024-11-11&ate=2024-11-17` e peça a prévia de reflexão com foco `rotina` e `ate` igual a `2024-11-17`. A primeira conta tem uma noite de 430 minutos, média de 425 minutos e destaque de telas na prévia. A segunda tem uma noite de 450 minutos e prévia sem fator destacado.
