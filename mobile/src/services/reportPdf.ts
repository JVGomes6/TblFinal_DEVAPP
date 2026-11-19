import { randomUUID } from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { printToFileAsync } from 'expo-print';
import * as Sharing from 'expo-sharing';
import { gerarHtmlRelatorio } from '../utils/reportTemplate';
import type { ResumoDoPeriodo } from './reports';

const saf = FileSystem.StorageAccessFramework;
const pastaBase = FileSystem.cacheDirectory && `${FileSystem.cacheDirectory}entrenoites-relatorios/`;
const uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const pastaTemporaria = new RegExp(`^relatorio-${uuid}$`, 'i');
const pdfDaImpressora = new RegExp(`^${uuid}\\.pdf$`, 'i');
const base64 = { encoding: FileSystem.EncodingType.Base64 };
const mimeType = 'application/pdf';
let limpeza: Promise<void> | undefined;
export class ErroDeExportacao extends Error {}

async function limparPasta(uri: string, padrao: RegExp): Promise<void> {
  const nomes = await FileSystem.readDirectoryAsync(uri).catch(() => []);
  await Promise.allSettled(nomes.filter((nome) => padrao.test(nome))
    .map((nome) => FileSystem.deleteAsync(uri + nome, { idempotent: true })));
}

export function limparTemporariosDeRelatorios(): Promise<void> {
  // Print/ é a pasta privada do Expo Print, usado somente nos relatórios deste app.
  limpeza ??= pastaBase && FileSystem.cacheDirectory
    ? Promise.all([limparPasta(pastaBase, pastaTemporaria), limparPasta(`${FileSystem.cacheDirectory}Print/`, pdfDaImpressora)]).then(() => {})
    : Promise.resolve();
  return limpeza;
}

function conferirCancelamento(signal: AbortSignal) {
  if (signal.aborted) throw new Error('Exportação cancelada.');
}

async function comPdfTemporario<T>(relatorio: ResumoDoPeriodo, signal: AbortSignal, usar: (uri: string, nome: string) => Promise<T>): Promise<T> {
  if (!pastaBase) throw new ErroDeExportacao('O armazenamento temporário está indisponível.');
  await limparTemporariosDeRelatorios();
  conferirCancelamento(signal);
  const pasta = `${pastaBase}relatorio-${randomUUID()}/`;
  const nome = `relatorio-sono-${relatorio.de.replaceAll('-', '')}-${relatorio.ate.replaceAll('-', '')}.pdf`;
  const uri = pasta + nome;
  let impresso: string | undefined;
  try {
    await FileSystem.makeDirectoryAsync(pasta, { intermediates: true });
    impresso = (await printToFileAsync({ html: gerarHtmlRelatorio(relatorio), width: 595, height: 842 })).uri;
    conferirCancelamento(signal);
    await FileSystem.moveAsync({ from: impresso, to: uri });
    conferirCancelamento(signal);
    return await usar(uri, nome);
  } finally {
    const destinos = impresso ? [pasta, impresso] : [pasta];
    await Promise.allSettled(destinos.map((temporario) => FileSystem.deleteAsync(temporario, { idempotent: true })));
  }
}

export async function salvarPdfNoAndroid(relatorio: ResumoDoPeriodo, signal: AbortSignal): Promise<'salvo' | 'cancelado'> {
  return comPdfTemporario(relatorio, signal, async (uri, nome) => {
    const permissao = await saf.requestDirectoryPermissionsAsync();
    if (!permissao.granted || signal.aborted) return 'cancelado';
    const dados = await FileSystem.readAsStringAsync(uri, base64);
    conferirCancelamento(signal);
    let destino: string | undefined;
    try {
      destino = await saf.createFileAsync(permissao.directoryUri, nome, mimeType);
      conferirCancelamento(signal);
      await saf.writeAsStringAsync(destino, dados, base64);
      const conferido = await saf.readAsStringAsync(destino, base64);
      conferirCancelamento(signal);
      if (conferido !== dados) throw new Error('A cópia gravada está incompleta.');
      return 'salvo';
    } catch {
      if (destino) {
        try { await saf.deleteAsync(destino, { idempotent: true }); }
        catch { throw new ErroDeExportacao('A gravação foi interrompida. Verifique a pasta escolhida e remova a cópia incompleta.'); }
      }
      throw new ErroDeExportacao('A gravação foi interrompida. Tente salvar novamente.');
    }
  });
}

export async function compartilharRelatorioPdf(relatorio: ResumoDoPeriodo, signal: AbortSignal): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new ErroDeExportacao('O compartilhamento está indisponível neste aparelho.');
  await comPdfTemporario(relatorio, signal, (uri) => Sharing.shareAsync(uri, { mimeType, UTI: 'com.adobe.pdf' }));
}
