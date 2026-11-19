import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { test } from 'node:test';
import { setTimeout as aguardar } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { jwtVerify, SignJWT } from 'jose';
import { Pool } from 'pg';
import { verificarFluxoGemini } from './gemini-cenarios.mjs';

const executar = promisify(execFile);
const pastaBackend = fileURLToPath(new URL('../', import.meta.url));
const fixtures = JSON.parse(await readFile(new URL('../../database/example-fixtures.json', import.meta.url), 'utf8'));

function urlDeTeste() {
  const url = URL.parse(process.env.TEST_DATABASE_URL ?? '');
  if (!url || !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase()) || url.searchParams.has('host')) {
    throw new Error('Configure TEST_DATABASE_URL com um PostgreSQL local. Veja backend/.env.test.example.');
  }
  return url;
}

async function portaDisponivel() {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const { port } = socket.address();
  await new Promise((resolve) => socket.close(resolve));
  return port;
}

async function iniciarApi(env) {
  const PORT = String(await portaDisponivel());
  const processo = spawn(process.execPath, ['dist/server.js'], {
    cwd: pastaBackend,
    env: { ...env, PORT },
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  });
  const encerrado = once(processo, 'exit');
  async function encerrar() {
    processo.kill();
    await encerrado;
  }

  try {
    await Promise.race([
      once(processo.stdout, 'data', { signal: AbortSignal.timeout(10_000) }),
      encerrado.then(() => { throw new Error('A API de teste encerrou antes de iniciar. Rode npm run build.'); }),
    ]);
    return { base: `http://127.0.0.1:${PORT}/v1`, encerrar };
  } catch (erro) {
    await encerrar();
    throw erro;
  }
}

