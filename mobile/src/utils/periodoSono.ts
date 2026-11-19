import { Temporal } from '@js-temporal/polyfill';
import type { PeriodoSono } from '../services/reports';

export function periodoDeSeteDias(termino: Temporal.PlainDate): PeriodoSono {
  const inicio = termino.subtract({ days: 6 });
  return { de: inicio.year < 1 ? '0001-01-01' : inicio.toString(), ate: termino.toString() };
}

export function periodoDoMes(valor: string): PeriodoSono | null {
  const partes = /^(0[1-9]|1[0-2])\/(\d{4})$/.exec(valor);
  if (!partes || partes[2] === '0000') return null;
  const mes = Temporal.PlainYearMonth.from(`${partes[2]}-${partes[1]}`);
  return { de: mes.toPlainDate({ day: 1 }).toString(), ate: mes.toPlainDate({ day: mes.daysInMonth }).toString() };
}
