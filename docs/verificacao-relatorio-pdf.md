# Verificação do relatório PDF

## Plataforma e reprodução

O ensaio executou o development build no emulador Android `Medium_Phone_API_37.0`, conectado à API real e a um PostgreSQL local temporário. O fluxo para iOS foi implementado com a folha de compartilhamento e a orientação **Salvar em Arquivos** e aguarda ensaio nessa plataforma.

Use a [configuração do development build](verificacao-diario-android.md#executar-o-development-build). Na Home, abra **Relatório de sono**, selecione o período e consulte a prévia. No Android, **Salvar PDF** abre o seletor de pasta e **Compartilhar PDF** abre uma ação separada. [Expo Print](https://docs.expo.dev/versions/v54.0.0/sdk/print/) · [Expo FileSystem legado](https://docs.expo.dev/versions/v54.0.0/sdk/filesystem-legacy/) · [Expo Sharing](https://docs.expo.dev/versions/v54.0.0/sdk/sharing/)

## Resultados

| Conta fictícia e seleção | Verificação |
| --- | --- |
| Aurora, últimos sete dias de 13/11/2026 a 19/11/2026 | Uma noite de 18/11 com `7h10 (430 min)`, cobertura parcial e seis dias sem registro. O PDF explicou a ausência de Spearman por insuficiência de pares. |
| Brisa, mês civil de 01/10/2026 a 31/10/2026 | 31 noites distribuídas em duas páginas A4, com cabeçalho do histórico repetido. A última linha mostra 01/10 com `6h41 (401 min)` e o rodapé de medidas autorrelatadas aparece inteiro. Spearman foi `-0,04` em 31 pares. |

Os dois arquivos foram gravados em `Documentos/EntreNoites`. Depois de encerrar o EntreNoites e ativar o modo avião, com Wi-Fi e dados móveis desligados, os dois PDFs abriram pelo gerenciador de arquivos. A última linha do mensal também foi lida no visualizador Android, ainda sem rede.

A inspeção visual e a extração de texto confirmaram a paginação, as datas e todas as 31 linhas do mensal. As duas contas tinham anotações fictícias com texto de controle. A conta Brisa também tinha uma noite de `315 min` na mesma data do semanal de Aurora e fora do mês civil. A conta Aurora tinha uma noite de `399 min` dentro do mês de Brisa e fora da semana. Os PDFs continham somente as linhas esperadas de cada titular e período. E-mails, sonhos e notas não apareceram na extração.

No Android, cancelar o seletor de pasta não criou arquivo e exibiu apenas a confirmação do cancelamento. O compartilhamento abriu a folha nativa em ação separada. Os temporários foram removidos após o salvamento. Ao reabrir o app, a limpeza inicial removeu dois temporários próprios de controle e preservou o arquivo sem o padrão do relatório. Um ensaio local com as operações de arquivo simuladas também verificou erro de gravação, cópia truncada, tentativa de remover o destino parcial e o aviso caso a remoção falhe.

`npm run typecheck` passou no diretório `mobile`. O formulário personalizado aceitou um intervalo de 31 dias, recusou 32 dias e orientou a escolher outro período quando o resultado estava vazio.
