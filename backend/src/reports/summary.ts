import { emTransacao } from '../db/connection.js';
import { calcularMetricasSono } from '../sleep/metrics.js';
import type { LinhaMetricaSono, PeriodoSono } from '../sleep/metrics.js';

interface LinhaDoDiario extends LinhaMetricaSono {
  cafeina: boolean | null;
  telas: boolean | null;
  ansiedade: boolean | null;
}

export async function resumirSono(usuarioId: string, periodo: PeriodoSono) {
  const { rows } = await emTransacao((client) => client.query<LinhaDoDiario>(
    `SELECT to_char(data_local, 'YYYY-MM-DD') AS "dataLocal",
            duracao_estimada_min AS "duracaoMin", qualidade, humor, despertares,
            minutos_acordado AS "minutosAcordado", cafeina, telas, ansiedade
      FROM registros_sono
      WHERE usuario_id = $1 AND data_local BETWEEN $2::date AND $3::date
      ORDER BY registros_sono.data_local DESC`,
    [usuarioId, periodo.de, periodo.ate],
  ), { somenteLeitura: true });

  const contagemFatores = { cafeina: 0, telas: 0, ansiedade: 0 };
  for (const linha of rows) {
    if (linha.cafeina === true) contagemFatores.cafeina++;
    if (linha.telas === true) contagemFatores.telas++;
    if (linha.ansiedade === true) contagemFatores.ansiedade++;
  }

  return { metricas: calcularMetricasSono(periodo, rows), contagemFatores };
}
