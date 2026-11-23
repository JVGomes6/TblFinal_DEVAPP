# Entrega acadêmica e APK

## Preparação local

Use as instruções do README em um checkout limpo. O `app.json` declara `EntreNoites`, slug `entrenoites`, versão `1.0.0`, pacote `br.edu.appsono.entrenoites` e `android.versionCode` igual a `1`. O perfil `production-apk` fixa EAS CLI `16.32.0`, Node `22.23.5`, distribuição interna, assinatura remota da equipe e ambiente `production`. [README](../README.md) · [Perfil EAS](../mobile/eas.json)

```powershell
Set-Location mobile
npx --yes eas-cli@16.32.0 --version
$env:EXPO_PUBLIC_API_URL = 'https://api-de-avaliacao.example.invalid/v1'
npm run validar:apk
```

O endereço acima é fictício e serve para validar o formato. O hook do EAS aplica a mesma validação no perfil de produção. O servidor de avaliação precisa de banco persistente, certificado TLS válido e dados exclusivamente fictícios para a demonstração. O código atual usa PostgreSQL e Gemini. Uma instalação com SQLite e Ollama requer confirmar a stack de avaliação e preparar código e ambiente próprios. [Configuração EAS](https://docs.expo.dev/eas/json/) · [Variáveis EAS](https://docs.expo.dev/eas/environment-variables/)

## Ações da conta e da infraestrutura da equipe

| Ação | Condição e verificação |
| --- | --- |
| Disponibilizar a API | Usar infraestrutura autorizada, banco de avaliação persistente e TLS. Validar `GET /v1/health` a partir de outra rede e testar persistência após reiniciar somente a API. |
| Vincular o projeto e assinar | Um integrante autorizado entra na conta Expo, confirma o projeto e seleciona a chave de assinatura da equipe para o identificador Android. Em instalações já distribuídas, conferir a impressão digital esperada antes do build. |
| Configurar a URL pública | Definir `EXPO_PUBLIC_API_URL` como variável `plaintext` no ambiente `production`. JWT, URL privada do banco, senhas e chave Gemini ficam no servidor. |
| Construir remotamente | Executar o perfil `production-apk` na conta autorizada e registrar o ID, o endereço privado do artefato e o SHA-256. |
| Distribuir o APK | Compartilhar só pelo canal de avaliação autorizado, depois do ensaio de instalação. |
| Enviar a entrega | O responsável da equipe envia uma entrega e registra o comprovante no canal da disciplina. |

Depois de autorizado o vínculo com o projeto da equipe, rodar em `mobile`.

```powershell
npx eas-cli@16.32.0 whoami
npx eas-cli@16.32.0 init
npx eas-cli@16.32.0 env:list --environment production
npx eas-cli@16.32.0 credentials --platform android
npx eas-cli@16.32.0 build --platform android --profile production-apk
```

Crie ou altere a variável `EXPO_PUBLIC_API_URL` no dashboard de produção da equipe, se necessário. Valide o endpoint real com `curl.exe -f "$env:EXPO_PUBLIC_API_URL/health"` após definir a variável nesse terminal. [Guia de APK do EAS](https://docs.expo.dev/build-reference/apk/) · [Credenciais de assinatura](https://docs.expo.dev/app-signing/app-credentials/)

## Ensaio de instalação limpa do APK

1. Registre o aparelho e a versão Android. Use um aparelho de ensaio sem dados reais do EntreNoites. Se houver um development build com outra assinatura, use um dispositivo de teste limpo ou retire a instalação antiga do aparelho descartável.
2. Execute `apksigner verify --print-certs EntreNoites.apk`, compare a impressão digital com a chave da equipe e calcule `Get-FileHash -Algorithm SHA256 EntreNoites.apk`. Instale com `adb install EntreNoites.apk`.
3. Com o Metro encerrado, abra pela lista de apps. Em outra rede, cadastre duas contas fictícias, aceite, grave e reabra uma noite, verifique isolamento e teste um cartão com inferência real na instalação autorizada.
4. Salve o PDF, feche o app, desligue a rede e abra o arquivo em Arquivos. Registre a última linha e o resultado. Anote URL real, aparelho, Android, ID do build e duração da execução no relatório. [Roteiro da demonstração](contribuicoes.md#roteiro-de-demonstração)

## ZIP privado

No diretório de preparação privado fora do Git, monte `ambiente-app-sono.zip` contendo `backend/.env` e `mobile/.env`, com esses caminhos na raiz do arquivo. Use credenciais dedicadas e revogáveis, um banco de avaliação com dados fictícios e o canal privado aprovado pela equipe. Depois de preencher os dois arquivos de configuração, substitua os caminhos locais no exemplo e monte o pacote.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$configuracao = 'C:\preparo-privado\configuracao'
$zip = 'C:\preparo-privado\ambiente-app-sono.zip'
$checkout = 'C:\src\entrenoites-teste'
[IO.Compression.ZipFile]::CreateFromDirectory($configuracao, $zip)
$arquivo = [IO.Compression.ZipFile]::OpenRead($zip)
try { $arquivo.Entries.FullName } finally { $arquivo.Dispose() }
# Confira que os dois caminhos são backend/.env e mobile/.env antes de extrair.
[IO.Compression.ZipFile]::ExtractToDirectory($zip, $checkout)
```

Execute `npm ci`, `npm run build`, `npm run db:init` e `npm start` no backend. Verifique `/v1/health`, execute o app e registre os resultados. Confira que o Git ignora os arquivos privados.

## Execução do pacote local de avaliação

Use Windows x64 com Git, Node 22 a partir de 22.13, npm 10, Android Studio e Android SDK. Clone o repositório em um caminho curto e extraia o ZIP na raiz do checkout. O arquivo `avaliacao/LEIA-ME.txt` traz os mesmos passos para consulta durante a instalação.

```powershell
git clone https://github.com/JVGomes6/TblFinal_DEVAPP.git C:\src\entrenoites-avaliacao
Set-Location C:\src\entrenoites-avaliacao
# Extraia o ZIP nesta pasta antes de prosseguir.
npm.cmd --prefix backend ci
npm.cmd --prefix backend run build
npm.cmd --prefix avaliacao ci
node avaliacao/iniciar.mjs
```

O inicializador cria um PostgreSQL 18.6 local com banco vazio e persiste os registros em `avaliacao/dados-postgres`. Use contas e registros fictícios. Mantenha o terminal aberto durante o teste. A API de desenvolvimento usa a porta 3336, a API HTTPS local usa a 3443 e o banco usa a 55433.

### Instalar o APK de avaliação

Abra o emulador Android ou conecte por USB um aparelho Android com depuração ativada. Na raiz do checkout, em outro PowerShell:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices
& $adb reverse tcp:3443 tcp:3443
& $adb install -r .\avaliacao\EntreNoites-Avaliacao.apk
```

Abra **EntreNoites Avaliação**. A edição local usa um bundle de release, assinatura Android de teste e o pacote `br.edu.appsono.entrenoites.avaliacao`. A conexão com o backend é feita por HTTPS em `localhost` via ADB. O certificado é confiado somente nessa edição do app, e o Metro pode ficar desligado. Se houver mais de um dispositivo, acrescente `-s <id-do-dispositivo>` após `$adb` nos comandos de instalação e redirecionamento.

### Executar pelo código-fonte

Com o inicializador e o emulador abertos, execute os comandos da seção **Mobile** do README. O `mobile/.env` incluído no ZIP aponta para `http://10.0.2.2:3336/v1`. A prévia da reflexão usa dados locais, e a geração do cartão requer acesso ao Gemini a partir do backend. [Execução do mobile](../README.md#4-execução-em-ambiente-de-desenvolvimento)

## Resultados e pendências

| Verificação | Resultado |
| --- | --- |
| Cópia limpa | A cópia dos arquivos candidatos à entrega passou em `npm ci` nos dois projetos, build do backend, typecheck do mobile e verificação de dependências Expo. Uma repetição independente por colega segue pendente. |
| ZIP fictício inicial | A extração em cópia limpa conferiu os dois caminhos. `db:init` e a API iniciaram com o `.env` extraído. A API respondeu `200` em `GET /v1/health`. O ambiente hospedado de avaliação depende da infraestrutura da equipe. |
| Git e segredos | Gitleaks `8.30.1` reportou zero ocorrências nos dois commits de todos os refs locais e na cópia dos arquivos candidatos à entrega. `git check-ignore` confirmou os dois `.env`, `mobile/credentials.json` e o ZIP. O endereço público retornou HTTP `200` em consulta sem autenticação. |
| Configuração EAS | CLI `16.32.0` executada. O validador local aceitou `https://avaliacao.example.invalid/v1` e recusou URL HTTP do emulador, HTTPS em loopback e variável ausente. `eas config --platform android --profile production-apk --non-interactive --json` exigiu uma conta Expo. |
| Build local de teste | `:app:assembleRelease -PreactNativeArchitectures=x86_64` passou com Gradle `8.14.3` e JDK `17.0.21+9` em caminho curto. No caminho do OneDrive, o CMake encontrou o limite de 260 caracteres. `aapt` confirmou nome, `1.0.0`, código `1` e pacote esperado. `apksigner` validou a assinatura v2 da chave Android Debug. O bundle incluiu a URL HTTPS fictícia. |
| Instalação limpa com Metro encerrado | `adb install` e o início a frio passaram no emulador `Medium_Phone_API_37.0`, Android 17/API 37, `x86_64`. A tela inicial apresentou Entrar, Criar conta e Privacidade. A URL fictícia limitou este ensaio à inicialização. [Tela inicial do APK](evidencias/etapa8/apk-local-sem-metro.png) |
| Build EAS e assinatura da equipe | ID pendente. A impressão digital da assinatura e as variáveis do ambiente `production` dependem do projeto e da conta Expo da equipe. |
| API e demonstração de avaliação | Endpoint HTTPS real pendente. Persistência, cartão real e PDF offline no APK de avaliação dependem da infraestrutura autorizada. A configuração SQLite/Ollama pedida para avaliação também aguarda confirmação da equipe. O PDF offline foi reproduzido separadamente no development build. [Ensaio funcional](verificacao.md#percursos-de-ponta-a-ponta) |

O APK local de teste tem SHA-256 `4c6f07e0d80d51b1239e4da8638cf95bd406699a3019afad0d3d3b0da88804ba`. A impressão digital SHA-256 do certificado de testes é `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`.

### Ensaio do pacote local de 23/11/2026

- Em uma cópia limpa do código, o inicializador do ZIP preparou o PostgreSQL 18.6 e respondeu a `GET /v1/health` por HTTPS com o certificado local. Os 15 testes do backend passaram, incluindo autorização, persistência, isolamento e geração com o transporte Gemini simulado.
- O Gradle 9.4.1 gerou o APK de avaliação com JBR 25 para `x86_64` e `arm64-v8a`. A assinatura Android de teste foi verificada. No emulador `x86_64`, o APK abriu com o bundle embarcado, autenticou uma conta fictícia e exibiu a noite de 430 minutos após fechar e reabrir. Também conferimos o botão **Confirmar e voltar** e salvamos um PDF com os dados dessa noite.
- No ensaio com o provedor real, a prévia respondeu `200` e a geração do cartão respondeu `503 CARTAO_INDISPONIVEL`. O APK assinado pela equipe e o endpoint hospedado continuam pendentes.

O arquivo `EntreNoites-Avaliacao.apk` desse pacote tem SHA-256 `c9d02399cb2e38125c5d7adbc716defc9172f72fafa202ea59bfb08db2328439`.

Para repetir a verificação de segredos, use Gitleaks `8.30.1` no repositório e em uma cópia dos arquivos listados por `git ls-files --cached --others --exclude-standard` que serão incluídos na entrega.

```powershell
gitleaks git . --redact=100 --log-opts=--all
gitleaks dir C:\src\copia-candidata --redact=100
git check-ignore backend/.env mobile/.env mobile/credentials.json ambiente-app-sono.zip
```
