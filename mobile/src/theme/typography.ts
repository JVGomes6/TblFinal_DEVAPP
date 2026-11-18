import type { TextStyle } from 'react-native';

export const tipografia = {
  titulo: { fontSize: 34, lineHeight: 42, fontWeight: '700' },
  subtitulo: { fontSize: 22, lineHeight: 30, fontWeight: '700' },
  corpo: { fontSize: 16, lineHeight: 24 },
  rotulo: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  detalhe: { fontSize: 14, lineHeight: 22 },
} satisfies Record<string, TextStyle>;