async function chamarApi({ base }, metodo, rota, { token, corpo, headers, signal } = {}) {
  const limite = AbortSignal.timeout(15_000);
  const resposta = await fetch(base + rota, {
    method: metodo,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(corpo !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    signal: signal ? AbortSignal.any([limite, signal]) : limite,
  });
  return { status: resposta.status, dados: resposta.status === 204 ? undefined : await resposta.json(), headers: resposta.headers };
}

async function cadastrar(api, corpo) {
  const cadastro = await chamarApi(api, 'POST', '/auth/register', { corpo });
  assert.equal(cadastro.status, 201);
  assert.deepEqual(Object.keys(cadastro.dados).sort(), ['altoContraste', 'consentimento', 'destaque', 'email', 'id', 'metaMin']);
  const login = await chamarApi(api, 'POST', '/auth/login', { corpo });
  assert.equal(login.status, 200);
  assert.deepEqual(Object.keys(login.dados).sort(), ['expiraEm', 'token', 'usuario']);
  assert.deepEqual(login.dados.usuario, cadastro.dados);
  assert.equal(login.dados.expiraEm, 3600);
  return { id: cadastro.dados.id, token: login.dados.token };
}

function tokenNoFormatoAnterior(payload, segredo) {
  const encode = (objeto) => Buffer.from(JSON.stringify(objeto)).toString('base64url');
  const entrada = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  return `${entrada}.${createHmac('sha256', segredo).update(entrada).digest('base64url')}`;
}

async function validarContratoDeAutenticacao(api, titular, credenciais, env) {
  const segredo = Buffer.from(env.JWT_SECRET_BASE64, 'base64');
  const { payload, protectedHeader } = await jwtVerify(titular.token, segredo, { algorithms: ['HS256'] });
  assert.equal(protectedHeader.alg, 'HS256');
  assert.equal(payload.iss, env.JWT_ISSUER);
  assert.equal(payload.aud, env.JWT_AUDIENCE);
  assert.equal(payload.sub, titular.id);
  assert.equal(payload.sessaoVersao, 1);
  assert.equal(payload.exp - payload.iat, 3600);
  assert.deepEqual(Object.keys(payload).sort(), ['aud', 'exp', 'iat', 'iss', 'sessaoVersao', 'sub']);

  const legado = tokenNoFormatoAnterior({ ...payload, iat: payload.iat - 10 }, segredo);
  assert.equal((await chamarApi(api, 'GET', '/users/me', { token: legado })).status, 200);
  const assinar = (claims, { alg = 'HS256', chave = segredo } = {}) => new SignJWT(claims).setProtectedHeader({ alg }).sign(chave);
  const { exp: _exp, ...semVencimento } = payload;

  for (const token of [
    undefined,
    'token-malformado',
    await assinar(payload, { chave: randomBytes(64) }),
    await assinar(payload, { alg: 'HS384' }),
    await assinar(semVencimento),
    await assinar({ ...payload, exp: payload.iat - 1 }),
    await assinar({ ...payload, iss: 'outro-emissor' }),
    await assinar({ ...payload, aud: 'outra-audiencia' }),
    await assinar({ ...payload, sub: 'sub-invalido' }),
    await assinar({ ...payload, sub: randomUUID() }),
    await assinar({ ...payload, sessaoVersao: '1' }),
    await assinar({ ...payload, sessaoVersao: 2 }),
  ]) {
    const invalida = await chamarApi(api, 'GET', '/users/me', { token });
    assert.equal(invalida.status, 401);
    assert.equal(invalida.dados.erro.codigo, 'SESSAO_INVALIDA');
  }

  const desconhecido = await chamarApi(api, 'POST', '/auth/login', { corpo: { ...credenciais, email: 'ausente@example.invalid' } });
  const incorreto = await chamarApi(api, 'POST', '/auth/login', { corpo: { ...credenciais, senha: `${credenciais.senha.slice(0, -1)}B` } });
  assert.equal(desconhecido.status, 401);
  assert.equal(incorreto.status, 401);
  assert.equal(incorreto.dados.erro.codigo, 'CREDENCIAIS_INVALIDAS');
  assert.deepEqual(incorreto.dados, desconhecido.dados);
  return legado;
}

async function aceitar(api, token) {
  const resultado = await chamarApi(api, 'PUT', '/users/me/consent', { token, corpo: { aceito: true, versao: 'sono-1' } });
  assert.equal(resultado.status, 200);
  assert.equal(resultado.dados.ativo, true);
}

async function aguardarBloqueioDaConta(banco) {
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    const { rows } = await banco.query(
      `SELECT 1 FROM pg_stat_activity
       WHERE application_name = current_setting('application_name') AND wait_event_type = $1 AND query LIKE $2`,
      ['Lock', '%FOR UPDATE%'],
    );
    if (rows.length > 0) return;
    await aguardar(50);
  }
  assert.fail('A requisição concorrente deveria aguardar o bloqueio da conta.');
}

