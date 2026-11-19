import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { limparTemporariosDeRelatorios } from './src/services/reportPdf';

export default function App() {
  useEffect(() => { void limparTemporariosDeRelatorios(); }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PreferencesProvider>
          <RootNavigator />
        </PreferencesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
