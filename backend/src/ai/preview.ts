import { createHash } from 'node:crypto';
import type { Sessao } from '../auth/tokens.js';
import { config } from '../config.js';
import { resumirSono } from '../reports/summary.js';
import { FATORES, hashDosMateriais, versaoCatalogo } from './compose.js';
import type { ContextoCartao, Fator } from './compose.js';

const SEIS_DIAS_MS = 6 * 86_400_000;
const PRIMEIRO_DIA_MS = Date.parse('0001-01-01');
const ROTULOS_FATOR: Record<Fator, string> = { cafeina: 'cafeína', telas: 'uso de telas', ansiedade: 'ansiedade' };

function coberturaDoPeriodo(noites: number): ContextoCartao['cobertura'] {
  if (noites === 0) return 'zero';
  if (noites === 1) return 'uma';
  return noites === 7 ? 'completa' : 'parcial';
}

function fatorEmDestaque(contagem: Record<Fator, number>): Fator | undefined {
  const maior = Math.max(...FATORES.map((fator) => contagem[fator]));
  const candidatos = FATORES.filter((fator) => contagem[fator] === maior);
  return maior >= 2 && candidatos.length === 1 ? candidatos[0] : undefined;
}

function observar(
  noites: number,
  mediaMin: number | null,
  contagem: Record<Fator, number>,
  fator?: Fator,
): string {
  if (mediaMin === null) return 'Você ainda não registrou noites no período selecionado.';
  if (fator) return `Você marcou ${ROTULOS_FATOR[fator]} em ${contagem[fator]} de ${noites} noites registradas.`;
  const minutos = Math.round(mediaMin);
  const duracao = `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`;
  if (noites === 1) return `A duração estimada da noite registrada foi de ${duracao}.`;
  return `A duração média estimada das ${noites} noites registradas foi de ${duracao}.`;
}

export async function prepararPrevia(sessao: Sessao, revisaoConsentimento: number, foco: ContextoCartao['foco'], ate: string) {
  const de = new Date(Math.max(PRIMEIRO_DIA_MS, Date.parse(ate) - SEIS_DIAS_MS)).toISOString().slice(0, 10);
  const { metricas, contagemFatores } = await resumirSono(sessao.usuarioId, { de, ate });
  const { noites, mediaMin } = metricas;
  const fator = fatorEmDestaque(contagemFatores);
  const contexto: ContextoCartao = { foco, cobertura: coberturaDoPeriodo(noites), ...(fator && { fator }) };
  const texto = JSON.stringify(contexto);
  const observacaoLocal = observar(noites, mediaMin, contagemFatores, fator);

  // A data, o titular, a sessão e a observação vinculam a prévia no servidor.
  const hashPrevia = createHash('sha256').update(JSON.stringify([
    sessao.usuarioId, sessao.versao, revisaoConsentimento, de, ate, texto, noites, observacaoLocal,
    config.geminiModel, versaoCatalogo, hashDosMateriais,
  ])).digest('hex');

  return {
    contexto,
    observacaoLocal,
    previa: { texto, versaoCatalogo, hashPrevia, noites, provedor: 'Google Gemini' },
  };
}
