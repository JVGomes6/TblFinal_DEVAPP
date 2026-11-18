import { criarApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/connection.js';

const server = criarApp().listen({ host: config.host, port: config.port }, (erro?: Error) => {
  if (erro) {
    console.error('Não foi possível iniciar a API.');
    process.exitCode = 1;
    return;
  }
  console.log(`API EntreNoites em execução no endereço ${config.host}, porta ${config.port}.`);
});

function encerrar(): void {
  process.removeListener('SIGINT', encerrar);
  process.removeListener('SIGTERM', encerrar);
  server.close((erro) => {
    if (erro) process.exitCode = 1;
    void pool.end().catch(() => {
      console.error('Não foi possível encerrar as conexões do backend.');
      process.exitCode = 1;
    });
  });
}

process.once('SIGINT', encerrar);
process.once('SIGTERM', encerrar);
