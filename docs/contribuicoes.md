# Contribuições e demonstração

## Divisão definitiva da equipe

| Membro | Telas | Código do aplicativo (React Native) | Código das APIs, do banco de dados ou da IAGen | Itens do documento |
| --- | --- | --- | --- | --- |
| Gabriel Trichez Dias | Cadastro, Login, Privacidade e ações de conta em Configurações | Navegação, `AuthContext`, sessão, comunicação com a API de conta e consentimento | Autenticação, usuários, JWT, hash de senha, autorização, consentimento e tabelas de conta | Apresentação, tecnologias, arquitetura e segurança/LGPD |
| Rafael Aranao Correa | Home, Registrar noite, Editar noite, Histórico, Detalhe da noite e Rotina | Formulário do diário, hooks, serviços de sono, fluxos de registros e Home contextual | CRUD, validação, métricas, repositório PostgreSQL e esquema do diário | Execução em desenvolvimento, qualidade, responsividade, contexto e itens de IHC/UX do diário |
| Joao Vitor de Oliveira Gomes | Relatório, Reflexão e preferências visuais em Configurações | PDF, serviços e fluxo da reflexão, preferências e alto contraste | API de relatórios, Gemini, prévia, autorização, materiais da IAGen e composição do cartão | Geração do APK, acessibilidade, itens de IHC/UX da reflexão e do relatório, inovação e revisão da entrega |

Esta é a divisão definitiva informada pela equipe. Todos possuem telas, código React Native, uma parte técnica de API/banco/IAGen conforme sua frente e uma parte da documentação para apresentar e explicar.

## Parte A — Conta, privacidade e segurança

**Responsável: Gabriel Trichez Dias**

**Telas:**

- Cadastro.
- Login.
- Privacidade.
- Ações relacionadas à conta em Configurações.

**React Native:**

- Navegação pública e autenticada.
- `AuthContext` e gerenciamento da sessão.
- Comunicação de usuário e conta com a API.
- Consentimento e fluxos relacionados à conta.

**Backend/banco:**

- Autenticação e usuários.
- JWT e proteção das senhas.
- Autorização e consentimento.
- Tabelas relacionadas à conta.

**Documentação:** apresentação do aplicativo, tecnologias, decisões arquiteturais e segurança/LGPD.

## Parte B — Diário e núcleo funcional

**Responsável: Rafael Aranao Correa**

**Telas:**

- Home.
- Registrar noite.
- Editar noite.
- Histórico.
- Detalhe da noite.
- Rotina.

**React Native:**

- Formulário do diário e hooks.
- Serviços de sono.
- Listagem, consulta e edição dos registros.
- Tratamento de estados de carregamento, erro e resultado.
- Comportamento contextual por horário.

**Backend/banco:**

- CRUD dos registros de sono.
- Validação e métricas.
- Repositório PostgreSQL.
- Estrutura dos registros de sono.

**Documentação:** execução em desenvolvimento, requisitos de qualidade, responsividade, sensibilidade ao contexto e parte dos itens de IHC/UX.

## Parte C — Relatório, IAGen e acessibilidade

**Responsável: Joao Vitor de Oliveira Gomes**

**Telas:**

- Relatório.
- Reflexão.
- Preferências visuais em Configurações.

**React Native:**

- Geração, salvamento e compartilhamento do PDF.
- Fluxo da reflexão.
- Preferências persistentes e alto contraste.
- Integração com relatório e IA.

**Backend/IAGen:**

- API de relatórios.
- Integração Gemini.
- Prévia e autorização do envio.
- Materiais da IAGen.
- Composição do cartão.

**Documentação:** geração do APK, acessibilidade, demais itens de IHC/UX, criatividade/inovação e revisão da entrega.

## Equilíbrio das responsabilidades

- **Parte A:** integra identidade, autenticação, autorização, consentimento, LGPD e banco. Abrange os fluxos de entrada e os controles de acesso e privacidade que sustentam o restante do aplicativo.
- **Parte B:** concentra o CRUD e o núcleo funcional do aplicativo, incluindo registros, histórico, validações, métricas e comportamento da Home.
- **Parte C:** concentra PDF, integração com IAGen, acessibilidade e distribuição, ligando os dados do diário à exportação e à reflexão opcional.

As três partes possuem carga e responsabilidade técnicas comparáveis: cada integrante conecta telas e código React Native a regras de API, banco ou IAGen, além de responder por documentação e demonstração. Todos terão código React Native para apresentar. As fronteiras se complementam: a Parte A trata os controles de conta, a Parte B produz e revisa os registros e a Parte C usa os relatórios e as preferências visuais na exportação e na reflexão.

## Histórico e assistência de IA

