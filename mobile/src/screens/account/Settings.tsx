import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { AccessibilityInfo, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import type { TextInput } from 'react-native';
import { BlocoDiario, CampoDiario, OpcoesDiario } from '../../components/DiarioFields';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Botao, Tela, Texto, useAcaoDaTela } from '../../navigation/FoundationScreens';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { Preferencias } from '../../services/users';
import { controleMinimo, espacos } from '../../theme/spacing';
import { tipografia } from '../../theme/typography';
import { formatarHorario, interpretarHorario } from '../../utils/horario';
import { mascaraHora } from '../../utils/sleepForm';

const opcoesDestaque: ReadonlyArray<{ valor: Preferencias['destaque']; texto: string }> = [
  { valor: 'duracao', texto: 'Duração' }, { valor: 'humor', texto: 'Humor' },
];

const confirmacoes = {
  revogar: {
    titulo: 'Revogar consentimento?',
    efeito: 'Suas noites e seu horário desejado serão apagados. Sua conta continuará disponível. Se você voltar a autorizar, começará com o diário vazio.',
    confirmar: 'Revogar e apagar diário',
  },
  excluir: {
    titulo: 'Excluir conta?',
    efeito: 'Seu cadastro, suas preferências e todas as noites serão apagados. A sessão será encerrada. Essa ação é definitiva.',
    confirmar: 'Excluir minha conta',
  },
} as const;

type AcaoDaConta = keyof typeof confirmacoes;

export function Settings({ navigation }: NativeStackScreenProps<RootStackParamList, 'Settings'>) {
  const { estado, sair, revogarConsentimento, excluirConta } = useAuth();
  const { altoContraste, destaque, metaMin, atualizarPreferencias, paleta } = usePreferences();
  const preferencias = useAcaoDaTela();
  const sessao = useAcaoDaTela();
  const [meta, setMeta] = useState('');
  const [erroMeta, setErroMeta] = useState<string>();
  const [confirmacao, setConfirmacao] = useState<string>();
  const [confirmacaoConta, setConfirmacaoConta] = useState<string>();
  const [acao, setAcao] = useState<AcaoDaConta | null>(null);
  const entradaMeta = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => { setMeta(metaMin === null ? '' : formatarHorario(metaMin)); }, [metaMin]);

  if (estado.status !== 'autenticado') return null;
  const { email, consentimento } = estado.usuario;
  const metaConfirmada = metaMin === null ? '' : formatarHorario(metaMin);
  const ocupado = preferencias.ocupado || sessao.ocupado;

  function persistir(alteracoes: Partial<Preferencias>, mensagem: string) {
    setConfirmacao(undefined);
    void preferencias.executar(async (signal) => {
      await atualizarPreferencias(alteracoes);
      if (!signal.aborted) setConfirmacao(mensagem);
    });
  }

  function salvarMeta() {
    const minutos = interpretarHorario(meta);
    if (minutos === null) {
      setErroMeta('Informe um horário entre 00:00 e 23:59.');
      requestAnimationFrame(() => {
        const entrada = entradaMeta.current;
        if (!entrada) return;
        entrada.focus();
        AccessibilityInfo.sendAccessibilityEvent(entrada, 'focus');
      });
      return;
    }
    Keyboard.dismiss();
    persistir({ metaMin: minutos }, 'Horário desejado salvo.');
  }

  return (
    <Tela titulo="Sua conta">
      <Texto>{email}</Texto>
      <BlocoDiario titulo="Preferências">
        <OpcoesDiario rotulo="Destaque na Home" valor={destaque} opcoes={opcoesDestaque} desabilitado={ocupado}
          alterar={(valor) => { if (valor !== destaque) persistir({ destaque: valor }, 'Destaque salvo.'); }} />
        <CampoDiario rotulo="Horário desejado para deitar" placeholder="HH:MM" keyboardType="number-pad" value={meta}
          editable={!ocupado} erro={erroMeta} inputRef={entradaMeta}
          onChangeText={(valor) => { setMeta(mascaraHora(valor)); setErroMeta(undefined); setConfirmacao(undefined); }} />
        <Botao titulo="Salvar horário" desabilitado={ocupado || meta === metaConfirmada} onPress={salvarMeta} />
        {metaMin !== null && (
          <Botao titulo="Remover horário" secundario desabilitado={ocupado} onPress={() => {
            setErroMeta(undefined);
            Keyboard.dismiss();
            persistir({ metaMin: null }, 'Horário desejado removido.');
          }} />
        )}
        <Pressable style={css.linha} accessibilityRole="switch" accessibilityLabel="Alto contraste"
          accessibilityState={{ checked: altoContraste, disabled: ocupado }} disabled={ocupado}
          onPress={() => persistir({ altoContraste: !altoContraste }, 'Preferência de contraste salva.')}>
          <Text style={[tipografia.rotulo, { color: paleta.texto, flex: 1 }]}>Alto contraste</Text>
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Switch value={altoContraste} trackColor={{ false: paleta.borda, true: paleta.primario }}
              thumbColor={altoContraste ? paleta.sobrePrimario : paleta.fundo} />
          </View>
        </Pressable>
        <View accessibilityLiveRegion="polite">
          {preferencias.ocupado && <Texto>Salvando preferência…</Texto>}
          {confirmacao && <Texto>{confirmacao}</Texto>}
          {preferencias.erro && <Texto erro>{preferencias.erro}</Texto>}
        </View>
      </BlocoDiario>
      <BlocoDiario titulo="Privacidade e dados">
        <Texto>{consentimento.ativo ? 'Consentimento do diário ativo.' : 'Diário sem autorização de armazenamento.'}</Texto>
        <View accessibilityLiveRegion="polite">{confirmacaoConta && <Texto>{confirmacaoConta}</Texto>}</View>
        {consentimento.ativo && <Botao titulo="Exportar relatório" secundario onPress={() => navigation.navigate('Report')} />}
        {consentimento.ativo
          ? <Botao titulo="Revogar consentimento" secundario desabilitado={ocupado} onPress={() => setAcao('revogar')} />
          : <Botao titulo="Revisar consentimento" desabilitado={ocupado} onPress={() => navigation.replace('Consent')} />}
        <Botao titulo="Privacidade" secundario onPress={() => navigation.navigate('Privacy')} />
        <Botao titulo="Excluir conta" secundario desabilitado={ocupado} onPress={() => setAcao('excluir')} />
      </BlocoDiario>
      {sessao.erro && <Texto erro>{sessao.erro}</Texto>}
      <Botao titulo="Sair da conta" secundario desabilitado={ocupado} onPress={() => { void sessao.executar(sair); }} />
      {acao && <ConfirmacaoDaConta key={acao} acao={acao} fechar={() => setAcao(null)}
        executarAcao={acao === 'revogar' ? revogarConsentimento : excluirConta} aoConfirmar={() => {
          setAcao(null);
          setConfirmacao(undefined);
          setErroMeta(undefined);
          if (acao === 'revogar') {
            setMeta('');
            setConfirmacaoConta('Consentimento revogado. Seu diário foi apagado e sua conta continua disponível.');
          }
        }} />}
    </Tela>
  );
}

