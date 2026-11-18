import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const CUSTO_BCRYPT = 12;
const FORMATO_HASH = 'bcrypt-sha384-v1:';
// Valor fictício para realizar o mesmo trabalho quando o e-mail não existe.
const HASH_FICTICIO = '$2b$12$PQPPna.F2FQNcR.EbE7eYevS54QUN96nMRMxI1vbyU4ZEf2F0d6jm';

export const senhaSchema = z.string().refine((senha) => {
  const caracteres = Array.from(senha).length;
  return caracteres >= 12 && caracteres <= 128 && !/\p{Surrogate}/u.test(senha);
});

// O sal por conta distingue o pré-hash de um SHA-384 puro. Em Base64, a
// entrada do bcrypt tem 64 bytes e inclui todos os caracteres da senha.
function prepararSenha(senha: string, sal: string): string {
  return createHash('sha384').update(FORMATO_HASH).update(sal).update(senha).digest('base64');
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = await bcrypt.genSalt(CUSTO_BCRYPT);
  return FORMATO_HASH + await bcrypt.hash(prepararSenha(senha, sal), sal);
}

export async function verificarSenha(senha: string, hashArmazenado?: string): Promise<boolean> {
  const hash = hashArmazenado?.startsWith(FORMATO_HASH) ? hashArmazenado.slice(FORMATO_HASH.length) : '';
  const hashValido = /^\$2b\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
  const alvo = hashValido ? hash : HASH_FICTICIO;
  const senhaConfere = await bcrypt.compare(prepararSenha(senha, bcrypt.getSalt(alvo)), alvo);
  return hashValido && senhaConfere;
}
