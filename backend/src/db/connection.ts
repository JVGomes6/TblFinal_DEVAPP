import { Pool, types } from 'pg';
import type { PoolClient } from 'pg';
import { config } from '../config.js';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: true,
  enableChannelBinding: true,
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  types: {
    getTypeParser(oid, format) {
      // Preserve a data civil sem conversão para o fuso do processo.
      if (oid === types.builtins.DATE && format !== 'binary') {
        return (value: string) => value;
      }

      return types.getTypeParser(oid, format);
    },
  },
});

pool.on('error', () => {
  console.error('Falha em uma conexão ociosa do PostgreSQL.');
});

export async function emTransacao<T>(
  executar: (client: PoolClient) => Promise<T>,
  { somenteLeitura = false } = {},
): Promise<T> {
  const client = await pool.connect();
  let descartarConexao = false;

  try {
    await client.query(`BEGIN ISOLATION LEVEL READ COMMITTED${somenteLeitura ? ' READ ONLY' : ''}`);
    const resultado = await executar(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch {
      descartarConexao = true;
    }
    throw erro;
  } finally {
    client.release(descartarConexao);
  }
}
