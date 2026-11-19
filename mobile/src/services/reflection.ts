import { z } from 'zod';
import { api, respostaInvalida } from './api';

const focoSchema = z.enum(['rotina', 'humor', 'descanso']);
const previaSchema = z.object({
  texto: z.string().min(1),
  versaoCatalogo: z.string().min(1),
  hashPrevia: z.string().regex(/^[a-f0-9]{64}$/),
  noites: z.int().min(0).max(7),
  provedor: z.literal('Google Gemini'),
});
const cartaoSchema = z.object({
  origem: z.literal('gemini'),
  observacaoLocal: z.string().min(1),
  abertura: z.string().min(1),
  pergunta: z.string().min(1),
  fecho: z.string().min(1),
  versaoCatalogo: z.string().min(1),
});

export type FocoReflexao = z.output<typeof focoSchema>;
export type PreviaReflexao = z.output<typeof previaSchema>;
export type CartaoReflexao = z.output<typeof cartaoSchema>;
export type PedidoPrevia = { foco: FocoReflexao; ate: string };

function lerResposta<T>(schema: z.ZodType<T>, data: unknown): T {
  const resultado = schema.safeParse(data);
  if (!resultado.success) throw respostaInvalida();
  return resultado.data;
}

export async function obterPrevia(pedido: PedidoPrevia, signal: AbortSignal): Promise<PreviaReflexao> {
  const { data } = await api.post<unknown>('/ai/preview', pedido, { signal });
  return lerResposta(previaSchema, data);
}

export async function gerarCartao(pedido: PedidoPrevia, hashPrevia: string, signal: AbortSignal): Promise<CartaoReflexao> {
  const { data } = await api.post<unknown>('/ai/ritual', { ...pedido, hashPrevia, autorizoEnvio: true }, {
    signal, timeout: 50_000, // A API pode esperar até 45 segundos pelo modelo na configuração padrão.
  });
  return lerResposta(cartaoSchema, data);
}
