import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { autenticacaoAtual } from './auth.js';
import { ErroApi } from './errors.js';

const QUINZE_MINUTOS = 15 * 60 * 1000;

function limitar(
  identifier: string,
  limit: number,
  windowMs: number,
  keyGenerator?: (req: Request, res: Response) => string,
) {
  return rateLimit({
    identifier,
    limit,
    windowMs,
    ...(keyGenerator && { keyGenerator }),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new ErroApi(429, 'LIMITE_REQUISICOES', 'Muitas tentativas. Aguarde e tente novamente.'));
    },
  });
}

function chaveDaConta(_req: Request, res: Response): string {
  return autenticacaoAtual(res).sessao.usuarioId;
}

export const limitarCadastro = limitar('cadastro', 5, QUINZE_MINUTOS);
export const limitarLogin = limitar('login', 10, QUINZE_MINUTOS);
export const limitarConfirmacaoSenha = limitar('confirmacao-senha', 5, QUINZE_MINUTOS, chaveDaConta);
export const limitarGeracao = limitar('geracao', 3, 60_000, chaveDaConta);
