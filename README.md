# EntreNoites

EntreNoites é um diário de sono autorrelatado desenvolvido para o Trabalho Final da disciplina de Desenvolvimento de Aplicações para Dispositivos Móveis da UFPR. Permite acompanhar a rotina de sono por meio de registros, histórico, métricas, relatório PDF e reflexão opcional.

O aplicativo tem caráter de apoio e acompanhamento: não realiza diagnóstico, não prescreve tratamento e não substitui atendimento profissional. Os testes e a apresentação utilizam somente dados fictícios. [Repositório público](https://github.com/JVGomes6/TblFinal_DEVAPP)

## 1. Apresentação do aplicativo

**Tema:** acompanhamento da rotina de sono dentro do domínio de Saúde Mental.

**Público-alvo:** pessoas interessadas em acompanhar e refletir sobre sua própria rotina de sono através de registros autorrelatados.

**Funcionalidades:**

- Criação de conta.
- Autenticação.
- Consentimento para uso do diário.
- Cadastro de noite.
- Histórico dos registros.
- Detalhe da noite.
- Edição de registros.
- Exclusão de registros.
- Painel e métricas de sono.
- Personalização da Home.
- Meta de horário.
- Alto contraste.
- Relatório de sono.
- Geração e salvamento de PDF, com opção de compartilhamento.
- Política de privacidade.
- Revogação de consentimento.
- Exclusão dos dados do diário.
- Exclusão da conta.
- Reflexão opcional integrada ao Google Gemini.

Essas funções permitem registrar, revisar, acompanhar e exportar os próprios dados. O consentimento, a prévia de envio à IA e as ações de revogação e exclusão mantêm o controle com o usuário.

## 2. Tecnologias e bibliotecas utilizadas

As versões das bibliotecas abaixo correspondem aos lockfiles do repositório.

| Tecnologia / biblioteca | Versão | Função no projeto |
| --- | --- | --- |
| Node.js e npm | 22 (a partir de 22.13) e 10 | Execução da API, ferramentas do app e instalação reproduzível das dependências. |
| JDK | 17 ou JBR 25 do Android Studio, usado no ensaio local | Compilação do aplicativo Android com Gradle. |
| PostgreSQL | 18; imagem local 18.6 | Persistência de contas, consentimento, preferências e registros de sono. |
| Android Studio / Android SDK | Conforme o ambiente Android | Emulador e ferramentas de compilação e instalação. |
| Docker / Docker Desktop | Conforme o ambiente local | Execução isolada do PostgreSQL de demonstração. |
| Expo | 58.0.26 | Development build, integração nativa e ferramentas de execução do app. |
| React e React Native | 19.3.0 e 0.88.1 | Componentes, estado e interface nativa. |
| Express | 5.3.0 | API HTTP e organização das rotas. |
| pg | 8.23.1 | Pool de conexões e consultas ao PostgreSQL. |
| bcryptjs | 3.0.3 | Proteção das senhas com sal e hash. |
| jose | 6.2.18 | Emissão e validação de JWT. |
| zod | 4.6.7 | Validação de entradas e contratos de dados. |
| @google/genai | 1.52.0 | Integração do backend com o Google Gemini para a reflexão opcional. |
| Expo SecureStore | 58.0.3 | Armazenamento protegido da sessão no dispositivo. |
| Expo Print | 58.0.9 | Renderização local do relatório em PDF. |
| Expo FileSystem | 58.0.14 | Arquivos temporários e salvamento do PDF. |
| Expo Sharing | 58.0.23 | Compartilhamento do PDF pela interface nativa. |

[Versões, modelo e digests](docs/arquitetura.md#2-stack-e-versões) · [Arquitetura e contratos](docs/arquitetura.md)

## 3. Decisões arquiteturais

| Pasta | Responsabilidade |
| --- | --- |
| `mobile/` | Aplicativo React Native: telas, navegação, sessão, preferências, cliente HTTP, diário, reflexão e PDF. |
| `backend/` | API Express: autenticação, autorização, consentimento, validações, métricas, acesso ao banco e integração Gemini. |
| `database/` | Estrutura principal do banco em `database/init.sql` e exemplos de dados fictícios. |
| `ai-materials/` | Instrução de sistema, catálogo controlado, esquema de resposta e registro de ideação da IAGen. |

O mobile guarda a sessão no SecureStore e consulta a API `/v1`. As rotas protegidas validam a autenticação e restringem os registros ao usuário autenticado. O servidor também exige consentimento nas operações do diário, relatório e reflexão, calcula as métricas e prepara a prévia do envio à IA. O PDF é renderizado no dispositivo.

Essa divisão separa interface, regras de negócio, persistência e materiais da IA, facilitando manutenção e verificação dos contratos. [Arquitetura e contratos](docs/arquitetura.md) · [Estrutura do banco](database/init.sql)

## 4. Execução em ambiente de desenvolvimento

Para executar com o ZIP privado de avaliação, siga o [roteiro do pacote local](docs/entrega-apk.md#execução-do-pacote-local-de-avaliação). O inicializador cria um PostgreSQL isolado e oferece a API por HTTP para desenvolvimento e por HTTPS local para o APK de avaliação. Os passos abaixo mostram como configurar o desenvolvimento sem o ZIP.

**Pré-requisitos:**

- Node.js 22, a partir de 22.13, e npm 10.
- JDK para o Gradle, com `JAVA_HOME` configurado. O development build desta versão foi validado com o JBR 25 do Android Studio.
- Android Studio e Android SDK, com `ANDROID_HOME` configurado e um emulador iniciado pelo Device Manager.
- Docker Desktop ativo; no Windows, com suporte a WSL 2 para containers Linux.

Os comandos abaixo usam PowerShell. Se a política de execução bloquear `npm.ps1` ou `npx.ps1`, use `npm.cmd` e `npx.cmd` nos mesmos comandos. Se usar Node portátil, ajuste o `PATH` da sessão em cada terminal para selecionar Node 22 e npm 10. No Windows, prefira um caminho curto para o checkout, como `C:\src\entrenoites`, para evitar o limite de caminho do CMake.

Clone o repositório:

```powershell
git clone https://github.com/JVGomes6/TblFinal_DEVAPP.git
cd TblFinal_DEVAPP
```

**PostgreSQL:** inicie o banco de demonstração com um volume persistente:

```powershell
docker run -d --name entrenoites-pg-teste -e POSTGRES_USER=entrenoites -e POSTGRES_PASSWORD=senha-ficticia-local -e POSTGRES_DB=entrenoites_teste -p 127.0.0.1:55432:5432 -v entrenoites-pg-teste-data:/var/lib/postgresql postgres:18.6@sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42
```

A senha desse exemplo é fictícia e exclusiva do banco local. Nas sessões seguintes, use `docker start entrenoites-pg-teste` se o container estiver parado. Se já houver PostgreSQL local, crie um banco dedicado e use sua URL na configuração do backend e em `.env.test` ao executar a suíte.

**Backend:** abra outro terminal na raiz do checkout. Para uma demonstração com o container local, as variáveis da sessão abaixo fornecem a conexão, geram um segredo JWT aleatório e iniciam com o Gemini desativado:

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

Mantenha esse terminal ativo. Em outra sessão, faça o teste de saúde antes de iniciar o mobile:

```powershell
curl.exe -f http://127.0.0.1:3333/v1/health
```

Resultado esperado:

```json
{"status":"ok"}
```

Para testar a Reflexão com o Gemini, preencha `GEMINI_API_KEY` no `backend/.env` e defina `GEMINI_ENABLED=true`. Remova a configuração de desativação da sessão com `Remove-Item Env:GEMINI_ENABLED -ErrorAction SilentlyContinue` e reinicie a API no mesmo terminal. O modelo padrão é `gemini-3.1-flash-lite`. Execute `npm run smoke:gemini` em `backend` para gerar um cartão com contexto fictício e, depois, teste a Reflexão pelo app com uma conta fictícia.

**Mobile:** em outro terminal na raiz do checkout, crie `mobile/.env` a partir do exemplo somente se ainda não existir. O arquivo deve ficar dentro de `mobile/`. No Android Emulator, mantenha a URL abaixo, que acessa o host pela rede do emulador:

```ini
EXPO_PUBLIC_API_URL=http://10.0.2.2:3333/v1
```

```powershell
Set-Location mobile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npx expo install --check
npm run android
```

Depois do development build instalado, nas sessões seguintes execute `npm start` dentro de `mobile` e pressione **a** para abrir no Android. Mantenha PostgreSQL, backend e Metro/Expo ativos durante o uso.

[Inicialização, banco local e fixtures](docs/inicializacao-backend.md) · [Roteiro Android](docs/verificacao-diario-android.md)

## 5. Geração do APK para produção

O perfil `production-apk` existe em `mobile/eas.json` e está configurado para gerar APK de distribuição interna, sem cliente de desenvolvimento, com assinatura remota e variáveis do ambiente `production`. O build exige `EXPO_PUBLIC_API_URL` com uma URL HTTPS terminada em `/v1`.

O vínculo com EAS, a credencial de assinatura da equipe e o endpoint real de avaliação permanecem pendentes na documentação da entrega. O build local de teste ali registrado não comprova a entrega de um APK de produção assinado pela equipe. Consulte o [roteiro de geração, assinatura, instalação limpa e preparação da entrega](docs/entrega-apk.md) antes de produzir e distribuir o artefato de avaliação.

## 6. Requisitos de qualidade adotados

- **Facilidade de uso:** ao tocar em um campo de data no Diário, no Histórico, no Relatório ou na Reflexão, o usuário pode escolher no calendário ou tocar em **Digitar data**. O relatório mensal também permite escolher ou digitar o mês e o ano. O formulário valida os valores inseridos e indica o campo a corrigir.
- **Desempenho:** paginação do histórico, pool PostgreSQL e agregações na API limitam o volume consultado. As medições locais de latência estão documentadas, com ambiente e método, sem extrapolação para produção.
- **Manutenibilidade:** separação entre mobile, API, esquema e materiais da IA, tipagem TypeScript, validação com zod e lockfiles permitem revisar contratos e reproduzir a instalação.
- **Confiabilidade:** testes de isolamento por conta, consentimento, métricas, conflitos de edição e reenvio por UUID verificam cenários de falha e consistência dos registros.

Para repetir as verificações, após instalar as dependências conforme a seção de execução:

```powershell
# Em backend, com o PostgreSQL de teste ativo
if (-not (Test-Path .env.test)) { Copy-Item .env.test.example .env.test }
npm run build
npm run test:local

# Em mobile
npm run typecheck
```

Ajuste `TEST_DATABASE_URL` em `.env.test` para o banco local de teste. A suíte cobre autenticação, isolamento, consentimento, precisão das métricas e reflexão com transporte simulado. Os percursos Android, medições e limites das verificações constam em [Resultados e reprodução](docs/verificacao.md).

## 7. Segurança e proteção de dados

- Senhas protegidas com `bcryptjs`, sal e pré-hash; autenticação por JWT emitido e validado com `jose`.
- Rotas restritas com autorização e isolamento dos dados por conta; consultas parametrizadas no PostgreSQL.
- Consentimento exigido antes do registro de sono e do acesso ao diário, relatório e reflexão.
- Política de privacidade no app e ações explícitas de revogação, exclusão dos dados do diário e exclusão da conta. A revogação apaga o diário e a meta e conserva a conta; a exclusão da conta encerra a sessão e remove os dados associados.
- Arquivos `.env`, chaves e credenciais fora do Git. A chave Gemini e o segredo de assinatura JWT permanecem no backend; a sessão do usuário fica no SecureStore e a URL pública da API integra o bundle mobile.

Esses controles apoiam a proteção de dados e o tratamento do consentimento, mas o uso com dados reais ainda depende da identificação do responsável, do canal de atendimento e da confirmação da infraestrutura, dos operadores e da retenção. [Arquitetura](docs/arquitetura.md) · [Controles e pendências](docs/arquitetura.md#8-segurança-e-privacidade)

## 8. Interface, IHC e UX

Foram aplicados dez itens TrackWell, com mapeamento entre item, componente, percurso e evidência no [relatório de IHC e acessibilidade](docs/verificacao.md#trackwell).

- **Responsividade:** a interface ajusta colunas à largura disponível e à escala da fonte; telas estreitas mantêm o formulário em coluna única. Os ensaios incluem tela larga e paisagem para preservar leitura e acesso às ações.
- **Sensibilidade ao contexto:** a Home altera a prioridade das ações conforme o horário local, destacando o registro ou a preparação da rotina sem esconder o outro acesso.
- **Personalização:** o destaque da Home e a meta de horário são persistentes; a meta pode ser alterada ou removida sem modificar os registros anteriores.
- **Acessibilidade:** alto contraste, aumento de fonte do sistema, rótulos e estados acessíveis e foco de erro favorecem leitura e navegação. Há ensaios com fonte a 200% e TalkBack; a verificação deste último é parcial, sem confirmação de escuta ou percurso completo com tela ocultada. Os limites estão em [Android e acessibilidade](docs/verificacao.md#android-e-acessibilidade).

## 9. Criatividade e inovação

A reflexão é opcional: o usuário consulta previamente as categorias que poderão ser enviadas e autoriza cada solicitação. O backend possui integração com Google Gemini; a IA seleciona IDs de abertura, pergunta e fecho de um catálogo controlado, e o servidor valida esses IDs e compõe o cartão.

A observação é calculada pela API a partir dos registros e pode ser relacionada ao histórico do período que a originou. A pergunta pode ser pulada, preservando o controle do usuário sobre a reflexão. A proposta combina relato manual, transparência do envio e retorno aos próprios dados.

Os testes automatizados usam transporte simulado. O ensaio `npm run smoke:gemini` também gerou um cartão válido com `gemini-3.1-flash-lite` e contexto fictício. [Verificação do Gemini](docs/verificacao-reflexao-gemini.md) · [Decisões e contribuição de IA](ai-materials/ideacao.md) · [Comparativo](docs/arquitetura.md#9-inovação-e-comparativo)

## 10. Divisão do trabalho

A [tabela de divisão do trabalho](docs/contribuicoes.md#divisão-definitiva-da-equipe) identifica, para cada integrante, as telas, o código React Native, o código das APIs, do banco ou da IAGen e os itens do documento sob sua responsabilidade. O mesmo documento detalha o roteiro individual de demonstração.

## Arquivos privados da entrega

Extraia o ZIP privado na raiz do repositório para preservar estes caminhos:

```text
backend/.env
mobile/.env
avaliacao/
```

A pasta `avaliacao/` contém o inicializador, o guia rápido, a configuração TLS local e, na versão completa, o APK de teste. Compartilhe o ZIP somente pela tarefa privada de avaliação. [Instruções do pacote](docs/entrega-apk.md#execução-do-pacote-local-de-avaliação)
