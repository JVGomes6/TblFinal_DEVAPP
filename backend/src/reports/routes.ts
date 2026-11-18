import { Router } from 'express';
import { z } from 'zod';
import { autenticacaoAtual, exigirAutenticacao } from '../middleware/auth.js';
import { exigirConsentimento, revalidarConsentimento } from '../middleware/consent.js';
import { ErroApi, semCorpo, validarCorpo } from '../middleware/errors.js';
import { dataLocalSchema } from '../sleep/schema.js';
import { resumirSono } from './summary.js';

const consultaSchema = z.strictObject({ de: dataLocalSchema, ate: dataLocalSchema });
const TRINTA_DIAS_MS = 30 * 86_400_000;

export const reportsRouter = Router();

reportsRouter.get('/sleep', exigirAutenticacao, exigirConsentimento, semCorpo, async (req, res) => {
  const periodo = validarCorpo(consultaSchema, req.query);
  const intervalo = Date.parse(periodo.ate) - Date.parse(periodo.de);
  if (intervalo < 0 || intervalo > TRINTA_DIAS_MS) {
    throw new ErroApi(422, 'PERIODO_INVALIDO', 'Selecione um período de até 31 dias, com o início antes ou no dia do fim.', 'ate');
  }

  const { sessao, usuario } = autenticacaoAtual(res);
  const { metricas } = await resumirSono(sessao.usuarioId, periodo);
  await revalidarConsentimento(sessao, usuario.consentimento_versao);
  res.json(metricas);
});
