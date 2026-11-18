import { FinishReason, GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { cartaoIndisponivel } from './compose.js';
import type { EsquemaRespostaCartao } from './compose.js';

const clienteGemini = config.geminiApiKey ? new GoogleGenAI({
  apiKey: config.geminiApiKey,
  vertexai: false,
  apiVersion: 'v1beta',
  httpOptions: {
    baseUrl: 'https://generativelanguage.googleapis.com',
    retryOptions: { attempts: 1 },
  },
}) : null;

export async function gerarIdsNoGemini(
  texto: string,
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
      contents: texto,
      config: {
        systemInstruction: instrucaoSistema,
        responseMimeType: 'application/json',
        responseJsonSchema: esquema,
        candidateCount: 1,
        temperature: 0.4,
        maxOutputTokens: 256,
        ...(config.geminiModel === 'gemini-2.5-flash' && { thinkingConfig: { thinkingBudget: 0 } }),
        abortSignal: sinal,
      },
    });
    sinal.throwIfAborted();

    const candidato = resposta.candidates?.[0];
    const partes = candidato?.content?.parts?.filter(({ thought }) => !thought);
    if (resposta.candidates?.length !== 1 || candidato?.finishReason !== FinishReason.STOP ||
        !partes?.length || partes.some((parte) => typeof parte.text !== 'string')) {
      throw cartaoIndisponivel();
    }
    return partes.map(({ text }) => text).join('');
  } catch {
    throw cartaoIndisponivel();
  }
}