Os commits `37b8e32` e `465e36c` registram o autor Git `rafaelaranaoo`. O primeiro adiciona backend e esquema; o segundo atualiza backend, mobile e integração com IA. Esse registro de versionamento não representa, por si só, toda a divisão de responsabilidades, definida acima pela equipe.

As etapas de implementação e verificação foram assistidas por IA. As instruções do projeto confirmaram a stack corrigida e limitaram o ensaio do Gemini a testes locais. A integração existente e seus limites estão no [registro de ideação](../ai-materials/ideacao.md) e no [contrato e ensaio local do Gemini](verificacao-reflexao-gemini.md). Este documento não acrescenta validação de inferência real ou em produção.

## Roteiro de demonstração

Use somente contas, senhas e registros fictícios. Prepare o banco e o app conforme o [README](../README.md#4-execução-em-ambiente-de-desenvolvimento) e os [exemplos de demonstração](inicializacao-backend.md#dados-fictícios-para-demonstração). Para a Reflexão, habilite o Gemini no backend e confirme a geração com uma conta fictícia antes da apresentação.

### Gabriel Trichez Dias — Parte A

1. Apresente o tema, o público-alvo, o caráter de acompanhamento e os limites não clínicos do aplicativo.
2. Demonstre Cadastro, Login e a separação entre navegação pública e autenticada. Mostre a política de privacidade e o aceite antes do acesso ao diário.
3. Explique no React Native o `AuthContext`, a sessão no SecureStore e a comunicação das ações de conta com a API. Relacione esses pontos à autenticação JWT, à proteção das senhas e às tabelas de conta.
4. Com Aurora e Brisa previamente preparadas, mostre o isolamento por titular e explique a diferença entre revogar consentimento, apagar o diário e excluir a conta. Execute ações destrutivas somente em uma conta fictícia reservada para esse trecho, após a demonstração dos registros e relatórios.
5. Relacione o percurso às seções de apresentação, tecnologias, arquitetura e segurança/LGPD, sem afirmar que as pendências institucionais de uso com dados reais foram resolvidas.

### Rafael Aranao Correa — Parte B

1. Mostre a Home e explique como o horário local altera a prioridade entre registrar uma noite e preparar a rotina. Demonstre a definição, alteração ou remoção da meta de horário e a consulta na tela Rotina.
2. Registre uma noite fictícia com deitar às 23:00, adormecer às 23:30 e despertar às 07:00 do dia seguinte, com 20 minutos acordado e um despertar. Abra o detalhe e confira `7h10`.
3. Localize a noite no Histórico, edite a anotação fictícia e reabra o detalhe. Demonstre a exclusão em um registro reservado para essa ação.
4. Apresente o formulário, os hooks e os serviços de sono no React Native. Explique como CRUD, validação, métricas e repositório PostgreSQL sustentam esses fluxos.
5. Mostre os estados de erro e carregamento e relacione-os à execução em desenvolvimento, à qualidade, à responsividade e aos itens de IHC/UX da sua frente.

### Joao Vitor de Oliveira Gomes — Parte C

1. Mostre a personalização persistente do destaque da Home e o alto contraste em Configurações. Explique as adaptações à fonte do sistema e os limites do ensaio parcial com TalkBack.
2. Abra o Relatório, selecione o período e consulte a prévia. Salve o PDF em uma pasta escolhida e mostre a ação separada de compartilhamento. Depois, feche o app, desligue a rede e abra o PDF pelo gerenciador de arquivos; restabeleça a rede antes de continuar.
3. Na Reflexão, escolha o foco, consulte a prévia e autorize a geração do cartão. Explique as categorias enviadas, a autorização por envio, a integração backend/Gemini e a seleção de IDs do catálogo.
4. Apresente o fluxo React Native, os serviços de relatório e reflexão, os materiais da IAGen e a composição do cartão. Use as evidências do ensaio com transporte simulado para explicar a observação, a pergunta que pode ser pulada e o retorno ao histórico do período.
5. Explique o perfil `production-apk`, as etapas de assinatura, o ZIP privado e as pendências da entrega. Relacione a demonstração às seções de acessibilidade e criatividade/inovação.

Planejamento sugerido: quatro minutos por integrante e três para perguntas, ajustado ao tempo oficial da disciplina; o anexo também menciona cinco minutos por integrante em H4. Façam a revisão cruzada e a conferência da entrega antes do envio único pelo canal da disciplina. Cada integrante responde ao questionário individual.

[Verificação](verificacao.md) · [Roteiro de instalação e APK](entrega-apk.md) · [Entrega na UFPR Virtual](https://ufprvirtual.ufpr.br/mod/assign/view.php?id=1778203) · [Questionário individual](https://forms.gle/s2nTEjooigXVWJtM6)
