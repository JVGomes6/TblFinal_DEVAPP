import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef, ReactNode, Ref } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mensagemDaSolicitacao, useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { cadastrar } from '../services/users';
import type { Credenciais } from '../services/users';
import { controleMinimo, espacos } from '../theme/spacing';
import { tipografia } from '../theme/typography';
import type { RootStackParamList } from './RootNavigator';

type Props<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export function Tela({ titulo, children, semCabecalho = false, rolagemRef, larguraMaxima = 520 }: {
  titulo: string; children: ReactNode; semCabecalho?: boolean; rolagemRef?: Ref<ComponentRef<typeof ScrollView>>; larguraMaxima?: number;
}) {
  const { paleta } = usePreferences();
  return (
    <SafeAreaView style={[css.tela, { backgroundColor: paleta.fundo }]} edges={semCabecalho ? ['top', 'bottom', 'left', 'right'] : ['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={css.tela} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={rolagemRef} keyboardShouldPersistTaps="handled" contentContainerStyle={css.rolagem}>
          <View style={[css.conteudo, { maxWidth: larguraMaxima }]}>
            <Text accessibilityRole="header" style={[tipografia.titulo, { color: paleta.texto }]}>{titulo}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Texto({ children, erro = false }: { children: ReactNode; erro?: boolean }) {
  const { paleta } = usePreferences();
  return (
    <Text accessibilityRole={erro ? 'alert' : undefined} accessibilityLiveRegion={erro ? 'polite' : 'none'}
      style={[tipografia.corpo, { color: erro ? paleta.erro : paleta.textoSecundario }]}>
      {children}
    </Text>
  );
}

export function Botao({ titulo, onPress, secundario = false, desabilitado = false }: {
  titulo: string;
  onPress: () => void;
  secundario?: boolean;
  desabilitado?: boolean;
}) {
  const { paleta } = usePreferences();
  const preenchido = !secundario && !desabilitado;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: desabilitado }} disabled={desabilitado} onPress={onPress}
      style={({ pressed }) => [css.botao, {
        backgroundColor: preenchido ? paleta.primario : pressed ? paleta.superficie : paleta.fundo,
        borderColor: desabilitado ? paleta.borda : paleta.primario,
        opacity: pressed && preenchido ? 0.86 : 1,
      }]}>
      <Text style={[tipografia.rotulo, css.textoCentral, { color: preenchido ? paleta.sobrePrimario : desabilitado ? paleta.textoSecundario : paleta.primario }]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

export function useAcaoDaTela() {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const acaoAtiva = useRef<AbortController | null>(null);
  useEffect(() => () => { acaoAtiva.current?.abort(); }, []);

  async function executar(acao: (signal: AbortSignal) => Promise<unknown>) {
    if (acaoAtiva.current) return;
    const controlador = new AbortController();
    acaoAtiva.current = controlador;
    setErro(null);
    setOcupado(true);
    try {
      await acao(controlador.signal);
    } catch (falha) {
      if (!controlador.signal.aborted) setErro(mensagemDaSolicitacao(falha));
    } finally {
      acaoAtiva.current = null;
      if (!controlador.signal.aborted) setOcupado(false);
    }
  }

  return { executar, erro, ocupado };
}

export function SessionStatus() {
  const { estado, tentarRestaurar } = useAuth();
  const { paleta } = usePreferences();
  return (
    <Tela titulo="EntreNoites" semCabecalho>
      {estado.status === 'erro' ? (
        <>
          <Texto erro>{estado.mensagem}</Texto>
          <Botao titulo="Tentar novamente" onPress={tentarRestaurar} />
        </>
      ) : (
        <View style={css.linha} accessibilityState={{ busy: true }}>
          <ActivityIndicator color={paleta.primario} />
          <Texto>Verificando sessão…</Texto>
        </View>
      )}
    </Tela>
  );
}

export function Welcome({ navigation }: Props<'Welcome'>) {
  return (
    <Tela titulo="EntreNoites" semCabecalho>
      <Texto>Seu diário de sono e descanso.</Texto>
      <Botao titulo="Entrar" onPress={() => navigation.navigate('Login')} />
      <Botao titulo="Criar conta" secundario onPress={() => navigation.navigate('Register')} />
      <Botao titulo="Privacidade" secundario onPress={() => navigation.navigate('Privacy')} />
    </Tela>
  );
}

function FormularioCredenciais({ cadastro, enviar }: {
  cadastro: boolean;
  enviar: (credenciais: Credenciais, signal: AbortSignal) => Promise<void>;
}) {
  const { paleta } = usePreferences();
  const { executar, erro, ocupado } = useAcaoDaTela();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const estiloCampo = [css.campo, tipografia.corpo, { color: paleta.texto, backgroundColor: paleta.superficie, borderColor: paleta.borda }];

  return (
    <Tela titulo={cadastro ? 'Sua conta' : 'Acesse seu diário'}>
      <View style={css.grupoCampo}>
        <Text style={[tipografia.rotulo, { color: paleta.texto }]}>E-mail</Text>
        <TextInput accessibilityLabel="E-mail" style={estiloCampo} value={email} onChangeText={setEmail} keyboardType="email-address"
          autoComplete="email" autoCapitalize="none" autoCorrect={false} editable={!ocupado} />
      </View>
      <View style={css.grupoCampo}>
        <Text style={[tipografia.rotulo, { color: paleta.texto }]}>Senha</Text>
        <TextInput accessibilityLabel="Senha" style={estiloCampo} value={senha} onChangeText={setSenha} secureTextEntry={!mostrarSenha}
          autoComplete={cadastro ? 'new-password' : 'current-password'} autoCapitalize="none" autoCorrect={false} editable={!ocupado} />
        {cadastro && <Texto>Use de 12 a 128 caracteres.</Texto>}
        <Botao titulo={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} secundario onPress={() => setMostrarSenha(!mostrarSenha)} />
      </View>
      {erro && <Texto erro>{erro}</Texto>}
      <Botao titulo={ocupado ? 'Aguarde…' : cadastro ? 'Criar conta' : 'Entrar'} desabilitado={ocupado || !email.trim() || !senha}
        onPress={() => { void executar((signal) => enviar({ email: email.trim(), senha }, signal)); }} />
    </Tela>
  );
}

export function Login() {
  const { entrar } = useAuth();
  return <FormularioCredenciais cadastro={false} enviar={entrar} />;
}

export function Register({ navigation }: Props<'Register'>) {
  return <FormularioCredenciais cadastro enviar={async (dados, signal) => {
    await cadastrar(dados, signal);
    if (!signal.aborted) navigation.replace('Login');
  }} />;
}

export function Consent({ navigation }: Props<'Consent'>) {
  const { estado, aceitarConsentimento } = useAuth();
  const { paleta } = usePreferences();
  const { executar, erro, ocupado } = useAcaoDaTela();
  const [aceito, setAceito] = useState(false);
  if (estado.status !== 'autenticado') return null;
  const versao = estado.usuario.consentimento.versaoAtual;

  return (
    <Tela titulo="Ativar o diário">
      <Texto>Autorize o armazenamento dos dados de sono e dos campos opcionais que preencher para acompanhar sua rotina.</Texto>
      <Texto>Versão do termo {versao}</Texto>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: aceito, disabled: ocupado }} disabled={ocupado}
        onPress={() => setAceito(!aceito)} style={[css.botao, css.linha, { borderColor: paleta.borda }]}>
        <Text style={[tipografia.rotulo, { color: paleta.primario }]}>{aceito ? '☑' : '☐'}</Text>
        <Text style={[tipografia.rotulo, { color: paleta.texto, flexShrink: 1 }]}>Autorizo o armazenamento</Text>
      </Pressable>
      {erro && <Texto erro>{erro}</Texto>}
      <Botao titulo="Ativar diário" desabilitado={!aceito || ocupado} onPress={() => { void executar(() => aceitarConsentimento(versao)); }} />
      <Botao titulo="Agora não" secundario desabilitado={ocupado} onPress={() => navigation.replace('Settings')} />
      <Botao titulo="Privacidade" secundario onPress={() => navigation.navigate('Privacy')} />
    </Tela>
  );
}

const css = StyleSheet.create({
  tela: { flex: 1 },
  rolagem: { flexGrow: 1, padding: espacos.xl, alignItems: 'center' },
  conteudo: { width: '100%', gap: espacos.lg },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espacos.md },
  grupoCampo: { gap: espacos.sm },
  campo: { minHeight: controleMinimo, borderWidth: 1, borderRadius: 12, padding: espacos.md },
  botao: { minHeight: controleMinimo, paddingVertical: espacos.md, paddingHorizontal: espacos.lg,
    borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textoCentral: { textAlign: 'center' },
});
