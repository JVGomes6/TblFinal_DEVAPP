import type { PoolClient } from 'pg';
import { pool } from '../db/connection.js';
import { ErroApi } from '../middleware/errors.js';
import { formatadorDoFuso, formatarInstanteNoFuso } from './schema.js';
import type { FiltrosSono, SonoParaGravar } from './schema.js';

interface ResumoNoBanco {
  id: string;
  data_local: string;
  fuso: string;
  deitou: string;
  dormiu: string;
  acordou: string;
  minutos_acordado: number | null;
  despertares: number | null;
  qualidade: number;
  humor: number | null;
  cansaco: number | null;
  cafeina: boolean | null;
  telas: boolean | null;
  ansiedade: boolean | null;
  duracao_estimada_min: number;
  versao: number;
}

interface RegistroNoBanco extends ResumoNoBanco {
  sonho: string | null;
}

const COLUNAS_RESUMO = `id, to_char(data_local, 'YYYY-MM-DD') AS data_local, fuso, deitou, dormiu, acordou,
  minutos_acordado, despertares, qualidade, humor, cansaco, cafeina, telas, ansiedade, duracao_estimada_min, versao`;
const COLUNAS_REGISTRO = `${COLUNAS_RESUMO}, sonho`;

function lerResumo(linha: ResumoNoBanco) {
  return {
    id: linha.id,
    dataLocal: linha.data_local,
    fuso: linha.fuso,
    deitou: Number(linha.deitou),
    dormiu: Number(linha.dormiu),
    acordou: Number(linha.acordou),
    minutosAcordado: linha.minutos_acordado,
    despertares: linha.despertares,
    qualidade: linha.qualidade,
    humor: linha.humor,
    cansaco: linha.cansaco,
    fatores: { cafeina: linha.cafeina, telas: linha.telas, ansiedade: linha.ansiedade },
    duracaoEstimadaMin: linha.duracao_estimada_min,
    versao: linha.versao,
  };
}

function projetarResumo(linha: ResumoNoBanco) {
  const registro = lerResumo(linha);
  const formatador = formatadorDoFuso(registro.fuso);
  return {
    ...registro,
    deitou: formatarInstanteNoFuso(formatador, registro.deitou),
    dormiu: formatarInstanteNoFuso(formatador, registro.dormiu),
    acordou: formatarInstanteNoFuso(formatador, registro.acordou),
  };
}

function projetarRegistro(linha: RegistroNoBanco) {
  return { ...projetarResumo(linha), sonho: linha.sonho };
}

function valoresRegistro(registro: SonoParaGravar) {
  const { dataLocal, fuso, deitou, dormiu, acordou, minutosAcordado, despertares, qualidade, humor, cansaco, fatores, sonho } = registro;
  return [dataLocal, fuso, deitou, dormiu, acordou, minutosAcordado, despertares, qualidade, humor, cansaco,
    fatores.cafeina, fatores.telas, fatores.ansiedade, sonho];
}

function registroIndisponivel(): ErroApi {
  return new ErroApi(404, 'REGISTRO_NAO_ENCONTRADO', 'Registro de sono não encontrado.');
}

function conflitoDeRegistro(): ErroApi {
  return new ErroApi(409, 'CONFLITO_REGISTRO', 'Não foi possível salvar este registro. Confira o histórico.');
}

async function localizarRegistro(db: typeof pool | PoolClient, usuarioId: string, id: string) {
  const { rows } = await db.query<RegistroNoBanco>(
    `SELECT ${COLUNAS_REGISTRO} FROM registros_sono WHERE usuario_id = $1 AND id = $2`,
    [usuarioId, id],
  );
  return rows[0];
}

export async function obterRegistro(usuarioId: string, id: string) {
  const linha = await localizarRegistro(pool, usuarioId, id);
  if (!linha) throw registroIndisponivel();
  return projetarRegistro(linha);
}

