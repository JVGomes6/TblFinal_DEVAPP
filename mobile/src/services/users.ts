import { z } from 'zod';
import { api, respostaInvalida } from './api';

const instanteSchema = z.int().nullable();
const consentimentoSchema = z.object({
  ativo: z.boolean(),
  versao: z.string().nullable(),
  versaoAtual: z.string().min(1),
  aceiteEm: instanteSchema,
  revogadoEm: instanteSchema,
});
const perfilSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  destaque: z.enum(['duracao', 'humor']),
  metaMin: z.int().min(0).max(1439).nullable(),
  altoContraste: z.boolean(),
  consentimento: consentimentoSchema,
});
const loginSchema = z.object({ token: z.string().min(1), expiraEm: z.int().positive(), usuario: perfilSchema });

export type PerfilUsuario = z.output<typeof perfilSchema>;
export type Preferencias = Pick<PerfilUsuario, 'destaque' | 'metaMin' | 'altoContraste'>;

export interface Credenciais {
  email: string;
  senha: string;
}

function validarResposta<T>(schema: z.ZodType<T>, dados: unknown): T {
  const resultado = schema.safeParse(dados);
  if (!resultado.success) throw respostaInvalida();
  return resultado.data;
}

export async function cadastrar({ email, senha }: Credenciais, signal?: AbortSignal) {
  const { data } = await api.post<unknown>('/auth/register', { email, senha }, { signal });
  return validarResposta(perfilSchema, data);
}

export async function login({ email, senha }: Credenciais, signal?: AbortSignal) {
  const { data } = await api.post<unknown>('/auth/login', { email, senha }, { signal });
  return validarResposta(loginSchema, data);
}

export async function logout(signal?: AbortSignal): Promise<void> {
  await api.post('/auth/logout', undefined, { signal });
}

export async function obterPerfil(signal?: AbortSignal): Promise<PerfilUsuario> {
  const { data } = await api.get<unknown>('/users/me', { signal });
  return validarResposta(perfilSchema, data);
}

export async function salvarPreferencias(preferencias: Partial<Preferencias>, signal?: AbortSignal) {
  const { data } = await api.patch<unknown>('/users/me', preferencias, { signal });
  return validarResposta(perfilSchema, data);
}

export async function aceitarTermo(versao: string, signal?: AbortSignal) {
  const { data } = await api.put<unknown>('/users/me/consent', { aceito: true, versao }, { signal });
  return validarResposta(consentimentoSchema, data);
}

export async function revogarTermo(senha: string, signal?: AbortSignal): Promise<void> {
  await api.delete('/users/me/consent', { data: { senha, apagarDiario: true }, signal });
}

export async function excluirUsuario(senha: string, signal?: AbortSignal): Promise<void> {
  await api.delete('/users/me', { data: { senha, confirmar: true }, signal });
}
