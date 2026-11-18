import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import type { ZodType } from 'zod';

export class ErroApi extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensagem: string,
    readonly campo?: string,
  ) {
    super(mensagem);
  }
}

export function sessaoInvalida(): ErroApi {
  return new ErroApi(401, 'SESSAO_INVALIDA', 'Entre novamente para continuar.');
}

export function validarCorpo<T>(schema: ZodType<T>, corpo: unknown): T {
  const resultado = schema.safeParse(corpo);
  if (resultado.success) return resultado.data;

  const campo = resultado.error.issues[0]?.path[0];
  throw new ErroApi(422, 'DADOS_INVALIDOS', 'Confira os dados enviados.',
    typeof campo === 'string' ? campo : undefined);
}

const semCorpoSchema = z.strictObject({}).optional();

export const semCorpo: RequestHandler = (req, _res, next) => {
  validarCorpo(semCorpoSchema, req.body);
  next();
};

export const semConsulta: RequestHandler = (req, _res, next) => {
  if (Object.keys(req.query).length > 0) {
    throw new ErroApi(422, 'CONSULTA_INVALIDA', 'Esta rota não aceita parâmetros na URL.');
  }
  next();
};

export const rotaNaoEncontrada: RequestHandler = (_req, _res, next) => {
  next(new ErroApi(404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.'));
};

export const tratarErros: ErrorRequestHandler = (erro: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(erro);
    return;
  }

  const resposta = erro instanceof ErroApi ? erro : erroDeRequisicao(erro);
  if (resposta.codigo === 'SESSAO_INVALIDA') res.set('WWW-Authenticate', 'Bearer');
  res.status(resposta.status).json({
    erro: { codigo: resposta.codigo, campo: resposta.campo, mensagem: resposta.message },
  });
};

function erroDeRequisicao(erro: unknown): ErroApi {
  if (typeof erro === 'object' && erro !== null && 'type' in erro) {
    switch (erro.type) {
      case 'entity.parse.failed':
      case 'request.size.invalid':
      case 'request.aborted':
        return new ErroApi(400, 'JSON_INVALIDO', 'Envie um corpo JSON válido.');
      case 'entity.too.large':
        return new ErroApi(413, 'CORPO_MUITO_GRANDE', 'O corpo da requisição deve ter até 16 KB.');
      case 'charset.unsupported':
      case 'encoding.unsupported':
        return new ErroApi(415, 'FORMATO_NAO_SUPORTADO', 'Envie o corpo em JSON UTF-8.');
    }
  }

  return new ErroApi(500, 'ERRO_INTERNO', 'Não foi possível concluir a solicitação agora.');
}
