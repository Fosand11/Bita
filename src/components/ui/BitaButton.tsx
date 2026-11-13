import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  SPACING,
  SQUIRCLE_CONTROL_STYLE,
  softShadow,
  useBitaTheme,
} from '../../theme';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type BitaButtonVariant = 'primary' | 'secondary' | 'surface';

export interface BitaButtonProps {
  label: string;
  onPress: () => void;
  variant?: BitaButtonVariant;
  /** Icono de Phosphor a la izquierda del texto. */
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primario: azul cielo sólido. Secundario: tonal (fondo celeste claro).
 * Surface: blanco con sombra suave para vivir dentro de bloques tonales.
 * Altura mínima 56 y radio suave de 20.
 * Utiliza PressableScale con micro-escala 0.98 y opacidad suave.
 */
export const BitaButton: React.FC<BitaButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  accessibilityHint,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;

  const isPrimary = variant === 'primary';
  const isSurface = variant === 'surface';
  const isDisabled = disabled || loading;
  const contentColor = isPrimary ? colors.onPrimary : colors.textPrimary;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        isSurface && softShadow(colors.shadow),
        {
          backgroundColor: isPrimary
            ? colors.primary
            : isSurface
            ? colors.surface
            : colors.surfaceTonal,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <View style={styles.contentRow}>
          {icon ? (
            <Icon name={icon} size={iconSizes.md} color={contentColor} weight="light" />
          ) : null}
          <Text
            style={[
              isPrimary ? typography.button : typography.buttonSecondary,
              styles.label,
              { color: contentColor },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  button: {
    ...SQUIRCLE_CONTROL_STYLE,
    minHeight: ACCESSIBILITY_METRICS.primaryButtonHeight,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  disabled: {
    opacity: ACCESSIBILITY_METRICS.disabledOpacity,
  },
});
