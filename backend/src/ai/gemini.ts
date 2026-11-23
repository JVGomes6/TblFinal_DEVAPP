import { FinishReason, GoogleGenAI, ThinkingLevel } from '@google/genai';
import { config } from '../config.js';
import { cartaoIndisponivel, serializarContexto } from './compose.js';
import type { ContextoCartao, EsquemaRespostaCartao } from './compose.js';

const clienteGemini = config.geminiEnabled && config.geminiApiKey ? new GoogleGenAI({
  apiKey: config.geminiApiKey,
  vertexai: false,
  apiVersion: 'v1beta',
  httpOptions: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    retryOptions: { attempts: 1 },
  },
}) : null;

export async function gerarIdsNoGemini(
  contexto: ContextoCartao,
  instrucaoSistema: string,
  esquema: EsquemaRespostaCartao,
  cancelamento: AbortSignal,
): Promise<string> {
  if (!clienteGemini) throw cartaoIndisponivel();

  try {
    const sinal = AbortSignal.any([cancelamento, AbortSignal.timeout(config.geminiTimeoutMs)]);
    sinal.throwIfAborted();
    const resposta = await clienteGemini.models.generateContent({
      model: config.geminiModel,
      contents: serializarContexto(contexto),
      config: {
        systemInstruction: instrucaoSistema,
        responseMimeType: 'application/json',
        responseJsonSchema: esquema,
        candidateCount: 1,
        temperature: 0.4,
        maxOutputTokens: 256,
        thinkingConfig: config.geminiModel === 'gemini-3.1-flash-lite'
          ? { thinkingLevel: ThinkingLevel.MINIMAL }
          : { thinkingBudget: 0 },
        abortSignal: sinal,
      },
    });
    sinal.throwIfAborted();

    const candidato = resposta.candidates?.[0];
    const partes = candidato?.content?.parts?.filter(({ thought }) => !thought);
    if (resposta.modelVersion !== config.geminiModel || resposta.candidates?.length !== 1 || candidato?.finishReason !== FinishReason.STOP ||
        !partes?.length || partes.some((parte) => typeof parte.text !== 'string')) {
      throw cartaoIndisponivel();
    }
    return partes.map(({ text }) => text).join('');
  } catch {
    throw cartaoIndisponivel();
  }
}
