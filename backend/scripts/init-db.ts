import { readFile } from 'node:fs/promises';
import { pool } from '../src/db/connection.js';

const pastaBanco = new URL('../../database/', import.meta.url);
const arquivos = ['init.sql', 'migrations/001_consentimento_versao.sql'];

try {
  const comandos = await Promise.all(arquivos.map((arquivo) => readFile(new URL(arquivo, pastaBanco), 'utf8')));
  for (const sql of comandos) await pool.query(sql);

  await pool.query('SELECT id, consentimento_versao FROM usuarios LIMIT 0');
  await pool.query('SELECT id, usuario_id, data_local, duracao_estimada_min, versao FROM registros_sono LIMIT 0');
  console.log('Esquema do EntreNoites inicializado e verificado.');
} catch (erro) {
  const codigo = typeof erro === 'object' && erro !== null && 'code' in erro &&
    typeof erro.code === 'string' && /^[A-Z0-9_]{1,64}$/.test(erro.code) ? ` (${erro.code})` : '';
  console.error(`Não foi possível inicializar o PostgreSQL${codigo}. Confira a conexão e as permissões da role.`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