async function comContaBloqueada(banco, usuarioId, executarComBloqueio) {
  const client = await banco.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT id FROM usuarios WHERE id = $1 FOR UPDATE', [usuarioId]);
    await executarComBloqueio(client);
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

test('Contrato HTTP de autenticação, consentimento, diário, relatório e prévia', { timeout: 90_000 }, async (t) => {
  const url = urlDeTeste();
  const esquema = `entrenoites_teste_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: url.href, ssl: true });
  url.searchParams.set('options', `-csearch_path=${esquema}`);
  url.searchParams.set('application_name', esquema);
  const banco = new Pool({ connectionString: url.href, ssl: true });
  const env = {
    ...process.env,
    NODE_ENV: 'test', DATABASE_URL: url.href, HOST: '127.0.0.1',
    JWT_SECRET_BASE64: randomBytes(64).toString('base64'), CONSENT_VERSION: 'sono-1',
    JWT_ISSUER: 'entrenoites-api', JWT_AUDIENCE: 'entrenoites-mobile', JWT_TTL_SECONDS: '3600',
    GEMINI_ENABLED: 'false', GEMINI_API_KEY: '',
  };
  const inicializar = () => executar(process.execPath, ['--import', 'tsx', 'scripts/init-db.ts'], {
    cwd: pastaBackend, env, timeout: 15_000,
  });
  let criouEsquema = false;
  let api;

  try {
    // O nome vem de um UUID local. Todas as operações ficam no esquema temporário.
    await admin.query(`CREATE SCHEMA ${esquema}`);
    criouEsquema = true;
    await Promise.all([inicializar(), inicializar()]);
    api = await iniciarApi(env);
    const saude = await chamarApi(api, 'GET', '/health');
    assert.equal(saude.status, 200);
    assert.deepEqual(saude.dados, { status: 'ok' });

    const [fixtureTitular, fixtureOutra] = fixtures.contas;
    const { credenciais, noites: [noite, segundaNoite] } = fixtureTitular;
    const [outraNoite] = fixtureOutra.noites;
    const senhaLonga = `${'🌙'.repeat(127)}A`;
    const credenciaisOutra = { ...fixtureOutra.credenciais, senha: senhaLonga };
    const titular = await cadastrar(api, credenciais);
    const outra = await cadastrar(api, credenciaisOutra);
    const { token } = titular;
    const contexto = { foco: 'rotina', ate: '2024-11-17' };
    const rotaRelatorio = '/reports/sleep?de=2024-11-11&ate=2024-11-17';
    const rotaNoite = `/sleep/${noite.id}`;
    let legado;

    await t.test('JWT HS256, login genérico e frases de 12 a 128 caracteres', async () => {
      legado = await validarContratoDeAutenticacao(api, titular, credenciaisOutra, env);
      for (const senha of ['a'.repeat(11), `${senhaLonga}B`]) {
        const invalida = await chamarApi(api, 'POST', '/auth/register', {
          corpo: { email: 'tamanho-invalido@example.invalid', senha },
        });
        assert.equal(invalida.status, 422);
        assert.equal(invalida.dados.erro.campo, 'senha');
      }
    });

    await t.test('recusa do consentimento mantém só a área de conta disponível', async () => {
      const recusado = await chamarApi(api, 'PUT', '/users/me/consent', { token, corpo: { aceito: false, versao: 'sono-1' } });
      assert.equal(recusado.status, 422);
      const perfil = await chamarApi(api, 'GET', '/users/me', { token });
      assert.equal(perfil.status, 200);
      assert.equal(perfil.dados.consentimento.ativo, false);
      for (const [metodo, rota, corpo] of [
        ['GET', '/sleep'], ['POST', '/sleep', noite], ['GET', rotaRelatorio],
        ['POST', '/ai/preview', contexto], ['POST', '/ai/ritual', { ...contexto, hashPrevia: '0'.repeat(64), autorizoEnvio: true }],
      ]) {
        const negada = await chamarApi(api, metodo, rota, { token, corpo });
        assert.equal(negada.status, 403);
        assert.equal(negada.dados.erro.codigo, 'CONSENTIMENTO_NECESSARIO');
      }
      await aceitar(api, token);
      await aceitar(api, outra.token);
    });

    await t.test('criação de 430 minutos e reenvio com o mesmo UUID', async () => {
      const criacao = await chamarApi(api, 'POST', '/sleep', { token, corpo: noite });
      assert.equal(criacao.status, 201);
      assert.equal(criacao.dados.duracaoEstimadaMin, 430);
      assert.equal(criacao.headers.get('location'), `/v1${rotaNoite}`);
      const reenvio = await chamarApi(api, 'POST', '/sleep', { token, corpo: noite });
      assert.equal(reenvio.status, 200);
      assert.deepEqual(reenvio.dados, criacao.dados);
      assert.equal((await chamarApi(api, 'POST', '/sleep', { token, corpo: { ...noite, qualidade: 4 } })).status, 409);
      assert.equal((await chamarApi(api, 'POST', '/sleep', { token, corpo: { ...noite, id: randomUUID() } })).status, 409);
    });

    await Promise.all([inicializar(), inicializar()]);
    await api.encerrar();
    api = await iniciarApi(env);

    await t.test('persistência, isolamento entre contas, paginação e prévia', async () => {
      assert.equal((await chamarApi(api, 'GET', '/health')).status, 200);
      const leitura = await chamarApi(api, 'GET', rotaNoite, { token });
      assert.equal(leitura.status, 200);
      assert.equal(leitura.dados.duracaoEstimadaMin, 430);
      assert.equal((await chamarApi(api, 'POST', '/sleep', { token, corpo: segundaNoite })).status, 201);
      const gravadaPelaOutra = await chamarApi(api, 'POST', '/sleep', { token: outra.token, corpo: outraNoite });
      assert.equal(gravadaPelaOutra.status, 201);
      assert.equal(gravadaPelaOutra.dados.dataLocal, leitura.dados.dataLocal);

      const rotaInexistente = `/sleep/${randomUUID()}`;
      const { id: _id, ...editavel } = noite;
      for (const [metodo, opcoes] of [
        ['GET', {}], ['PUT', { corpo: { ...editavel, versao: 1 } }], ['DELETE', { headers: { 'If-Match': '"1"' } }],
      ]) {
        const parametros = { ...opcoes, token: outra.token };
        const alheio = await chamarApi(api, metodo, rotaNoite, parametros);
        const inexistente = await chamarApi(api, metodo, rotaInexistente, parametros);
        assert.equal(alheio.status, 404);
        assert.equal(inexistente.status, 404);
        assert.deepEqual(alheio.dados, inexistente.dados);
      }

      const pagina = await chamarApi(api, 'GET', '/sleep?limite=1', { token });
      assert.equal(pagina.status, 200);
      assert.deepEqual(pagina.dados.itens.map(({ id }) => id), [noite.id]);
      assert.ok(!Object.hasOwn(pagina.dados.itens[0], 'sonho'));
      const cursor = pagina.dados.proximoAntesDe;
      assert.equal(cursor, '2024-11-17');
      const proxima = await chamarApi(api, 'GET', `/sleep?limite=1&antesDe=${cursor}`, { token });
      assert.deepEqual(proxima.dados.itens.map(({ id }) => id), [segundaNoite.id]);
      assert.equal(proxima.dados.proximoAntesDe, null);
      const listaOutra = await chamarApi(api, 'GET', '/sleep', { token: outra.token });
      assert.deepEqual(listaOutra.dados.itens.map(({ id }) => id), [outraNoite.id]);

      const relatorio = await chamarApi(api, 'GET', rotaRelatorio, { token });
      const relatorioOutra = await chamarApi(api, 'GET', rotaRelatorio, { token: outra.token });
      assert.equal(relatorio.status, 200);
      assert.equal(relatorioOutra.status, 200);
      assert.equal(relatorio.dados.mediaMin, 425);
      assert.deepEqual(relatorio.dados.linhas.map(({ duracaoMin }) => duracaoMin), [430, 420]);
      assert.equal(relatorioOutra.dados.mediaMin, 450);
      assert.deepEqual(relatorioOutra.dados.linhas.map(({ duracaoMin }) => duracaoMin), [450]);

      const previa = await chamarApi(api, 'POST', '/ai/preview', { token, corpo: contexto });
      const previaOutra = await chamarApi(api, 'POST', '/ai/preview', { token: outra.token, corpo: contexto });
      assert.equal(previa.status, 200);
      assert.equal(previaOutra.status, 200);
      assert.equal(previa.dados.noites, 2);
      assert.equal(previaOutra.dados.noites, 1);
      assert.deepEqual(JSON.parse(previa.dados.texto), { foco: 'rotina', cobertura: 'parcial', fator: 'telas' });
      assert.deepEqual(JSON.parse(previaOutra.dados.texto), { foco: 'rotina', cobertura: 'uma' });
      assert.notEqual(previa.dados.hashPrevia, previaOutra.dados.hashPrevia);
      const corpo = { ...contexto, hashPrevia: previa.dados.hashPrevia, autorizoEnvio: true };
      assert.equal((await chamarApi(api, 'POST', '/ai/ritual', { token: outra.token, corpo })).status, 409);
      const ritual = await chamarApi(api, 'POST', '/ai/ritual', { token, corpo });
      assert.equal(ritual.status, 503);
      assert.equal(ritual.dados.erro.codigo, 'CARTAO_INDISPONIVEL');
    });

    await t.test('fuso, horário de verão, edição concorrente e If-Match', async () => {
      const offsetErrado = await chamarApi(api, 'POST', '/sleep', {
        token, corpo: { ...noite, id: randomUUID(), acordou: '2024-11-17T07:00:00-04:00' },
      });
      assert.equal(offsetErrado.status, 422);
      assert.equal(offsetErrado.dados.erro.codigo, 'OFFSET_INCOMPATIVEL');
      const horaInexistente = await chamarApi(api, 'POST', '/sleep', {
        token, corpo: { id: randomUUID(), fuso: 'America/New_York', qualidade: 3,
          deitou: '2024-03-10T01:00:00-05:00', dormiu: '2024-03-10T02:30:00-05:00', acordou: '2024-03-10T04:00:00-04:00' },
      });
      assert.equal(horaInexistente.status, 422);
      const horaRepetida = await chamarApi(api, 'POST', '/sleep', {
        token, corpo: { id: randomUUID(), fuso: 'America/New_York', qualidade: 3,
          deitou: '2024-11-03T01:00:00-04:00', dormiu: '2024-11-03T01:30:00-04:00', acordou: '2024-11-03T01:30:00-05:00' },
      });
      assert.equal(horaRepetida.status, 201);
      assert.equal(horaRepetida.dados.duracaoEstimadaMin, 60);

      const { id, ...campos } = segundaNoite;
      const rota = `/sleep/${id}`;
      const edicoes = await Promise.all([2, 5].map((qualidade) => chamarApi(api, 'PUT', rota, {
        token, corpo: { ...campos, versao: 1, qualidade },
      })));
      assert.deepEqual(edicoes.map(({ status }) => status).sort(), [200, 409]);
      const atualizada = edicoes.find(({ status }) => status === 200);
      assert.equal(atualizada.dados.versao, 2);
      assert.equal(atualizada.headers.get('etag'), '"2"');
      assert.equal((await chamarApi(api, 'DELETE', rota, { token })).status, 428);
      assert.equal((await chamarApi(api, 'DELETE', rota, { token, headers: { 'If-Match': '"1"' } })).status, 412);
      assert.equal((await chamarApi(api, 'DELETE', rota, { token, headers: { 'If-Match': '"2"' } })).status, 204);
      assert.equal((await chamarApi(api, 'GET', rota, { token })).status, 404);
    });

    await t.test('relatório separa dias ausentes, pares incompletos, empates e variância zero', async () => {
      const duracoes = [400, 400, 430, 430, 460, 460, 490, 420];
      const humores = [1, 2, 2, 3, 3, 4, 5, null];
      for (const [indice, duracao] of duracoes.entries()) {
        const dia = String(indice + 1).padStart(2, '0');
        const data = `2025-02-${dia}`;
        const noite = {
          fuso: 'UTC', deitou: `${data}T00:00:00Z`, dormiu: `${data}T00:00:00Z`, acordou: `${data}T09:00:00Z`,
          qualidade: 3, humor: humores[indice], despertares: 1,
        };
        const gravar = (tokenConta, minutos) => chamarApi(api, 'POST', '/sleep', {
          token: tokenConta, corpo: { ...noite, id: randomUUID(), minutosAcordado: 540 - minutos },
        });
        assert.equal((await gravar(token, duracao)).status, 201);
        if (humores[indice] !== null) assert.equal((await gravar(outra.token, 430)).status, 201);
      }
      const rota = '/reports/sleep?de=2025-02-01&ate=2025-02-10';
      const { status, dados } = await chamarApi(api, 'GET', rota, { token });
      assert.equal(status, 200);
      assert.equal(dados.diasPeriodo - dados.noites, 2);
      assert.equal(dados.linhas.find(({ dataLocal }) => dataLocal === '2025-02-08').humor, null);
      assert.equal(dados.spearman.pares, 7);
      assert.equal(dados.spearman.motivo, null);
      // Os postos médios produzem soma dos produtos 24,5 e somas de quadrados 26,5 e 27.
      assert.ok(Math.abs(dados.spearman.rho - 24.5 / Math.sqrt(26.5 * 27)) < 1e-12);

      const outraConta = await chamarApi(api, 'GET', rota, { token: outra.token });
      assert.equal(outraConta.status, 200);
      assert.equal(outraConta.dados.noites, 7);
      assert.deepEqual(outraConta.dados.spearman, { pares: 7, rho: null, motivo: 'variancia_zero' });
    });

    await t.test('revogação concorrente e reaceite com diário vazio', async () => {
      let revogacao;
      await comContaBloqueada(banco, titular.id, async (escritor) => {
        revogacao = chamarApi(api, 'DELETE', '/users/me/consent', { token, corpo: { senha: credenciais.senha, apagarDiario: true } });
        // Deixe o teste fechar a transação mesmo se a requisição concorrente falhar.
        void revogacao.catch(() => {});
        await aguardarBloqueioDaConta(banco);
        await escritor.query(
          `INSERT INTO registros_sono (id, usuario_id, data_local, fuso, deitou, dormiu, acordou, qualidade)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [randomUUID(), titular.id, '2024-11-18', 'UTC', 1731888000, 1731888000, 1731888060, 3],
        );
      });
      assert.equal((await revogacao).status, 204);
      assert.equal((await chamarApi(api, 'GET', '/sleep', { token })).status, 403);
      await aceitar(api, token);
      assert.deepEqual((await chamarApi(api, 'GET', '/sleep', { token })).dados.itens, []);
      const versao = await banco.query('SELECT consentimento_versao FROM usuarios WHERE id = $1', [titular.id]);
      assert.equal(versao.rows[0].consentimento_versao, 3);

      let gravacaoAntiga;
      await comContaBloqueada(banco, titular.id, async (client) => {
        gravacaoAntiga = chamarApi(api, 'POST', '/sleep', { token, corpo: noite });
        void gravacaoAntiga.catch(() => {});
        await aguardarBloqueioDaConta(banco);
        // Reproduza a revisão deixada por revogar e reaceitar antes de a escrita obter o bloqueio.
        await client.query('UPDATE usuarios SET consentimento_versao = consentimento_versao + 2 WHERE id = $1', [titular.id]);
      });
      const bloqueada = await gravacaoAntiga;
      assert.equal(bloqueada.status, 403);
      assert.equal(bloqueada.dados.erro.codigo, 'CONSENTIMENTO_NECESSARIO');
      assert.deepEqual((await chamarApi(api, 'GET', '/sleep', { token })).dados.itens, []);

      const registroDaOutraConta = await chamarApi(api, 'GET', `/sleep/${outraNoite.id}`, { token: outra.token });
      assert.equal(registroDaOutraConta.status, 200);
      assert.equal(registroDaOutraConta.dados.duracaoEstimadaMin, 450);
    });

    await t.test('exclusão em cascata e logout invalidam as sessões correspondentes', async () => {
      const excluida = await chamarApi(api, 'DELETE', '/users/me', { token: outra.token, corpo: { senha: senhaLonga, confirmar: true } });
      assert.equal(excluida.status, 204);
      assert.equal((await chamarApi(api, 'GET', '/users/me', { token: outra.token })).status, 401);
      // Reutilizar o UUID pela conta sobrevivente comprova que a exclusão removeu a noite.
      assert.equal((await chamarApi(api, 'POST', '/sleep', { token, corpo: outraNoite })).status, 201);
      assert.equal((await chamarApi(api, 'GET', '/users/me', { token: legado })).status, 200);
      assert.equal((await chamarApi(api, 'POST', '/auth/logout', { token })).status, 204);
      assert.equal((await chamarApi(api, 'GET', '/users/me', { token })).status, 401);
      assert.equal((await chamarApi(api, 'GET', '/users/me', { token: legado })).status, 401);
      const novoLogin = await chamarApi(api, 'POST', '/auth/login', { corpo: credenciais });
      assert.equal(novoLogin.status, 200);
      assert.equal((await chamarApi(api, 'GET', '/users/me', { token: novoLogin.dados.token })).status, 200);
    });

    await verificarFluxoGemini(t, { env, chamarApi, cadastrar, aceitar, noites: fixtureTitular.noites });
  } finally {
    await api?.encerrar();
    await banco.end();
    try {
      if (criouEsquema) await admin.query(`DROP SCHEMA ${esquema} CASCADE`);
    } finally {
      await admin.end();
    }
  }
});
