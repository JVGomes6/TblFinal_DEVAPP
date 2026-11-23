import { Temporal } from '@js-temporal/polyfill';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { CampoData } from '../../components/CampoData';
import { BlocoDiario, escalas, OpcoesDiario } from '../../components/DiarioFields';
import { usePreferences } from '../../context/PreferencesContext';
import { useErroDiario } from '../../hooks/useSleepList';
import { Botao, Tela, Texto } from '../../navigation/FoundationScreens';
import { compartilharRelatorioPdf, ErroDeExportacao, salvarPdfNoAndroid } from '../../services/reportPdf';
import { obterResumoSono } from '../../services/reports';
import type { PeriodoSono, ResumoDoPeriodo } from '../../services/reports';
import { espacos } from '../../theme/spacing';
import { periodoDeSeteDias, periodoDoMes } from '../../utils/periodoSono';
import { avisosDoRelatorio, descreverSpearman, formatarMinutosRelatorio, rotuloCobertura } from '../../utils/reportPresentation';
import { formatarData, interpretarData } from '../../utils/sleepForm';

const opcoes = [
  { valor: 'semana', texto: 'Últimos 7 dias' },
  { valor: 'mes', texto: 'Mês civil' },
  { valor: 'personalizado', texto: 'Personalizado' },
] as const;
type Selecao = typeof opcoes[number]['valor'];
type Atividade = 'consultando' | 'salvando' | 'compartilhando';
type Erros = { mes?: string; inicio?: string; fim?: string };

const acoesEmAndamento: Record<Atividade, string> = {
  consultando: 'Carregando prévia…', salvando: 'Preparando e salvando PDF…', compartilhando: 'Preparando PDF para compartilhar…',
};

export function Report() {
  const { paleta } = usePreferences();
  const erroDaApi = useErroDiario();
  const [selecao, setSelecao] = useState<Selecao>('semana');
  const [mes, setMes] = useState(() => {
    const data = Temporal.Now.plainDateISO().toString();
    return `${data.slice(5, 7)}/${data.slice(0, 4)}`;
  });
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [relatorio, setRelatorio] = useState<ResumoDoPeriodo | null>(null);
  const [mostrarLinhas, setMostrarLinhas] = useState(false);
  const [atividade, setAtividade] = useState<Atividade | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; erro?: boolean }>();
  const operacao = useRef<AbortController | null>(null);
  const android = Platform.OS === 'android';
  const semana = periodoDeSeteDias(Temporal.Now.plainDateISO());
  const periodoSugerido = selecao === 'semana' ? semana : selecao === 'mes' ? periodoDoMes(mes) : null;

  useFocusEffect(useCallback(() => {
    setAtividade(null);
    return () => {
      operacao.current?.abort();
      operacao.current = null;
    };
  }, []));

  function invalidar() {
    setErros({});
    setRelatorio(null);
    setMostrarLinhas(false);
    setMensagem(undefined);
  }

  function validarPeriodo(): PeriodoSono | null {
    if (periodoSugerido) return periodoSugerido;
    if (selecao === 'mes') {
      setErros({ mes: 'Informe um mês válido no formato MM/AAAA.' });
      return null;
    }
    const de = interpretarData(inicio);
    const ate = interpretarData(fim);
    if (!de || !ate) {
      const texto = 'Informe uma data válida no formato DD/MM/AAAA.';
      setErros({ inicio: de ? undefined : texto, fim: ate ? undefined : texto });
      return null;
    }
    const dias = Temporal.PlainDate.from(de).until(Temporal.PlainDate.from(ate)).days + 1;
    if (dias <= 0 || dias > 31) {
      setErros({ fim: dias <= 0 ? 'O fim precisa ser igual ou posterior ao início.' : 'Escolha um período de até 31 dias.' });
      return null;
    }
    return { de, ate };
  }

  async function executar(tipo: Atividade, acao: (signal: AbortSignal) => Promise<void>) {
    if (operacao.current) return;
    const atual = new AbortController();
    operacao.current = atual;
    setMensagem(undefined);
    setAtividade(tipo);
    try {
      await acao(atual.signal);
    } catch (falha) {
      if (atual.signal.aborted) return;
      const texto = tipo === 'consultando' ? erroDaApi(falha) : falha instanceof ErroDeExportacao ? falha.message :
        'Não foi possível preparar o PDF. Tente novamente.';
      setMensagem({ texto, erro: true });
    } finally {
      if (operacao.current === atual) {
        operacao.current = null;
        setAtividade(null);
      }
    }
  }

  function consultar() {
    if (operacao.current) return;
    const periodo = validarPeriodo();
    if (!periodo) return;
    Keyboard.dismiss();
    invalidar();
    void executar('consultando', async (signal) => {
      const resposta = await obterResumoSono(periodo, signal);
      if (!signal.aborted) setRelatorio(resposta);
    });
  }

  function exportar(acao: 'salvando' | 'compartilhando') {
    if (!relatorio?.noites) return;
    void executar(acao, async (signal) => {
      if (acao === 'compartilhando') {
        await compartilharRelatorioPdf(relatorio, signal);
        return;
      }
      const resultado = await salvarPdfNoAndroid(relatorio, signal);
      if (!signal.aborted) setMensagem({ texto: resultado === 'salvo' ? 'Arquivo salvo na pasta escolhida.' : 'Seleção da pasta cancelada.' });
    });
  }

  return (
    <Tela titulo="Relatório de sono">
      <BlocoDiario titulo="Período">
        <OpcoesDiario rotulo="Tipo de período" valor={selecao} opcoes={opcoes} desabilitado={atividade !== null} alterar={(valor) => {
          if (valor === selecao) return;
          setSelecao(valor);
          invalidar();
        }} />
        {selecao === 'mes' && <CampoData rotulo="Mês e ano" somenteMes value={mes} erro={erros.mes}
          editable={!atividade} onChangeText={(valor) => { setMes(valor); invalidar(); }} />}
        {selecao === 'personalizado' && (
          <>
            <CampoData rotulo="Data inicial" value={inicio} erro={erros.inicio} editable={!atividade}
              onChangeText={(valor) => { setInicio(valor); invalidar(); }} />
            <CampoData rotulo="Data final" value={fim} erro={erros.fim} editable={!atividade}
              onChangeText={(valor) => { setFim(valor); invalidar(); }} />
          </>
        )}
        {periodoSugerido && <Texto>{formatarData(periodoSugerido.de)} a {formatarData(periodoSugerido.ate)}</Texto>}
        <Botao titulo="Consultar prévia" desabilitado={atividade !== null} onPress={consultar} />
      </BlocoDiario>
      {relatorio && <Previa relatorio={relatorio} mostrarLinhas={mostrarLinhas} alternarLinhas={() => setMostrarLinhas(!mostrarLinhas)} />}
      {relatorio && relatorio.noites > 0 && (
        <BlocoDiario titulo="Exportar relatório">
          <Texto>{avisosDoRelatorio}</Texto>
          <Texto>{android ? 'Escolha uma pasta do aparelho para manter sua cópia.' : 'Na folha de compartilhamento, escolha Salvar em Arquivos para manter sua cópia.'}</Texto>
          {android && <Botao titulo="Salvar PDF" desabilitado={atividade !== null} onPress={() => exportar('salvando')} />}
          <Botao titulo={android ? 'Compartilhar PDF' : 'Salvar ou compartilhar PDF'} secundario={android} desabilitado={atividade !== null}
            onPress={() => exportar('compartilhando')} />
        </BlocoDiario>
      )}
      {atividade && <View style={css.aguarde} accessibilityLiveRegion="polite" accessibilityState={{ busy: true }}>
        <ActivityIndicator color={paleta.primario} /><Texto>{acoesEmAndamento[atividade]}</Texto>
      </View>}
      {mensagem && <View accessibilityLiveRegion="polite"><Texto erro={mensagem.erro}>{mensagem.texto}</Texto></View>}
    </Tela>
  );
}

