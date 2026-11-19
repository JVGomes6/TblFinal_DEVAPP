# Arquitetura do EntreNoites

## 1. Produto

Diário autorrelatado com conta, consentimento, histórico, métricas de sono, exportação e cartão opcional. Os cálculos descrevem os registros informados. A demonstração acadêmica usa dados fictícios.

## 2. Stack e versões

| Camada | Versão verificada |
| --- | --- |
| Ensaio | Node 22.23.5, npm 10.9.11, PostgreSQL 18.6 local |
| App | Expo 54.0.38, React 19.1.0, React Native 0.81.5 |
| PDF | expo-print 15.0.8, expo-file-system 19.0.24 e expo-sharing 14.0.8 |
| API | Express 5.3.0, pg 8.23.1, zod 4.6.7 |
| Autenticação | bcryptjs 3.0.3, jose 6.2.18 |
| Reflexão | @google/genai 1.52.0, modelo solicitado `gemini-2.5-flash`, catálogo `cartao-1` |

As decisões confirmadas durante a implementação substituíram SQLite, Argon2id e Ollama por PostgreSQL, bcryptjs e Gemini. O roteiro de produção corresponde à implementação versionada. A instalação SQLite/Ollama citada no enunciado da Etapa 9 exigiria outra implementação e outro ensaio. O Gemini é um serviço remoto com modelo identificado na resposta e sem digest local de pesos. [Limites do ensaio do Gemini](verificacao-reflexao-gemini.md)

O ensaio consultou `SHOW server_version` no PostgreSQL local. O manifesto oficial da imagem Docker `postgres:18.6`, indicada no README como opção de instalação, retornou `sha256:e3d24f6906d0760bf4da0dae872415391ededefad23fd471c47dc53b0ddf3c42` no cabeçalho `Docker-Content-Digest`. [Imagem oficial PostgreSQL](https://hub.docker.com/_/postgres)

SHA-256 dos materiais no checkout examinado, calculados com `Get-FileHash -Algorithm SHA256` nos três arquivos abaixo. O hash dos bytes depende inclusive da terminação de linha do checkout.

| Material | SHA-256 |
| --- | --- |
| `catalogo.json` | `03b6c91fb58e877c4b84865e00bf1b5260cd58b9725c6f2d3619c28e3efe32a9` |
| `resposta.schema.json` | `4ce8bcdea7196c1a130a7d67b4c48edaf501bc1a9bb8c455efa026e45a8132a5` |
| `system.pt-BR.txt` | `a1df1e32181a8e7bd07a48f6f8b50242b1cbe3ddec786d77ffe50f04b07fdba8` |

## 3. Sistema e repositório

`mobile` contém navegação, estado da sessão e preferências, cliente HTTP, diário, reflexão e PDF. `backend` contém Express, autorização e acesso PostgreSQL por Pool. `database` contém o esquema e exemplos fictícios. `ai-materials` contém instrução, catálogo, esquema e registro de ideação.

## 4. Dados e persistência

O esquema usa UUID, timestamps inteiros, restrições de escala e unicidade por conta e data de despertar. Usuários, consentimento e registros são isolados por titular. Revogação e escritas usam bloqueio da linha da conta e revisão de consentimento. A exclusão usa chave estrangeira com cascade. [Esquema PostgreSQL](../database/init.sql) · [Inicialização](inicializacao-backend.md)

## 5. API e IA

As rotas `/v1/auth/*` e `/v1/users/me*` tratam conta e consentimento. `/v1/sleep` expõe CRUD e paginação por data. `/v1/reports/sleep` agrega até 31 dias, com distribuição por humor e Spearman descritivo. `/v1/ai/preview` retorna categorias, contagem local e hash. `/v1/ai/ritual` exige autorização específica, revalida a prévia antes do envio e revalida consentimento após a inferência. O Google recebe somente categorias agregadas do diário, além dos materiais fixos da geração. [Verificação do contrato de reflexão](verificacao-reflexao-gemini.md)

## 6. Frontend e fluxos

A navegação limita as telas de saúde às sessões consentidas. O formulário único preserva fuso e offset, suporta reenvio por UUID e apresenta conflitos de versão. A Home e o relatório usam a mesma consulta. A exportação monta HTML A4 local, salva por seletor de pasta no Android e oferece a folha de compartilhamento no iOS. [Diário](verificacao-diario-android.md) · [PDF](verificacao-relatorio-pdf.md)

## 7. IHC e acessibilidade

O app adapta ação principal e tema ao horário local, com alto contraste de preferência. O relatório de testes registra os dez itens TrackWell, tamanhos de tela, teclado, razões de contraste e alcance do ensaio com TalkBack. [Verificação](verificacao.md)

## 8. Segurança e privacidade

JWT HS256 validado com `jose`, revisão de sessão e segredo do servidor. Senhas com bcryptjs, sal e pré-hash para permitir frases longas. As consultas filtram por titular e usam parâmetros PostgreSQL. A revogação elimina o diário e a meta, e o app remove telas privadas e dados transitórios conforme a sessão. O APK de avaliação exige API HTTPS. A equipe precisa confirmar identidade institucional do responsável, canal de atendimento, hospedagem, retenção de dados e backups e os operadores antes de permitir uso com dados reais. [Pendências institucionais](verificacao-painel-conta.md#dados-institucionais-pendentes)

## 9. Inovação e comparativo

No recorte acadêmico do anexo, Sleep Cycle é usado como referência de acompanhamento por sensores e Calm como referência de conteúdo para a rotina. O EntreNoites combina relato manual, prévia explícita do envio e retorno aos registros que sustentam a observação. [Ideação e revisão](../ai-materials/ideacao.md)

## 10. Entrega e demonstração

As instruções separam instalação de desenvolvimento, APK de avaliação, preparação do ZIP privado e ações na infraestrutura da equipe. O registro de verificação informa o ambiente realmente executado. [Entrega e APK](entrega-apk.md) · [Roteiro e autoria](contribuicoes.md) · [Verificação](verificacao.md)
