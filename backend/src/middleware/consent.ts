import type { RequestHandler } from 'express';
import type { PoolClient } from 'pg';
import type { Sessao } from '../auth/tokens.js';
import { temConsentimentoVigente } from '../users/consentService.js';
import { buscarUsuarioAutenticado } from '../users/repository.js';
import type { Usuario } from '../users/repository.js';
import { autenticacaoAtual } from './auth.js';
import { ErroApi } from './errors.js';

declare global {
  namespace Express {
    interface Locals {
      consentimentoVersao?: number;
    }
  }
}

function conferirConsentimento(usuario: Usuario, versaoEsperada = usuario.consentimento_versao): void {
  if (!temConsentimentoVigente(usuario) || usuario.consentimento_versao !== versaoEsperada) {
    throw new ErroApi(403, 'CONSENTIMENTO_NECESSARIO', 'Confira o consentimento para acessar o diário.');
  }
}

export const exigirConsentimento: RequestHandler = (_req, res, next) => {
  const { usuario } = autenticacaoAtual(res);
  conferirConsentimento(usuario);
  res.locals.consentimentoVersao = usuario.consentimento_versao;
  next();
};

// Use antes de devolver uma consulta ou um cartão após trabalho assíncrono.
export async function revalidarConsentimento(sessao: Sessao, versaoEsperada: number): Promise<void> {
  conferirConsentimento(await buscarUsuarioAutenticado(sessao), versaoEsperada);
}

// Use com o cliente da mesma transação, antes de gravar no diário.
export async function bloquearConsentimentoParaEscrita(
  client: PoolClient,
  sessao: Sessao,
  versaoEsperada: number,
): Promise<void> {
  conferirConsentimento(await buscarUsuarioAutenticado(sessao, client), versaoEsperada);
}
