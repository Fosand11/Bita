import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Anuncia un mensaje a los lectores de pantalla (VoiceOver en iOS, TalkBack en Android).
 * Se usa tras completar acciones clave como:
 * - Toma de medicamento marcada ("Toma registrada correctamente").
 * - Toma omitida ("Toma omitida").
 * - Documento procesado ("Documento procesado. Datos listos para revisión").
 * - Documento guardado ("Documento guardado en el historial de salud").
 * - Campo confirmado ("Campo verificado").
 */
export function announceAccessibility(message: string): void {
  if (Platform.OS === 'web') return;
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Silencioso si falla
  }
}