function Previa({ relatorio, mostrarLinhas, alternarLinhas }: {
  relatorio: ResumoDoPeriodo; mostrarLinhas: boolean; alternarLinhas: () => void;
}) {
  const { de, ate, noites, diasPeriodo, mediaMin, mediaQualidade, porHumor, spearman, linhas, semDescontoInformado } = relatorio;
  const faltam = diasPeriodo - noites;
  return (
    <>
      <BlocoDiario titulo="Prévia do PDF">
        <Texto>{formatarData(de)} a {formatarData(ate)}</Texto>
        <Texto>{rotuloCobertura(noites, diasPeriodo)} · {noites} de {diasPeriodo} noites</Texto>
        <Texto>{faltam} {faltam === 1 ? 'dia' : 'dias'} sem registro</Texto>
        {mediaMin !== null && <Texto>Duração média estimada · {formatarMinutosRelatorio(mediaMin)}</Texto>}
        {mediaQualidade !== null && <Texto>Qualidade média · {mediaQualidade.toFixed(1).replace('.', ',')} de 5</Texto>}
        {semDescontoInformado > 0 && <Texto>Minutos acordados não informados em {semDescontoInformado} registro(s).</Texto>}
        {noites === 0 && <Texto>Escolha outro período para incluir noites no PDF.</Texto>}
      </BlocoDiario>
      <BlocoDiario titulo="Duração por humor">
        {porHumor.length === 0 && <Texto>Sem registros com humor informado.</Texto>}
        {porHumor.map(({ humor, n, mediaMin: media }) => (
          <Texto key={humor}>{escalas.humor[humor - 1]} · {n} {n === 1 ? 'noite' : 'noites'} · Média {formatarMinutosRelatorio(media)}</Texto>
        ))}
        <Texto>Spearman · {descreverSpearman(spearman)}</Texto>
        {linhas.length > 0 && <Botao titulo={mostrarLinhas ? 'Ocultar linhas do histórico' : 'Ver linhas do histórico'} secundario onPress={alternarLinhas} />}
        {mostrarLinhas && linhas.map(({ dataLocal, duracaoMin, qualidade, humor, despertares }) => (
          <Texto key={dataLocal}>{formatarData(dataLocal)} · {formatarMinutosRelatorio(duracaoMin)} · Qualidade {qualidade} de 5 · Humor {humor ?? 'não informado'} · Despertares {despertares ?? 'não informados'}</Texto>
        ))}
      </BlocoDiario>
    </>
  );
}

const css = StyleSheet.create({ aguarde: { flexDirection: 'row', alignItems: 'center', gap: espacos.sm } });
