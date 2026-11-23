import { usePreventRemove } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, Keyboard, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent, ScrollView, TextInput } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { BlocoDiario, CampoDiario, escalas, OpcoesDiario } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useErroDiario, useRegistroSono } from '../../hooks/useSleepList';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ErroApi } from '../../services/api';
import { editarSono, obterSono, salvarNovaNoite } from '../../services/sleep';
import type { DadosSono, RegistroSono } from '../../services/sleep';
import { espacos } from '../../theme/spacing';
import { tipografia } from '../../theme/typography';
import {
  formatarData, formatarDuracao, horarios, mascaraHora, rascunhoInicial, rotulosFatores, rotulosHorario, validarRascunho,
} from '../../utils/sleepForm';
import type { CampoSono, ErrosSono, Horario, RascunhoSono } from '../../utils/sleepForm';

type Props = NativeStackScreenProps<RootStackParamList, 'SleepForm'>;

const semResposta = { valor: null, texto: 'Não informado' };
const valoresFator = [semResposta, { valor: false, texto: 'Não' }, { valor: true, texto: 'Sim' }];
const opcoesEscala = [1, 2, 3, 4, 5].map((valor) => ({ valor, texto: String(valor) }));
const opcionais = ['minutosAcordado', 'despertares', 'humor', 'cansaco', 'fatores', 'sonho'] as const;
const camposParaRevisar: CampoSono[] = [
  'fuso', 'deitou.data', 'deitou.hora', 'dormiu.data', 'dormiu.hora', 'acordou.data', 'acordou.hora', 'qualidade', ...opcionais,
];

function campoDaApi(campo: string | undefined): CampoSono | undefined {
  const horario = horarios.find((nome) => nome === campo);
  return horario ? `${horario}.hora` : camposParaRevisar.find((nome) => nome === campo);
}

export function SleepForm({ route, navigation }: Props) {
  const id = route.params?.id.toLowerCase();
  const { registro, carregando, erro, recarregar } = useRegistroSono(id);
  const { paleta } = usePreferences();

  if (id && (!registro || carregando)) {
    return (
      <Tela titulo="Editar noite">
        {erro ? <><Texto erro>{erro}</Texto><Botao titulo="Tentar novamente" onPress={recarregar} /></> :
          <ActivityIndicator accessibilityLabel="Carregando formulário" color={paleta.primario} />}
      </Tela>
    );
  }

  return <EditorSono key={id ?? 'nova'} navigation={navigation} inicial={registro ?? undefined} />;
}

