import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CampoData } from '../../components/CampoData';
import { BlocoDiario, escalas, OpcoesDiario } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useSleepList } from '../../hooks/useSleepList';
import { Botao, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { FiltrosSono } from '../../services/sleep';
import { controleMinimo, espacos } from '../../theme/spacing';
import { tipografia } from '../../theme/typography';
import { formatarData, formatarDuracao, interpretarData } from '../../utils/sleepForm';

const opcoesQualidade = [{ valor: null, texto: 'Todas' }, ...escalas.qualidade.map((_, i) => ({ valor: i + 1, texto: String(i + 1) }))];

export function History({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'History'>) {
  const { paleta } = usePreferences();
  const periodo = route.params?.periodo;
  const [inicio, setInicio] = useState(() => periodo ? formatarData(periodo.de) : '');
  const [fim, setFim] = useState(() => periodo ? formatarData(periodo.ate) : '');
  const [qualidade, setQualidade] = useState<number | null>(null);
  const [filtros, setFiltros] = useState<FiltrosSono>(() => periodo ?? {});
  const [erros, setErros] = useState<{ de?: string; ate?: string }>({});
  const { itens, proximoAntesDe, carregando, erro, paginando, erroPagina, recarregar, carregarMais } = useSleepList(filtros);
  const comFiltros = Boolean(filtros.de || filtros.ate || filtros.qualidade);

  function aplicar() {
    const de = inicio ? interpretarData(inicio) : undefined;
    const ate = fim ? interpretarData(fim) : undefined;
    const errosNovos: typeof erros = {};
    if (de === null) errosNovos.de = 'Informe uma data inicial válida.';
    if (ate === null) errosNovos.ate = 'Informe uma data final válida.';
    if (de && ate && de > ate) errosNovos.ate = 'A data final deve ser igual ou posterior à inicial.';
    setErros(errosNovos);
    if (Object.keys(errosNovos).length) return;
    Keyboard.dismiss();
    setFiltros({ de: de ?? undefined, ate: ate ?? undefined, qualidade: qualidade ?? undefined });
  }

  function limpar() {
    setInicio(''); setFim(''); setQualidade(null); setErros({}); setFiltros({});
    Keyboard.dismiss();
  }

  const cabecalho = (
    <BlocoDiario titulo="Filtrar noites">
      <CampoData rotulo="Data inicial" value={inicio}
        onChangeText={(texto) => { setInicio(texto); setErros((valor) => ({ ...valor, de: undefined })); }} erro={erros.de} />
      <CampoData rotulo="Data final" value={fim}
        onChangeText={(texto) => { setFim(texto); setErros((valor) => ({ ...valor, ate: undefined })); }} erro={erros.ate} />
      <OpcoesDiario rotulo="Qualidade" valor={qualidade} opcoes={opcoesQualidade} alterar={setQualidade} legenda="1 muito ruim · 5 muito boa" />
      <Botao titulo="Aplicar filtros" onPress={aplicar} />
      {(comFiltros || inicio || fim || qualidade !== null) && <Botao titulo="Limpar filtros" secundario onPress={limpar} />}
    </BlocoDiario>
  );

  return (
    <SafeAreaView style={[css.tela, { backgroundColor: paleta.fundo }]} edges={['bottom', 'left', 'right']}>
      <FlatList data={itens} keyExtractor={({ id }) => id} style={css.tela} contentContainerStyle={css.lista}
        keyboardShouldPersistTaps="handled" ListHeaderComponent={cabecalho} refreshing={carregando && itens.length > 0}
        onRefresh={recarregar}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('SleepDetail', { id: item.id })}
            style={[css.noite, { backgroundColor: paleta.superficie, borderColor: paleta.borda }]}>
            <Text style={[tipografia.rotulo, { color: paleta.texto }]}>{formatarData(item.dataLocal)} · {formatarDuracao(item.duracaoEstimadaMin)}</Text>
            <Text style={[tipografia.detalhe, { color: paleta.textoSecundario }]}>Qualidade {item.qualidade} de 5 · {escalas.qualidade[item.qualidade - 1]}</Text>
          </Pressable>
        )}
        ListEmptyComponent={carregando ? <ActivityIndicator accessibilityLabel="Carregando histórico" color={paleta.primario} /> : erro ? (
          <View style={css.grupo}><Texto erro>{erro}</Texto><Botao titulo="Tentar novamente" onPress={recarregar} /></View>
        ) : (
          <View style={css.grupo}>
            <Texto>{comFiltros ? 'Nenhuma noite corresponde aos filtros.' : 'Você ainda não registrou noites.'}</Texto>
            {comFiltros ? <Botao titulo="Mostrar todas as noites" secundario onPress={limpar} /> :
              <Botao titulo="Registrar minha primeira noite" onPress={() => navigation.navigate('SleepForm')} />}
          </View>
        )}
        onEndReached={() => { if (!erroPagina) void carregarMais(); }} onEndReachedThreshold={0.35}
        ListFooterComponent={proximoAntesDe ? (
          <View style={css.grupo}>
            {erroPagina && <Texto erro>{erroPagina}</Texto>}
            <Botao titulo={paginando ? 'Carregando…' : erroPagina ? 'Tentar carregar mais' : 'Carregar mais'}
              secundario desabilitado={paginando} onPress={() => { void carregarMais(); }} />
          </View>
        ) : undefined} />
    </SafeAreaView>
  );
}

const css = StyleSheet.create({
  tela: { flex: 1 },
  lista: { width: '100%', maxWidth: 560, alignSelf: 'center', padding: espacos.xl, gap: espacos.lg },
  noite: { minHeight: controleMinimo, padding: espacos.lg, borderWidth: 1, borderRadius: 12, gap: espacos.xs },
  grupo: { gap: espacos.sm },
});
