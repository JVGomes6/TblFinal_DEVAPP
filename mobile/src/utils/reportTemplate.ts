import type { ResumoDoPeriodo } from '../services/reports';
import { avisosDoRelatorio, descreverSpearman, formatarMinutosRelatorio, rotuloCobertura } from './reportPresentation';
import { escalas, formatarData } from './sleepForm';

function escapar(valor: string | number): string {
  return String(valor).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function tabela(colunas: string[], linhas: Array<Array<string | number>>): string {
  const cabecalho = colunas.map((coluna) => `<th scope="col">${escapar(coluna)}</th>`).join('');
  const corpo = linhas.map((linha) => `<tr>${linha.map((valor) => `<td>${escapar(valor)}</td>`).join('')}</tr>`).join('');
  return `<table><thead><tr>${cabecalho}</tr></thead><tbody>${corpo}</tbody></table>`;
}

export function gerarHtmlRelatorio(relatorio: ResumoDoPeriodo): string {
  const { de, ate, noites, diasPeriodo, mediaMin, mediaQualidade, semDescontoInformado, spearman } = relatorio;
  const porHumor = relatorio.porHumor.map(({ humor, n, mediaMin: media }) => [escalas.humor[humor - 1] ?? 'Não informado', n, formatarMinutosRelatorio(media)]);
  const historico = relatorio.linhas.map(({ dataLocal, duracaoMin, qualidade, humor, despertares }) => [
    formatarData(dataLocal), formatarMinutosRelatorio(duracaoMin), qualidade, humor ?? 'Não informado', despertares ?? 'Não informado',
  ]);
  const cobertura = rotuloCobertura(noites, diasPeriodo);
  const duracao = mediaMin === null ? 'Não disponível' : formatarMinutosRelatorio(mediaMin);
  const qualidade = mediaQualidade === null ? 'Não disponível' : `${mediaQualidade.toFixed(1).replace('.', ',')} de 5`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório de sono · EntreNoites</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #241d33; }
  body { font: 10pt/1.4 Arial, sans-serif; }
  h1, h2 { color: #281d43; }
  h1 { font-size: 24pt; line-height: 1.1; margin: 0 0 4pt; }
  h2 { font-size: 13pt; margin: 15pt 0 6pt; break-after: avoid; page-break-after: avoid; }
  p { margin: 0 0 5pt; }
  .periodo { color: #494057; }
  .resumo { border-top: 2pt solid #523a93; margin-top: 10pt; padding-top: 6pt; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 6pt; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { padding: 6pt 5pt; text-align: left; border-bottom: 0.5pt solid #aba3b6; vertical-align: top; }
  th { color: #281d43; border-bottom: 1pt solid #523a93; line-height: 1.2; }
  footer { margin-top: 12pt; padding-top: 6pt; border-top: 1pt solid #aba3b6; color: #494057;
    font-size: 9pt; break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>
<header><h1>Relatório de sono</h1><p class="periodo">EntreNoites · ${escapar(formatarData(de))} a ${escapar(formatarData(ate))}</p></header>
<section class="resumo">
  <h2>Cobertura e duração</h2>
  <p><strong>${escapar(cobertura)}</strong> · ${escapar(noites)} de ${escapar(diasPeriodo)} noites · ${escapar(diasPeriodo - noites)} dias sem registro</p>
  <p>Duração média estimada ${escapar(duracao)} · Qualidade média ${escapar(qualidade)}</p>
  ${semDescontoInformado > 0 ? `<p>Minutos acordados não informados em ${escapar(semDescontoInformado)} registro(s).</p>` : ''}
</section>
<section>
  <h2>Duração por humor</h2>
  ${porHumor.length ? tabela(['Humor', 'Noites', 'Duração média'], porHumor) : '<p>Sem registros com humor informado.</p>'}
  <p><strong>Correlação de Spearman.</strong> ${escapar(descreverSpearman(spearman))}</p>
</section>
<section>
  <h2>Histórico de noites</h2>
  ${historico.length ? tabela(['Data de despertar', 'Sono estimado', 'Qualidade (1 a 5)', 'Humor (1 a 5)', 'Despertares'], historico) : '<p>Sem noites no período.</p>'}
</section>
<footer>${escapar(avisosDoRelatorio)}</footer>
</body>
</html>`;
}
