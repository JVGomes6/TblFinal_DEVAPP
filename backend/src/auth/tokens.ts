import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';

const claimsSchema = z.object({
  sub: z.uuid(),
  iss: z.literal(config.jwtIssuer),
  aud: z.literal(config.jwtAudience),
  exp: z.int().positive(),
  sessaoVersao: z.int().positive().max(2147483647),
});

export interface Sessao {
  usuarioId: string;
  versao: number;
  expiraEm: number;
}

export function emitirToken(usuarioId: string, sessaoVersao: number): string {
  return jwt.sign({ sessaoVersao }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: usuarioId,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: config.jwtTtlSeconds,
  });
}

export function verificarToken(token: string): Sessao | null {
  try {
    const claims = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    });
    const resultado = claimsSchema.safeParse(claims);
    if (!resultado.success) return null;

    return {
      usuarioId: resultado.data.sub,
      versao: resultado.data.sessaoVersao,
      expiraEm: resultado.data.exp,
    };
  } catch (erro) {
    if (erro instanceof jwt.JsonWebTokenError) return null;
    throw erro;
  }
}
