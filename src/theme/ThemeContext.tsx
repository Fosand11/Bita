import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BitaTheme, createBitaTheme, ThemeVariant } from './tokens';

interface ThemeContextValue {
  theme: BitaTheme;
  variant: ThemeVariant;
  setVariant: (nextVariant: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialVariant?: ThemeVariant;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialVariant = 'cream',
}) => {
  const [variant, setVariantState] = useState<ThemeVariant>(initialVariant);

  const setVariant = useCallback((nextVariant: ThemeVariant) => {
    setVariantState(nextVariant);
  }, []);

  const theme = useMemo(() => createBitaTheme(variant), [variant]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({ theme, variant, setVariant }),
    [theme, variant, setVariant]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {/* Apariencia clara: iconos de la barra de estado oscuros. */}
      <StatusBar style="dark" />
      {children}
    </ThemeContext.Provider>
  );
};

export function useBitaTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useBitaTheme debe utilizarse dentro de un <ThemeProvider>');
  }
  return context;
}
