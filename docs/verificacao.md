# Verificação do EntreNoites

## Ambiente e critérios

Ensaio com dados fictícios, Windows 11 Home (`10.0.26300`), Intel Core i5‑11300H com 4 núcleos e 8 processadores lógicos, 15,8 GiB de RAM, Node `22.23.5`, npm `10.9.11` e PostgreSQL 18.6 local. O development build Android foi executado no emulador `Medium_Phone_API_37.0`. A API usa PostgreSQL, bcryptjs, `jose` e o adaptador Gemini da stack corrigida. Para o modelo, o ensaio utiliza o transporte simulado ou a geração desativada. [Inicialização da API](inicializacao-backend.md) · [Development build](verificacao-diario-android.md) · [Contrato do Gemini](verificacao-reflexao-gemini.md)

As contas de ensaio usaram endereços `example.invalid`. O conjunto de desempenho usa outubro de 2024. A conta Aurora tem 29 noites, com os dias 13 e 20 ausentes, e a conta Brisa tem sete noites nas mesmas datas do início do mês. Use endereços, senhas e anotações fictícios para reproduzir o percurso.

## TrackWell

Mapeamento dos dez itens Personal Health Informatics conforme a seção 7 do anexo. [Guia TrackWell](https://educapes.capes.gov.br/bitstream/capes/1132272/6/Guia_TrackWell_10_051125_final_publicar.pdf)

| Item | Tela / componente | Percurso reproduzível | Resultado e evidência |
| --- | --- | --- | --- |
| PHI 01 · Reflexão conduzida pela pessoa | `Reflection` | Home → Cartão de reflexão → escolher foco → consultar prévia → autorizar → Pular pergunta | Com o transporte simulado, a observação de 7h10 e o fecho permaneceram na tela depois de pular a pergunta. [Cartão fictício](evidencias/etapa8/cartao-observacao.png) |
| PHI 02 · Revisitar registros | `Home`, `History`, `SleepDetail` | Abrir último registro da Home ou consultar Histórico e abrir uma noite | O detalhe apresenta as datas de deitar e acordar e a duração de 430 min. [Detalhe fictício](evidencias/etapa8/noite-430-recuperada.png) |
| PHI 03 · Pergunta simples | `SleepForm` | Registrar noite → Complementos opcionais → responder Como você acordou? e Quanto cansaço sentiu durante o dia? | Os dois controles têm perguntas próprias e escalas independentes. O campo de anotações continua editável com teclado aberto. [Teclado no campo final](evidencias/etapa8/campo-final-teclado.png) |
| PHI 04 · Examinar alternativas | `Report` | Relatório → mês civil de outubro de 2024 → Consultar prévia → Duração por humor | A tabela informa contagem e média por grupo. O contrato comprovou o cálculo com empates e a mensagem de variância zero para a conta de controle. [Ensaio do PDF](verificacao-relatorio-pdf.md) |
| PHI 05 · Reinterpretar a experiência | `SleepDetail`, `SleepForm` | Abrir a noite de 18/11/2026 → Editar noite → Complementos opcionais → substituir anotação → salvar | O detalhe mostrou `Nota ficticia revisitada` após salvar a alteração. |
| PHI 07 · Dimensões qualitativas | `SleepDetail` | Abrir o detalhe da noite de 430 min e chegar a Sonhos e anotações | A nota fictícia aparece ao lado das medidas no detalhe e fica fora da projeção exportada. [Detalhe fictício](evidencias/etapa8/noite-430-recuperada.png) |
| PHI 08 · Personalizar a experiência | `Settings`, `Home` | Configurações → selecionar Humor → voltar para a Home | O painel usa o destaque persistido para ordenar duração e humor. [Ensaio de persistência](verificacao-painel-conta.md) |
| PHI 09 · Tornar a interpretação compartilhada | `Reflection`, `History` | No cartão, De onde veio esta observação? → Abrir histórico deste período | A observação mostra a duração de 7h10. O histórico abriu de 13/11 a 19/11/2026 e mostrou a noite de 18/11. [Cartão fictício](evidencias/etapa8/cartao-observacao.png) |
| PHI 10 · Controle sobre os dados | `Settings`, `Report` | Configurações → Exportar relatório → consultar prévia → salvar. Testar separadamente revogar e excluir com senha. | A prévia precede a gravação e o PDF salvo reabriu offline. Revogar apaga o diário e conserva a conta. Excluir encerra a sessão. [PDF offline](evidencias/etapa8/pdf-offline.png) · [Ensaio de conta](verificacao-painel-conta.md) |
| PHI 11 · Metas flexíveis | `Settings`, `Routine` | Configurações → definir 22:00 → Preparar a rotina → voltar a Configurações e remover | A meta tem gravação e remoção explícitas, sem alterar os registros. [Ensaio de persistência](verificacao-painel-conta.md) |

## Desempenho da API local

Medição sequencial em `127.0.0.1`, incluindo HTTP, autenticação, consulta ao PostgreSQL local e leitura do JSON. Foram feitas cinco chamadas de aquecimento e 30 amostras por rota. O percentil 95 é o 29º valor da lista ordenada. O ambiente usou um proxy local de ensaio para simular a perda de resposta em um teste separado. A simulação estava inativa durante a medição.

| Rota | Entradas | Mínimo | Mediana | p95 | Máximo |
| --- | --- | ---: | ---: | ---: | ---: |
| `GET /v1/sleep?de=2024-10-01&ate=2024-10-31&limite=20` | 20 episódios e cursor para a próxima página | 10,66 ms | 11,76 ms | 14,30 ms | 14,54 ms |
| `GET /v1/reports/sleep?de=2024-10-01&ate=2024-10-31` | 31 dias e 29 episódios | 5,29 ms | 6,22 ms | 8,06 ms | 9,38 ms |

Para repetir a medição, autentique uma conta fictícia com o mesmo volume e percorra as duas rotas a partir do host da API. Cronometre cada requisição até terminar de ler o corpo, descarte as cinco primeiras e calcule a mediana e o p95 das 30 seguintes. Os números descrevem este host, este conjunto e a API local. A meta de 500 ms para a página do diário foi atendida neste ensaio.

## Contraste

As razões usam luminância relativa sRGB sobre as cores efetivamente usadas no fundo e na superfície. Quando há dois fundos possíveis, a tabela registra a menor razão. Em **Pressionado**, os dois lados foram compostos com opacidade de `0,86`, como no botão do app. [WCAG 2.2, contraste aprimorado](https://www.w3.org/TR/WCAG22/#contrast-enhanced)

| Tema | Texto principal | Secundário / desabilitado | Erro | Ação secundária | Botão preenchido | Pressionado | Borda do controle |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Claro | 15,51:1 | 7,95:1 | 7,18:1 | 8,19:1 | 8,80:1 | 6,08:1 | 3,06:1 |
| Escuro | 15,46:1 | 8,81:1 | 10,29:1 | 10,48:1 | 10,27:1 | 7,95:1 | 4,49:1 |
| Alto contraste | 18,86:1 | 15,89:1 | 11,56:1 | 14,47:1 | 15,06:1 | 11,14:1 | 18,86:1 |

O menor resultado de texto nos estados medidos do modo de alto contraste foi 11,14:1, acima da meta de 7:1. As bordas foram comparadas com o fundo e a superfície adjacentes. O gráfico conserva sua alternativa textual e usa a cor primária sobre o fundo para a barra. O seletor de contraste usa uma linha inteira como alvo e deixa o desenho do interruptor fora da árvore de acessibilidade, para que haja um só controle com estado.

## Android e acessibilidade

| Ensaio | Reprodução e resultado |
| --- | --- |
| 320 dp e fonte a 200% | No emulador, `adb shell wm size 768x1728`, `adb shell wm density 384` e `adb shell settings put system font_scale 2.0`. O formulário abriu em coluna única, o botão Registrar uma noite mediu 50 dp de altura e o primeiro horário inválido recebeu foco. A apresentação inicial do Gboard cobre parte do campo na captura. O foco foi confirmado na árvore de interface. [Captura do erro](evidencias/etapa8/foco-320dp-fonte200.png) |
| Tela larga e paisagem | `wm size 1600x2400`, `wm density 320` e fonte normal. Na Home de 800 dp, os cartões aparecem lado a lado com Humor à esquerda, conforme a preferência. `wm user-rotation lock 1` girou a janela ativa para `2400×1600` e manteve a ordem horizontal. A mudança simultânea de densidade e escala via ADB deixou a janela React Native com a configuração anterior até relançar o app, o que afetou a disposição dos cartões no primeiro ensaio. [Tela larga](evidencias/etapa8/home-larga.png) · [Paisagem](evidencias/etapa8/home-paisagem.png) |
| Teclado e foco de erro | Em Registrar uma noite, tocar Salvar noite com horas vazias focou `deitou.hora`. Em Complementos opcionais foi possível digitar no campo final Sonhos e anotações. [Teclado](evidencias/etapa8/campo-final-teclado.png) |
| Diálogo e navegação de retorno | Configurações → Revogar consentimento abriu o diálogo específico. Voltar descartou o diálogo e devolveu a ação de revogação à tela, sem executar a operação. O título recebe o evento de foco ao abrir. A verificação do anúncio falado no diálogo fica no bloqueio de TalkBack. |
| TalkBack | `17.0.0.889642762`, com exploração por toque ativa e **Display speech output** habilitado. Ao abrir Reflexão, foi observado o destaque de foco no retorno ao EntreNoites e a saída textual correspondente. **Parcial**. A sessão headless sem áudio não permitiu validar escuta, percurso completo com tela ocultada ou sequência de anúncios a 200%. Para repetir a parte pendente, use TalkBack com áudio em um aparelho, oculte a tela no menu do leitor e percorra Home, formulário com erro e diálogo de revogação. [Foco observado](evidencias/etapa8/talkback-proximo.png) · [Configuração do TalkBack](https://support.google.com/accessibility/android/answer/6006589) |
| Troca de contexto | No emulador, voltar ao app com relógio local às 05:59:46 mostrou Boa noite. Mantê-lo aberto até 06:00 mudou para Seu diário e colocou Registrar primeiro. Deixar o app em segundo plano, ajustar o relógio para 20:00:01 e retornar restaurou Boa noite e colocou Preparar a rotina primeiro. Os dois acessos ficaram visíveis nos dois contextos. |

## Percursos de ponta a ponta

| Percurso | Execução observada |
| --- | --- |
| Resposta perdida e edição | Um proxy local deixou a API gravar a noite de Aurora com `201` e fechou a conexão antes de enviar a resposta ao app. A recuperação consultou o mesmo UUID com `GET`, recebeu `200` e abriu o detalhe de 430 minutos. Em seguida, o app editou a anotação da mesma noite. [Noite reaberta](evidencias/etapa8/noite-430-recuperada.png) |
| Isolamento e consentimento | Aurora e Brisa tinham noites em datas coincidentes. Um `GET` da noite de Aurora autenticado como Brisa retornou `404`. A suíte HTTP comprova isolamento de diário, relatório e prévia, cancelamento durante inferência, descarte de resultado após revogar, revogação concorrente de escrita, reaceite com diário vazio e exclusão em cascata. [Percursos Android de conta](verificacao-painel-conta.md) · [Testes do Gemini](verificacao-reflexao-gemini.md) |
| Modelo indisponível | Com uma noite na semana, escolhi Descanso, consultei a prévia e autorizei. O transporte simulado devolveu indisponibilidade e o app ofereceu tentar de novo. Após restabelecer o transporte, nova autorização gerou o cartão que abriu o histórico. A suíte também ensaia `GEMINI_ENABLED=false`: relatório e diário permanecem acessíveis e a geração retorna `503`. |
| PDF offline | Na primeira instância do emulador, Salvar PDF retornou “Não foi possível preparar o PDF. Tente novamente.” antes do seletor, e o Expo Print deixou um temporário de zero bytes. Em uma instância limpa do mesmo AVD, o development build abriu o seletor e confirmou a gravação em Documentos. Fechei o app, desliguei a rede e abri o PDF semanal de Aurora pelo gerenciador. O visualizador mostrou a linha de 18/11 com 430 min e o rodapé, sem a noite de 355 min de Brisa, e-mail ou nota privada. [PDF offline](evidencias/etapa8/pdf-offline.png) · [Execução semanal e mensal anterior](verificacao-relatorio-pdf.md) |

## Validação automatizada

`npm run build` e `npm run test:local` no backend e `npm run typecheck` no mobile. A suíte passou com 15 testes. O caso de relatório usa postos empatados e calcula `24,5 / √(26,5 × 27)`, com sete pares, uma noite sem humor e dois dias sem registro. A segunda conta tem sete durações iguais e recebe `rho: null`, `motivo: variancia_zero`. A suíte cobre isolamento, `404` para recurso alheio, revogação concorrente de escrita e revogação durante inferência, reaceite vazio, conflito de edição, UUID idempotente e retorno `503` com a geração desativada.
