import React, { useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  BORDERS,
  SPACING,
  SQUIRCLE_CONTROL_STYLE,
  useBitaTheme,
} from '../../theme';
import { Icon, IconName } from './Icon';

export type BitaInputState = 'default' | 'focus' | 'error';

export interface BitaInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Icono de Phosphor dentro del campo, a la izquierda. */
  leftIcon?: IconName;
  helperText?: string;
  errorMessage?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BitaInput: React.FC<BitaInputProps> = ({
  label,
  leftIcon,
  helperText,
  errorMessage,
  containerStyle,
  onFocus,
  onBlur,
  ...textInputProps
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(errorMessage);
  const visualState: BitaInputState = hasError ? 'error' : isFocused ? 'focus' : 'default';

  const borderColor =
    visualState === 'error'
      ? colors.errorIcon
      : visualState === 'focus'
      ? colors.primary
      : colors.border;

  const backgroundColor = visualState === 'error' ? colors.errorSurface : colors.surface;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[typography.fieldLabel, styles.label, { color: colors.textPrimary }]}>
        {label}
      </Text>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor,
            borderColor,
            borderWidth: visualState === 'default' ? BORDERS.width : BORDERS.focusWidth,
          },
        ]}
      >
        {leftIcon ? (
          <Icon
            name={leftIcon}
            size={iconSizes.md}
            color={colors.textSecondary}
            weight="light"
            style={styles.leftIcon}
          />
        ) : null}

        <TextInput
          {...textInputProps}
          accessibilityLabel={label}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          style={[typography.body, styles.input, { color: colors.textPrimary }]}
        />
      </View>

      {hasError ? (
        <Text
          accessibilityRole="alert"
          style={[typography.secondaryText, { color: colors.error, marginTop: spacing.xs }]}
        >
          {errorMessage}
        </Text>
      ) : helperText ? (
        <Text
          style={[typography.secondaryText, { color: colors.textSecondary, marginTop: spacing.xs }]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    ...SQUIRCLE_CONTROL_STYLE,
    minHeight: ACCESSIBILITY_METRICS.primaryButtonHeight,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.sm,
  },
});
