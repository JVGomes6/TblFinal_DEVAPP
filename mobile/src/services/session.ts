import * as SecureStore from 'expo-secure-store';

const CHAVE_TOKEN = 'entrenoites.jwt';
const opcoes = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

interface SessaoLocal {
  readonly token: string;
  readonly revisao: number;
}

export class ErroArmazenamentoSessao extends Error {}

let sessao: SessaoLocal | null = null;
let revisao = 0;
let restaurada = false;
let fila = Promise.resolve();
const ouvintesDeSaida = new Set<() => void>();

function serializar<T>(operacao: () => Promise<T>): Promise<T> {
  const resultado = fila.then(operacao);
  fila = resultado.then(() => undefined, () => undefined);
  return resultado;
}

export function sessaoAtiva(): SessaoLocal | null {
  return sessao;
}

export function observarFimDaSessao(ouvinte: () => void): () => void {
  ouvintesDeSaida.add(ouvinte);
  return () => { ouvintesDeSaida.delete(ouvinte); };
}

export function restaurarSessao(): Promise<SessaoLocal | null> {
  return serializar(async () => {
    if (restaurada) return sessao;
    try {
      const token = await SecureStore.getItemAsync(CHAVE_TOKEN, opcoes);
      sessao = token ? { token, revisao: ++revisao } : null;
      restaurada = true;
      return sessao;
    } catch {
      throw new ErroArmazenamentoSessao('Não foi possível ler a sessão do dispositivo.');
    }
  });
}

export function salvarSessao(token: string): Promise<SessaoLocal> {
  return serializar(async () => {
    try {
      await SecureStore.setItemAsync(CHAVE_TOKEN, token, opcoes);
    } catch {
      throw new ErroArmazenamentoSessao('Não foi possível guardar a sessão no dispositivo.');
    }
    restaurada = true;
    sessao = { token, revisao: ++revisao };
    return sessao;
  });
}

export function apagarSessao(revisaoEsperada: number): Promise<void> {
  return serializar(async () => {
    if (sessao?.revisao !== revisaoEsperada) return;
    sessao = null;
    for (const ouvinte of ouvintesDeSaida) ouvinte();

    try {
      await SecureStore.deleteItemAsync(CHAVE_TOKEN, opcoes);
    } catch {
      throw new ErroArmazenamentoSessao('Não foi possível remover a sessão guardada no dispositivo.');
    }
  });
}
