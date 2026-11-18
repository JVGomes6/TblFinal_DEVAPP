import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { apagarSessao, sessaoAtiva } from './session';

const baseURL = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');
const URL_HTTPS = /^https:\/\/(?:[a-z0-9.-]+|\[[a-f0-9:]+\])(?::\d+)?(?:\/[a-z0-9_-]+)*\/v1$/i;
const URL_LOCAL = /^http:\/\/(?:10\.0\.2\.2|127\.0\.0\.1|localhost)(?::\d+)?\/v1$/i;
const ROTAS_PUBLICAS = new Set(['/health', '/auth/login', '/auth/register']);
const sessoesPorRequisicao = new WeakMap<InternalAxiosRequestConfig, number>();

export class ErroApi extends Error {
  constructor(
    readonly status: number | null,
    readonly codigo: string,
    mensagem: string,
    readonly campo?: string,
  ) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

export function requisicaoCancelada(): ErroApi {
  return new ErroApi(null, 'REQUISICAO_CANCELADA', 'Solicitação cancelada.');
}

export function erroSessaoInvalida(): ErroApi {
  return new ErroApi(401, 'SESSAO_INVALIDA', 'Entre novamente para continuar.');
}

export function respostaInvalida(): ErroApi {
  return new ErroApi(null, 'RESPOSTA_INVALIDA', 'A API retornou uma resposta inesperada.');
}

export const api = axios.create({
  baseURL,
  allowAbsoluteUrls: false,
  timeout: 15_000,
  headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
});

api.interceptors.request.use((config) => {
  if (!baseURL || (!URL_HTTPS.test(baseURL) && !(__DEV__ && URL_LOCAL.test(baseURL)))) {
    throw new ErroApi(null, 'API_NAO_CONFIGURADA', 'Confira o endereço da API na configuração do app.');
  }
  const rota = config.url;
  if (!rota || !/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(rota)) {
    throw new ErroApi(null, 'ROTA_INVALIDA', 'O caminho da API é inválido.');
  }

  config.baseURL = baseURL;
  config.headers.delete('Authorization');
  delete config.auth;
  if (ROTAS_PUBLICAS.has(rota)) return config;

  const sessao = sessaoAtiva();
  if (!sessao) throw erroSessaoInvalida();
  config.headers.set('Authorization', `Bearer ${sessao.token}`);
  sessoesPorRequisicao.set(config, sessao.revisao);
  return config;
});

api.interceptors.response.use((resposta) => {
  const revisao = sessoesPorRequisicao.get(resposta.config);
  if (revisao !== undefined && sessaoAtiva()?.revisao !== revisao) throw requisicaoCancelada();
  return resposta;
}, async (erro: unknown) => {
  if (axios.isCancel(erro)) throw requisicaoCancelada();
  if (!axios.isAxiosError(erro)) throw erro;

  const { config, response } = erro;
  const revisao = config && sessoesPorRequisicao.get(config);
  if (revisao !== undefined && sessaoAtiva()?.revisao !== revisao) throw requisicaoCancelada();

  if (response?.status === 401 && revisao !== undefined) {
    try {
      await apagarSessao(revisao);
    } catch {
      // A sessão já foi invalidada em memória e no servidor.
    }
  }

  if (!response) {
    if (erro.code === 'ECONNABORTED' || erro.code === 'ETIMEDOUT') {
      throw new ErroApi(null, 'TEMPO_ESGOTADO', 'A API demorou para responder. Tente novamente.');
    }
    throw new ErroApi(null, 'SEM_CONEXAO', 'Não foi possível conectar à API. Verifique a conexão.');
  }

  const dados: unknown = response.data;
  const detalhes = dados && typeof dados === 'object' && 'erro' in dados ? dados.erro : null;
  if (detalhes && typeof detalhes === 'object' && 'codigo' in detalhes && 'mensagem' in detalhes &&
      typeof detalhes.codigo === 'string' && typeof detalhes.mensagem === 'string') {
    const campo = 'campo' in detalhes && typeof detalhes.campo === 'string' ? detalhes.campo : undefined;
    throw new ErroApi(response.status, detalhes.codigo, detalhes.mensagem, campo);
  }

  throw new ErroApi(response.status, 'SOLICITACAO_FALHOU', 'Não foi possível concluir a solicitação.');
});
