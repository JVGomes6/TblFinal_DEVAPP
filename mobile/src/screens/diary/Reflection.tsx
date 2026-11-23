import { Temporal } from '@js-temporal/polyfill';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { BlocoDiario, OpcoesDiario } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useErroDiario } from '../../hooks/useSleepList';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { ErroApi } from '../../services/api';
import { gerarCartao, obterPrevia } from '../../services/reflection';
import type { CartaoReflexao, FocoReflexao, PedidoPrevia, PreviaReflexao } from '../../services/reflection';
import type { PeriodoSono } from '../../services/reports';
import { espacos } from '../../theme/spacing';
import { tipografia } from '../../theme/typography';
import { periodoDeSeteDias } from '../../utils/periodoSono';
import { formatarData, interpretarData } from '../../utils/sleepForm';

const focos = [
  { valor: 'rotina', texto: 'Rotina' },
  { valor: 'humor', texto: 'Humor' },
  { valor: 'descanso', texto: 'Descanso' },
] as const;
const nomesDaOrigem = { gemini: 'Google Gemini' } as const;

type Consulta = { pedido: PedidoPrevia; periodo: PeriodoSono; previa: PreviaReflexao };
type EstadoReflexao =
  | { tipo: 'edicao'; erro?: string; desatualizada?: boolean }
  | { tipo: 'consultando' }
  | { tipo: 'previa'; consulta: Consulta; erro?: string }
  | { tipo: 'gerando' }
  | { tipo: 'cartao'; cartao: CartaoReflexao; periodo: PeriodoSono };

const edicao: EstadoReflexao = { tipo: 'edicao' };

