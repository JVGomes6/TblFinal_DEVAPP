import type { ComponentRef, ReactNode, Ref } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { usePreferences } from '../context/PreferencesContext';
import { Texto } from '../navigation/FoundationScreens';
import { controleMinimo, espacos } from '../theme/spacing';
import { tipografia } from '../theme/typography';

export { escalas } from '../utils/sleepForm';

export function CampoDiario({ rotulo, erro, inputRef, ...props }: TextInputProps & {
  rotulo: string; erro?: string; inputRef?: Ref<ComponentRef<typeof TextInput>>;
}) {
  const { paleta } = usePreferences();
  return (
    <View style={css.grupo}>
      <Text style={[tipografia.rotulo, { color: paleta.texto }]}>{rotulo}</Text>
      <TextInput {...props} ref={inputRef} accessibilityLabel={props.accessibilityLabel ?? rotulo} accessibilityHint={erro ?? props.accessibilityHint}
        placeholderTextColor={paleta.textoSecundario}
        style={[css.input, tipografia.corpo,
          { color: paleta.texto, backgroundColor: paleta.superficie, borderColor: erro ? paleta.erro : paleta.borda },
          props.multiline && css.multilinha, props.style]} />
      {erro && <Texto erro>{erro}</Texto>}
    </View>
  );
}

export function OpcoesDiario<T extends string | number | boolean | null>({ rotulo, valor, opcoes, alterar, legenda, erro, desabilitado, primeiraOpcaoRef }: {
  rotulo: string; valor: T; opcoes: ReadonlyArray<{ valor: T; texto: string }>; alterar: (valor: T) => void;
  legenda?: string; erro?: string; desabilitado?: boolean; primeiraOpcaoRef?: Ref<ComponentRef<typeof View>>;
}) {
  const { paleta } = usePreferences();
  return (
    <View style={css.grupo}>
      <Text style={[tipografia.rotulo, { color: paleta.texto }]}>{rotulo}</Text>
      {legenda && <Text style={[tipografia.detalhe, { color: paleta.textoSecundario }]}>{legenda}</Text>}
      <View style={css.opcoes}>
        {opcoes.map((opcao, indice) => {
          const marcado = opcao.valor === valor;
          return (
            <Pressable key={String(opcao.valor)} ref={indice === 0 ? primeiraOpcaoRef : undefined}
              accessibilityRole="radio" accessibilityLabel={`${rotulo}: ${opcao.texto}`} accessibilityHint={erro}
              accessibilityState={{ checked: marcado, disabled: desabilitado }} disabled={desabilitado}
              onPress={() => alterar(opcao.valor)} style={[css.opcao, { borderColor: marcado ? paleta.primario : paleta.borda,
                backgroundColor: marcado ? paleta.primario : paleta.superficie }]}>
              <Text style={[tipografia.rotulo, { color: marcado ? paleta.sobrePrimario : paleta.texto, textAlign: 'center' }]}>{opcao.texto}</Text>
            </Pressable>
          );
        })}
      </View>
      {erro && <Texto erro>{erro}</Texto>}
    </View>
  );
}

export function BlocoDiario({ titulo, tituloRef, children }: { titulo?: string; tituloRef?: Ref<ComponentRef<typeof Text>>; children: ReactNode }) {
  const { paleta } = usePreferences();
  return (
    <View style={[css.bloco, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
      {titulo && <Text ref={tituloRef} accessibilityRole="header" style={[tipografia.subtitulo, { color: paleta.texto }]}>{titulo}</Text>}
      {children}
    </View>
  );
}

const css = StyleSheet.create({
  grupo: { gap: espacos.xs, minWidth: 0 },
  input: { minHeight: controleMinimo, borderWidth: 1, borderRadius: 10, paddingHorizontal: espacos.md, paddingVertical: espacos.sm },
  multilinha: { minHeight: 100, textAlignVertical: 'top' },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espacos.sm },
  opcao: { minWidth: controleMinimo, minHeight: controleMinimo, paddingHorizontal: espacos.md, paddingVertical: espacos.sm,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 10, maxWidth: '100%' },
  bloco: { padding: espacos.lg, borderWidth: 1, borderRadius: 16, gap: espacos.md },
});
