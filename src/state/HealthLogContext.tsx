import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { ApiPrescription, HealthLogRecord, mapPrescriptionToRecord } from '../data/healthLog';
import { useProfile } from './ProfileContext';

interface HealthLogContextValue {
  records: readonly HealthLogRecord[];
  isLoading: boolean;
  getRecordById: (id?: string) => HealthLogRecord | undefined;
  /** Refresca la bitácora del perfil activo contra el backend (tras guardar una receta nueva). */
  refreshRecords: () => Promise<void>;
  /** Bandera local en memoria de consentimiento informado antes del primer escaneo. */
  hasAcceptedScanConsent: boolean;
  acceptScanConsent: () => void;
}

const HealthLogContext = createContext<HealthLogContextValue | undefined>(undefined);

/**
 * Bitácora de salud respaldada por la API real: carga las recetas procesadas del perfil
 * activo y las mapea a `HealthLogRecord`. Citas, resultados de laboratorio y "otros"
 * documentos aún no tienen tabla en el backend (ver alcance acordado), por lo que por ahora
 * la bitácora solo refleja recetas reales.
 */
export const HealthLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedProfileId } = useProfile();
  const [records, setRecords] = useState<readonly HealthLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAcceptedScanConsent, setHasAcceptedScanConsent] = useState<boolean>(false);

  const refreshRecords = useCallback(async () => {
    if (!selectedProfileId) {
      setRecords([]);
      return;
    }
    setIsLoading(true);
    try {
      const prescriptions = await api.get<ApiPrescription[]>(
        `/profiles/${selectedProfileId}/prescriptions`
      );
      const mapped = prescriptions
        .map((p) => mapPrescriptionToRecord(p, selectedProfileId))
        .filter((r): r is HealthLogRecord => r !== null)
        .sort((a, b) => b.dateIso.localeCompare(a.dateIso));
      setRecords(mapped);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    void refreshRecords();
  }, [refreshRecords]);

  const getRecordById = useCallback(
    (id?: string): HealthLogRecord | undefined => {
      if (!id) {
        return records[0];
      }
      return records.find((r) => r.id === id);
    },
    [records]
  );

  const acceptScanConsent = useCallback(() => {
    setHasAcceptedScanConsent(true);
  }, []);

  const value = useMemo<HealthLogContextValue>(
    () => ({
      records,
      isLoading,
      getRecordById,
      refreshRecords,
      hasAcceptedScanConsent,
      acceptScanConsent,
    }),
    [records, isLoading, getRecordById, refreshRecords, hasAcceptedScanConsent, acceptScanConsent]
  );

  return <HealthLogContext.Provider value={value}>{children}</HealthLogContext.Provider>;
};

export function useHealthLog(): HealthLogContextValue {
  const context = useContext(HealthLogContext);
  if (!context) {
    throw new Error('useHealthLog debe utilizarse dentro de un <HealthLogProvider>');
  }
  return context;
}
