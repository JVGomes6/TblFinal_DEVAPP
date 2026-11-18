import type { RequestHandler, Response } from 'express';
import { verificarToken } from '../auth/tokens.js';
import type { Sessao } from '../auth/tokens.js';
import { buscarUsuarioAutenticado } from '../users/repository.js';
import type { Usuario } from '../users/repository.js';
import { sessaoInvalida } from './errors.js';

interface Autenticacao {
  sessao: Sessao;
  usuario: Usuario;
}

declare global {
  namespace Express {
    interface Locals {
      autenticacao?: Autenticacao;
    }
  }
}

export const exigirAutenticacao: RequestHandler = async (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const token = /^Bearer +([^\s,]+)$/i.exec(req.get('Authorization') ?? '')?.[1];
  const sessao = token ? verificarToken(token) : null;
  if (!sessao) throw sessaoInvalida();

  const usuario = await buscarUsuarioAutenticado(sessao);
  res.locals.autenticacao = { sessao, usuario };
  next();
};

export function autenticacaoAtual(res: Response): Autenticacao {
  const autenticacao = res.locals.autenticacao;
  if (!autenticacao) throw sessaoInvalida();
  return autenticacao;
}
