import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  RADII,
  SPACING,
  SQUIRCLE_CONTROL_STYLE,
  useBitaTheme,
} from '../../theme';
import { Icon, IconName } from './Icon';

/** Id de perfil: el id numérico del perfil en el backend, como string. */
export type ProfileId = string;

export interface ProfileOption {
  id: ProfileId;
  label: string;
  icon: IconName;
}

/** Fallback usado solo mientras los perfiles reales cargan desde la API. */
export const DEFAULT_PROFILES: readonly ProfileOption[] = [
  { id: 'placeholder', label: 'Mi Salud', icon: 'heart' },
];

export interface ProfileSelectorProps {
  selectedProfileId: ProfileId;
  onSelectProfile: (profileId: ProfileId) => void;
  profiles?: readonly ProfileOption[];
  style?: StyleProp<ViewStyle>;
}

/** Selector segmentado tonal de perfiles (botones de igual ancho, separados 12px). */
export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  selectedProfileId,
  onSelectProfile,
  profiles = DEFAULT_PROFILES,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Selector de expediente médico"
      style={[styles.container, { gap: spacing.sm }, style]}
    >
      {profiles.map((profile) => {
        const isSelected = profile.id === selectedProfileId;
        const contentColor = isSelected ? colors.onPrimary : colors.textPrimary;

        return (
          <Pressable
            key={profile.id}
            onPress={() => onSelectProfile(profile.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Expediente de ${profile.label}`}
            style={({ pressed }) => [
              styles.pill,
              { backgroundColor: isSelected ? colors.primary : colors.surfaceTonal },
              pressed && styles.pressed,
            ]}
          >
            <Icon name={profile.icon} size={iconSizes.md} color={contentColor} weight="light" />
            <Text style={[typography.buttonSecondary, { color: contentColor }]}>
              {profile.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export interface ProfileChipProps {
  profile: ProfileOption;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Chip compacta y tocable del perfil activo; lleva a la pantalla Familia. */
export const ProfileChip: React.FC<ProfileChipProps> = ({ profile, onPress, style }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Perfil activo: ${profile.label}. Abrir Familia para cambiar de perfil`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: colors.surfaceTonal },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon name={profile.icon} size={iconSizes.md} color={colors.primary} weight="light" />
      <Text style={[typography.label, styles.chipLabel, { color: colors.textPrimary }]}>
        {profile.label}
      </Text>
      <Icon name="caret-right" size={iconSizes.xs} color={colors.textSecondary} weight="regular" />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    ...SQUIRCLE_CONTROL_STYLE,
    flex: 1,
    minHeight: ACCESSIBILITY_METRICS.primaryButtonHeight,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  chip: {
    alignSelf: 'flex-start',
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chipLabel: {
    flexShrink: 1,
  },
  pressed: {
    opacity: ACCESSIBILITY_METRICS.pressedOpacity,
  },
});
