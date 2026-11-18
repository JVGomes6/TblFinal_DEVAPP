import { Router } from 'express';
import type { Response } from 'express';
import type { PoolClient } from 'pg';
import { emTransacao } from '../db/connection.js';
import { autenticacaoAtual, exigirAutenticacao } from '../middleware/auth.js';
import { bloquearConsentimentoParaEscrita, exigirConsentimento, revalidarConsentimento } from '../middleware/consent.js';
import { semConsulta, semCorpo, validarCorpo } from '../middleware/errors.js';
import { atualizarRegistro, criarRegistro, excluirRegistro, listarRegistros, obterRegistro } from './repository.js';
import { criacaoSonoSchema, edicaoSonoSchema, filtrosSonoSchema, lerIdRegistro, lerVersaoIfMatch, normalizarSono } from './schema.js';

async function consultarDiario<T>(res: Response, consultar: (usuarioId: string) => Promise<T>): Promise<T> {
  const { sessao, usuario } = autenticacaoAtual(res);
  const resultado = await consultar(sessao.usuarioId);
  await revalidarConsentimento(sessao, usuario.consentimento_versao);
  return resultado;
}

function gravarNoDiario<T>(res: Response, gravar: (client: PoolClient, usuarioId: string) => Promise<T>): Promise<T> {
  const { sessao, usuario } = autenticacaoAtual(res);
  return emTransacao(async (client) => {
    await bloquearConsentimentoParaEscrita(client, sessao, usuario.consentimento_versao);
    return gravar(client, sessao.usuarioId);
  });
}

export const sleepRouter = Router();
sleepRouter.use(exigirAutenticacao, exigirConsentimento);

sleepRouter.post('/', semConsulta, async (req, res) => {
  const { id, ...entrada } = validarCorpo(criacaoSonoSchema, req.body);
  const dados = normalizarSono(entrada);
  const { criado, registro } = await gravarNoDiario(res, (client, usuarioId) => criarRegistro(client, usuarioId, id, dados));
  if (criado) res.location(`/v1/sleep/${registro.id}`);
  res.set('ETag', `"${registro.versao}"`).status(criado ? 201 : 200).json(registro);
});

sleepRouter.get('/', semCorpo, async (req, res) => {
  const filtros = validarCorpo(filtrosSonoSchema, req.query);
  const pagina = await consultarDiario(res, (usuarioId) => listarRegistros(usuarioId, filtros));
  res.json(pagina);
});

sleepRouter.get('/:id', semConsulta, semCorpo, async (req, res) => {
  const id = lerIdRegistro(req.params.id);
  const registro = await consultarDiario(res, (usuarioId) => obterRegistro(usuarioId, id));
  res.set('ETag', `"${registro.versao}"`).json(registro);
});

sleepRouter.put('/:id', semConsulta, async (req, res) => {
  const id = lerIdRegistro(req.params.id);
  const { versao, ...entrada } = validarCorpo(edicaoSonoSchema, req.body);
  const dados = normalizarSono(entrada);
  const registro = await gravarNoDiario(res, (client, usuarioId) => atualizarRegistro(client, usuarioId, id, versao, dados));
  res.set('ETag', `"${registro.versao}"`).json(registro);
});

sleepRouter.delete('/:id', semConsulta, semCorpo, async (req, res) => {
  const id = lerIdRegistro(req.params.id);
  const versao = lerVersaoIfMatch(req.get('If-Match'));
  await gravarNoDiario(res, (client, usuarioId) => excluirRegistro(client, usuarioId, id, versao));
  res.status(204).end();
});
