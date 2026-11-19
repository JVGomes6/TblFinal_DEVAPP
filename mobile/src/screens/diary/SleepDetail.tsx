import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { BlocoDiario, escalas } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useErroDiario, useRegistroSono } from '../../hooks/useSleepList';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ErroApi } from '../../services/api';
import { excluirSono } from '../../services/sleep';
import { tipografia } from '../../theme/typography';
import { formatarData, formatarDuracao, formatarMomento, horarios, rotulosFatores, rotulosHorario } from '../../utils/sleepForm';

function escala(valor: number | null, nomes: readonly string[]): string {
  return valor === null ? 'Não informado' : `${valor} de 5 · ${nomes[valor - 1]}`;
}

export function SleepDetail({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'SleepDetail'>) {
  const { id } = route.params;
  const { registro, carregando, erro, recarregar } = useRegistroSono(id.toLowerCase());
  const { paleta } = usePreferences();
  const mensagem = useErroDiario();
  const [apagando, setApagando] = useState(false);
  const [apagada, setApagada] = useState(false);
  const [falhaExclusao, setFalhaExclusao] = useState<string | null>(null);
  const [conflito, setConflito] = useState(false);
  const operacao = useRef<AbortController | null>(null);

  useFocusEffect(useCallback(() => () => operacao.current?.abort(), []));
  usePreventRemove(apagando && !apagada, () => {});
  useEffect(() => { if (apagada) navigation.goBack(); }, [apagada, navigation]);

  function atualizarRegistro() {
    setFalhaExclusao(null);
    setConflito(false);
    recarregar();
  }

  async function apagar(versao: number) {
    if (operacao.current) return;
    const atual = new AbortController();
    operacao.current = atual;
    setApagando(true);
    setFalhaExclusao(null);
    try {
      await excluirSono(id, versao, atual.signal);
      if (!atual.signal.aborted) setApagada(true);
    } catch (falha) {
      if (!atual.signal.aborted) {
        setFalhaExclusao(mensagem(falha));
        setConflito(falha instanceof ErroApi && falha.status === 412);
      }
    } finally {
      operacao.current = null;
      if (!atual.signal.aborted) setApagando(false);
    }
  }

  if (!registro || carregando) {
    return (
      <Tela titulo="Registro de sono">
        {erro ? <><Texto erro>{erro}</Texto><Botao titulo="Recarregar registro" onPress={atualizarRegistro} /></> :
          <ActivityIndicator accessibilityLabel="Carregando registro" color={paleta.primario} />}
      </Tela>
    );
  }

  return (
    <Tela titulo={formatarData(registro.dataLocal)}>
      <BlocoDiario>
        <Text style={[tipografia.subtitulo, { color: paleta.texto }]}>{formatarDuracao(registro.duracaoEstimadaMin)} de sono estimado</Text>
        {registro.minutosAcordado === null && <Texto>Intervalo sem desconto informado de minutos acordados.</Texto>}
        <Texto>Qualidade · {escala(registro.qualidade, escalas.qualidade)}</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="Horários">
        {horarios.map((campo) => <Texto key={campo}>{rotulosHorario[campo]} · {formatarMomento(registro[campo])}</Texto>)}
        <Texto>Fuso · {registro.fuso}</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="Complementos">
        <Texto>Minutos acordado · {registro.minutosAcordado ?? 'Não informado'}</Texto>
        <Texto>Despertares · {registro.despertares ?? 'Não informado'}</Texto>
        <Texto>Humor · {escala(registro.humor, escalas.humor)}</Texto>
        <Texto>Cansaço · {escala(registro.cansaco, escalas.cansaco)}</Texto>
        {(Object.keys(rotulosFatores) as Array<keyof typeof rotulosFatores>).map((fator) => {
          const valor = registro.fatores[fator];
          return <Texto key={fator}>{rotulosFatores[fator]} · {valor === null ? 'Não informado' : valor ? 'Sim' : 'Não'}</Texto>;
        })}
        {registro.sonho !== null && <><Text style={[tipografia.rotulo, { color: paleta.texto }]}>Sonhos e anotações</Text><Texto>{registro.sonho}</Texto></>}
      </BlocoDiario>
      {falhaExclusao && <Texto erro>{falhaExclusao}</Texto>}
      {falhaExclusao && <Botao titulo="Recarregar registro" secundario onPress={atualizarRegistro} />}
      <Botao titulo="Editar noite" desabilitado={apagando || conflito} onPress={() => navigation.navigate('SleepForm', { id: registro.id })} />
      <Botao titulo={apagando ? 'Apagando…' : 'Apagar noite'} secundario desabilitado={apagando || conflito}
        onPress={() => Alert.alert('Apagar esta noite?', `O registro de ${formatarData(registro.dataLocal)} será excluído do diário.`, [
          { text: 'Cancelar', style: 'cancel' }, { text: 'Apagar noite', style: 'destructive', onPress: () => { void apagar(registro.versao); } },
        ], { cancelable: true })} />
    </Tela>
  );
}
