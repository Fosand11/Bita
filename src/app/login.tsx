import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, useBitaTheme } from '../theme';
import { BitaButton, BitaCard, BitaInput } from '../components/ui';
import { useAuth, isAuthError } from '../state/AuthContext';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;
  const { login, register } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setErrorMessage(undefined);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (error) {
      if (isAuthError(error)) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('No se pudo conectar con el servidor. Verifica tu conexión.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1, justifyContent: 'center' }}
        >
          <View style={{ gap: spacing.xxs, marginBottom: spacing.md }}>
            <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
              {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              {mode === 'login'
                ? 'Accede a tu bitácora de salud.'
                : 'Guarda tus recetas y las de tu familia en un solo lugar.'}
            </Text>
          </View>

          <BitaCard variant="base">
            <View style={{ gap: spacing.sm }}>
              {mode === 'register' ? (
                <BitaInput label="Nombre" value={name} onChangeText={setName} autoCapitalize="words" />
              ) : null}
              <BitaInput
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <BitaInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                errorMessage={errorMessage}
              />

              <BitaButton
                label={mode === 'login' ? 'Entrar' : 'Registrarme'}
                onPress={handleSubmit}
                loading={isSubmitting}
                disabled={!email || !password || (mode === 'register' && !name)}
                style={{ marginTop: spacing.xs }}
              />
              <BitaButton
                variant="secondary"
                label={mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
                onPress={() => {
                  setErrorMessage(undefined);
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
              />
            </View>
          </BitaCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
