export function formatarHorario(minutos: number): string {
  const horas = Math.floor(minutos / 60).toString().padStart(2, '0');
  const minutosDaHora = (minutos % 60).toString().padStart(2, '0');
  return `${horas}:${minutosDaHora}`;
}

export function interpretarHorario(texto: string): number | null {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(texto)) return null;
  return Number(texto.slice(0, 2)) * 60 + Number(texto.slice(3));
}
