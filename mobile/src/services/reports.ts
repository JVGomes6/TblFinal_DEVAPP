import { z } from 'zod';
import { api, respostaInvalida } from './api';

const periodoSchema = z.object({ de: z.iso.date(), ate: z.iso.date() });
const escala = z.int().min(1).max(5);
const minutos = z.number().nonnegative();
const resumoSchema = periodoSchema.extend({
  diasPeriodo: z.int().positive(),
  noites: z.int().nonnegative(),
  mediaMin: minutos.nullable(),
  mediaQualidade: z.number().min(1).max(5).nullable(),
  semDescontoInformado: z.int().nonnegative(),
  porHumor: z.array(z.object({ humor: escala, n: z.int().positive(), mediaMin: minutos })),
  spearman: z.union([
    z.object({ pares: z.int().min(7), rho: z.number().min(-1).max(1), motivo: z.null() }),
    z.object({ pares: z.int().nonnegative(), rho: z.null(), motivo: z.enum(['amostra_pequena', 'variancia_zero']) }),
  ]),
  linhas: z.array(z.object({
    dataLocal: z.iso.date(), duracaoMin: z.int().nonnegative(), qualidade: escala, humor: escala.nullable(),
    despertares: z.int().nonnegative().nullable(),
  })),
});

export type PeriodoSono = z.output<typeof periodoSchema>;
export type ResumoDoPeriodo = z.output<typeof resumoSchema>;

export async function obterResumoSono(periodo: PeriodoSono, signal?: AbortSignal): Promise<ResumoDoPeriodo> {
  const { data } = await api.get<unknown>('/reports/sleep', { params: periodo, signal });
  const resultado = resumoSchema.safeParse(data);
  if (!resultado.success || resultado.data.de !== periodo.de || resultado.data.ate !== periodo.ate) throw respostaInvalida();
  return resultado.data;
}
