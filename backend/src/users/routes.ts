import { Router } from 'express';
import { z } from 'zod';
import { senhaSchema, verificarSenha } from '../auth/passwords.js';
import type { Sessao } from '../auth/tokens.js';
import { autenticacaoAtual, exigirAutenticacao } from '../middleware/auth.js';
import { ErroApi, semConsulta, semCorpo, validarCorpo } from '../middleware/errors.js';
import { limitarConfirmacaoSenha } from '../middleware/limit.js';
import { aceitarConsentimento, perfilPublico, revogarConsentimento } from './consentService.js';
import { atualizarPreferencias, buscarHashDaSenha, excluirUsuario } from './repository.js';

const preferenciasSchema = z.strictObject({
  destaque: z.enum(['duracao', 'humor']).optional(),
  metaMin: z.int().min(0).max(1439).nullable().optional(),
  altoContraste: z.boolean().optional(),
});
const aceiteSchema = z.strictObject({ aceito: z.literal(true), versao: z.string() });
const revogacaoSchema = z.strictObject({ senha: senhaSchema, apagarDiario: z.literal(true) });
const exclusaoSchema = z.strictObject({ senha: senhaSchema, confirmar: z.literal(true) });

async function confirmarSenha(sessao: Sessao, senha: string): Promise<void> {
  const hash = await buscarHashDaSenha(sessao);
  if (!(await verificarSenha(senha, hash))) {
    throw new ErroApi(403, 'SENHA_INCORRETA', 'A senha informada está incorreta.', 'senha');
  }
}

export const usersRouter = Router();
usersRouter.use('/me', exigirAutenticacao, semConsulta);

usersRouter.get('/me', semCorpo, (_req, res) => {
  res.json(perfilPublico(autenticacaoAtual(res).usuario));
});

usersRouter.patch('/me', async (req, res) => {
  const preferencias = validarCorpo(preferenciasSchema, req.body);
  const usuario = await atualizarPreferencias(autenticacaoAtual(res).sessao, preferencias);
  res.json(perfilPublico(usuario));
});

usersRouter.put('/me/consent', async (req, res) => {
  const { versao } = validarCorpo(aceiteSchema, req.body);
  const consentimento = await aceitarConsentimento(autenticacaoAtual(res).sessao, versao);
  res.json(consentimento);
});

usersRouter.delete('/me/consent', limitarConfirmacaoSenha, async (req, res) => {
  const { senha } = validarCorpo(revogacaoSchema, req.body);
  const { sessao } = autenticacaoAtual(res);
  await confirmarSenha(sessao, senha);
  await revogarConsentimento(sessao);
  res.status(204).end();
});

usersRouter.delete('/me', limitarConfirmacaoSenha, async (req, res) => {
  const { senha } = validarCorpo(exclusaoSchema, req.body);
  const { sessao } = autenticacaoAtual(res);
  await confirmarSenha(sessao, senha);
  await excluirUsuario(sessao);
  res.status(204).end();
});
