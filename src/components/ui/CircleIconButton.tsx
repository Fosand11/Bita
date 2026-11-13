import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  RADII,
  softShadow,
  useBitaTheme,
} from '../../theme';
import { Icon, IconName } from './Icon';

export type CircleIconButtonVariant = 'outlined' | 'plain';

export interface CircleIconButtonProps {
  icon: IconName;
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: CircleIconButtonVariant;
  style?: StyleProp<ViewStyle>;
}

/** Botón de icono de 48x48: círculo blanco con sombra suave (`outlined`) o solo el icono (`plain`). */
export const CircleIconButton: React.FC<CircleIconButtonProps> = ({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'outlined',
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, iconSizes } = theme;
  const isOutlined = variant === 'outlined';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.button,
        isOutlined && [{ backgroundColor: colors.surface }, softShadow(colors.shadow)],
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={isOutlined ? iconSizes.md : iconSizes.lg}
        color={colors.textSecondary}
        weight="light"
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    width: ACCESSIBILITY_METRICS.minTouchTarget,
    height: ACCESSIBILITY_METRICS.minTouchTarget,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: ACCESSIBILITY_METRICS.pressedOpacity,
  },
});
