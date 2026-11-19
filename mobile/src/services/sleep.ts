import { z } from 'zod';
import { api, ErroApi, respostaInvalida } from './api';

const escala = z.int().min(1).max(5);
const momento = z.iso.datetime({ offset: true });
const fatores = z.object({ cafeina: z.boolean().nullable(), telas: z.boolean().nullable(), ansiedade: z.boolean().nullable() });
const dadosSono = z.object({
  fuso: z.string(), deitou: momento, dormiu: momento, acordou: momento,
  qualidade: escala, humor: escala.nullable(), cansaco: escala.nullable(),
  minutosAcordado: z.int().min(0).nullable(), despertares: z.int().min(0).nullable(), fatores,
});
const resumoSono = dadosSono.extend({
  id: z.uuid(), dataLocal: z.iso.date(), duracaoEstimadaMin: z.int().min(0), versao: z.int().positive(),
});
const registroSono = resumoSono.extend({ sonho: z.string().nullable() });
const paginaSono = z.object({ itens: z.array(resumoSono), proximoAntesDe: z.iso.date().nullable() });

export type ResumoSono = z.output<typeof resumoSono>;
export type RegistroSono = z.output<typeof registroSono>;
export type DadosSono = z.output<typeof dadosSono> & { sonho: string | null };
export type PaginaSono = z.output<typeof paginaSono>;

export interface FiltrosSono {
  de?: string;
  ate?: string;
  qualidade?: number;
  limite?: number;
  antesDe?: string;
}

function ler<T>(schema: z.ZodType<T>, data: unknown): T {
  const resultado = schema.safeParse(data);
  if (!resultado.success) throw respostaInvalida();
  return resultado.data;
}

export async function listarSono(params: FiltrosSono, signal?: AbortSignal): Promise<PaginaSono> {
  const { data } = await api.get<unknown>('/sleep', { params, signal });
  return ler(paginaSono, data);
}

export async function obterSono(id: string, signal?: AbortSignal): Promise<RegistroSono> {
  const { data } = await api.get<unknown>(`/sleep/${id}`, { signal });
  return ler(registroSono, data);
}

export async function editarSono(id: string, versao: number, dados: DadosSono, signal?: AbortSignal): Promise<RegistroSono> {
  const { data } = await api.put<unknown>(`/sleep/${id}`, { ...dados, versao }, { signal });
  return ler(registroSono, data);
}

export async function excluirSono(id: string, versao: number, signal?: AbortSignal): Promise<void> {
  await api.delete(`/sleep/${id}`, { headers: { 'If-Match': `"${versao}"` }, signal });
}

function respostaIncerta(erro: unknown): boolean {
  return erro instanceof ErroApi && (['SEM_CONEXAO', 'TEMPO_ESGOTADO', 'RESPOSTA_INVALIDA'].includes(erro.codigo) ||
    (erro.status !== null && erro.status >= 500));
}

async function verificarCriacao(id: string, signal?: AbortSignal) {
  try {
    return { estado: 'salva', registro: await obterSono(id, signal) } as const;
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 404) return { estado: 'ausente' } as const;
    if (respostaIncerta(erro)) return { estado: 'pendente' } as const;
    throw erro;
  }
}

export async function salvarNovaNoite(id: string, dados: DadosSono, verificarAntes: boolean, signal?: AbortSignal) {
  if (verificarAntes) {
    const existente = await verificarCriacao(id, signal);
    if (existente.estado !== 'ausente') return existente;
  }

  try {
    const { data } = await api.post<unknown>('/sleep', { id, ...dados }, { signal });
    return { estado: 'salva', registro: ler(registroSono, data) } as const;
  } catch (erro) {
    if (!respostaIncerta(erro)) throw erro;
    const consulta = await verificarCriacao(id, signal);
    return consulta.estado === 'salva' ? consulta : { estado: 'pendente' } as const;
  }
}
