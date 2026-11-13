import React, { useEffect, useRef } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_SCALES,
  RADII,
  SPACING,
  TIMELINE_METRICS,
  useBitaTheme,
} from '../../theme';
import { hapticSelection } from '../../lib/haptics';
import { Icon } from './Icon';

export type StampVariant = 'review' | 'verified';

export interface ReviewBadgeProps {
  /** 'review' ("Revisar datos", ámbar tonal) o 'verified' ("Verificada", salvia tonal). */
  variant?: StampVariant;
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Sello editorial con transición de estado y efecto de asentamiento:
 * - 'review': "Revisar datos" en ámbar tonal.
 * - 'verified': "Verificada" en salvia tonal.
 *
 * Al cambiar a 'verified':
 * - Transición de color suave (~250ms).
 * - Efecto de sello: escala 1.1 -> 1.0 con asentamiento de la rotación (-1.5deg).
 * - Háptica de selección.
 * - Reducir movimiento: fundido corto (150ms) sin cambio de escala ni rotación.
 */
export const ReviewBadge: React.FC<ReviewBadgeProps> = ({
  variant = 'review',
  label,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;
  const reducedMotion = useReducedMotion();

  const isVerified = variant === 'verified';
  const resolvedLabel = label ?? (isVerified ? 'Verificada' : 'Revisar datos');

  const prevVariantRef = useRef(variant);
  const transitionProgress = useSharedValue(isVerified ? 1 : 0);
  const stampScale = useSharedValue(1);
  const stampRotation = useSharedValue(TIMELINE_METRICS.stampRotation);

  useEffect(() => {
    if (prevVariantRef.current !== variant) {
      const becameVerified = variant === 'verified';
      prevVariantRef.current = variant;

      if (becameVerified) {
        hapticSelection();
      }

      if (reducedMotion) {
        transitionProgress.value = withTiming(becameVerified ? 1 : 0, {
          duration: MOTION_DURATIONS.reducedFade,
        });
        stampScale.value = 1;
      } else {
        transitionProgress.value = withTiming(becameVerified ? 1 : 0, {
          duration: MOTION_DURATIONS.stampSettle,
          easing: MOTION_EASINGS.easeOut,
        });

        if (becameVerified) {
          stampScale.value = MOTION_SCALES.stampInitial;
          stampScale.value = withTiming(MOTION_SCALES.normal, {
            duration: MOTION_DURATIONS.stampSettle,
            easing: MOTION_EASINGS.easeOut,
          });
        }
      }
    }
  }, [variant, reducedMotion, transitionProgress, stampScale, stampRotation]);

  const animatedStampStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      transitionProgress.value,
      [0, 1],
      [colors.warningSurface, colors.successSurface]
    );

    return {
      backgroundColor: bg,
      transform: [
        { scale: stampScale.value },
        { rotate: TIMELINE_METRICS.stampRotation },
      ],
    };
  });

  const textColor = isVerified ? colors.success : colors.warning;
  const iconColor = isVerified ? colors.successIcon : colors.warningIcon;

  return (
    <View
      accessible
      accessibilityLabel={
        isVerified
          ? `Documento ${resolvedLabel.toLowerCase()}`
          : `Atención: ${resolvedLabel.toLowerCase()}`
      }
      style={[styles.stampSafeWrapper, style]}
    >
      <Animated.View style={[styles.stamp, animatedStampStyle]}>
        <Icon
          name={isVerified ? 'check-circle' : 'warning-circle'}
          size={iconSizes.xs}
          color={iconColor}
          weight="regular"
        />
        <Text style={[typography.label, styles.stampLabel, { color: textColor }]}>
          {resolvedLabel}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  stampSafeWrapper: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.xxs,
    paddingHorizontal: SPACING.xs,
  },
  stamp: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xxs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.stamp,
  },
  stampLabel: {
    flexShrink: 1,
  },
});
