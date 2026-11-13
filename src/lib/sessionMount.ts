import { useRef } from 'react';

// Conjunto en memoria durante el ciclo de vida de la sesión de la app
const sessionMountedScreens = new Set<string>();

/**
 * Hook para controlar que las animaciones de entrada solo se ejecuten
 * la primera vez que una pantalla o sección se monta durante la sesión.
 *
 * Devuelve `true` si es el primer montaje de la sesión; `false` en navegaciones
 * posteriores a la misma pestaña o en re-renderizados.
 */
export function useFirstSessionMount(screenKey: string): boolean {
  const isFirstMount = useRef(!sessionMountedScreens.has(screenKey));

  if (isFirstMount.current) {
    sessionMountedScreens.add(screenKey);
  }

  return isFirstMount.current;
}

export function resetSessionMounts(): void {
  sessionMountedScreens.clear();
}

