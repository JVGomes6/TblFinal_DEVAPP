# EntreNoites · diagnóstico e prompts de implementação

Análise de 18/11/2026 sobre o commit `465e36c`, comparado à especificação `Arquitetura_app_sono.md` de 17/11/2026. O anexo foi usado como referência de produto e arquitetura. Os blocos abaixo são prompts para execução futura, um por vez.

## Estado atual

| Área | O que encontrei | Lacuna para fechar |
| --- | --- | --- |
| Ambiente de teste | `backend/.env.example` e `mobile/.env.example` existem. Android SDK e dois AVDs estão instalados. | Sem os dois `.env`, API em execução ou dispositivo conectado na verificação. O host usa Node 24.15.0/npm 11.12.1 e a arquitetura pede Node 22/npm 10. Falta comprovar instalação limpa e persistência. |
| Banco | `database/init.sql`, uma migração PostgreSQL e acesso via `pg`. O backend já implementa transações e mantém uma revisão interna do consentimento. | A arquitetura pede SQLite com `better-sqlite3`, inicialização local idempotente, migrações e dados fictícios. A troca afeta todos os repositórios e a serialização entre revogação e gravação. |
| Conta, sessão e consentimento | A API tem cadastro, login, logout, perfil, preferências, aceite, revogação e exclusão. O app já tem sessão no SecureStore, telas públicas, consentimento e conta básica. | Trocar bcrypt por Argon2id e `jsonwebtoken` por `jose`, como especificado. Configurações ainda só permite editar alto contraste. Faltam destaque, meta ajustável, revogação e exclusão pela interface. O texto de privacidade é parcial e nomeia o Gemini. |
| Diário | A API tem CRUD, validação de fuso e horários, filtros, paginação, versão e fluxo de reenvio por ID. | O app ainda não tem formulário, histórico, detalhe, exclusão de noite ou integração com `/sleep`. A Home atual é uma tela base com acesso a Configurações. |
| Painel e PDF | Backend agrega episódios, grupos por humor e Spearman em `sleep/metrics.ts`; existe `GET /v1/reports/sleep`. O app já declara dependências nativas de impressão, arquivos e compartilhamento. | Faltam painel com cobertura e lacunas, tela de relatório, prévia e salvamento comprovado no Android. |
| Reflexão | Existem rotas de prévia e ritual, hash, catálogo de trechos, schema de resposta, limitação e revalidação do consentimento. O adaptador atual usa Google Gemini. | Trocar para Ollama privado com `qwen2.5:3b`. Faltam tela, confirmação por cartão, ligação com registros, casos de teste e evidência de chamada real. |
| IHC e acessibilidade | Há paletas, modo noturno, opção de alto contraste, Safe Area e alguns controles com rótulos. | Aplicar os comportamentos às telas do diário, testar TalkBack, fonte a 200%, tamanhos de tela e teclado. Demonstrar os dez itens PHI previstos no anexo. |
| Evidências e entrega | Há arquivos de lock e configuração básica do app Android. `npm run build` no backend e `npm run typecheck` no mobile passaram na máquina atual. | Sem suíte automatizada versionada, README, guia de verificação, contribuições, registro de ideação ou perfil EAS. Cadastro, CRUD, cartão, PDF e APK ainda precisam de ensaio. |

### Ordem sugerida

**1 → 2 → 3** produz o primeiro teste útil no Android: criar conta, aceitar o termo, registrar uma noite e reabri-la após reiniciar a API. **4** completa conta e painel. **5 → 6** entrega a reflexão. **7** pode começar após 4 e é independente do cartão. **8 → 9** fecha a verificação e a entrega.

O plano assume conformidade com a stack do anexo. Manter PostgreSQL, Gemini, bcrypt ou `jsonwebtoken` mudaria a arquitetura de entrega e exigiria uma decisão explícita da equipe. Se houver um banco PostgreSQL em uso, decidir o tratamento dele antes de trocar a configuração do ambiente existente. A demonstração pode começar com SQLite novo e dados fictícios.

## Prompts prontos para copiar

Abra cada etapa com a especificação disponível. Quando o anexo estiver fora do contexto do assistente, reanexe `Arquitetura_app_sono.md`. Execute um prompt por vez e use os critérios de aceite para decidir se a etapa seguinte pode começar.

