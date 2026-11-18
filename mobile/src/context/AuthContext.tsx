import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { ErroApi, erroSessaoInvalida, requisicaoCancelada } from '../services/api';
import {
  ErroArmazenamentoSessao, apagarSessao, observarFimDaSessao, restaurarSessao, salvarSessao, sessaoAtiva,
} from '../services/session';
import { aceitarTermo, excluirUsuario, login, logout, obterPerfil, revogarTermo, salvarPreferencias } from '../services/users';
import type { Credenciais, PerfilUsuario, Preferencias } from '../services/users';

type EstadoAuth =
  | { status: 'carregando' }
  | { status: 'visitante' }
  | { status: 'erro'; mensagem: string }
  | { status: 'autenticado'; usuario: PerfilUsuario; revisao: number };

interface AuthValue {
  estado: EstadoAuth;
  tentarRestaurar: () => void;
  entrar: (credenciais: Credenciais, signal?: AbortSignal) => Promise<void>;
  sair: () => Promise<void>;
  recarregarPerfil: () => Promise<PerfilUsuario>;
  atualizarPreferencias: (preferencias: Partial<Preferencias>) => Promise<PerfilUsuario>;
  aceitarConsentimento: (versao: string) => Promise<void>;
  revogarConsentimento: (senha: string) => Promise<void>;
  excluirConta: (senha: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function mensagemDaSolicitacao(erro: unknown): string {
  if (erro instanceof ErroApi || erro instanceof ErroArmazenamentoSessao) return erro.message;
  return 'Não foi possível concluir a solicitação. Tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({ status: 'carregando' });
  const restauracao = useRef<AbortController | null>(null);
  const loginEmAndamento = useRef(false);
  const fila = useRef<{ revisao: number; pendente: Promise<void> } | null>(null);
  const montado = useRef(false);

  const publicarPerfil = useCallback((revisao: number, usuario: PerfilUsuario) => {
    if (montado.current && sessaoAtiva()?.revisao === revisao) {
      setEstado({ status: 'autenticado', usuario, revisao });
    }
  }, []);

  const tentarRestaurar = useCallback(() => {
    restauracao.current?.abort();
    const controlador = new AbortController();
    restauracao.current = controlador;
    setEstado({ status: 'carregando' });

    void (async () => {
      try {
        const sessao = await restaurarSessao();
        if (controlador.signal.aborted) return;
        if (!sessao) {
          setEstado({ status: 'visitante' });
          return;
        }
        const perfil = await obterPerfil(controlador.signal);
        if (!controlador.signal.aborted) publicarPerfil(sessao.revisao, perfil);
      } catch (erro) {
        if (controlador.signal.aborted) return;
        if (erro instanceof ErroApi && erro.status === 401) setEstado({ status: 'visitante' });
        else setEstado({ status: 'erro', mensagem: mensagemDaSolicitacao(erro) });
      } finally {
        if (restauracao.current === controlador) restauracao.current = null;
      }
    })();
  }, [publicarPerfil]);

  useEffect(() => {
    montado.current = true;
    const pararDeObservar = observarFimDaSessao(() => {
      restauracao.current?.abort();
      fila.current = null;
      setEstado({ status: 'visitante' });
    });
    tentarRestaurar();
    return () => {
      montado.current = false;
      restauracao.current?.abort();
      pararDeObservar();
    };
  }, [tentarRestaurar]);

  // Leia e altere o perfil na ordem em que as operações da mesma sessão chegam.
  const operarNaSessao = useCallback(function operarNaSessao<T>(operacao: (revisao: number) => Promise<T>): Promise<T> {
    const sessao = sessaoAtiva();
    if (!sessao) return Promise.reject(erroSessaoInvalida());

    const anterior = fila.current?.revisao === sessao.revisao ? fila.current.pendente : Promise.resolve();
    const resultado = anterior.then(() => {
      if (sessaoAtiva()?.revisao !== sessao.revisao) throw requisicaoCancelada();
      return operacao(sessao.revisao);
    });
    fila.current = { revisao: sessao.revisao, pendente: resultado.then(() => undefined, () => undefined) };
    return resultado;
  }, []);

  const recarregarPerfil = useCallback(() => operarNaSessao(async (revisao) => {
    const perfil = await obterPerfil();
    publicarPerfil(revisao, perfil);
    return perfil;
  }), [operarNaSessao, publicarPerfil]);

  useEffect(() => {
    if (estado.status !== 'autenticado') return;
    const assinatura = AppState.addEventListener('change', (appState) => {
      if (appState === 'active') void recarregarPerfil().catch(() => {});
    });
    return () => assinatura.remove();
  }, [estado.status, recarregarPerfil]);

  async function entrar(credenciais: Credenciais, signal?: AbortSignal) {
    if (loginEmAndamento.current || sessaoAtiva()) {
      throw new ErroApi(null, 'LOGIN_INDISPONIVEL', 'Aguarde a verificação da sessão antes de entrar.');
    }
    loginEmAndamento.current = true;
    try {
      const { token, usuario } = await login(credenciais, signal);
      if (signal?.aborted || !montado.current) throw requisicaoCancelada();
      const sessao = await salvarSessao(token);
      publicarPerfil(sessao.revisao, usuario);
    } finally {
      loginEmAndamento.current = false;
    }
  }

  function sair() {
    return operarNaSessao(async (revisao) => {
      try {
        await logout();
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) return;
        throw erro;
      }
      await apagarSessao(revisao);
    });
  }

  function atualizarPreferencias(preferencias: Partial<Preferencias>) {
    return operarNaSessao(async (revisao) => {
      const perfil = await salvarPreferencias(preferencias);
      publicarPerfil(revisao, perfil);
      return perfil;
    });
  }

  function aceitarConsentimento(versao: string) {
    return operarNaSessao(async (revisao) => {
      const consentimento = await aceitarTermo(versao);
      setEstado((anterior) => anterior.status === 'autenticado' && anterior.revisao === revisao
        ? { ...anterior, usuario: { ...anterior.usuario, consentimento } }
        : anterior);
    });
  }

  function revogarConsentimento(senha: string) {
    return operarNaSessao(async (revisao) => {
      await revogarTermo(senha);
      setEstado((anterior) => anterior.status === 'autenticado' && anterior.revisao === revisao
        ? { ...anterior, usuario: { ...anterior.usuario, metaMin: null, consentimento: { ...anterior.usuario.consentimento, ativo: false } } }
        : anterior);

      // O DELETE já confirmou a revogação. Atualize os demais campos quando a leitura estiver disponível.
      try {
        publicarPerfil(revisao, await obterPerfil());
      } catch {
        // A área do diário continua fechada se a atualização do perfil falhar.
      }
    });
  }

  function excluirConta(senha: string) {
    return operarNaSessao(async (revisao) => {
      await excluirUsuario(senha);
      await apagarSessao(revisao);
    });
  }

  return (
    <AuthContext.Provider value={{
      estado, tentarRestaurar, entrar, sair, recarregarPerfil, atualizarPreferencias,
      aceitarConsentimento, revogarConsentimento, excluirConta,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return contexto;
}
