import { z } from 'zod';
import { ErroApi, validarCorpo } from '../middleware/errors.js';
import { calcularDuracaoEstimadaMin } from './metrics.js';

const MAIOR_INTEIRO_POSTGRES = 2_147_483_647;
const LIMITE_EPISODIO_SEGUNDOS = 86_400;

export const registroIdSchema = z.uuid().transform((id) => id.toLowerCase());
const versaoSchema = z.int().min(1).max(MAIOR_INTEIRO_POSTGRES);
const escalaSchema = z.int().min(1).max(5);
export const dataLocalSchema = z.iso.date().refine((data) => !data.startsWith('0000-'));
const instanteSchema = z.string()
  .transform((iso) => iso.replace(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/, '$1:00$2'))
  .pipe(z.iso.datetime({ offset: true }))
  .refine((iso) => !iso.startsWith('0000-') && /^.{16}:00(?:\.0+)?(?:Z|[+-]\d{2}:\d{2})$/.test(iso));

const camposObrigatorios = {
  fuso: z.string().min(1).max(128),
  deitou: instanteSchema,
  dormiu: instanteSchema,
  acordou: instanteSchema,
  qualidade: escalaSchema,
};

const complementos = {
  minutosAcordado: z.int().min(0).max(1440).nullable(),
  despertares: z.int().min(0).max(MAIOR_INTEIRO_POSTGRES).nullable(),
  humor: escalaSchema.nullable(),
  cansaco: escalaSchema.nullable(),
  sonho: z.string().refine((texto) => Array.from(texto).length <= 1000 && !/[\p{Surrogate}\u0000]/u.test(texto)).nullable(),
};

const fatorSchema = z.boolean().nullable();
const fatoresNaCriacao = z.strictObject({
  cafeina: fatorSchema.default(null),
  telas: fatorSchema.default(null),
  ansiedade: fatorSchema.default(null),
});

export const criacaoSonoSchema = z.strictObject({
  id: registroIdSchema,
  ...camposObrigatorios,
  minutosAcordado: complementos.minutosAcordado.default(null),
  despertares: complementos.despertares.default(null),
  humor: complementos.humor.default(null),
  cansaco: complementos.cansaco.default(null),
  sonho: complementos.sonho.default(null),
  fatores: fatoresNaCriacao.default({ cafeina: null, telas: null, ansiedade: null }),
});

export const edicaoSonoSchema = z.strictObject({
  versao: versaoSchema,
  ...camposObrigatorios,
  ...complementos,
  fatores: z.strictObject({ cafeina: fatorSchema, telas: fatorSchema, ansiedade: fatorSchema }),
});

const inteiroNaConsulta = z.string().regex(/^\d+$/).transform(Number);
export const filtrosSonoSchema = z.strictObject({
  de: dataLocalSchema.optional(),
  ate: dataLocalSchema.optional(),
  qualidade: inteiroNaConsulta.pipe(escalaSchema).optional(),
  limite: inteiroNaConsulta.pipe(z.int().min(1).max(50)).default(20),
  antesDe: dataLocalSchema.optional(),
}).refine(({ de, ate }) => !de || !ate || de <= ate, { path: ['ate'] });

export type FiltrosSono = z.output<typeof filtrosSonoSchema>;

const ifMatchSchema = z.string().regex(/^"[1-9]\d*"$/)
  .transform((valor) => Number(valor.slice(1, -1))).pipe(versaoSchema);
const parametroIdSchema = z.strictObject({ id: registroIdSchema });

export function lerVersaoIfMatch(cabecalho: string | undefined): number {
  if (cabecalho === undefined) {
    throw new ErroApi(428, 'IF_MATCH_OBRIGATORIO', 'Informe a versão do registro no cabeçalho If-Match.', 'If-Match');
  }
  const resultado = ifMatchSchema.safeParse(cabecalho);
  if (!resultado.success) {
    throw new ErroApi(422, 'IF_MATCH_INVALIDO', 'Use a versão do registro entre aspas no cabeçalho If-Match.', 'If-Match');
  }
  return resultado.data;
}