### 1. Fazer o backend rodar localmente com SQLite

```text
No repositório EntreNoites, use as seções 2 a 5 e 10 de Arquitetura_app_sono.md como referência. Implemente a persistência SQLite com better-sqlite3 na linha Node 22/npm 10. Inspecione antes os repositórios PostgreSQL, as rotas e a revisão interna de consentimento. Preserve os contratos /v1, os tipos públicos, as validações e os códigos de erro que já atendem à especificação.

Migre as consultas de usuários, diário e relatórios para SQL parametrizado em SQLite. Use tabelas STRICT, foreign_keys, WAL, busy_timeout, duração gerada, unicidade por titular/data e migrações numeradas. Preserve a revisão de consentimento usada para invalidar operações em andamento. Garanta que revogação, revalidação de autorização e escritas do diário usem transações curtas com a ordem correta. Mantenha a inferência fora das transações.

Adicione DB_PATH, db:init idempotente, guia curto de inicialização, .nvmrc, arquivos de lock coerentes e ignore arquivos de banco, WAL e configuração privada. Use um SQLite novo para a demonstração. Se localizar um banco existente, preserve-o e reporte a necessidade de uma migração autorizada. Configure um ambiente local de teste com segredo gerado no host sem exibi-lo. Deixe a API funcionar com a IA desligada.

Aceite: npm ci e build na linha Node 22/npm 10; db:init executado duas vezes sem perder uma noite fictícia; /v1/health retorna 200 usando o banco local; uma noite de 430 minutos continua acessível depois de reiniciar a API. Liste os comandos executados e as verificações que ficaram pendentes.
```

### 2. Adequar autenticação e comprovar o contrato da API

```text
Com o SQLite local funcionando, adapte a autenticação já implementada no backend às seções 5 e 8 de Arquitetura_app_sono.md. Use Argon2id com sal por senha, parâmetros mínimos descritos no anexo e suporte a frases de 12 a 128 caracteres. Use jose para HS256, validando algoritmo, emissor, audiência, sub, exp e revisão de sessão. Preserve os DTOs, a resposta genérica do login e a proteção contra enumeração de contas. Se houver contas legadas cuja migração foi autorizada, trate os hashes existentes e documente a compatibilidade antes de remover qualquer verificador.

Adicione testes automatizados com o executor do Node e SQLite temporário. Use duas contas fictícias com noites na mesma data. Cubra login/logout, sessão inválida, recusa e reaceite, revogação concorrente com escrita, exclusão em cascata, isolamento de diário e relatório, paginação, reenvio com UUID, edição concorrente, If-Match, offset/fuso e duração de 430 minutos. Exercite a API pelo contrato público. Adicione fixtures fictícias reutilizáveis para a demonstração.

Aceite: testes reproduzíveis sem Ollama nem banco remoto; rotas de diário, relatório e reflexão bloqueadas antes do aceite; usuário alheio recebe o mesmo 404 de recurso inexistente; reaceite após revogação abre diário vazio; relatório e prévia permanecem isolados por conta. Entregue o comando de testes e os resultados.
```

### 3. Entregar o diário testável no Android

```text
Implemente o diário mobile conforme a seção 6 de Arquitetura_app_sono.md. Reuse o cliente HTTP, AuthContext, SecureStore, PreferencesContext e RootNavigator existentes. Adicione o serviço sleep, formulário único de criação/edição, histórico paginado com FlatList e filtros, detalhe e confirmação de exclusão. Dê acesso a “Registrar minha primeira noite” a partir da Home. Registre as telas privadas somente com consentimento vigente e passe IDs nas rotas.

Mostre data e hora de deitar, adormecer e despertar, inclusive na virada de data. Envie horário com offset coerente com o fuso IANA. Preserve a distinção entre null, zero e falso. Inclua escalas com legenda, seção opcional, estimativa no formulário, validação por campo e confirmação ao descartar edição. Reuse o UUID no reenvio e consulte o ID após resposta incerta; trate conflito de edição sem perder as mudanças locais e envie a versão vista em If-Match na exclusão. Atualize detalhe e histórico após mutações. Cancele consultas antigas e mantenha filtros ao voltar do detalhe.

Prepare .env local com a URL adequada ao emulador e use o development build. Aceite: typecheck passa e, no Android conectado à API, cadastro → login → aceite → criar noite → reabrir → editar → filtrar → apagar funciona com dados fictícios. Confirme separadamente que uma noite pode ser reaberta após reiniciar a API. Se o teste em aparelho estiver bloqueado, registre o erro observado e o último ponto comprovado.
```

