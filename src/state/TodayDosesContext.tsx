import React, { createContext, useContext, useMemo, useState } from 'react';
import { DoseStatus } from '../components/ui/DoseActionButton';

interface TodayDosesContextValue {
  /** Estado de la toma destacada de hoy ("Próxima toma"). */
  featuredDoseStatus: DoseStatus;
  setFeaturedDoseStatus: (status: DoseStatus) => void;
}

const TodayDosesContext = createContext<TodayDosesContextValue | undefined>(undefined);

/**
 * Eleva a contexto el `useState<DoseStatus>('pending')` que antes vivía local en Mis Medicinas,
 * para que el resumen del día del Historial lea el mismo estado. Los datos siguen siendo en memoria.
 */
export const TodayDosesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [featuredDoseStatus, setFeaturedDoseStatus] = useState<DoseStatus>('pending');

  const value = useMemo<TodayDosesContextValue>(
    () => ({ featuredDoseStatus, setFeaturedDoseStatus }),
    [featuredDoseStatus]
  );

  return <TodayDosesContext.Provider value={value}>{children}</TodayDosesContext.Provider>;
};

export function useTodayDoses(): TodayDosesContextValue {
  const context = useContext(TodayDosesContext);
  if (!context) {
    throw new Error('useTodayDoses debe utilizarse dentro de un <TodayDosesProvider>');
  }
  return context;
}

