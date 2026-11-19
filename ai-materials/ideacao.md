# Ideação com IA e revisão humana

## Entradas registradas

O anexo de arquitetura registra uma comparação assistida de histórias livres, classificação automática de risco e composição com catálogo. O texto integral do prompt original e as respostas brutas dessa primeira comparação não foram fornecidos. O registro atual usa as alternativas e a decisão descritas no anexo, além das instruções efetivamente usadas no desenvolvimento.

| Instrução registrada, em síntese | Resultado aproveitado | Decisão ou revisão observável |
| --- | --- | --- |
| Etapa 3B pediu saída estruturada com IDs de abertura, pergunta e fecho para Gemini. | Catálogo e resposta com três identificadores, traduzidos no servidor para trechos em português. | A equipe solicitou o catálogo e definiu o uso do modelo `gemini-2.5-flash`. |
| Etapa 5 corrigida pediu contexto só com categorias permitidas, comparação de hash e revalidação de consentimento. | Prévia literal, schema dinâmico de IDs válidos e rejeição de resultados incompatíveis. | A instrução requereu controle de envio e a equipe limitou a validação a ensaio local. |
| Etapa 6 pediu mostrar a prévia antes de autorizar e retornar ao histórico que explica a observação. | Separação entre autorização, composição e observação calculada, com pergunta opcional. | As ações e o percurso de aceite foram especificados na instrução humana. |

## Alternativas e decisão

| Alternativa | Avaliação |
| --- | --- |
| Histórias livres | Amplia a quantidade de texto que exigiria revisão. |
| Classificação automática de risco | Atribui interpretação clínica além da finalidade de diário autorrelatado. |
| Composição com catálogo | Permite escolher entre trechos controlados, validar IDs e conferir a observação nos registros. Esta é a alternativa implementada. |

## Separação das duas funções de IA

A assistência de projeto ajudou a implementar e verificar código, interface e documentação. Na execução do app, o Google Gemini recebe as categorias mostradas na prévia e retorna IDs. A API calcula a observação e aplica o catálogo. Esses materiais são `system.pt-BR.txt`, `catalogo.json` e `resposta.schema.json`. A suíte valida cobertura, fatores e saída com transporte simulado. [Verificação](../docs/verificacao-reflexao-gemini.md)

A revisão final por pessoa identificada, a aprovação de cada fragmento e o arquivo de prompts originais da ideação ficam pendentes de confirmação pela equipe. A atribuição ao anexo e as decisões registradas acima têm a evidência disponível nesta entrega.