### 4. Completar painel, preferências e controle da conta

```text
Complete a Home e Configurações conforme as seções 6 a 8 de Arquitetura_app_sono.md. Consuma GET /v1/reports/sleep para mostrar duração, período, número de noites, dias sem registro e distribuição por humor com alternativa textual. Use o destaque persistido duração/humor para definir a ordem dos cartões. Reuse useNightContext para alternar ênfase entre registro e preparação da rotina, mantendo ambos os percursos acessíveis. Distinga estado vazio, consulta em andamento e falha de rede.

Em Configurações, conecte destaque, horário desejado removível e alto contraste ao PATCH de perfil. Exiba confirmação após persistir. Implemente revogar consentimento e excluir conta em fluxos distintos, cada um com senha, confirmação e efeitos claros. Reuse as ações existentes do AuthContext; ao revogar ou apagar, remova da navegação e da memória as telas do diário afetadas. Mantenha conta e política acessíveis para quem recusar ou revogar. Complete o conteúdo de privacidade com os dados confirmados da instalação e marque dados institucionais pendentes no relatório de verificação.

Aceite: salvar a preferência e iniciar outra sessão mantém a ordem escolhida; limpar a meta persiste; três noites em sete dias mostram cobertura parcial; uma noite de 430 minutos aparece como 7h10; revogar deixa a conta disponível e reaceitar abre diário vazio; excluir encerra a sessão. Valide com typecheck e registre o ensaio com duas contas fictícias.
```

### 5. Migrar a geração para Ollama e validar uma chamada real

```text
Alinhe apenas o backend de reflexão às seções 2, 5 e 8 de Arquitetura_app_sono.md. Substitua Gemini por Ollama privado e qwen2.5:3b usando /api/chat, JSON Schema com enums compatíveis por papel, stream:false, limites de geração, timeout e cancelamento. Carregue configuração e origem pelo servidor. Remova a dependência e variáveis de Gemini. Atualize o nome do serviço no aviso de privacidade em conjunto com a troca efetiva.

Reuse catálogo, regras de foco/cobertura/fator, agregação, prévia e revalidação pós-inferência. O contexto variável deve conter somente categorias permitidas; contagem, observação, e-mail, notas, horários, datas e identificadores ficam fora dele. Compare o hash antes da chamada e valide novamente os três IDs retornados pelo modelo. Mantenha um pedido ativo por conta e os limites da especificação. Se o provedor estiver indisponível, devolva erro em português mantendo diário e relatório operantes.

Aceite: teste com provedor simulado demonstra prévia desatualizada, conta sem aceite, cancelamento, resposta inválida e revogação durante inferência. Valide também zero noites, fator dominante e empate. Rode uma chamada real local com dados fictícios, confirme que o cartão contém somente trechos do catálogo e registre versão do Ollama, digest do modelo e duração fria/quente observada. Diferencie o teste simulado do teste real.
```

### 6. Expor o cartão de reflexão no app

```text
Adicione a tela de cartão de reflexão ao mobile, conforme as seções 5 a 7 de Arquitetura_app_sono.md. Reuse a navegação privada e o cliente HTTP existentes. Implemente a escolha entre rotina, humor e descanso, obtenção de prévia e exibição do texto exato de contexto variável destinado ao modelo antes do botão “Autorizar e gerar este cartão”. Mostre a identificação do serviço, o caráter opcional da geração e a contagem somente na interface.

Ao mudar foco ou data, invalide a prévia. Em 409, solicite nova prévia e nova autorização explícita. Bloqueie duplo envio e cancele consultas ao sair. Em falha, permita tentar novamente com confirmação do usuário. Exiba origem, observação server-side, pergunta e fecho. Ofereça acesso ao histórico no período que explica a observação e permita pular a pergunta. Remova resultados em andamento da interface após revogação, exclusão ou troca de sessão.

Aceite: voltar da prévia não chama /ritual; cada geração requer confirmação; zero noites tem mensagem adequada; contexto alterado exige confirmação nova; cartão gerado com Ollama abre o histórico correspondente; falha do modelo gera estado recuperável. Valide no Android e com typecheck.
```

