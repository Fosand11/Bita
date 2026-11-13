import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SPACING, useBitaTheme } from '../../theme';
import {
  BitaButton,
  BitaCard,
  BitaInput,
  Icon,
  ScreenHeader,
  useFloatingTabBarInset,
} from '../../components/ui';
import { useProfile } from '../../state/ProfileContext';

/** Hub de Familia: lista los perfiles reales del usuario y permite crear nuevos. */
export default function FamilyScreen() {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const { profiles, selectedProfileId, setSelectedProfileId, createProfile, isLoading, error, refreshProfiles } =
    useProfile();
  const bottomInset = useFloatingTabBarInset();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelationship, setNewRelationship] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateProfile = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    setFormError(null);
    try {
      await createProfile(newName.trim(), newRelationship.trim() || undefined);
      setNewName('');
      setNewRelationship('');
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el perfil.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: bottomInset,
        }}
      >
        <ScreenHeader
          title="Familia"
          subtitle="Elige el expediente que quieres consultar"
        />

        <Text style={[typography.sectionHeader, styles.sectionTitle, { color: colors.textPrimary }]}>
          Perfiles
        </Text>

        {isLoading && profiles.length === 0 ? (
          <BitaCard variant="base" title="Cargando perfiles…" />
        ) : null}

        {error && !isLoading ? (
          <BitaCard variant="warning">
            <View style={{ gap: spacing.sm }}>
              <Text style={[typography.cardTitle, { color: colors.warning }]}>
                No se pudieron cargar tus perfiles
              </Text>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{error}</Text>
              <BitaButton variant="secondary" label="Reintentar" onPress={() => void refreshProfiles()} />
            </View>
          </BitaCard>
        ) : null}

        {profiles.map((profile) => {
          const isActive = profile.id === selectedProfileId;
          return (
            <BitaCard
              key={profile.id}
              variant={isActive ? 'highlighted' : 'base'}
              icon={profile.icon}
              inkKey={isActive ? 'celeste' : 'indigo'}
              title={profile.label}
              subtitle={isActive ? 'Perfil activo' : 'Toca para cambiar a este perfil'}
              onPress={() => setSelectedProfileId(profile.id)}
              accessibilityLabel={
                isActive
                  ? `${profile.label}, perfil activo`
                  : `Cambiar al perfil de ${profile.label}`
              }
              trailing={
                isActive ? (
                  <Icon
                    name="check-circle"
                    size={iconSizes.lg}
                    color={colors.primary}
                    weight="light"
                  />
                ) : undefined
              }
            />
          );
        })}

        {showForm ? (
          <BitaCard variant="base">
            <View style={{ gap: spacing.sm }}>
              <BitaInput label="Nombre" value={newName} onChangeText={setNewName} autoCapitalize="words" />
              <BitaInput
                label="Parentesco (opcional)"
                value={newRelationship}
                onChangeText={setNewRelationship}
                placeholder="Ej. Mamá, Papá, Hijo"
              />
              {formError ? (
                <Text style={[typography.secondaryText, { color: colors.errorIcon }]}>{formError}</Text>
              ) : null}
              <BitaButton
                label="Guardar perfil"
                loading={isCreating}
                disabled={!newName.trim()}
                onPress={() => void handleCreateProfile()}
              />
            </View>
          </BitaCard>
        ) : (
          <BitaButton
            variant="secondary"
            icon="user"
            label="Agregar familiar"
            onPress={() => setShowForm(true)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  sectionTitle: {
    marginTop: SPACING.xs,
  },
});
