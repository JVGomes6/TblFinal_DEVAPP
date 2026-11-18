import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function estaNoHorarioNoturno(agora: Date): boolean {
  const hora = agora.getHours();
  return hora >= 20 || hora < 6;
}

export function msAteTrocaDeContexto(agora: Date): number {
  const proxima = new Date(agora);
  const hora = agora.getHours();
  if (hora >= 20) proxima.setDate(proxima.getDate() + 1);
  proxima.setHours(estaNoHorarioNoturno(agora) ? 6 : 20, 0, 0, 0);
  return proxima.getTime() - agora.getTime();
}

export function useNightContext(): boolean {
  const [ehNoite, setEhNoite] = useState(() => estaNoHorarioNoturno(new Date()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const atualizar = () => {
      clearTimeout(timer);
      const agora = new Date();
      setEhNoite(estaNoHorarioNoturno(agora));
      if (AppState.currentState === 'active' || AppState.currentState === null) {
        // Verifique também mudanças de relógio ou fuso enquanto o app estiver aberto.
        timer = setTimeout(atualizar, Math.max(1, Math.min(msAteTrocaDeContexto(agora), 60_000)));
      }
    };

    atualizar();
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') atualizar();
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      assinatura.remove();
    };
  }, []);

  return ehNoite;
}