function ConfirmacaoDaConta({ acao, fechar, executarAcao, aoConfirmar }: {
  acao: AcaoDaConta; fechar: () => void; executarAcao: (senha: string) => Promise<void>; aoConfirmar: () => void;
}) {
  const { paleta } = usePreferences();
  const { executar, erro, ocupado } = useAcaoDaTela();
  const [senha, setSenha] = useState('');
  const tituloRef = useRef<ComponentRef<typeof Text>>(null);
  const { titulo, efeito, confirmar } = confirmacoes[acao];

  function confirmarComSenha() {
    Keyboard.dismiss();
    void executar(async (signal) => {
      await executarAcao(senha);
      if (!signal.aborted) aoConfirmar();
    });
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={() => { if (!ocupado) fechar(); }}
      onShow={() => { if (tituloRef.current) AccessibilityInfo.sendAccessibilityEvent(tituloRef.current, 'focus'); }}>
      <KeyboardAvoidingView style={css.fundoModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={css.centralizar} keyboardShouldPersistTaps="handled">
          <View style={css.confirmacao} accessibilityViewIsModal>
            <BlocoDiario titulo={titulo} tituloRef={tituloRef}>
              <Texto>{efeito}</Texto>
              <CampoDiario rotulo="Senha atual" value={senha} onChangeText={setSenha} autoComplete="current-password"
                autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!ocupado} />
              {erro && <Texto erro>{erro}</Texto>}
              <Botao titulo={ocupado ? 'Aguarde…' : confirmar} desabilitado={ocupado || !senha} onPress={confirmarComSenha} />
              <Botao titulo="Cancelar" secundario desabilitado={ocupado} onPress={fechar} />
            </BlocoDiario>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const css = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center', minHeight: controleMinimo, gap: espacos.md },
  fundoModal: { flex: 1, backgroundColor: '#0009' },
  centralizar: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: espacos.xl },
  confirmacao: { width: '100%', maxWidth: 460 },
});
