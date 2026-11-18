const SEGUNDOS_POR_MINUTO = 60;
const MILISSEGUNDOS_POR_DIA = 86_400_000;
const MINIMO_DE_PARES = 7;

export function calcularDuracaoEstimadaMin(dormiu: number, acordou: number, minutosAcordado: number | null): number {
  return (acordou - dormiu) / SEGUNDOS_POR_MINUTO - (minutosAcordado ?? 0);
}

export interface LinhaMetricaSono {
  dataLocal: string;
  duracaoMin: number;
  qualidade: number;
  humor: number | null;
  despertares: number | null;
  minutosAcordado: number | null;
}

export interface PeriodoSono {
  de: string;
  ate: string;
}

interface ParSonoHumor {
  duracaoMin: number;
  humor: number;
}

function postosMedios(valores: number[]): Map<number, number> {
  const ordenados = valores.sort((a, b) => a - b);
  const postos = new Map<number, number>();
  for (let inicio = 0; inicio < ordenados.length;) {
    const valor = ordenados[inicio]!;
    let fim = inicio + 1;
    while (fim < ordenados.length && ordenados[fim] === valor) fim++;
    postos.set(valor, (inicio + 1 + fim) / 2);
    inicio = fim;
  }
  return postos;
}

function calcularSpearman(pares: ParSonoHumor[]) {
  const n = pares.length;
  if (n < MINIMO_DE_PARES) return { pares: n, rho: null, motivo: 'amostra_pequena' } as const;

  const postosDuracao = postosMedios(pares.map((par) => par.duracaoMin));
  const postosHumor = postosMedios(pares.map((par) => par.humor));
  if (postosDuracao.size === 1 || postosHumor.size === 1) {
    return { pares: n, rho: null, motivo: 'variancia_zero' } as const;
  }

  const centro = (n + 1) / 2;
  let produtos = 0;
  let quadradosDuracao = 0;
  let quadradosHumor = 0;
  for (const { duracaoMin, humor } of pares) {
    const duracao = postosDuracao.get(duracaoMin)! - centro;
    const nivelHumor = postosHumor.get(humor)! - centro;
    produtos += duracao * nivelHumor;
    quadradosDuracao += duracao ** 2;
    quadradosHumor += nivelHumor ** 2;
  }

  const rho = produtos / Math.sqrt(quadradosDuracao * quadradosHumor);
  return { pares: n, rho: Math.max(-1, Math.min(1, rho)), motivo: null } as const;
}

export function calcularMetricasSono({ de, ate }: PeriodoSono, entradas: readonly LinhaMetricaSono[]) {
  const diasPeriodo = (Date.parse(ate) - Date.parse(de)) / MILISSEGUNDOS_POR_DIA + 1;
  const noitesDoPeriodo = entradas.filter(({ dataLocal }) => dataLocal >= de && dataLocal <= ate);
  const noites = noitesDoPeriodo.length;
  const pares: ParSonoHumor[] = [];
  const grupos = new Map<number, { n: number; somaMin: number }>();
  let somaMin = 0;
  let somaQualidade = 0;
  let semDescontoInformado = 0;

  for (const { duracaoMin, qualidade, humor, minutosAcordado } of noitesDoPeriodo) {
    somaMin += duracaoMin;
    somaQualidade += qualidade;
    if (minutosAcordado === null) semDescontoInformado++;
    if (humor !== null) {
      pares.push({ duracaoMin, humor });
      const grupo = grupos.get(humor) ?? { n: 0, somaMin: 0 };
      grupo.n++;
      grupo.somaMin += duracaoMin;
      grupos.set(humor, grupo);
    }
  }

  const porHumor = Array.from(grupos, ([humor, grupo]) => ({
    humor, n: grupo.n, mediaMin: grupo.somaMin / grupo.n,
  })).sort((a, b) => a.humor - b.humor);

  return {
    de, ate, diasPeriodo, noites,
    mediaMin: noites === 0 ? null : somaMin / noites,
    mediaQualidade: noites === 0 ? null : somaQualidade / noites,
    semDescontoInformado,
    porHumor,
    spearman: calcularSpearman(pares),
    linhas: noitesDoPeriodo.map(({ dataLocal, duracaoMin, qualidade, humor, despertares }) => ({
      dataLocal, duracaoMin, qualidade, humor, despertares,
    })),
  };
}
