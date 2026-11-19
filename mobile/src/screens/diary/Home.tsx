import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlocoDiario, escalas } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useSleepList } from '../../hooks/useSleepList';
import { useSleepReport } from '../../hooks/useSleepReport';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { ResumoDoPeriodo } from '../../services/reports';
import { espacos } from '../../theme/spacing';
import { tipografia } from '../../theme/typography';
import { formatarData, formatarDuracao } from '../../utils/sleepForm';

export function Home({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const { ehNoite, paleta, destaque } = usePreferences();
  const { width, fontScale } = useWindowDimensions();
  const { left, right } = useSafeAreaInsets();
  const ladoALado = width - left - right - 2 * espacos.xl >= 600 && fontScale <= 1.25;
  const ultimas = useSleepList({ limite: 1 });
  const { estado, recarregar } = useSleepReport();
  const ultima = ultimas.itens[0];
  const textoCadastro = !ultimas.carregando && !ultimas.erro && !ultima ? 'Registrar minha primeira noite' : 'Registrar uma noite';
  const registrar = <Botao key="registro" titulo={textoCadastro} secundario={ehNoite} onPress={() => navigation.navigate('SleepForm')} />;
  const preparar = <Botao key="rotina" titulo="Preparar a rotina" secundario={!ehNoite} onPress={() => navigation.navigate('Routine')} />;

  return (
    <Tela titulo={ehNoite ? 'Boa noite' : 'Seu diário'} larguraMaxima={ladoALado ? 880 : 520}>
      <View style={css.acoes}>{ehNoite ? [preparar, registrar] : [registrar, preparar]}</View>
      <Botao titulo="Cartão de reflexão" secundario onPress={() => navigation.navigate('Reflection')} />
      <Botao titulo="Relatório de sono" secundario onPress={() => navigation.navigate('Report')} />
      <BlocoDiario titulo="Últimos 7 dias">
        {estado.status === 'carregando' && (
          <View style={css.linha} accessibilityLiveRegion="polite">
            <ActivityIndicator color={paleta.primario} />
            <Texto>Carregando resumo…</Texto>
          </View>
        )}
        {estado.status === 'erro' && (
          <>
            <Texto erro>{estado.mensagem}</Texto>
            <Botao titulo="Tentar carregar o resumo" secundario onPress={recarregar} />
          </>
        )}
        {estado.status === 'pronto' && <Cobertura resumo={estado.resumo} />}
      </BlocoDiario>
      {estado.status === 'pronto' && estado.resumo.noites > 0 && (
        <CartoesDoPeriodo resumo={estado.resumo} destaque={destaque} ladoALado={ladoALado} />
      )}
      {ultima && (
        <BlocoDiario titulo="Último registro">
          <Texto>{formatarData(ultima.dataLocal)} · {formatarDuracao(ultima.duracaoEstimadaMin)} de sono estimado</Texto>
          <Botao titulo="Abrir último registro" secundario onPress={() => navigation.navigate('SleepDetail', { id: ultima.id })} />
        </BlocoDiario>
      )}
      <Botao titulo="Histórico" secundario onPress={() => navigation.navigate('History')} />
      <Botao titulo="Configurações" secundario onPress={() => navigation.navigate('Settings')} />
    </Tela>
  );
}

function Cobertura({ resumo }: { resumo: ResumoDoPeriodo }) {
  const { de, ate, noites, diasPeriodo } = resumo;
  const diasSemRegistro = diasPeriodo - noites;

  return (
    <>
      <Texto>{formatarData(de)} a {formatarData(ate)}</Texto>
      <Texto>{noites} de {diasPeriodo} noites registradas</Texto>
      <Texto>{diasSemRegistro} {diasSemRegistro === 1 ? 'dia' : 'dias'} sem registro</Texto>
      <Texto>{noites === 0 ? 'Nenhuma noite registrada neste período.' : diasSemRegistro > 0 ? 'Cobertura parcial' : 'Cobertura completa'}</Texto>
    </>
  );
}

function CartoesDoPeriodo({ resumo, destaque, ladoALado }: {
  resumo: ResumoDoPeriodo; destaque: 'duracao' | 'humor'; ladoALado: boolean;
}) {
  const { paleta } = usePreferences();
  const { mediaMin, noites, porHumor } = resumo;
  const semHumor = noites - porHumor.reduce((total, grupo) => total + grupo.n, 0);
  const duracao = (
    <BlocoDiario titulo="Duração estimada">
      {mediaMin !== null && <Text style={[tipografia.titulo, { color: paleta.texto }]}>{formatarDuracao(Math.round(mediaMin))}</Text>}
      <Texto>{noites === 1 ? 'Tempo de sono da noite registrada.' : 'Média das noites registradas.'}</Texto>
    </BlocoDiario>
  );
  const humor = (
    <BlocoDiario titulo="Distribuição por humor">
      {porHumor.length === 0 && <Texto>Nenhum humor informado no período.</Texto>}
      {porHumor.map((grupo) => (
        <View key={grupo.humor} style={css.grupoHumor}>
          <Text style={[tipografia.rotulo, { color: paleta.texto }]}>{escalas.humor[grupo.humor - 1]}</Text>
          <View style={[css.trilho, { backgroundColor: paleta.fundo }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[css.barra, { backgroundColor: paleta.primario, width: `${100 * grupo.n / noites}%` }]} />
          </View>
          <Texto>{grupo.n} {grupo.n === 1 ? 'noite' : 'noites'} · Duração média {formatarDuracao(Math.round(grupo.mediaMin))}</Texto>
        </View>
      ))}
      {semHumor > 0 && porHumor.length > 0 && <Texto>{semHumor} {semHumor === 1 ? 'noite' : 'noites'} sem humor informado</Texto>}
    </BlocoDiario>
  );

  const cartoes = destaque === 'humor' ? [humor, duracao] : [duracao, humor];
  return (
    <View style={[css.cartoes, ladoALado && css.ladoALado]}>
      <View style={ladoALado && css.coluna}>{cartoes[0]}</View>
      <View style={ladoALado && css.coluna}>{cartoes[1]}</View>
    </View>
  );
}

const css = StyleSheet.create({
  acoes: { gap: espacos.sm },
  cartoes: { gap: espacos.lg },
  ladoALado: { flexDirection: 'row' },
  coluna: { flex: 1, minWidth: 0 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espacos.sm },
  grupoHumor: { gap: espacos.xs },
  trilho: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: 4 },
});