export function Reflection({ navigation }: NativeStackScreenProps<RootStackParamList, 'Reflection'>) {
  const { paleta } = usePreferences();
  const mensagemDeErro = useErroDiario();
  const [foco, setFoco] = useState<FocoReflexao>('rotina');
  const [data, setData] = useState(() => formatarData(Temporal.Now.plainDateISO().toString()));
  const [erroData, setErroData] = useState<string>();
  const [estado, setEstado] = useState<EstadoReflexao>(edicao);
  const operacao = useRef<AbortController | null>(null);
  const ocupado = estado.tipo === 'consultando' || estado.tipo === 'gerando';

  useFocusEffect(useCallback(() => {
    const cancelar = () => {
      operacao.current?.abort();
      operacao.current = null;
    };
    const reporEdicaoSeOcupado = () => setEstado((anterior) =>
      anterior.tipo === 'gerando' || anterior.tipo === 'consultando' ? edicao : anterior);

    reporEdicaoSeOcupado();
    const assinatura = AppState.addEventListener('change', (status) => {
      if (status === 'background') {
        cancelar();
        reporEdicaoSeOcupado();
      }
    });
    return () => {
      cancelar();
      assinatura.remove();
    };
  }, []));

  async function executar(acao: (signal: AbortSignal) => Promise<void>, aoFalhar: (erro: unknown) => void) {
    if (operacao.current) return;
    const controle = new AbortController();
    operacao.current = controle;
    try {
      await acao(controle.signal);
    } catch (erro) {
      if (!controle.signal.aborted) aoFalhar(erro);
    } finally {
      if (operacao.current === controle) operacao.current = null;
    }
  }

  function consultar() {
    const ate = interpretarData(data);
    if (!ate) {
      setErroData('Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    Keyboard.dismiss();
    const pedido = { foco, ate };
    const periodo = periodoDeSeteDias(Temporal.PlainDate.from(ate));
    void executar(async (signal) => {
      setEstado({ tipo: 'consultando' });
      const previa = await obterPrevia(pedido, signal);
      if (!signal.aborted) setEstado({ tipo: 'previa', consulta: { pedido, periodo, previa } });
    }, (erro) => setEstado({ tipo: 'edicao', erro: mensagemDeErro(erro) }));
  }

  function autorizar() {
    if (estado.tipo !== 'previa') return;
    const { consulta } = estado;
    void executar(async (signal) => {
      setEstado({ tipo: 'gerando' });
      const cartao = await gerarCartao(consulta.pedido, consulta.previa.hashPrevia, signal);
      if (!signal.aborted) setEstado({ tipo: 'cartao', cartao, periodo: consulta.periodo });
    }, (erro) => {
      if (erro instanceof ErroApi && erro.status === 409) {
        setEstado({ tipo: 'edicao', desatualizada: true, erro: 'Os dados da prévia mudaram. Confira uma nova prévia e autorize o envio novamente.' });
        return;
      }
      const mensagem = mensagemDeErro(erro);
      if (erro instanceof ErroApi && (erro.status === 401 || erro.codigo === 'CONSENTIMENTO_NECESSARIO')) {
        setEstado({ tipo: 'edicao', erro: mensagem });
        return;
      }
      setEstado({ tipo: 'previa', consulta, erro: mensagem });
    });
  }

  if (estado.tipo === 'cartao') {
    const { cartao, periodo } = estado;
    return <Resultado key="cartao" cartao={cartao} periodo={periodo} outroCartao={() => setEstado(edicao)}
      abrirHistorico={() => navigation.push('History', { periodo })} />;
  }

  return (
    <Tela key="preparacao" titulo="Cartão de reflexão">
      <Texto>A geração é opcional. Escolha um assunto e confira os dados da prévia antes de decidir se quer enviar.</Texto>
      <BlocoDiario>
        <OpcoesDiario rotulo="Foco" valor={foco} opcoes={focos} desabilitado={ocupado} alterar={(valor) => {
          if (valor === foco) return;
          setFoco(valor);
          setEstado(edicao);
        }} />
        <CampoData rotulo="Data final" value={data}
          erro={erroData} editable={!ocupado} onChangeText={(valor) => {
            if (valor === data) return;
            setData(valor);
            setErroData(undefined);
            setEstado(edicao);
          }} />
        <Texto>A prévia considera até sete dias, incluindo a data final escolhida.</Texto>
      </BlocoDiario>
      {ocupado && (
        <View style={css.aguarde} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
          <ActivityIndicator color={paleta.primario} />
          <Texto>{estado.tipo === 'gerando' ? 'Gerando cartão…' : 'Consultando prévia…'}</Texto>
        </View>
      )}
      {estado.tipo === 'edicao' && (
        <>
          {estado.erro && <Texto erro>{estado.erro}</Texto>}
          <Botao titulo={estado.desatualizada ? 'Consultar nova prévia' : 'Consultar prévia'} onPress={consultar} />
        </>
      )}
      {estado.tipo === 'previa' && (
        <Previa consulta={estado.consulta} erro={estado.erro} autorizar={autorizar} voltar={() => navigation.goBack()} />
      )}
    </Tela>
  );
}

function Previa({ consulta, erro, autorizar, voltar }: {
  consulta: Consulta; erro?: string; autorizar: () => void; voltar: () => void;
}) {
  const { paleta } = usePreferences();
  const { previa, periodo } = consulta;
  const { noites } = previa;

  return (
    <BlocoDiario titulo="Prévia de envio">
      <Texto>Serviço externo · {previa.provedor}</Texto>
      <Texto>{formatarData(periodo.de)} a {formatarData(periodo.ate)}</Texto>
      <Texto>{noites} {noites === 1 ? 'noite registrada' : 'noites registradas'}. A contagem aparece só no app.</Texto>
      {noites === 0 && <Texto>O período está vazio. Se quiser gerar um cartão, ele trará uma pergunta para começar a observar suas noites.</Texto>}
      <Texto>Este é o texto exato do contexto que será enviado.</Texto>
      <Text selectable style={[tipografia.corpo, css.contexto, { color: paleta.texto, borderColor: paleta.borda }]}>
        {previa.texto}
      </Text>
      {erro && <><Texto erro>{erro}</Texto><Texto>Para tentar novamente, confira a prévia e autorize o envio abaixo.</Texto></>}
      <Botao titulo="Autorizar e gerar este cartão" onPress={autorizar} />
      <Botao titulo="Voltar sem enviar" secundario onPress={voltar} />
    </BlocoDiario>
  );
}

function Resultado({ cartao, periodo, abrirHistorico, outroCartao }: {
  cartao: CartaoReflexao; periodo: PeriodoSono; abrirHistorico: () => void; outroCartao: () => void;
}) {
  const [pulou, setPulou] = useState(false);

  return (
    <Tela titulo="Seu cartão">
      <Texto>Origem · {nomesDaOrigem[cartao.origem]}</Texto>
      <BlocoDiario>
        <Texto>{cartao.abertura}</Texto>
        {pulou ? <Texto>Pergunta pulada.</Texto> : (
          <>
            <Texto>{cartao.pergunta}</Texto>
            <Botao titulo="Pular pergunta" secundario onPress={() => setPulou(true)} />
          </>
        )}
        <Texto>{cartao.fecho}</Texto>
      </BlocoDiario>
      <BlocoDiario titulo="De onde veio esta observação?">
        <Texto>{cartao.observacaoLocal}</Texto>
        <Texto>{formatarData(periodo.de)} a {formatarData(periodo.ate)}</Texto>
        <Botao titulo="Abrir histórico deste período" secundario onPress={abrirHistorico} />
      </BlocoDiario>
      <Botao titulo="Preparar outro cartão" secundario onPress={outroCartao} />
    </Tela>
  );
}

const css = StyleSheet.create({
  aguarde: { flexDirection: 'row', alignItems: 'center', gap: espacos.sm },
  contexto: { borderWidth: 1, borderRadius: 8, padding: espacos.md, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
