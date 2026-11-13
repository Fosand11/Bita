import { useMemo } from 'react';
import {
  MEDICATION_INKS,
  MEDICATION_INK_LIST,
  MedicationInk,
  MedicationInkKey,
} from './colors';

/**
 * Función de hash polinomial ponderada por posición (genérica).
 * Evita colisiones entre cadenas con prefijos o sufijos comunes sin depender de nombres fijos.
 */
function hashString(input: string): number {
  let hash = input.length * 17;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash + input.charCodeAt(i) * (i + 1)) >>> 0;
  }
  return hash;
}

/**
 * Devuelve un color de tinta determinista a partir del identificador o nombre del medicamento,
 * o directamente por clave si coincide con una de las 6 tintas.
 */
export function getMedicationInk(idOrKey: string): MedicationInk {
  if (idOrKey in MEDICATION_INKS) {
    return MEDICATION_INKS[idOrKey as MedicationInkKey];
  }

  const normalized = idOrKey.trim().toLowerCase();
  if (!normalized) {
    return MEDICATION_INK_LIST[0];
  }

  const index = hashString(normalized) % MEDICATION_INK_LIST.length;
  return MEDICATION_INK_LIST[index];
}

/**
 * Hook que asigna y memoriza el color de tinta fijo de un medicamento (por `id` o nombre).
 */
export function useMedicationInk(medicationIdOrKey: string): MedicationInk {
  return useMemo(() => getMedicationInk(medicationIdOrKey), [medicationIdOrKey]);
}
