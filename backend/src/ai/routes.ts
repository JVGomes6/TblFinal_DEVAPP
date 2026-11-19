import { Router } from 'express';
import { z } from 'zod';
import { autenticacaoAtual, exigirAutenticacao } from '../middleware/auth.js';
import { exigirConsentimento, revalidarConsentimento } from '../middleware/consent.js';
import { ErroApi, semConsulta, validarCorpo } from '../middleware/errors.js';
import { limitarGeracao } from '../middleware/limit.js';
import { dataLocalSchema } from '../sleep/schema.js';
import { comporCartao, focoSchema, prepararComposicao } from './compose.js';
import { gerarIdsNoGemini } from './gemini.js';
import { prepararPrevia } from './preview.js';

const previaSchema = z.strictObject({ foco: focoSchema, ate: dataLocalSchema });
const ritualSchema = previaSchema.extend({
  hashPrevia: z.string().length(64).regex(/^[a-f0-9]+$/),
  autorizoEnvio: z.literal(true),
});
const geracoesEmAndamento = new Set<string>();

export const aiRouter = Router();
aiRouter.use(exigirAutenticacao, exigirConsentimento, semConsulta);

aiRouter.post('/preview', async (req, res) => {
  const { foco, ate } = validarCorpo(previaSchema, req.body);
  const { sessao, usuario } = autenticacaoAtual(res);
  const { previa } = await prepararPrevia(sessao, usuario.consentimento_versao, foco, ate);
  await revalidarConsentimento(sessao, usuario.consentimento_versao);
  res.json(previa);
});

aiRouter.post('/ritual', limitarGeracao, async (req, res) => {
  const { foco, ate, hashPrevia } = validarCorpo(ritualSchema, req.body);
  const { sessao, usuario } = autenticacaoAtual(res);
  const { usuarioId } = sessao;
  if (geracoesEmAndamento.has(usuarioId)) {
    throw new ErroApi(429, 'GERACAO_EM_ANDAMENTO', 'Aguarde a geração do cartão atual.');
  }

  const controlador = new AbortController();
  const cancelar = () => { controlador.abort(); };
  geracoesEmAndamento.add(usuarioId);
  res.once('close', cancelar);
  if (res.destroyed) cancelar();

  try {
    const { previa, contexto, observacaoLocal } = await prepararPrevia(sessao, usuario.consentimento_versao, foco, ate);
    await revalidarConsentimento(sessao, usuario.consentimento_versao);
    if (previa.hashPrevia !== hashPrevia) {
      throw new ErroApi(409, 'PREVIA_DESATUALIZADA', 'Confira a nova prévia antes de gerar seu cartão.');
    }

    const { opcoes, esquema, instrucaoSistema } = prepararComposicao(contexto);
    const resposta = await gerarIdsNoGemini(contexto, instrucaoSistema, esquema, controlador.signal);
    if (controlador.signal.aborted) return;
    await revalidarConsentimento(sessao, usuario.consentimento_versao);
    if (controlador.signal.aborted) return;
    const cartao = comporCartao(resposta, opcoes);

    res.json({ origem: 'gemini', observacaoLocal, ...cartao, versaoCatalogo: previa.versaoCatalogo });
  } catch (erro) {
    if (!controlador.signal.aborted) throw erro;
  } finally {
    res.off('close', cancelar);
    geracoesEmAndamento.delete(usuarioId);
  }
});