### 7. Gerar e salvar o PDF no aparelho

```text
Implemente a tela de relatório e o salvamento do PDF, seguindo as seções 5 a 7 de Arquitetura_app_sono.md. Reuse o serviço GET /v1/reports/sleep já consumido pelo painel. Permita últimos sete dias, mês civil e período personalizado de até 31 dias. Mostre alcance, cobertura, total de noites, dados por humor, motivo da ausência de Spearman quando aplicável e uma prévia antes de habilitar “Salvar PDF”.

Gere HTML de impressão A4 local com valores escapados, projeção permitida, cabeçalho de tabela repetido e rodapé sobre medidas autorrelatadas. O PDF omite e-mail, sonhos e notas privadas. Use expo-print e o seletor de pasta do Android via expo-file-system/legacy, confirme sucesso só após gravar, permita compartilhamento em ação separada e limpe temporários próprios. Trate cancelamento e gravação interrompida. No iOS, siga o fluxo de compartilhamento com orientação para salvar em Arquivos.

Aceite: com duas contas fictícias, salve um PDF semanal e um mensal, encontre-os no gerenciador de arquivos após fechar o app e abra-os sem rede. Confira os 430 minutos, as últimas linhas, o filtro por período e a ausência de dados da outra conta e de campos privados. Cancelar o seletor não mostra sucesso. Registre qual plataforma foi de fato testada.
```

### 8. Verificar IHC, acessibilidade e fluxos de ponta a ponta

```text
Faça uma rodada de verificação do EntreNoites com as seções 7, 8 e 10 de Arquitetura_app_sono.md. Registre os dez itens TrackWell do anexo (PHI 01, 02, 03, 04, 05, 07, 08, 09, 10 e 11) em docs/verificacao.md com tela, percurso e resultado observado. Use somente dados fictícios nas evidências.

Teste TalkBack, fonte a 200%, 320 dp, tela larga, paisagem, teclado, foco após erro e diálogos, botões de 48 dp e contraste efetivo, incluindo a meta de 7:1 para texto no modo alto contraste. Teste troca de período noturno/diurno, retorno ao primeiro plano, persistência de preferências e uso com conexão instável. Corrija defeitos que prejudiquem os percursos.

Reexecute o fluxo completo com duas contas, incluindo isolamento, revogação durante operação, datas ausentes, empate e variância zero no Spearman, criação com resposta perdida, Ollama desligado e PDF aberto offline. Meça o tempo de API para uma página de 20 noites e um relatório de até 31 dias na máquina de demonstração. Aceite: cada item tem resultado reproduzível, evidência ou bloqueio explícito; se houver falha, anote impacto e o passo de reprodução. Rode a suíte da API, build e typecheck ao finalizar.
```

### 9. Preparar entrega acadêmica e APK

```text
Prepare o EntreNoites para entrega seguindo a seção 10 de Arquitetura_app_sono.md. Crie o README na ordem exigida e organize docs/arquitetura.md, docs/verificacao.md, docs/contribuicoes.md e ai-materials/ideacao.md. Inclua comandos reproduzíveis, versões/digests verificados, divisão real do trabalho, roteiro de demonstração e registro da contribuição de IA com revisão humana. Sinalize campos institucionais e de autoria pendentes; use os resultados medidos nas etapas anteriores.

Crie o perfil EAS production-apk. Valide a configuração de assinatura, a variável pública no build e o endpoint HTTPS da API de avaliação, com SQLite persistente e Ollama privado. Confirme nomes e versões no app.json. Prepare o roteiro da instalação limpa, do APK com Metro desligado e do ZIP privado de configuração. Use conta, credenciais e infraestrutura da equipe quando houver autorização disponível. Separe a preparação local das ações de publicar, construir remotamente, distribuir e enviar a entrega; execute essas ações quando autorizadas.

Aceite: um colega consegue seguir o README em instalação limpa; APK assinado instala e executa com Metro desligado, gera um cartão real e salva um PDF que reabre offline; ZIP privado foi validado em uma extração limpa; Git e histórico foram verificados para segredos. Registre versão de CLI, ID do build, aparelho, endpoint real e verificações que dependam de credenciais ou autorização. Use somente dados fictícios no ensaio.
```
