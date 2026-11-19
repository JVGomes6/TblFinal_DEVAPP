import { Temporal } from '@js-temporal/polyfill';
import type { DadosSono, RegistroSono } from '../services/sleep';

export const escalas = {
  qualidade: ['Muito ruim', 'Ruim', 'Regular', 'Boa', 'Muito boa'],
  humor: ['Muito desagradável', 'Desagradável', 'Neutro', 'Agradável', 'Muito agradável'],
  cansaco: ['Muito baixo', 'Baixo', 'Moderado', 'Alto', 'Muito alto'],
} as const;

export const horarios = ['deitou', 'dormiu', 'acordou'] as const;
export type Horario = typeof horarios[number];
export const rotulosHorario: Record<Horario, string> = { deitou: 'Deitou', dormiu: 'Adormeceu', acordou: 'Acordou' };
export const rotulosFatores = { cafeina: 'Cafeína', telas: 'Uso de telas', ansiedade: 'Ansiedade' } as const;

export interface HorarioEditavel { data: string; hora: string; offset: string | null }
export interface RascunhoSono extends Record<Horario, HorarioEditavel> {
  fuso: string;
  qualidade: number | null;
  humor: number | null;
  cansaco: number | null;
  minutosAcordado: string;
  despertares: string;
  fatores: DadosSono['fatores'];
  sonho: string;
}

type CampoHorario = `${Horario}.${'data' | 'hora'}`;
export type CampoSono = CampoHorario | Exclude<keyof RascunhoSono, Horario>;
export type ErrosSono = Partial<Record<CampoSono, string>>;

