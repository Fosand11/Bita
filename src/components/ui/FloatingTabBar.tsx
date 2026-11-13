import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  FLOATING_TAB_BAR,
  ICON_SIZES,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  RADII,
  SPACING,
  softShadow,
  useBitaTheme,
} from '../../theme';
import { Icon, IconName } from './Icon';
import { PressableScale } from './PressableScale';

const hasExpoLinearGradient = Boolean(
  UIManager.getViewManagerConfig?.('ExpoLinearGradient')
);

let ExpoLinearGradientComponent: any = null;
if (hasExpoLinearGradient) {
  try {
    ExpoLinearGradientComponent = require('expo-linear-gradient').LinearGradient;
  } catch {}
}

interface TabBarBackgroundFadeProps {
  height: number;
  color: string;
}

/**
 * Degradado funcional suave de transparente al color de fondo.
 * Evita que el contenido se corte de golpe detrás de la barra flotante.
 */
const TabBarBackgroundFade: React.FC<TabBarBackgroundFadeProps> = ({ height, color }) => {
  if (ExpoLinearGradientComponent) {
    return (
      <ExpoLinearGradientComponent
        colors={['transparent', color]}
        style={[styles.fade, { height }]}
        pointerEvents="none"
      />
    );
  }

  return (
    <View pointerEvents="none" style={[styles.fade, { height }]}>
      <Svg height="100%" width="100%">
        <Defs>
          <SvgLinearGradient id="tabFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0" />
            <Stop offset="35%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="75%" stopColor={color} stopOpacity="0.9" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#tabFade)" />
      </Svg>
    </View>
  );
};

interface TabItemConfig {
  label: string;
  icon: IconName;
  accessibilityLabel: string;
}

/** Orden fijo de la barra: Historial, Escanear, Mis Medicinas, Familia. */
const TAB_ORDER = ['index', 'scan', 'medications', 'family'] as const;

const TAB_ITEMS: Record<(typeof TAB_ORDER)[number], TabItemConfig> = {
  index: { label: 'Historial', icon: 'house', accessibilityLabel: 'Bitácora de salud' },
  scan: {
    label: 'Escanear',
    icon: 'camera',
    accessibilityLabel: 'Escanear documento de salud',
  },
  medications: {
    label: 'Mis Medicinas',
    icon: 'pill',
    accessibilityLabel: 'Mis Medicinas y tomas del día',
  },
  family: { label: 'Familia', icon: 'users', accessibilityLabel: 'Familia y perfiles' },
};

/**
 * Padding inferior que deben reservar las pantallas con barra flotante para que ningún botón quede
 * tapado: área segura + margen inferior + altura de la barra + holgura suficiente para el fade.
 */
export function useFloatingTabBarInset(): number {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(Math.max(fontScale, 1), FLOATING_TAB_BAR.maxFontScaleForInset);
  return (
    insets.bottom +
    FLOATING_TAB_BAR.bottomMargin +
    FLOATING_TAB_BAR.baseHeight * scale +
    SPACING.xxl
  );
}

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}

/** Fondo tonal del ítem activo: aparece con fundido (instantáneo con Reducir movimiento). */
const TabActiveBackground: React.FC<{ active: boolean; color: string }> = ({ active, color }) => {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue<number>(active ? 1 : 0);

  useEffect(() => {
    progress.value = reducedMotion
      ? active
        ? 1
        : 0
      : withTiming(active ? 1 : 0, {
          duration: MOTION_DURATIONS.tabBarIndicator,
          easing: MOTION_EASINGS.easeInOut,
        });
  }, [active, reducedMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.activeBackground,
        { backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
};

/**
 * Barra de navegación flotante:
 * - El fondo del ítem activo se desliza suavemente entre pestañas (~250ms).
 * - La etiqueta activa aparece con fundido y ligera expansión.
 * - Con reducción de movimiento, cambia de inmediato o mediante fundido corto.
 */
export const FloatingTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const reducedMotion = useReducedMotion();

  const focusedRouteName = state.routes[state.index]?.name;
  const fadeHeight =
    insets.bottom + FLOATING_TAB_BAR.bottomMargin + FLOATING_TAB_BAR.baseHeight + SPACING.lg;

  if (keyboardVisible) {
    return null;
  }

  return (
    <>
      <TabBarBackgroundFade height={fadeHeight} color={colors.background} />
      <View
        pointerEvents="box-none"
        style={[
          styles.anchor,
          { bottom: insets.bottom + FLOATING_TAB_BAR.bottomMargin },
        ]}
      >
        <View
          accessibilityRole="tablist"
          style={[styles.bar, { backgroundColor: colors.surface }, softShadow(colors.shadow)]}
        >
          {TAB_ORDER.map((routeName) => {
            const route = state.routes.find((r) => r.name === routeName);
            if (!route) {
              return null;
            }
            const config = TAB_ITEMS[routeName];
            const isFocused = focusedRouteName === routeName;
            const isScan = routeName === 'scan';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const iconColor = isFocused ? colors.primary : colors.iconMuted;

            const iconNode = isScan ? (
              <View
                style={[
                  styles.scanCircle,
                  { backgroundColor: isFocused ? colors.surface : colors.surfaceTonal },
                ]}
              >
                <Icon name={config.icon} size={iconSizes.lg} color={iconColor} weight="light" />
              </View>
            ) : (
              <View style={styles.iconWrapper}>
                <Icon name={config.icon} size={iconSizes.lg} color={iconColor} weight="light" />
              </View>
            );

            return (
              <PressableScale
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={config.accessibilityLabel}
                style={[
                  styles.item,
                  isFocused && styles.itemActive,
                ]}
              >
                <TabActiveBackground active={isFocused} color={colors.surfaceTonal} />
                <Animated.View style={styles.itemContent} pointerEvents="none">
                  {iconNode}
                  {isFocused ? (
                    <Animated.View
                      entering={
                        reducedMotion
                          ? undefined
                          : FadeIn.duration(MOTION_DURATIONS.tabBarIndicator)
                      }
                      exiting={
                        reducedMotion
                          ? undefined
                          : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                      }
                    >
                      <Text
                        style={[
                          typography.tabBarLabelActive,
                          styles.activeLabel,
                          { color: colors.primaryText },
                        ]}
                      >
                        {config.label}
                      </Text>
                    </Animated.View>
                  ) : null}
                </Animated.View>
              </PressableScale>
            );
          })}
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  anchor: {
    position: 'absolute',
    left: FLOATING_TAB_BAR.horizontalMargin,
    right: FLOATING_TAB_BAR.horizontalMargin,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    gap: FLOATING_TAB_BAR.gap,
    padding: FLOATING_TAB_BAR.padding,
    borderRadius: RADII.pill,
    position: 'relative',
  },
  item: {
    minWidth: FLOATING_TAB_BAR.itemMinSize,
    minHeight: FLOATING_TAB_BAR.itemMinSize,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemActive: {
    flexShrink: 1,
    minWidth: FLOATING_TAB_BAR.activeMinWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xxs,
  },
  activeBackground: {
    borderRadius: RADII.pill,
    zIndex: 0,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    zIndex: 1,
  },
  iconWrapper: {
    width: ICON_SIZES.lg,
    height: ICON_SIZES.lg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activeLabel: {
    flexShrink: 1,
  },
  scanCircle: {
    width: FLOATING_TAB_BAR.scanCircle,
    height: FLOATING_TAB_BAR.scanCircle,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
});
