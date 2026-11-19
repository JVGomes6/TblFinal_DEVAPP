import type { ResumoDoPeriodo } from '../services/reports';
import { formatarDuracao } from './sleepForm';

export const avisosDoRelatorio = 'As medidas são autorrelatadas e a duração de sono é estimada. Este PDF pode conter dados sensíveis.';

export function formatarMinutosRelatorio(valor: number): string {
  const minutos = Math.round(valor);
  return `${formatarDuracao(minutos)} (${minutos} min)`;
}

export function rotuloCobertura(noites: number, dias: number): string {
  if (noites === 0) return 'Sem registros no período';
  return noites === dias ? 'Cobertura completa' : 'Cobertura parcial';
}

export function descreverSpearman({ pares, motivo, rho }: ResumoDoPeriodo['spearman']): string {
  if (rho !== null) return `${rho.toFixed(2).replace('.', ',')} em ${pares} pares. A associação é descritiva.`;
  if (motivo === 'amostra_pequena') return `Coeficiente indisponível. Há ${pares} de pelo menos 7 pares necessários com duração e humor informados.`;
  return `Coeficiente indisponível. A duração ou o humor não variou entre os ${pares} pares.`;
}
