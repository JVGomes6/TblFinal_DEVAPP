import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { ErroApi } from '../middleware/errors.js';

const FOCOS = ['rotina', 'humor', 'descanso'] as const;
const COBERTURAS = ['zero', 'uma', 'parcial', 'completa'] as const;
const PAPEIS = ['abertura', 'pergunta', 'fecho'] as const;
export const FATORES = ['cafeina', 'telas', 'ansiedade'] as const;
export const focoSchema = z.enum(FOCOS);
export type Fator = typeof FATORES[number];

export interface ContextoCartao {
  foco: z.output<typeof focoSchema>;
  cobertura: typeof COBERTURAS[number];
  fator?: Fator;
}

const fragmentoSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  focos: z.array(focoSchema).min(1),
  coberturas: z.array(z.enum(COBERTURAS)).min(1),
  fator: z.enum(FATORES).optional(),
  texto: z.string().trim().min(1),
});
type Fragmento = z.output<typeof fragmentoSchema>;
type OpcoesCartao = Record<typeof PAPEIS[number], Fragmento[]>;

const catalogoSchema = z.strictObject({
  versao: z.string().trim().min(1),
  abertura: z.array(fragmentoSchema).min(2),
  pergunta: z.array(fragmentoSchema).min(2),
  fecho: z.array(fragmentoSchema).min(2),
});

const propriedadeIdSchema = z.strictObject({
  type: z.literal('string'),
  description: z.string(),
  enum: z.array(z.string()).min(2),
});
const contratoSchema = z.strictObject({
  type: z.literal('object'),
  properties: z.strictObject({ abertura: propriedadeIdSchema, pergunta: propriedadeIdSchema, fecho: propriedadeIdSchema }),
  required: z.tuple([z.literal('abertura'), z.literal('pergunta'), z.literal('fecho')]),
  additionalProperties: z.literal(false),
});
export type EsquemaRespostaCartao = z.output<typeof contratoSchema>;

const idsDoCartaoSchema = z.strictObject({ abertura: z.string(), pergunta: z.string(), fecho: z.string() });
const pastaMateriais = new URL('../../../ai-materials/', import.meta.url);

function lerMaterial(nome: string): string {
  return readFileSync(new URL(nome, pastaMateriais), 'utf8');
}

function selecionar(fragmentos: Fragmento[], { foco, cobertura, fator }: ContextoCartao): Fragmento[] {
  return fragmentos.filter((fragmento) => fragmento.focos.includes(foco) && fragmento.coberturas.includes(cobertura) &&
    (fragmento.fator === undefined || fragmento.fator === fator));
}

function carregarMateriais() {
  const instrucaoSistema = z.string().trim().min(1).parse(lerMaterial('system.pt-BR.txt'));
  const catalogo = catalogoSchema.parse(JSON.parse(lerMaterial('catalogo.json')));
  const contrato = contratoSchema.parse(JSON.parse(lerMaterial('resposta.schema.json')));

  for (const papel of PAPEIS) {
    const ids = new Set(catalogo[papel].map(({ id }) => id));
    const previstos = new Set(contrato.properties[papel].enum);
    if (ids.size !== catalogo[papel].length || previstos.size !== contrato.properties[papel].enum.length ||
        ids.size !== previstos.size || [...ids].some((id) => !id.startsWith(`${papel}_`) || !previstos.has(id))) {
      throw new Error(`O esquema de resposta e o catálogo usam IDs diferentes para ${papel}.`);
    }
    for (const foco of FOCOS) {
      for (const cobertura of COBERTURAS) {
        if (selecionar(catalogo[papel], { foco, cobertura }).length < 2) {
          throw new Error(`O catálogo precisa de duas opções de ${papel} para ${foco} com cobertura ${cobertura}.`);
        }
      }
    }
  }

  const hash = createHash('sha256').update(JSON.stringify([instrucaoSistema, catalogo, contrato])).digest('hex');
  return { instrucaoSistema, catalogo, contrato, hash };
}

const materiais = carregarMateriais();
export const versaoCatalogo = materiais.catalogo.versao;
export const hashDosMateriais = materiais.hash;

export function prepararComposicao(contexto: ContextoCartao) {
  const { catalogo, contrato, instrucaoSistema } = materiais;
  const opcoes: OpcoesCartao = {
    abertura: selecionar(catalogo.abertura, contexto),
    pergunta: selecionar(catalogo.pergunta, contexto),
    fecho: selecionar(catalogo.fecho, contexto),
  };
  const esquema: EsquemaRespostaCartao = {
    ...contrato,
    properties: {
      abertura: { ...contrato.properties.abertura, enum: opcoes.abertura.map(({ id }) => id) },
      pergunta: { ...contrato.properties.pergunta, enum: opcoes.pergunta.map(({ id }) => id) },
      fecho: { ...contrato.properties.fecho, enum: opcoes.fecho.map(({ id }) => id) },
    },
  };

  return { instrucaoSistema, opcoes, esquema };
}

export function cartaoIndisponivel(): ErroApi {
  return new ErroApi(503, 'CARTAO_INDISPONIVEL', 'Não foi possível gerar seu cartão agora. Tente novamente.');
}

export function comporCartao(resposta: string, opcoes: OpcoesCartao) {
  let json: unknown;
  try {
    json = JSON.parse(resposta);
  } catch {
    throw cartaoIndisponivel();
  }
  const resultado = idsDoCartaoSchema.safeParse(json);
  if (!resultado.success) throw cartaoIndisponivel();

  // JSON.parse mantém só o último valor de uma chave repetida. Conte os
  // separadores de propriedade fora das strings para rejeitar duplicatas.
  const tokens = resposta.match(/"(?:\\.|[^"\\])*"|:/g);
  if (tokens?.filter((token) => token === ':').length !== PAPEIS.length) throw cartaoIndisponivel();

  const { data: ids } = resultado;
  const abertura = opcoes.abertura.find(({ id }) => id === ids.abertura);
  const pergunta = opcoes.pergunta.find(({ id }) => id === ids.pergunta);
  const fecho = opcoes.fecho.find(({ id }) => id === ids.fecho);
  if (!abertura || !pergunta || !fecho) throw cartaoIndisponivel();

  return { abertura: abertura.texto, pergunta: pergunta.texto, fecho: fecho.texto };
}
