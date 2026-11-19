import { Temporal } from '@js-temporal/polyfill';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { obterResumoSono } from '../services/reports';
import type { ResumoDoPeriodo } from '../services/reports';
import { periodoDeSeteDias } from '../utils/periodoSono';
import { useErroDiario } from './useSleepList';

type EstadoRelatorio =
  | { status: 'carregando' }
  | { status: 'pronto'; resumo: ResumoDoPeriodo }
  | { status: 'erro'; mensagem: string };

export function useSleepReport() {
  const mensagem = useErroDiario();
  const [estado, setEstado] = useState<EstadoRelatorio>({ status: 'carregando' });
  const [revisao, setRevisao] = useState(0);

  useFocusEffect(useCallback(() => {
    let controle: AbortController | undefined;
    let viradaDoDia: ReturnType<typeof setTimeout> | undefined;

    function consultar() {
      clearTimeout(viradaDoDia);
      controle?.abort();
      const atual = new AbortController();
      controle = atual;
      const periodo = periodoDeSeteDias(Temporal.Now.plainDateISO());
      setEstado({ status: 'carregando' });
      void obterResumoSono(periodo, atual.signal).then((resumo) => {
        if (!atual.signal.aborted) setEstado({ status: 'pronto', resumo });
      }).catch((erro: unknown) => {
        if (!atual.signal.aborted) setEstado({ status: 'erro', mensagem: mensagem(erro) });
      });

      const amanha = new Date();
      amanha.setHours(24, 0, 0, 0);
      viradaDoDia = setTimeout(consultar, Math.max(1, amanha.getTime() - Date.now()));
    }

    consultar();
    const assinatura = AppState.addEventListener('change', (status) => {
      if (status === 'active') consultar();
      else {
        controle?.abort();
        clearTimeout(viradaDoDia);
      }
    });

    return () => {
      controle?.abort();
      clearTimeout(viradaDoDia);
      assinatura.remove();
    };
  }, [mensagem, revisao]));

  return { estado, recarregar: () => setRevisao((valor) => valor + 1) };
}
