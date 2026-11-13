import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AsapSharp_400Regular,
  AsapSharp_500Medium,
  AsapSharp_600SemiBold,
} from '@expo-google-fonts/asap-sharp';
import { BORDERS, ThemeProvider, useBitaTheme } from '../theme';
import { AuthProvider, useAuth } from '../state/AuthContext';
import { ProfileProvider } from '../state/ProfileContext';
import { TodayDosesProvider } from '../state/TodayDosesContext';
import { HealthLogProvider } from '../state/HealthLogContext';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { theme } = useBitaTheme();
  const { colors } = theme;
  const { isAuthenticated, isLoading } = useAuth();
  console.log('[AUTH DEBUG] RootNavigator render', { isAuthenticated, isLoading });

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  const stack = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'none',
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="prescription" options={{ animation: 'none' }} />
        </>
      ) : (
        <Stack.Screen name="login" options={{ headerShown: false }} />
      )}
    </Stack>
  );

  // Previsualización en el navegador del Mac: la app se muestra dentro de un marco vertical de celular.
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webBackdrop, { backgroundColor: colors.webBackdrop }]}>
        <View
          style={[
            styles.webMobileFrame,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          {stack}
        </View>
      </View>
    );
  }

  return stack;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    AsapSharp_400Regular,
    AsapSharp_500Medium,
    AsapSharp_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialVariant="cream">
        <AuthProvider>
          <ProfileProvider>
            <TodayDosesProvider>
              <HealthLogProvider>
                <RootNavigator />
              </HealthLogProvider>
            </TodayDosesProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webMobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    maxHeight: 932,
    borderLeftWidth: BORDERS.width,
    borderRightWidth: BORDERS.width,
    overflow: 'hidden',
  },
});