function EditorSono({ navigation, inicial }: { navigation: Props['navigation']; inicial?: RegistroSono }) {
  const { paleta } = usePreferences();
  const { width, fontScale } = useWindowDimensions();
  const mensagem = useErroDiario();
  const [base, setBase] = useState(() => rascunhoInicial(inicial));
  const [rascunho, setRascunho] = useState(base);
  const [versao, setVersao] = useState(inicial?.versao);
  const [mostrarComplementos, setMostrarComplementos] = useState(false);
  const [exibirErros, setExibirErros] = useState(false);
  const [errosServidor, setErrosServidor] = useState<ErrosSono>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [criacaoPendente, setCriacaoPendente] = useState(false);
  const [conflito, setConflito] = useState(false);
  const [versaoAtual, setVersaoAtual] = useState<RegistroSono | null>(null);
  const [salva, setSalva] = useState<string | null>(null);
  const operacao = useRef<AbortController | null>(null);
  const tentativa = useRef<{ id: string; dados: DadosSono } | null>(null);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const referencias = useRef<Partial<Record<CampoSono, ComponentRef<typeof TextInput> | null>>>({});
  const primeiraQualidade = useRef<ComponentRef<typeof View>>(null);
  const posicoes = useRef<Partial<Record<CampoSono, number>>>({});
  const validacao = useMemo(() => validarRascunho(rascunho), [rascunho]);
  const erros = { ...(exibirErros ? validacao.erros : {}), ...errosServidor };
  const alterado = JSON.stringify(rascunho) !== JSON.stringify(base);
  const bloqueado = ocupado || criacaoPendente;
  const horariosEmLinha = width >= 360 && fontScale <= 1.25;

  useEffect(() => () => operacao.current?.abort(), []);
  usePreventRemove(!salva && (alterado || ocupado || criacaoPendente), ({ data }) => {
    if (operacao.current) return;
    Alert.alert('Sair do formulário?', criacaoPendente
      ? 'A gravação ainda não foi confirmada. Ao sair, confira seu histórico antes de registrar outra noite.'
      : 'As alterações deste formulário serão descartadas.', [
      { text: 'Continuar editando', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ], { cancelable: true });
  });
  useEffect(() => {
    if (!salva) return;
    if (inicial) navigation.goBack();
    else navigation.replace('SleepDetail', { id: salva });
  }, [salva, inicial, navigation]);

  function marcarPosicao(evento: LayoutChangeEvent, campos: readonly CampoSono[]) {
    for (const campo of campos) posicoes.current[campo] = evento.nativeEvent.layout.y;
  }

  function focalizar(campo: CampoSono | undefined) {
    if (!campo) return;
    if (opcionais.some((nome) => nome === campo)) setMostrarComplementos(true);
    requestAnimationFrame(() => {
      rolagem.current?.scrollTo({ y: Math.max(0, (posicoes.current[campo] ?? 0) - espacos.md) });
      const input = referencias.current[campo];
      input?.focus();
      const controle = input ?? (campo === 'qualidade' ? primeiraQualidade.current : null);
      if (controle) AccessibilityInfo.sendAccessibilityEvent(controle, 'focus');
    });
  }

  function alterar<K extends keyof RascunhoSono>(campo: K, valor: RascunhoSono[K]) {
    setRascunho((anterior) => ({ ...anterior, [campo]: valor }));
    setErrosServidor({});
    if (!conflito) setErroGeral(null);
  }

  function alterarHorario(campo: Horario, parte: 'data' | 'hora', texto: string) {
    alterar(campo, { ...rascunho[campo], [parte]: texto, offset: null });
  }

  async function executar(acao: (signal: AbortSignal) => Promise<void>) {
    if (operacao.current) return;
    const atual = new AbortController();
    operacao.current = atual;
    setOcupado(true);
    setErroGeral(null);
    setErrosServidor({});
    try {
      await acao(atual.signal);
    } catch (falha) {
      if (!atual.signal.aborted) {
        const texto = mensagem(falha);
        const campo = falha instanceof ErroApi && falha.status === 422 ? campoDaApi(falha.campo) : undefined;
        if (campo) {
          setErrosServidor({ [campo]: texto });
          focalizar(campo);
        } else setErroGeral(texto);
        if (falha instanceof ErroApi) {
          if (inicial && falha.codigo === 'VERSAO_CONFLITANTE') {
            setVersaoAtual(null);
            setConflito(true);
          }
          if (!inicial && falha.status !== null && falha.status < 500 && falha.status !== 401 && falha.status !== 403) {
            setCriacaoPendente(false);
          }
        }
      }
    } finally {
      operacao.current = null;
      if (!atual.signal.aborted) setOcupado(false);
    }
  }

  function salvar() {
    if (operacao.current || conflito || salva) return;
    const atual = validarRascunho(rascunho);
    const dados = criacaoPendente ? tentativa.current?.dados : atual.dados;
    if (!dados) {
      setExibirErros(true);
      focalizar(camposParaRevisar.find((campo) => atual.erros[campo]));
      return;
    }
    Keyboard.dismiss();
    void executar(async (signal) => {
      if (inicial && versao !== undefined) {
        const resultado = await editarSono(inicial.id, versao, dados, signal);
        if (!signal.aborted) setSalva(resultado.id);
        return;
      }

      const id = tentativa.current?.id ?? randomUUID();
      tentativa.current = { id, dados };
      const resultado = await salvarNovaNoite(id, dados, criacaoPendente, signal);
      if (signal.aborted) return;
      if (resultado.estado === 'salva') setSalva(resultado.registro.id);
      else setCriacaoPendente(true);
    });
  }

  function adotarVersao(registro: RegistroSono, preservar: boolean) {
    const atual = rascunhoInicial(registro);
    setBase(atual);
    if (!preservar) setRascunho(atual);
    setVersao(registro.versao);
    setVersaoAtual(null);
    setConflito(false);
    setErroGeral(null);
    setErrosServidor({});
    setExibirErros(false);
  }

  function verVersaoAtual() {
    if (!inicial) return;
    void executar(async (signal) => {
      const registro = await obterSono(inicial.id, signal);
      if (!signal.aborted) setVersaoAtual(registro);
    });
  }

  return (
    <Tela titulo={inicial ? 'Editar noite' : 'Registrar uma noite'} rolagemRef={rolagem}>
      <View onLayout={(e) => marcarPosicao(e, ['fuso'])}>
        <CampoDiario rotulo="Fuso horário" placeholder="America/Sao_Paulo" autoCapitalize="none" autoCorrect={false}
          editable={!bloqueado} value={rascunho.fuso} erro={erros.fuso} inputRef={(ref) => { referencias.current.fuso = ref; }}
          onChangeText={(fuso) => {
            setRascunho((anterior) => ({
              ...anterior, fuso, deitou: { ...anterior.deitou, offset: null },
              dormiu: { ...anterior.dormiu, offset: null }, acordou: { ...anterior.acordou, offset: null },
            }));
            setErrosServidor({});
          }} />
      </View>

      {horarios.map((campo) => {
        const data = `${campo}.data` as const;
        const hora = `${campo}.hora` as const;
        const escolhas = validacao.offsets[campo];
        return (
          <View key={campo} onLayout={(e) => marcarPosicao(e, [data, hora])}>
            <BlocoDiario titulo={rotulosHorario[campo]}>
              <View style={[css.camposHorario, horariosEmLinha && css.linha]}>
                <View style={[css.campoHorario, horariosEmLinha && css.campoEmLinha]}>
                  <CampoData rotulo="Data" accessibilityLabel={`${rotulosHorario[campo]} — data`} testID={data}
                    editable={!bloqueado} value={rascunho[campo].data}
                    erro={erros[data]} inputRef={(ref) => { referencias.current[data] = ref; }}
                    onChangeText={(texto) => alterarHorario(campo, 'data', texto)} />
                </View>
                <View style={[css.campoHorario, horariosEmLinha && css.campoEmLinha]}>
                  <CampoDiario rotulo="Hora" accessibilityLabel={`${rotulosHorario[campo]} — hora`} testID={hora}
                    placeholder="HH:MM" keyboardType="number-pad" editable={!bloqueado} value={rascunho[campo].hora}
                    erro={erros[hora]} inputRef={(ref) => { referencias.current[hora] = ref; }}
                    onChangeText={(texto) => alterarHorario(campo, 'hora', mascaraHora(texto))} />
                </View>
              </View>
              {escolhas.length > 1 && (
                <OpcoesDiario rotulo="Ocorrência do horário" valor={rascunho[campo].offset} desabilitado={bloqueado}
                  opcoes={escolhas.map((valor, i) => ({ valor, texto: `${i + 1}ª · UTC${valor}` }))}
                  alterar={(offset) => alterar(campo, { ...rascunho[campo], offset })} />
              )}
            </BlocoDiario>
          </View>
        );
      })}

      {validacao.estimativa !== null && (
        <BlocoDiario>
          <Text style={[tipografia.subtitulo, { color: paleta.texto }]} accessibilityLiveRegion="polite">
            {formatarDuracao(validacao.estimativa)} de sono estimado
          </Text>
          {rascunho.minutosAcordado === '' && <Texto>Intervalo sem desconto informado de minutos acordados.</Texto>}
        </BlocoDiario>
      )}

      <View onLayout={(e) => marcarPosicao(e, ['qualidade'])}>
        <OpcoesDiario rotulo="Qualidade do sono" valor={rascunho.qualidade} desabilitado={bloqueado} opcoes={opcoesEscala} primeiraOpcaoRef={primeiraQualidade}
          alterar={(valor) => alterar('qualidade', valor)} legenda="1 muito ruim · 5 muito boa" erro={erros.qualidade} />
      </View>

      <View style={css.complementos} onLayout={(e) => marcarPosicao(e, opcionais)}>
        <Botao titulo={mostrarComplementos ? 'Ocultar complementos' : 'Complementos opcionais'} secundario
          onPress={() => setMostrarComplementos(!mostrarComplementos)} />
        {mostrarComplementos && (
          <BlocoDiario>
            <CampoDiario rotulo="Minutos acordado" keyboardType="number-pad" value={rascunho.minutosAcordado} editable={!bloqueado}
              erro={erros.minutosAcordado} inputRef={(ref) => { referencias.current.minutosAcordado = ref; }}
              onChangeText={(valor) => alterar('minutosAcordado', valor)} />
            <CampoDiario rotulo="Despertares" keyboardType="number-pad" value={rascunho.despertares} editable={!bloqueado}
              erro={erros.despertares} inputRef={(ref) => { referencias.current.despertares = ref; }}
              onChangeText={(valor) => alterar('despertares', valor)} />
            <OpcoesDiario rotulo="Como você acordou?" valor={rascunho.humor} opcoes={[semResposta, ...opcoesEscala]} desabilitado={bloqueado}
              legenda={`1 ${escalas.humor[0].toLowerCase()} · 5 ${escalas.humor[4].toLowerCase()}`} erro={erros.humor}
              alterar={(valor) => alterar('humor', valor)} />
            <OpcoesDiario rotulo="Quanto cansaço sentiu durante o dia?" valor={rascunho.cansaco} opcoes={[semResposta, ...opcoesEscala]} desabilitado={bloqueado}
              legenda={`1 ${escalas.cansaco[0].toLowerCase()} · 5 ${escalas.cansaco[4].toLowerCase()}`} erro={erros.cansaco}
              alterar={(valor) => alterar('cansaco', valor)} />
            {(Object.keys(rotulosFatores) as Array<keyof typeof rotulosFatores>).map((fator) => (
              <OpcoesDiario key={fator} rotulo={rotulosFatores[fator]} valor={rascunho.fatores[fator]} opcoes={valoresFator}
                desabilitado={bloqueado} alterar={(valor) => alterar('fatores', { ...rascunho.fatores, [fator]: valor })} />
            ))}
            {erros.fatores && <Texto erro>{erros.fatores}</Texto>}
            <CampoDiario rotulo="Sonhos e anotações" multiline value={rascunho.sonho} editable={!bloqueado} erro={erros.sonho}
              inputRef={(ref) => { referencias.current.sonho = ref; }} onChangeText={(valor) => alterar('sonho', valor)} />
          </BlocoDiario>
        )}
      </View>

      {erroGeral && <Texto erro>{erroGeral}</Texto>}
      {criacaoPendente && <Texto erro>Ainda não foi possível confirmar se a noite foi salva. Verifique antes de reenviar o mesmo registro.</Texto>}
      {conflito && (
        <BlocoDiario titulo="O registro foi alterado">
          <Texto>Seu rascunho está neste formulário. Confira a versão atual antes de decidir o que salvar.</Texto>
          {versaoAtual ? (
            <>
              <Texto>Versão atual · {formatarData(versaoAtual.dataLocal)} · {formatarDuracao(versaoAtual.duracaoEstimadaMin)}</Texto>
              <Botao titulo="Manter meu rascunho" secundario onPress={() => Alert.alert('Manter o rascunho?',
                'Ao salvar, os campos do rascunho substituirão os campos da versão atual.', [
                  { text: 'Cancelar', style: 'cancel' }, { text: 'Manter rascunho', onPress: () => adotarVersao(versaoAtual, true) },
                ])} />
              <Botao titulo="Carregar dados atuais" secundario onPress={() => Alert.alert('Descartar alterações?',
                'O formulário será preenchido com a versão atual do registro.', [
                  { text: 'Cancelar', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: () => adotarVersao(versaoAtual, false) },
                ])} />
            </>
          ) : <Botao titulo="Consultar versão atual" secundario desabilitado={ocupado} onPress={verVersaoAtual} />}
        </BlocoDiario>
      )}
      <Botao titulo={ocupado ? 'Aguarde…' : criacaoPendente ? 'Verificar e tentar novamente' : inicial ? 'Salvar alterações' : 'Salvar noite'}
        desabilitado={ocupado || conflito || salva !== null} onPress={salvar} />
    </Tela>
  );
}

const css = StyleSheet.create({
  camposHorario: { gap: espacos.md },
  linha: { flexDirection: 'row' },
  campoHorario: { minWidth: 0 },
  campoEmLinha: { flex: 1 },
  complementos: { gap: espacos.md },
});
