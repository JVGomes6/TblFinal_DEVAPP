import express from 'express';
import { aiRouter } from './ai/routes.js';
import { authRouter } from './auth/routes.js';
import { pool } from './db/connection.js';
import { ErroApi, rotaNaoEncontrada, semConsulta, semCorpo, tratarErros } from './middleware/errors.js';
import { reportsRouter } from './reports/routes.js';
import { sleepRouter } from './sleep/routes.js';
import { usersRouter } from './users/routes.js';

const decodificadorUtf8 = new TextDecoder('utf-8', { fatal: true });

export function criarApp() {
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use((req, _res, next) => {
    const temCorpo = req.headers['transfer-encoding'] || Number(req.headers['content-length']) > 0;
    if (temCorpo && !req.is('application/json')) {
      throw new ErroApi(415, 'FORMATO_NAO_SUPORTADO', 'Envie o corpo em JSON UTF-8.');
    }
    next();
  });
  app.use(express.json({
    limit: '16kb',
    strict: false,
    verify: (_req, _res, corpo, charset) => {
      if (charset !== 'utf-8') {
        throw new ErroApi(415, 'FORMATO_NAO_SUPORTADO', 'Envie o corpo em JSON UTF-8.');
      }
      try {
        decodificadorUtf8.decode(corpo);
      } catch {
        throw new ErroApi(400, 'JSON_INVALIDO', 'Envie um corpo JSON válido.');
      }
    },
  }));
  app.get('/v1/health', semConsulta, semCorpo, async (_req, res) => {
    try {
      await pool.query('SELECT 1');
    } catch {
      throw new ErroApi(503, 'BANCO_INDISPONIVEL', 'O banco de dados está indisponível.');
    }
    res.json({ status: 'ok' });
  });
  app.use('/v1/auth', authRouter);
  app.use('/v1/users', usersRouter);
  app.use('/v1/sleep', sleepRouter);
  app.use('/v1/reports', reportsRouter);
  app.use('/v1/ai', aiRouter);
  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
