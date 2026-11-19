import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { readFile } from 'node:fs/promises';

const modelo = 'gemini-2.5-flash';
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
const papeis = ['abertura', 'pergunta', 'fecho'];
const contexto = { foco: 'rotina', ate: '2024-11-17' };

function simularTransporteGemini(t) {
  const eventos = new EventEmitter();
  const fetchLocal = globalThis.fetch;
  const envios = [];

  t.mock.method(globalThis, 'fetch', (input, init) => {
    const endereco = new URL(input instanceof Request ? input.url : input);
    if (endereco.hostname === '127.0.0.1') return fetchLocal(input, init);
    assert.equal(endereco.href, endpoint);
    assert.equal(init.method, 'POST');
    const { signal } = init;

    return new Promise((resolve, reject) => {
      function cancelar() { reject(signal.reason); }
      signal.addEventListener('abort', cancelar, { once: true });
      const envio = {
        corpo: JSON.parse(init.body), signal,
        responder({ modelVersion = modelo, texto } = {}) {
          signal.removeEventListener('abort', cancelar);
          const ids = Object.fromEntries(papeis.map((papel) => [papel, envio.corpo.generationConfig.responseJsonSchema.properties[papel].enum[0]]));
          resolve(Response.json({ modelVersion, candidates: [{
            finishReason: 'STOP', content: { role: 'model', parts: [{ text: texto ?? JSON.stringify(ids) }] },
          }] }));
        },
      };
      envios.push(envio);
      eventos.emit('envio', envio);
    });
  });

  return {
    envios,
    async proximo() {
      const [envio] = await once(eventos, 'envio', { signal: AbortSignal.timeout(7_000) });
      return envio;
    },
  };
}

async function carregarAppComGemini(env) {
  const valores = {
    NODE_ENV: 'test', DATABASE_URL: env.DATABASE_URL, JWT_SECRET_BASE64: env.JWT_SECRET_BASE64,
    JWT_ISSUER: env.JWT_ISSUER, JWT_AUDIENCE: env.JWT_AUDIENCE, JWT_TTL_SECONDS: env.JWT_TTL_SECONDS,
    CONSENT_VERSION: env.CONSENT_VERSION, GEMINI_ENABLED: 'true', GEMINI_API_KEY: 'chave-ficticia-apenas-no-teste',
    GEMINI_MODEL: modelo, GEMINI_TIMEOUT_MS: '10000',
  };
  const anteriores = new Map(Object.keys(valores).map((nome) => [nome, process.env[nome]]));
  Object.assign(process.env, valores);
  try {
    const { criarApp } = await import('../dist/app.js');
    const { pool } = await import('../dist/db/connection.js');
    return { app: criarApp(), pool };
  } finally {
    for (const [nome, valor] of anteriores) {
      if (valor === undefined) delete process.env[nome];
      else process.env[nome] = valor;
    }
  }
}

