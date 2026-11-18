export type ModoTema = 'claro' | 'escuro' | 'altoContraste';

export interface Paleta {
  fundo: string;
  superficie: string;
  texto: string;
  textoSecundario: string;
  borda: string;
  primario: string;
  sobrePrimario: string;
  erro: string;
}

export const cores: Record<ModoTema, Paleta> = {
  claro: {
    fundo: '#F7F6FC', superficie: '#FFFFFF', texto: '#221936', textoSecundario: '#534765',
    borda: '#9588AB', primario: '#523A93', sobrePrimario: '#FFFFFF', erro: '#9B2346',
  },
  escuro: {
    fundo: '#151124', superficie: '#221A37', texto: '#F9F6FF', textoSecundario: '#C5B7DE',
    borda: '#8D7EAB', primario: '#D7C5FF', sobrePrimario: '#251749', erro: '#FFB9CD',
  },
  altoContraste: {
    fundo: '#080610', superficie: '#130E22', texto: '#FFFFFF', textoSecundario: '#F0E8FF',
    borda: '#FFFFFF', primario: '#F9E180', sobrePrimario: '#0D0A13', erro: '#FFB7C9',
  },
};
