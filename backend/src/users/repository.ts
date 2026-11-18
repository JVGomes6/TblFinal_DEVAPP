import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { Sessao } from '../auth/tokens.js';
import { pool } from '../db/connection.js';
import { sessaoInvalida } from '../middleware/errors.js';

export interface Usuario {
  id: string;
  email: string;
  destaque: 'duracao' | 'humor';
  meta_min: number | null;
  alto_contraste: boolean;
  termo_versao: string | null;
  aceite_em: string | null;
  revogado_em: string | null;
  sessao_versao: number;
  consentimento_versao: number;
}

export interface Preferencias {
  destaque?: Usuario['destaque'];
  metaMin?: number | null;
  altoContraste?: boolean;
}

interface Credenciais extends Usuario {
  senha_hash: string;
}

const COLUNAS_USUARIO = `id, email, destaque, meta_min, alto_contraste, termo_versao,
  aceite_em, revogado_em, sessao_versao, consentimento_versao`;

export async function criarUsuario(email: string, senhaHash: string): Promise<Usuario | undefined> {
  const { rows } = await pool.query<Usuario>(
    `INSERT INTO usuarios (id, email, senha_hash) VALUES ($1, $2, $3)
      ON CONFLICT (lower(email)) DO NOTHING
      RETURNING ${COLUNAS_USUARIO}`,
    [randomUUID(), email, senhaHash],
  );
  return rows[0];
}

export async function buscarCredenciaisPorEmail(email: string): Promise<Credenciais | undefined> {
  const { rows } = await pool.query<Credenciais>(
    `SELECT ${COLUNAS_USUARIO}, senha_hash FROM usuarios WHERE lower(email) = $1`,
    [email],
  );
  return rows[0];
}

export function exigirSessaoDentroDoPrazo(sessao: Sessao): void {
  if (Date.now() >= sessao.expiraEm * 1000) throw sessaoInvalida();
}

// Ao receber o cliente de uma transação, mantenha a conta bloqueada até o commit.
export async function buscarUsuarioAutenticado(sessao: Sessao, client?: PoolClient): Promise<Usuario> {
  const { rows } = await (client ?? pool).query<Usuario>(
    `SELECT ${COLUNAS_USUARIO} FROM usuarios WHERE id = $1 AND sessao_versao = $2
      ${client ? 'FOR UPDATE' : ''}`,
    [sessao.usuarioId, sessao.versao],
  );
  exigirSessaoDentroDoPrazo(sessao);
  const usuario = rows[0];
  if (!usuario) throw sessaoInvalida();
  return usuario;
}

export async function buscarHashDaSenha(sessao: Sessao): Promise<string> {
  const { rows } = await pool.query<{ senha_hash: string }>(
    'SELECT senha_hash FROM usuarios WHERE id = $1 AND sessao_versao = $2',
    [sessao.usuarioId, sessao.versao],
  );
  const linha = rows[0];
  if (!linha) throw sessaoInvalida();
  return linha.senha_hash;
}

export async function invalidarSessoes(sessao: Sessao): Promise<void> {
  const { rowCount } = await pool.query(
    'UPDATE usuarios SET sessao_versao = sessao_versao + 1 WHERE id = $1 AND sessao_versao = $2',
    [sessao.usuarioId, sessao.versao],
  );
  if (!rowCount) throw sessaoInvalida();
}

export async function atualizarPreferencias(sessao: Sessao, preferencias: Preferencias): Promise<Usuario> {
  const { rows } = await pool.query<Usuario>(
    `UPDATE usuarios
      SET destaque = coalesce($3, destaque),
          meta_min = CASE WHEN $4 THEN $5 ELSE meta_min END,
          alto_contraste = coalesce($6, alto_contraste)
      WHERE id = $1 AND sessao_versao = $2
      RETURNING ${COLUNAS_USUARIO}`,
    [sessao.usuarioId, sessao.versao, preferencias.destaque ?? null,
      preferencias.metaMin !== undefined, preferencias.metaMin ?? null, preferencias.altoContraste ?? null],
  );
  const usuario = rows[0];
  if (!usuario) throw sessaoInvalida();
  return usuario;
}

export async function registrarAceite(client: PoolClient, id: string, versao: string): Promise<Usuario> {
  const { rows } = await client.query<Usuario>(
    `UPDATE usuarios
      SET termo_versao = $2, aceite_em = floor(extract(epoch FROM clock_timestamp()))::bigint,
          revogado_em = NULL, consentimento_versao = consentimento_versao + 1
      WHERE id = $1
      RETURNING ${COLUNAS_USUARIO}`,
    [id, versao],
  );
  const usuario = rows[0];
  if (!usuario) throw sessaoInvalida();
  return usuario;
}

export async function limparDiarioERevogar(client: PoolClient, id: string): Promise<void> {
  await client.query('DELETE FROM registros_sono WHERE usuario_id = $1', [id]);
  await client.query(
    `UPDATE usuarios
      SET meta_min = NULL,
          revogado_em = CASE WHEN aceite_em IS NOT NULL THEN coalesce(revogado_em,
            greatest(aceite_em, floor(extract(epoch FROM clock_timestamp()))::bigint)) END,
          consentimento_versao = consentimento_versao +
            CASE WHEN aceite_em IS NOT NULL AND revogado_em IS NULL THEN 1 ELSE 0 END
      WHERE id = $1`,
    [id],
  );
}

export async function excluirUsuario(sessao: Sessao): Promise<void> {
  exigirSessaoDentroDoPrazo(sessao);
  // A exclusão e o cascade fazem parte da mesma transação implícita do DELETE.
  const { rowCount } = await pool.query(
    'DELETE FROM usuarios WHERE id = $1 AND sessao_versao = $2',
    [sessao.usuarioId, sessao.versao],
  );
  if (!rowCount) throw sessaoInvalida();
}
