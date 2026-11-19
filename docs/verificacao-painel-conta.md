# Verificação do painel e da conta

## Ambiente e dados do ensaio

Use o [development build no Android](verificacao-diario-android.md#executar-o-development-build), com API local, PostgreSQL local e Gemini desativado. No diretório `mobile`, execute `npm run typecheck` com Node 22 e npm 10.

Use duas contas `example.invalid`. Considere hoje como a data local do Android. Em cada noite, use o fuso `America/Sao_Paulo` e preencha o despertar às `07:00` na data indicada. Use `23:00` para deitar e `23:30` para adormecer no dia anterior.

| Conta fictícia | Noites nos últimos sete dias | Minutos acordado em cada noite | Humor |
| --- | --- | --- | --- |
| `painel-aurora@example.invalid` | Há 5, 3 e 1 dia | 20, resultando em `7h10` de sono estimado | 3, 3 e 4 |
| `painel-brisa@example.invalid` | Há 1 dia | 40, resultando em `6h50` de sono estimado | 2 |

## Roteiro

1. Na conta Aurora, confirme 3 de 7 noites, 4 dias sem registro, cobertura parcial, duração média `7h10` e os grupos de humor com 2 e 1 noite. A duração aparece primeiro com a preferência padrão.
2. Em Configurações, escolha Humor, grave `00:00` como horário desejado e ative o alto contraste. Aguarde a confirmação de cada gravação. Saia e entre novamente. O cartão de humor aparece primeiro, o contraste continua ativo e `00:00` permanece salvo.
3. Remova o horário desejado, saia e entre novamente. O campo volta vazio e a preparação da rotina oferece definir um horário.
4. Abra a confirmação de revogação e cancele. Abra novamente, informe uma senha incorreta e confira o erro. Confirme com a senha correta. A conta continua acessível e o diário sai da navegação. Revise o termo, recuse e consulte Privacidade em Configurações. Revise e aceite novamente. A Home volta com 0 de 7 noites e o histórico vazio.
5. Entre na conta Brisa. A noite de `6h50` deve continuar disponível apesar da revogação na outra conta. Cancele a confirmação de exclusão e confirme que a conta continua acessível. Reabra o diálogo, autentique a exclusão e confira a volta à tela pública. Tentar entrar com a conta apagada deve retornar a mensagem genérica de login.

## Resultado

`npm run typecheck` passou com Node `22.23.5` e npm `10.9.11`. O ensaio usou o development build no emulador Android `Medium_Phone_API_37.0`. O aparelho estava em GMT, com janela local de 13/11/2026 a 19/11/2026.

- **Aurora.** A Home mostrou `3 de 7`, `4 dias sem registro`, cobertura parcial e `7h10`. A distribuição apresentou 2 noites de humor neutro e 1 de humor agradável, com contagens e médias em texto. Depois de sair e entrar, Humor continuou sendo o primeiro cartão, o contraste continuou ativo e `00:00` apareceu na rotina. A remoção do horário persistiu na sessão seguinte.
- **Revogação.** O diálogo permitiu cancelar e recusou uma senha incorreta. Após a confirmação correta, Configurações permaneceu disponível. Foi possível recusar o termo e abrir a política. Após o reaceite, a Home mostrou `0 de 7` e o histórico voltou vazio.
- **Brisa.** Após a revogação de Aurora, Brisa ainda mostrou a própria noite de `6h50`. Cancelar a exclusão manteve a conta aberta. Confirmar com a senha levou à tela pública, e uma nova tentativa de login retornou “E-mail ou senha inválidos.”
- **Contexto e conexão.** A preparação veio primeiro no horário noturno, e o registro veio primeiro em um novo processo no horário diurno. Ambos os acessos ficaram disponíveis. Ao trocar manualmente o fuso no emulador, foi preciso reabrir o app para observar a mudança. Com a API de ensaio encerrada, a Home exibiu a falha de conexão e a opção de tentar de novo, distinta do diário vazio observado no reaceite.

Na paleta de alto contraste, a razão de contraste calculada entre texto e superfície foi de `18,86:1` para texto principal e `15,89:1` para texto secundário. O texto do botão primário sobre seu preenchimento teve `15,06:1`.

## Dados institucionais pendentes

A especificação identifica a UFPR e a disciplina como contexto acadêmico. O ensaio confirmou API e PostgreSQL locais com dados fictícios. A integração prevista para reflexão usa a API do Google Gemini, com categorias mostradas na prévia e confirmação por pedido quando a função estiver disponível.

Antes de disponibilizar uma instalação para dados reais, a equipe precisa confirmar o responsável pelo tratamento, seu canal de contato e atendimento aos titulares, o provedor e a região de hospedagem, os operadores aplicáveis e seus termos, e a retenção efetiva de registros, logs e backups. Essas informações precisam entrar na política da instalação. [LGPD, art. 9º](https://normas.leg.br/?urn=urn%3Alex%3Abr%3Afederal%3Alei%3A2018-08-14%3B13709%402022-10-25%21art9)
