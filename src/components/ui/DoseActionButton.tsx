import React, { useEffect, useRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  BitaColors,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  SPACING,
  SQUIRCLE_CONTROL_STYLE,
  useBitaTheme,
} from '../../theme';
import { hapticLight, hapticSuccess } from '../../lib/haptics';
import { announceAccessibility } from '../../lib/accessibility';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type DoseStatus = 'pending' | 'completed' | 'skipped';

export interface DoseActionButtonProps {
  status: DoseStatus;
  medicationName?: string;
  scheduledTime?: string;
  onPress: (currentStatus: DoseStatus) => void;
  /** Si se pasa y la toma está pendiente, se muestra "Omitir por ahora" debajo. */
  onSkipPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Checkmark animado con trazo SVG dibujado (stroke-dashoffset).
 */
const AnimatedCheckIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 22,
}) => {
  const reducedMotion = useReducedMotion();
  const strokeLength = 22;
  const strokeOffset = useSharedValue(reducedMotion ? 0 : strokeLength);

  useEffect(() => {
    if (reducedMotion) {
      strokeOffset.value = 0;
    } else {
      strokeOffset.value = strokeLength;
      strokeOffset.value = withTiming(0, {
        duration: MOTION_DURATIONS.segmented,
        easing: MOTION_EASINGS.easeOut,
      });
    }
  }, [reducedMotion, strokeOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: strokeOffset.value,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M5 12.5 L9.5 17 L19 7.5"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeLength}
        animatedProps={animatedProps}
      />
    </Svg>
  );
};

export const DoseActionButton: React.FC<DoseActionButtonProps> = ({
  status,
  medicationName,
  scheduledTime,
  onPress,
  onSkipPress,
  disabled = false,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const reducedMotion = useReducedMotion();

  const prevStatusRef = useRef(status);
  const fadeProgress = useSharedValue(1);

  const config = getStatusVisualConfig(status, colors);

  const a11ySubject = medicationName
    ? `${medicationName}${scheduledTime ? ` de las ${scheduledTime}` : ''}`
    : 'dosis';

  const accessibilityLabel =
    status === 'pending'
      ? `Marcar ${a11ySubject} como tomada`
      : status === 'completed'
      ? `${a11ySubject} registrada como tomada. Toca para deshacer`
      : `${a11ySubject} registrada como omitida. Toca para cambiar`;

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      fadeProgress.value = 0.4;
      fadeProgress.value = withTiming(1, {
        duration: reducedMotion ? MOTION_DURATIONS.reducedFade : MOTION_DURATIONS.segmented,
        easing: MOTION_EASINGS.easeOut,
      });
    }
  }, [status, reducedMotion, fadeProgress]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: fadeProgress.value,
  }));

  const handleMainPress = () => {
    if (status === 'pending') {
      hapticSuccess();
      announceAccessibility(`Toma de ${a11ySubject} registrada como tomada`);
    } else {
      hapticLight();
      announceAccessibility(`Estado de la toma de ${a11ySubject} restablecido`);
    }
    onPress(status);
  };

  const handleSkipPress = () => {
    hapticLight();
    announceAccessibility(`Toma de ${a11ySubject} omitida por ahora`);
    onSkipPress?.();
  };

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      <PressableScale
        onPress={handleMainPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ checked: status === 'completed', disabled }}
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.button,
          { backgroundColor: config.backgroundColor },
          disabled && styles.disabled,
        ]}
      >
        <Animated.View style={[styles.contentRow, animatedContentStyle]}>
          {status === 'completed' ? (
            <AnimatedCheckIcon color={config.iconColor} size={iconSizes.md} />
          ) : (
            <Icon name={config.icon} size={iconSizes.lg} color={config.iconColor} weight="light" />
          )}
          <Text
            style={[
              status === 'pending' ? typography.button : typography.buttonSecondary,
              styles.label,
              { color: config.textColor },
            ]}
          >
            {config.label}
          </Text>
        </Animated.View>
      </PressableScale>

      {status === 'pending' && onSkipPress ? (
        <PressableScale
          onPress={handleSkipPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Omitir por ahora la toma de ${a11ySubject}`}
          style={[
            styles.button,
            { backgroundColor: colors.surface },
            disabled && styles.disabled,
          ]}
        >
          <Icon name="minus" size={iconSizes.md} color={colors.slateIcon} weight="light" />
          <Text style={[typography.buttonSecondary, styles.label, { color: colors.textPrimary }]}>
            Omitir por ahora
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
};

function getStatusVisualConfig(
  status: DoseStatus,
  colors: BitaColors
): {
  label: string;
  icon: IconName;
  backgroundColor: string;
  textColor: string;
  iconColor: string;
} {
  switch (status) {
    case 'completed':
      return {
        label: 'Tomada',
        icon: 'check-circle',
        backgroundColor: colors.successSurface,
        textColor: colors.success,
        iconColor: colors.successIcon,
      };
    case 'skipped':
      return {
        label: 'Omitida',
        icon: 'minus',
        backgroundColor: colors.slateSurface,
        textColor: colors.slate,
        iconColor: colors.slateIcon,
      };
    case 'pending':
    default:
      return {
        label: 'Marcar como tomada',
        icon: 'check-circle',
        backgroundColor: colors.primary,
        textColor: colors.onPrimary,
        iconColor: colors.onPrimary,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    ...SQUIRCLE_CONTROL_STYLE,
    minHeight: ACCESSIBILITY_METRICS.primaryButtonHeight,
    paddingHorizontal: SPACING.md,
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
