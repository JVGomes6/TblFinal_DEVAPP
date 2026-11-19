# EntreNoites

## 1. Apresentação

Diário de sono autorrelatado para acompanhar a própria rotina. O app reúne registros, painel, relatório em PDF e reflexão opcional. Projeto acadêmico da disciplina de Desenvolvimento de Aplicações para Dispositivos Móveis da UFPR. A avaliação usa somente dados fictícios. [Repositório público](https://github.com/JVGomes6/TblFinal_DEVAPP)

## 2. Tecnologias

Node 22 e npm 10. App em Expo `54.0.38`, React `19.1.0` e React Native `0.81.5`. API em Express `5.3.0`, PostgreSQL via `pg` `8.23.1`, `bcryptjs` `3.0.3`, JWT via `jose` `6.2.18` e Google Gemini via `@google/genai` `1.52.0`. As versões resolvidas estão nos lockfiles. [Versões, modelo e digests](docs/arquitetura.md#2-stack-e-versões)

## 3. Arquitetura

O app guarda a sessão no SecureStore e consulta a API `/v1`. O servidor valida sessão e consentimento, isola os registros por conta, calcula as métricas e serve a prévia da reflexão. O PDF é renderizado no dispositivo. [Arquitetura e contratos](docs/arquitetura.md)

## 4. Execução local

Use Node 22, npm 10, Docker ou outra instância de PostgreSQL local, Android Studio e JDK 17. Abra um emulador Android pelo Device Manager. No Windows, prefira um caminho curto para o checkout, como `C:\src\entrenoites`, para evitar o limite de caminho do CMake. Mantenha `GEMINI_ENABLED=false` para reproduzir o ensaio local.

No primeiro terminal, inicie o PostgreSQL de demonstração com dados fictícios. Se já houver PostgreSQL local, crie um banco dedicado e use sua URL no terminal do backend e em `.env.test`.

```powershell
docker run --rm --name entrenoites-pg-teste -e POSTGRES_USER=entrenoites -e POSTGRES_PASSWORD=senha-ficticia-local -e POSTGRES_DB=entrenoites_teste -p 127.0.0.1:55432:5432 postgres:18.6@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42
```

Em outro terminal na raiz, configure o backend e inicie a API.

```powershell
Set-Location backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
$env:DATABASE_URL = 'postgresql://entrenoites:senha-ficticia-local@127.0.0.1:55432/entrenoites_teste?sslmode=disable'
$env:JWT_SECRET_BASE64 = node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"
$env:GEMINI_ENABLED = 'false'
npm ci
npm run build
npm run db:init
npm start
```

Em um terceiro terminal, `curl.exe -f http://127.0.0.1:3333/v1/health` deve retornar `{"status":"ok"}`. Na raiz, instale e inicie o app.

```powershell
Set-Location mobile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npx expo install --check
npm run android
```

O emulador usa `http://10.0.2.2:3333/v1`. Em sessões seguintes com o development build instalado, use `npm start` dentro de `mobile`. [Inicialização, banco local e fixtures](docs/inicializacao-backend.md) · [Roteiro Android](docs/verificacao-diario-android.md)

## 5. APK

O perfil EAS `production-apk` gera um APK para distribuição interna, sem cliente de desenvolvimento. Usa assinatura gerenciada pela conta Expo da equipe e `EXPO_PUBLIC_API_URL` no ambiente `production`. O build exige uma URL HTTPS terminada em `/v1`. O vínculo com EAS, a credencial de assinatura e o endpoint real de avaliação estão pendentes. [Roteiro de assinatura, build, instalação limpa e ZIP privado](docs/entrega-apk.md)

## 6. Qualidade

```powershell
# Em backend, com o PostgreSQL de teste ativo
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
npm run build
npm run test:local

# Em mobile
npm run typecheck
```

A suíte local cobre autenticação, isolamento, consentimento, precisão das métricas e reflexão com transporte simulado. Ajuste `TEST_DATABASE_URL` em `.env.test` se estiver usando outra instância PostgreSQL local. [Resultados e reprodução](docs/verificacao.md)

## 7. Segurança

O backend exige consentimento para diário, relatório e reflexão. A chave Gemini e o segredo JWT ficam no servidor. A URL pública do app é a única variável dessa integração no bundle. O uso com dados reais depende da identificação do responsável, do canal de atendimento e da confirmação da infraestrutura, dos operadores e da retenção. [Controles e pendências](docs/arquitetura.md#8-segurança-e-privacidade)

## 8. Interface e IHC

A Home alterna a prioridade de rotina e registro pelo horário local. O app oferece alto contraste, personalização persistente, revisão de registros e prévia de exportação. Os dez itens TrackWell têm percurso, evidência e resultados no relatório. [IHC e acessibilidade](docs/verificacao.md#trackwell)

## 9. Inovação

O cartão combina trechos de um catálogo revisável a partir de poucas categorias, com prévia e autorização por pedido. A observação é calculada pela API e abre o histórico do mesmo período. [Decisões e contribuição de IA](ai-materials/ideacao.md) · [Comparativo](docs/arquitetura.md#9-inovação-e-comparativo)

## 10. Divisão do trabalho

O documento registra a atribuição observável no Git, a implementação assistida e as confirmações de autoria, revisão e apresentação que ainda cabem à equipe. [Contribuições e roteiro de demonstração](docs/contribuicoes.md)