export function formatarData(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export function formatarDuracao(minutos: number): string {
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}`;
}

export function formatarMomento(iso: string): string {
  const offset = iso.endsWith('Z') ? '+00:00' : iso.slice(-6);
  return `${formatarData(iso)} às ${iso.slice(11, 16)} (UTC${offset})`;
}

export function mascaraData(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4)].filter(Boolean).join('/');
}

export function mascaraHora(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 4);
  return [digitos.slice(0, 2), digitos.slice(2)].filter(Boolean).join(':');
}

export function interpretarData(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes || partes[3] === '0000') return null;
  try {
    return Temporal.PlainDate.from(`${partes[3]}-${partes[2]}-${partes[1]}`).toString();
  } catch {
    return null;
  }
}

function horarioDoRegistro(iso: string): HorarioEditavel {
  return { data: formatarData(iso), hora: iso.slice(11, 16), offset: iso.endsWith('Z') ? '+00:00' : iso.slice(-6) };
}

export function rascunhoInicial(registro?: RegistroSono): RascunhoSono {
  const fuso = registro?.fuso ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
  if (registro) {
    return {
      fuso, deitou: horarioDoRegistro(registro.deitou), dormiu: horarioDoRegistro(registro.dormiu), acordou: horarioDoRegistro(registro.acordou),
      qualidade: registro.qualidade, humor: registro.humor, cansaco: registro.cansaco,
      minutosAcordado: registro.minutosAcordado?.toString() ?? '', despertares: registro.despertares?.toString() ?? '',
      fatores: registro.fatores, sonho: registro.sonho ?? '',
    };
  }

  const hoje = formatarData(Temporal.Now.plainDateISO(fuso).toString());
  const vazio = { data: hoje, hora: '', offset: null };
  return {
    fuso, deitou: vazio, dormiu: vazio, acordou: vazio, qualidade: null, humor: null, cansaco: null,
    minutosAcordado: '', despertares: '', fatores: { cafeina: null, telas: null, ansiedade: null }, sonho: '',
  };
}

function fusoValido(fuso: string): boolean {
  if (!/^[A-Za-z]\S*$/.test(fuso) || fuso.length > 128) return false;
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: fuso });
    return true;
  } catch {
    return false;
  }
}

function resolverHorario(campo: Horario, rascunho: RascunhoSono, fuso: string, erros: ErrosSono) {
  const { data, hora, offset } = rascunho[campo];
  const iso = interpretarData(data);
  const horaValida = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hora);
  if (!iso) erros[`${campo}.data`] = 'Informe uma data válida no formato DD/MM/AAAA.';
  if (!horaValida) erros[`${campo}.hora`] = 'Informe uma hora válida no formato HH:MM.';
  if (!iso || !horaValida || erros.fuso) return { escolhas: [] };

  const local = Temporal.PlainDateTime.from(`${iso}T${hora}`);
  const primeira = local.toZonedDateTime(fuso, { disambiguation: 'earlier' });
  const segunda = local.toZonedDateTime(fuso, { disambiguation: 'later' });
  const validos = (primeira.equals(segunda) ? [primeira] : [primeira, segunda])
    .filter((valor) => valor.toPlainDateTime().equals(local));
  if (!validos.length) {
    erros[`${campo}.hora`] = 'Essa hora não ocorreu nesse fuso. Escolha outro horário.';
    return { escolhas: [] };
  }
  const escolhas = validos.map((valor) => valor.offset);
  const escolhido = validos.length === 1 ? validos[0] : validos.find((valor) => valor.offset === offset);
  if (!escolhido) erros[`${campo}.hora`] = 'A hora se repetiu. Selecione a ocorrência pelo offset.';
  else if (!/^[+-]\d{2}:\d{2}$/.test(escolhido.offset)) {
    erros[`${campo}.hora`] = 'O offset histórico desse horário inclui segundos. Escolha outro horário.';
    return { escolhas };
  }
  return { escolhas, escolhido };
}

function inteiroOpcional(texto: string, campo: 'minutosAcordado' | 'despertares', maximo: number, erros: ErrosSono) {
  if (texto === '') return null;
  const valor = Number(texto);
  if (!/^\d+$/.test(texto) || !Number.isInteger(valor) || valor > maximo) {
    erros[campo] = `Informe um número inteiro entre 0 e ${maximo}.`;
    return null;
  }
  return valor;
}

export function validarRascunho(rascunho: RascunhoSono, agora = Date.now()) {
  const erros: ErrosSono = {};
  const fuso = rascunho.fuso.trim();
  if (!fusoValido(fuso)) erros.fuso = 'Informe um fuso IANA, como America/Sao_Paulo.';
  const deitou = resolverHorario('deitou', rascunho, fuso, erros);
  const dormiu = resolverHorario('dormiu', rascunho, fuso, erros);
  const acordou = resolverHorario('acordou', rascunho, fuso, erros);
  const offsets = { deitou: deitou.escolhas, dormiu: dormiu.escolhas, acordou: acordou.escolhas };
  const minutos = inteiroOpcional(rascunho.minutosAcordado, 'minutosAcordado', 1440, erros);
  const despertares = inteiroOpcional(rascunho.despertares, 'despertares', 2_147_483_647, erros);
  if (despertares === 0 && (minutos ?? 0) > 0) erros.despertares = 'Confira os despertares e os minutos acordados.';
  if (rascunho.qualidade === null) erros.qualidade = 'Escolha a qualidade do sono.';
  if (Array.from(rascunho.sonho).length > 1000 || /[\p{Surrogate}\u0000]/u.test(rascunho.sonho)) {
    erros.sonho = 'Use até 1.000 caracteres válidos.';
  }

  let estimativa: number | null = null;
  const inicio = deitou.escolhido;
  const sono = dormiu.escolhido;
  const fim = acordou.escolhido;
  if (inicio && sono && inicio.epochMilliseconds > sono.epochMilliseconds) erros['dormiu.hora'] = 'Adormecer deve ser no horário de deitar ou depois.';
  if (inicio && fim && fim.epochMilliseconds - inicio.epochMilliseconds > 86_400_000) erros['acordou.hora'] = 'A noite inteira pode ter até 24 horas.';
  if (fim && fim.epochMilliseconds > agora) erros['acordou.hora'] = 'O despertar deve ser agora ou antes.';
  if (sono && fim) {
    const intervalo = (fim.epochMilliseconds - sono.epochMilliseconds) / 60_000;
    if (intervalo <= 0) erros['acordou.hora'] = 'Acordar deve acontecer depois de adormecer.';
    else if ((minutos ?? 0) > intervalo) erros.minutosAcordado = 'Os minutos acordados excedem o intervalo de sono.';
    else if (!erros['dormiu.hora'] && !erros['acordou.hora'] && !erros.minutosAcordado) estimativa = intervalo - (minutos ?? 0);
  }

  const { qualidade, humor, cansaco, fatores, sonho } = rascunho;
  const saidaIso = (valor: Temporal.ZonedDateTime) => valor.toString({ smallestUnit: 'second', timeZoneName: 'never', calendarName: 'never' });
  const dados: DadosSono | null = Object.keys(erros).length || !inicio || !sono || !fim || qualidade === null ? null : {
    fuso, deitou: saidaIso(inicio), dormiu: saidaIso(sono), acordou: saidaIso(fim), qualidade, humor, cansaco, fatores,
    minutosAcordado: minutos, despertares, sonho: sonho === '' ? null : sonho,
  };
  return { erros, dados, estimativa, offsets };
}
