# Verificação do cartão de reflexão no Android

## Ambiente

O ensaio usa o [development build Android](verificacao-diario-android.md#executar-o-development-build), a API do EntreNoites e um PostgreSQL local temporário. O SDK `@google/genai` executa no backend com o transporte simulado para testar respostas válidas, falhas e cancelamento. A integração segue o [contrato do Gemini da Etapa 5](verificacao-reflexao-gemini.md).

```powershell
Set-Location mobile
npm run typecheck
```

## Roteiro

1. Entre com uma conta fictícia, aceite o diário e abra **Cartão de reflexão** na Home. Consulte a prévia com o diário vazio. Confira o serviço Google Gemini, a mensagem de período vazio, a contagem em separado e o contexto literal `{"foco":"rotina","cobertura":"zero"}`.
2. Use **Voltar sem enviar** e confira que a API recebeu somente `POST /v1/ai/preview`. Reabra a tela, consulte uma prévia e mude o foco. Consulte novamente e mude a data final. Cada alteração pede uma nova consulta antes de mostrar **Autorizar e gerar este cartão**.
3. Escolha Descanso e data final `17/11/2024`. Consulte com o diário vazio e, em outra sessão da mesma conta, registre uma noite que termina em `17/11/2024`. Autorize a prévia antiga. A API deve retornar `409` antes de chamar o modelo. Consulte a nova prévia e autorize novamente.
4. Simule uma falha do provedor e confirme que o app volta à prévia com a opção de autorizar outra tentativa. Na tentativa bem-sucedida, confira origem, abertura, observação da API, pergunta e fecho. Use **Pular pergunta** e confira que o restante do cartão continua disponível.
5. Abra o histórico a partir da observação. O filtro deve estar aplicado a `11/11/2024`–`17/11/2024`. Uma noite de controle fora desse período ajuda a verificar o limite.
6. Com uma segunda conta fictícia, atrase a resposta do provedor. Envie uma vez, toque novamente e volte enquanto a geração está em andamento. Em tentativas separadas, revogue o consentimento ou exclua a conta durante a geração e confira a saída da área privada.

## Resultado observado

`npm run typecheck` passou com Node `22.23.5` e npm `10.9.11`. O development build foi executado no emulador `Medium_Phone_API_37.0`, conectado à API local com duas contas fictícias.

| Cenário | Resultado no Android e na API |
| --- | --- |
| Diário vazio e saída da prévia | O app mostrou a prévia literal, o aviso de zero noites e o serviço Google Gemini. A API recebeu somente `/ai/preview` ao usar **Voltar sem enviar**. |
| Alteração de foco, data e registros | Foco e data removeram a prévia anterior. Com novos registros no período, a API retornou `409` antes de chamar o modelo. O app pediu nova prévia e nova autorização. |
| Falha e nova tentativa | A API retornou `503`; o app voltou à prévia com confirmação explícita. A nova tentativa retornou `200` e compôs o cartão do catálogo. |
| Cartão e histórico | O app mostrou a origem e a observação de `7h10`. Pular a pergunta manteve o cartão disponível. O histórico consultou `de=2024-11-11&ate=2024-11-17`, mostrou a noite de 17/11 e excluiu a noite de controle de 04/11. |
| Dois toques e saída durante a geração | A API recebeu um `POST /ai/ritual`, e o sinal de cancelamento chegou ao SDK quando o usuário voltou. |
| Troca de conta | A segunda conta abriu uma reflexão nova e obteve prévia de zero noites. |
| Revogação e exclusão durante a geração | A revogação retornou `403` e abriu a tela de consentimento. A exclusão retornou `401` e abriu a tela pública. O cartão em andamento não apareceu nos dois casos. |
