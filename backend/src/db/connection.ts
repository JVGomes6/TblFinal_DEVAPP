import { Pool, types } from 'pg';
import type { PoolClient } from 'pg';
import { config } from '../config.js';

const urlBanco = new URL(config.databaseUrl);
const hostBanco = urlBanco.searchParams.getAll('host').at(-1) || urlBanco.hostname;
const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostBanco.toLowerCase());
if (config.nodeEnv === 'production' || !loopback) {
  // Os parâmetros TLS da URL têm precedência sobre a opção ssl do Pool.
  urlBanco.searchParams.delete('ssl');
  urlBanco.searchParams.set('sslmode', 'verify-full');
}

export const pool = new Pool({
  connectionString: urlBanco.href,
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