export function lerIdRegistro(id: unknown): string {
  return validarCorpo(parametroIdSchema, { id }).id;
}

export function formatadorDoFuso(fuso: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: fuso, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZoneName: 'longOffset',
  });
}

export function formatarInstanteNoFuso(formatador: Intl.DateTimeFormat, segundos: number): string {
  const partes = Object.fromEntries(formatador.formatToParts(segundos * 1000).map(({ type, value }) => [type, value]));
  const ano = partes.year!.padStart(4, '0');
  const offset = partes.timeZoneName!.slice('GMT'.length) || 'Z';
  return `${ano}-${partes.month}-${partes.day}T${partes.hour}:${partes.minute}:${partes.second}${offset}`;
}

type EntradaSono = Omit<z.output<typeof edicaoSonoSchema>, 'versao'>;

export interface SonoParaGravar extends Omit<EntradaSono, 'deitou' | 'dormiu' | 'acordou'> {
  dataLocal: string;
  deitou: number;
  dormiu: number;
  acordou: number;
}

function validarFuso(fuso: string): Intl.DateTimeFormat {
  // Intl também aceita offsets fixos. Aqui exigimos um identificador de fuso.
  if (/^[A-Za-z]/.test(fuso)) {
    try {
      return formatadorDoFuso(fuso);
    } catch (erro) {
      if (!(erro instanceof RangeError)) throw erro;
    }
  }
  throw new ErroApi(422, 'FUSO_INVALIDO', 'Informe um fuso horário IANA válido.', 'fuso');
}

function lerInstanteNoFuso(formatador: Intl.DateTimeFormat, iso: string, campo: 'deitou' | 'dormiu' | 'acordou') {
  const segundos = Date.parse(iso) / 1000;
  const horarioLocal = formatarInstanteNoFuso(formatador, segundos);
  if (horarioLocal.slice(0, 19) !== `${iso.slice(0, 16)}:00`) {
    throw new ErroApi(422, 'OFFSET_INCOMPATIVEL', 'Confira a hora e o offset para o fuso escolhido.', campo);
  }
  return { segundos, dataLocal: horarioLocal.slice(0, 10) };
}

export function normalizarSono(entrada: EntradaSono, agoraMs = Date.now()): SonoParaGravar {
  const formatador = validarFuso(entrada.fuso);
  const { segundos: deitou } = lerInstanteNoFuso(formatador, entrada.deitou, 'deitou');
  const { segundos: dormiu } = lerInstanteNoFuso(formatador, entrada.dormiu, 'dormiu');
  const { segundos: acordou, dataLocal } = lerInstanteNoFuso(formatador, entrada.acordou, 'acordou');
  if (deitou > dormiu) {
    throw new ErroApi(422, 'ORDEM_HORARIOS', 'Confira a data e a hora em que você dormiu.', 'dormiu');
  }
  if (dormiu >= acordou || acordou - deitou > LIMITE_EPISODIO_SEGUNDOS) {
    throw new ErroApi(422, 'ORDEM_HORARIOS', 'Confira a data e a hora em que você acordou.', 'acordou');
  }
  if (acordou * 1000 > agoraMs) {
    throw new ErroApi(422, 'DESPERTAR_FUTURO', 'O horário de despertar deve ser no passado ou agora.', 'acordou');
  }
  if (calcularDuracaoEstimadaMin(dormiu, acordou, entrada.minutosAcordado) < 0) {
    throw new ErroApi(422, 'MINUTOS_ACORDADO_INVALIDOS', 'Os minutos acordados excedem o intervalo de sono.', 'minutosAcordado');
  }
  if (entrada.despertares === 0 && (entrada.minutosAcordado ?? 0) > 0) {
    throw new ErroApi(422, 'DESPERTARES_INCONSISTENTES', 'Confira os despertares e os minutos acordados.', 'despertares');
  }

  return { ...entrada, deitou, dormiu, acordou, dataLocal };
}