export async function verificarFluxoGemini(t, { env, chamarApi, cadastrar, aceitar, noites }) {
  const transporte = simularTransporteGemini(t);
  const { app, pool } = await carregarAppComGemini(env);
  const servidor = app.listen(0, '127.0.0.1');
  try {
    await once(servidor, 'listening');
    const api = { base: `http://127.0.0.1:${servidor.address().port}/v1` };
    const senha = 'frase-ficticia-reflexao';
    const titular = await cadastrar(api, { email: 'reflexao-titular@example.invalid', senha });
    const outra = await cadastrar(api, { email: 'reflexao-outra@example.invalid', senha });
    const prompt = (await readFile(new URL('../../ai-materials/system.pt-BR.txt', import.meta.url), 'utf8')).trim();

    const previa = (token) => chamarApi(api, 'POST', '/ai/preview', { token, corpo: contexto });
    const gerar = (token, hashPrevia, signal) => chamarApi(api, 'POST', '/ai/ritual', {
      token, corpo: { ...contexto, hashPrevia, autorizoEnvio: true }, signal,
    });

    async function conferirPrevia(token, total, categorias) {
      const resultado = await previa(token);
      assert.equal(resultado.status, 200);
      assert.equal(resultado.dados.noites, total);
      assert.equal(resultado.dados.provedor, 'Google Gemini');
      assert.equal(resultado.dados.texto, JSON.stringify(categorias));
      assert.match(resultado.dados.hashPrevia, /^[a-f0-9]{64}$/);
      return resultado.dados;
    }

    function conferirEnvio(envio, texto) {
      const { contents, systemInstruction, generationConfig } = envio.corpo;
      assert.deepEqual(Object.keys(envio.corpo).sort(), ['contents', 'generationConfig', 'systemInstruction']);
      assert.deepEqual(contents, [{ role: 'user', parts: [{ text: texto }] }]);
      assert.deepEqual(systemInstruction.parts, [{ text: prompt }]);
      assert.equal(generationConfig.responseMimeType, 'application/json');
      const esquema = generationConfig.responseJsonSchema;
      assert.equal(esquema.type, 'object');
      assert.equal(esquema.additionalProperties, false);
      assert.deepEqual(Object.keys(esquema.properties), papeis);
      assert.deepEqual(esquema.required, papeis);
      return esquema.properties.pergunta.enum;
    }

    async function gravar(token, fator) {
      for (const noite of noites) {
        const resultado = await chamarApi(api, 'POST', '/sleep', {
          token, corpo: { ...noite, id: randomUUID(), fatores: { ...noite.fatores, cafeina: fator } },
        });
        assert.equal(resultado.status, 201);
      }
    }

    let vazia;
    let dominante;
    let empate;

    await t.test('Gemini: conta sem aceite nunca chama o provedor', async () => {
      for (const resposta of [await previa(titular.token), await gerar(titular.token, '0'.repeat(64))]) {
        assert.equal(resposta.status, 403);
        assert.equal(resposta.dados.erro.codigo, 'CONSENTIMENTO_NECESSARIO');
      }
      assert.equal(transporte.envios.length, 0);
      await aceitar(api, titular.token);
      await aceitar(api, outra.token);
    });

    await t.test('Gemini: zero noites, corpo exato da prévia e JSON do catálogo', async () => {
      vazia = await conferirPrevia(titular.token, 0, { foco: 'rotina', cobertura: 'zero' });
      const envio = transporte.proximo();
      const resultado = gerar(titular.token, vazia.hashPrevia);
      const pedido = await envio;
      assert.deepEqual(conferirEnvio(pedido, vazia.texto), ['pergunta_inicio', 'pergunta_primeira_impressao']);
      pedido.responder();
      const cartao = await resultado;
      assert.equal(cartao.status, 200);
      assert.deepEqual(Object.keys(cartao.dados).sort(), ['abertura', 'fecho', 'observacaoLocal', 'origem', 'pergunta', 'versaoCatalogo']);
      assert.equal(cartao.dados.origem, 'gemini');
      assert.equal(cartao.dados.versaoCatalogo, vazia.versaoCatalogo);
      assert.match(cartao.dados.observacaoLocal, /ainda não registrou noites/);
      assert.ok(papeis.every((papel) => cartao.dados[papel].length > 0));
    });

    await t.test('Gemini: fator dominante, empate e prévia alterada rejeitada antes da chamada', async () => {
      await gravar(titular.token, false);
      await gravar(outra.token, true);
      dominante = await conferirPrevia(titular.token, 2, { foco: 'rotina', cobertura: 'parcial', fator: 'telas' });
      empate = await conferirPrevia(outra.token, 2, { foco: 'rotina', cobertura: 'parcial' });
      const total = transporte.envios.length;
      const resposta = await gerar(titular.token, vazia.hashPrevia);
      assert.equal(resposta.status, 409);
      assert.equal(resposta.dados.erro.codigo, 'PREVIA_DESATUALIZADA');
      assert.equal(transporte.envios.length, total);
    });

    await t.test('Gemini: cancelamento chega ao SDK, que permite um novo pedido', async () => {
      const controle = new AbortController();
      const envio = transporte.proximo();
      const cancelada = assert.rejects(gerar(outra.token, empate.hashPrevia, controle.signal), { name: 'AbortError' });
      const pedido = await envio;
      assert.ok(!conferirEnvio(pedido, empate.texto).includes('pergunta_telas'));
      const abortado = once(pedido.signal, 'abort', { signal: AbortSignal.timeout(7_000) });
      controle.abort();
      await Promise.all([cancelada, abortado]);
      assert.equal((await previa(outra.token)).status, 200);

      const novoEnvio = transporte.proximo();
      const novaGeracao = gerar(outra.token, empate.hashPrevia);
      (await novoEnvio).responder();
      assert.equal((await novaGeracao).status, 200);
    });

    await t.test('Gemini: revogar e reaceitar durante a inferência invalida o resultado antigo', async () => {
      const envio = transporte.proximo();
      const geracao = gerar(titular.token, dominante.hashPrevia);
      const pedido = await envio;
      assert.ok(conferirEnvio(pedido, dominante.texto).includes('pergunta_telas'));
      const revogacao = await chamarApi(api, 'DELETE', '/users/me/consent', {
        token: titular.token, corpo: { senha, apagarDiario: true },
      });
      assert.equal(revogacao.status, 204);
      await aceitar(api, titular.token);
      assert.equal(pedido.signal.aborted, false);
      pedido.responder();
      const resposta = await geracao;
      assert.equal(resposta.status, 403);
      assert.equal(resposta.dados.erro.codigo, 'CONSENTIMENTO_NECESSARIO');
      await conferirPrevia(titular.token, 0, { foco: 'rotina', cobertura: 'zero' });
    });

    await t.test('Gemini: recusa modelo substituto e JSON fora do catálogo', async () => {
      const envio = transporte.proximo();
      const geracao = gerar(outra.token, empate.hashPrevia);
      (await envio).responder({ modelVersion: 'gemini-3.5-flash-lite' });
      const resposta = await geracao;
      assert.equal(resposta.status, 503);
      assert.equal(resposta.dados.erro.codigo, 'CARTAO_INDISPONIVEL');

      const { comporCartao, prepararComposicao, serializarContexto } = await import('../dist/ai/compose.js');
      const { opcoes } = prepararComposicao(JSON.parse(empate.texto));
      const validos = Object.fromEntries(papeis.map((papel) => [papel, opcoes[papel][0].id]));
      assert.throws(() => serializarContexto({ ...JSON.parse(empate.texto), noites: 2 }));
      for (const texto of [
        'texto solto', '{}', JSON.stringify({ ...validos, extra: 'texto' }),
        JSON.stringify({ ...validos, pergunta: 'pergunta_telas' }),
        JSON.stringify(validos).replace('{', '{"fecho":"repetido",'),
      ]) assert.throws(() => comporCartao(texto, opcoes), { codigo: 'CARTAO_INDISPONIVEL' });
    });
  } finally {
    const fechou = once(servidor, 'close');
    servidor.close();
    servidor.closeAllConnections();
    await fechou;
    await pool.end();
  }
}
