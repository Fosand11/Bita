import React, { useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_SCALES,
} from '../../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  activeScale?: number;
  activeOpacity?: number;
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

/**
 * Componente interactivo compartido que aplica una micro-escala suave (0.98)
 * y una ligera variación de opacidad en ~100ms al presionar.
 *
 * Respeta `useReducedMotion()`: si la reducción de movimiento del sistema
 * está activa, omite la transformación de escala por completo.
 */
export const PressableScale: React.FC<PressableScaleProps> = ({
  style,
  activeScale = MOTION_SCALES.press,
  activeOpacity = MOTION_SCALES.pressedOpacity,
  disabled,
  onPressIn,
  onPressOut,
  children,
  ...rest
}) => {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (event: GestureResponderEvent) => {
    setPressed(true);
    if (!disabled) {
      if (!reducedMotion) {
        scale.value = withTiming(activeScale, {
          duration: MOTION_DURATIONS.press,
          easing: MOTION_EASINGS.easeOut,
        });
      }
      opacity.value = withTiming(activeOpacity, {
        duration: MOTION_DURATIONS.press,
        easing: MOTION_EASINGS.easeOut,
      });
    }
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    setPressed(false);
    if (!disabled) {
      if (!reducedMotion) {
        scale.value = withTiming(1, {
          duration: MOTION_DURATIONS.press,
          easing: MOTION_EASINGS.easeOut,
        });
      }
      opacity.value = withTiming(1, {
        duration: MOTION_DURATIONS.press,
        easing: MOTION_EASINGS.easeOut,
      });
    }
    onPressOut?.(event);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // El estilo del consumidor (objeto, arreglo o función de estado) se resuelve aquí y se pasa
  // como arreglo estático: Reanimated no procesa estilos en forma de función.
  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[resolvedStyle, animatedStyle]}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  );
};
