import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { FloatingTabBar } from '../../components/ui';
import { useAuth } from '../../state/AuthContext';

/** Barra flotante de 4 ítems: Historial, Escanear, Mis Medicinas, Familia (orden definido en `FloatingTabBar`). */
export default function TabsLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  // Guardia explícita: el Stack raíz ya condiciona qué pantallas declara, pero
  // expo-router puede seguir resolviendo esta ruta por archivo si ya estaba activa.
  // Esto garantiza que (tabs) nunca se muestre sin sesión real.
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Historial' }} />
      <Tabs.Screen name="scan" options={{ title: 'Escanear' }} />
      <Tabs.Screen name="medications" options={{ title: 'Mis Medicinas' }} />
      <Tabs.Screen name="family" options={{ title: 'Familia' }} />
    </Tabs>
  );
}
