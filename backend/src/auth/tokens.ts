import { errors, jwtVerify, SignJWT } from 'jose';
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

export function emitirToken(usuarioId: string, sessaoVersao: number): Promise<string> {
  const agora = Math.floor(Date.now() / 1000);
  return new SignJWT({ sessaoVersao })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(usuarioId)
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setIssuedAt(agora)
    .setExpirationTime(agora + config.jwtTtlSeconds)
    .sign(config.jwtSecret);
}

export async function verificarToken(token: string): Promise<Sessao | null> {
  try {
    const { payload } = await jwtVerify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      requiredClaims: ['sub', 'exp', 'sessaoVersao'],
    });
    const resultado = claimsSchema.safeParse(payload);
    if (!resultado.success) return null;

    return {
      usuarioId: resultado.data.sub,
      versao: resultado.data.sessaoVersao,
      expiraEm: resultado.data.exp,
    };
  } catch (erro) {
    if (erro instanceof errors.JOSEError) return null;
    throw erro;
  }
}
