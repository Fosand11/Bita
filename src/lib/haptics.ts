import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Helper central de háptica para Bita.
 * Solo 3 patrones funcionales autorizados:
 * 1. Éxito: marcar toma como tomada, guardar documento.
 * 2. Ligera: omitir toma.
 * 3. Selección: cambiar de perfil, confirmar campo en revisión.
 *
 * No se debe disparar háptica en toques arbitrarios o de navegación común.
 */

export async function hapticSuccess(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Ignorar si el dispositivo no soporta háptica
  }
}

export async function hapticLight(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Ignorar
  }
}

export async function hapticSelection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    // Ignorar
  }
}

