import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { Consent, Home, Login, Privacy, Register, SessionStatus, Settings, Welcome } from './FoundationScreens';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Privacy: undefined;
  Consent: undefined;
  Home: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { estado } = useAuth();
  const { modo, paleta } = usePreferences();
  const escuro = modo !== 'claro';
  const base = escuro ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: {
      ...base.colors,
      background: paleta.fundo,
      card: paleta.superficie,
      text: paleta.texto,
      border: paleta.borda,
      primary: paleta.primario,
      notification: paleta.erro,
    },
  };

  return (
    <>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <NavigationContainer theme={tema}>
        {estado.status === 'carregando' || estado.status === 'erro' ? (
          <SessionStatus />
        ) : (
          <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: paleta.fundo } }}>
            {estado.status === 'visitante' ? (
              <Stack.Group navigationKey="visitante">
                <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
                <Stack.Screen name="Login" component={Login} options={{ title: 'Entrar' }} />
                <Stack.Screen name="Register" component={Register} options={{ title: 'Criar conta' }} />
                <Stack.Screen name="Privacy" component={Privacy} options={{ title: 'Privacidade' }} />
              </Stack.Group>
            ) : (
              <Stack.Group navigationKey={`${estado.usuario.id}:${estado.revisao}:${estado.usuario.consentimento.ativo}`}>
                {estado.usuario.consentimento.ativo ? (
                  <Stack.Screen name="Home" component={Home} options={{ title: 'EntreNoites' }} />
                ) : (
                  <Stack.Screen name="Consent" component={Consent} options={{ title: 'Consentimento' }} />
                )}
                <Stack.Screen name="Settings" component={Settings} options={{ title: 'Configurações' }} />
                <Stack.Screen name="Privacy" component={Privacy} options={{ title: 'Privacidade' }} />
              </Stack.Group>
            )}
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </>
  );
}