export async function listarRegistros(usuarioId: string, filtros: FiltrosSono) {
  const { de, ate, qualidade, antesDe, limite } = filtros;
  const { rows } = await pool.query<ResumoNoBanco>(
    `SELECT ${COLUNAS_RESUMO}
      FROM registros_sono
      WHERE usuario_id = $1
        AND ($2::date IS NULL OR data_local >= $2)
        AND ($3::date IS NULL OR data_local <= $3)
        AND ($4::integer IS NULL OR qualidade = $4)
        AND ($5::date IS NULL OR data_local < $5)
      ORDER BY registros_sono.data_local DESC
      LIMIT $6`,
    [usuarioId, de ?? null, ate ?? null, qualidade ?? null, antesDe ?? null, limite + 1],
  );

  const pagina = rows.slice(0, limite);
  return {
    itens: pagina.map(projetarResumo),
    proximoAntesDe: rows.length > limite ? pagina.at(-1)!.data_local : null,
  };
}

export async function criarRegistro(client: PoolClient, usuarioId: string, id: string, registro: SonoParaGravar) {
  const valores = valoresRegistro(registro);
  const { rows } = await client.query<RegistroNoBanco>(
    `INSERT INTO registros_sono (id, usuario_id, data_local, fuso, deitou, dormiu, acordou,
      minutos_acordado, despertares, qualidade, humor, cansaco, cafeina, telas, ansiedade, sonho)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT DO NOTHING
      RETURNING ${COLUNAS_REGISTRO}`,
    [id, usuarioId, ...valores],
  );
  const inserido = rows[0];
  if (inserido) return { criado: true, registro: projetarRegistro(inserido) };

  const existente = await localizarRegistro(client, usuarioId, id);
  if (existente) {
    const valoresExistentes = valoresRegistro({ ...lerResumo(existente), sonho: existente.sonho });
    if (valoresExistentes.every((valor, indice) => valor === valores[indice])) {
      return { criado: false, registro: projetarRegistro(existente) };
    }
  }
  throw conflitoDeRegistro();
}

async function informarFalhaDeVersao(client: PoolClient, usuarioId: string, id: string, status: 409 | 412): Promise<never> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM registros_sono WHERE usuario_id = $1 AND id = $2',
    [usuarioId, id],
  );
  if (!rowCount) throw registroIndisponivel();
  throw new ErroApi(status, 'VERSAO_CONFLITANTE', 'Este registro mudou. Abra a versão atual e tente novamente.', 'versao');
}

export async function atualizarRegistro(client: PoolClient, usuarioId: string, id: string, versao: number, registro: SonoParaGravar) {
  try {
    const { rows } = await client.query<RegistroNoBanco>(
      `UPDATE registros_sono
        SET data_local = $4, fuso = $5, deitou = $6, dormiu = $7, acordou = $8, minutos_acordado = $9,
            despertares = $10, qualidade = $11, humor = $12, cansaco = $13, cafeina = $14, telas = $15,
            ansiedade = $16, sonho = $17, versao = versao + 1
        WHERE usuario_id = $1 AND id = $2 AND versao = $3
        RETURNING ${COLUNAS_REGISTRO}`,
      [usuarioId, id, versao, ...valoresRegistro(registro)],
    );
    const atualizado = rows[0];
    if (atualizado) return projetarRegistro(atualizado);
  } catch (erro) {
    if (typeof erro === 'object' && erro !== null && 'code' in erro && erro.code === '23505') {
      throw conflitoDeRegistro();
    }
    throw erro;
  }

  return informarFalhaDeVersao(client, usuarioId, id, 409);
}

export async function excluirRegistro(client: PoolClient, usuarioId: string, id: string, versao: number): Promise<void> {
  const { rowCount } = await client.query(
    'DELETE FROM registros_sono WHERE usuario_id = $1 AND id = $2 AND versao = $3',
    [usuarioId, id, versao],
  );
  if (!rowCount) await informarFalhaDeVersao(client, usuarioId, id, 412);
}
