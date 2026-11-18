import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useNightContext } from '../hooks/useNightContext';
import type { PerfilUsuario, Preferencias } from '../services/users';
import { cores } from '../theme/colors';
import type { ModoTema, Paleta } from '../theme/colors';
import { useAuth } from './AuthContext';

interface PreferencesValue extends Preferencias {
  modo: ModoTema;
  paleta: Paleta;
  ehNoite: boolean;
  atualizarPreferencias: (preferencias: Partial<Preferencias>) => Promise<PerfilUsuario>;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { estado, atualizarPreferencias } = useAuth();
  const ehNoite = useNightContext();
  const perfil = estado.status === 'autenticado' ? estado.usuario : null;
  const altoContraste = perfil?.altoContraste ?? false;
  const modo = altoContraste ? 'altoContraste' : ehNoite ? 'escuro' : 'claro';

  return (
    <PreferencesContext.Provider value={{
      modo, paleta: cores[modo], ehNoite, altoContraste, atualizarPreferencias,
      destaque: perfil?.destaque ?? 'duracao', metaMin: perfil?.metaMin ?? null,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesValue {
  const contexto = useContext(PreferencesContext);
  if (!contexto) throw new Error('usePreferences deve ser usado dentro de PreferencesProvider.');
  return contexto;
}
