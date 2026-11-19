# Verificação da reflexão com Gemini

## Contrato e privacidade

`POST /v1/ai/preview` calcula as categorias dos últimos sete dias e devolve o JSON exato a ser enviado, seu hash e a contagem para exibição no app. O contexto variável tem `foco`, `cobertura` e, quando há um único fator com pelo menos duas marcações afirmativas, `fator`. Contagem exata, observação, e-mail, notas, horários, datas e identificadores ficam no EntreNoites.

`POST /v1/ai/ritual` exige o consentimento do diário, a confirmação do envio e o hash da prévia atual. O backend usa `@google/genai` com `responseMimeType: 'application/json'` e um esquema que enumera os IDs permitidos para `abertura`, `pergunta` e `fecho`. Após a inferência, verifica a revisão de consentimento e aceita apenas IDs do catálogo compatíveis com a prévia. [Saída estruturada do Gemini](https://aistudio.google.com/docs/structured-output)

O cancelamento da conexão interrompe a espera do backend e sinaliza o cancelamento ao SDK. A revogação invalida a entrega do cartão mesmo após um novo aceite. Um envio já recebido pelo provedor continua sujeito aos termos do Google. A instalação de avaliação usa dados fictícios. [Termos da API Gemini](https://ai.google.dev/gemini-api/terms?hl=pt-br)

## Ensaio local

Use um [PostgreSQL de teste local](inicializacao-backend.md#teste-local-com-dados-fictícios). A partir de `backend`, execute com Node 22 e npm 10.

```powershell
npm run build
npm run test:local
```

Os 14 testes passaram com PostgreSQL local temporário. A suíte exercitou as rotas HTTP e o SDK real com o transporte do Google simulado. A inspeção do corpo confirmou que o contexto variável corresponde à prévia.

| Cenário | Resultado |
| --- | --- |
| Conta sem aceite | `403` na prévia e na geração, com zero chamadas ao provedor |
| Prévia alterada por novos registros | `409` antes de chamar o provedor |
| Zero noites | Cobertura `zero`, pergunta inicial do catálogo e cartão válido |
| Fator dominante e empate | `telas` incluído quando dominante, campo omitido no empate |
| Cancelamento após o início da inferência | O sinal chegou ao SDK e um novo pedido pôde ser iniciado |
| Revogação seguida de reaceite durante a inferência | `403` para a geração anterior e diário vazio |
| Modelo substituto ou resposta fora do contrato | Resultado recusado |

## Chamada real opcional com contexto fictício

A verificação desta etapa foi limitada ao ambiente local por decisão da equipe. Os testes usaram o transporte simulado e nenhuma requisição de inferência foi enviada ao Google.

Guarde `GEMINI_API_KEY` no ambiente do servidor ou em `backend/.env`, ignorado pelo Git. `GEMINI_ENABLED=true` habilita a rota de geração no servidor. O comando abaixo habilita o adaptador apenas no processo do ensaio e usa um contexto fictício de cobertura zero. Em caso de sucesso, imprime os três IDs e o cartão composto em JSON.

```powershell
npm run build
npm run smoke:gemini
```

Um ensaio real exige uma chave de projeto com acesso a `gemini-2.5-flash`. O Google informa que o acesso está limitado a projetos com histórico de uso e que, a partir de 1º de dezembro de 2026, direcionará as chamadas de `gemini-2.5-flash` para `gemini-3.5-flash-lite`. O backend confere a versão informada na resposta antes de entregar o cartão. [Cronograma do Google](https://aistudio.google.com/docs/deprecations#gemini-2.5-flash-models) · [Referência de `modelVersion`](https://aistudio.google.com/api-reference/generate-content#Resource:GenerateContentResponse)
