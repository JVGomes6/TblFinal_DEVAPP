import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { mensagemDaSolicitacao, useAuth } from '../context/AuthContext';
import { ErroApi } from '../services/api';
import { listarSono, obterSono } from '../services/sleep';
import type { FiltrosSono, PaginaSono, RegistroSono } from '../services/sleep';

export function useErroDiario() {
  const { recarregarPerfil } = useAuth();
  return useCallback((erro: unknown) => {
    if (erro instanceof ErroApi && erro.codigo === 'CONSENTIMENTO_NECESSARIO') {
      void recarregarPerfil().catch(() => {});
    }
    return mensagemDaSolicitacao(erro);
  }, [recarregarPerfil]);
}

const paginaVazia: PaginaSono = { itens: [], proximoAntesDe: null };

export function useSleepList({ de, ate, qualidade, limite }: FiltrosSono) {
  const filtros = useMemo(() => ({ de, ate, qualidade, limite }), [de, ate, qualidade, limite]);
  const controle = useRef<AbortController | null>(null);
  const pedidoExtra = useRef<AbortController | null>(null);
  const mensagem = useErroDiario();
  const [pagina, setPagina] = useState(paginaVazia);
  const [carregando, setCarregando] = useState(true);
  const [paginando, setPaginando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroPagina, setErroPagina] = useState<string | null>(null);
  const [revisao, setRevisao] = useState(0);

  useFocusEffect(useCallback(() => {
    const atual = new AbortController();
    controle.current = atual;
    setPagina(paginaVazia);
    setErro(null);
    setErroPagina(null);
    setCarregando(true);
    setPaginando(false);

    void listarSono(filtros, atual.signal).then((dados) => {
      if (!atual.signal.aborted) setPagina(dados);
    }).catch((falha: unknown) => {
      if (!atual.signal.aborted) setErro(mensagem(falha));
    }).finally(() => {
      if (!atual.signal.aborted) setCarregando(false);
    });

    return () => {
      atual.abort();
      controle.current = null;
      pedidoExtra.current = null;
    };
  }, [filtros, mensagem, revisao]));

  async function carregarMais() {
    const atual = controle.current;
    if (!atual || atual.signal.aborted || carregando || pedidoExtra.current || !pagina.proximoAntesDe) return;
    pedidoExtra.current = atual;
    setPaginando(true);
    setErroPagina(null);
    try {
      const dados = await listarSono({ ...filtros, antesDe: pagina.proximoAntesDe }, atual.signal);
      if (atual.signal.aborted) return;
      setPagina((anterior) => {
        const ids = new Set(anterior.itens.map(({ id }) => id));
        return { itens: [...anterior.itens, ...dados.itens.filter(({ id }) => !ids.has(id))], proximoAntesDe: dados.proximoAntesDe };
      });
    } catch (falha) {
      if (!atual.signal.aborted) setErroPagina(mensagem(falha));
    } finally {
      if (!atual.signal.aborted) {
        pedidoExtra.current = null;
        setPaginando(false);
      }
    }
  }

  return { ...pagina, carregando, paginando, erro, erroPagina, carregarMais, recarregar: () => setRevisao((valor) => valor + 1) };
}

export function useRegistroSono(id: string | undefined) {
  const mensagem = useErroDiario();
  const [registro, setRegistro] = useState<RegistroSono | null>(null);
  const [carregando, setCarregando] = useState(Boolean(id));
  const [erro, setErro] = useState<string | null>(null);
  const [revisao, setRevisao] = useState(0);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    const atual = new AbortController();
    setCarregando(true);
    setRegistro(null);
    setErro(null);
    void obterSono(id, atual.signal).then((noite) => {
      if (!atual.signal.aborted) setRegistro(noite);
    }).catch((falha: unknown) => {
      if (!atual.signal.aborted) setErro(mensagem(falha));
    }).finally(() => {
      if (!atual.signal.aborted) setCarregando(false);
    });
    return () => atual.abort();
  }, [id, mensagem, revisao]));

  return { registro: registro?.id === id ? registro : null, carregando, erro, recarregar: () => setRevisao((valor) => valor + 1) };
}
