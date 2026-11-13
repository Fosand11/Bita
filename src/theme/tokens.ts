import { Platform, ViewStyle } from 'react-native';
import { BitaColors, COLORS, MedicationInkKey } from './colors';
import { BitaTypography, FONT_FAMILIES, FONT_SIZES, TYPOGRAPHY } from './typography';

export type ThemeVariant = 'cream';

export type ToneName = MedicationInkKey;

export const RADII = {
  card: 28,
  consultationCard: 24,
  control: 20,
  badge: 12,
  stamp: 12,
  tag: 8,
  sheet: 12,
  pill: 9999,
} as const;

export const BORDERS = {
  width: 1,
  focusWidth: 1.5,
  ringWidth: 2,
  cornerWidth: 2,
} as const;

export const ICON_SIZES = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

/** Métricas geométricas de la línea de tiempo y sellos. */
export const TIMELINE_METRICS = {
  dateColumnMinWidth: 40,
  axisWidth: 1,
  nodeSize: 14,
  stampRotation: '-1.5deg',
} as const;

/** Métricas del calendario (tira semanal y cuadrícula mensual). */
export const CALENDAR_METRICS = {
  glyphSize: 26,
  todayDot: 6,
  cellMinHeight: 56,
} as const;

/** Métricas de la barra de navegación flotante. */
export const FLOATING_TAB_BAR = {
  horizontalMargin: 20,
  bottomMargin: 12,
  padding: 8,
  gap: 4,
  itemMinSize: 48,
  activeMinWidth: 96,
  scanCircle: 40,
  baseHeight: 64,
  maxFontScaleForInset: 2,
} as const;

/** Esquina "squircle": curva continua en iOS, radio uniforme en Android/web. */
export function squircle(radius: number): ViewStyle {
  return {
    borderRadius: radius,
    ...(Platform.OS === 'ios' ? { borderCurve: 'continuous' } : {}),
  };
}

export const SQUIRCLE_CARD_STYLE: ViewStyle = squircle(RADII.card);
export const SQUIRCLE_CONTROL_STYLE: ViewStyle = squircle(RADII.control);

/**
 * Accesibilidad:
 * - Área táctil mínima: 48x48
 * - Botones principales: 56 de alto
 * - Separación mínima entre elementos tocables: 12
 */
export const ACCESSIBILITY_METRICS = {
  minTouchTarget: 48,
  primaryButtonHeight: 56,
  minInteractiveGap: 12,
  pressedOpacity: 0.78,
  disabledOpacity: 0.45,
} as const;

export const SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  screenBottom: 40,
} as const;

/** Sombra muy sutil con tinte azul, unificada desde el tema. */
export function softShadow(color: string = COLORS.shadow): ViewStyle {
  return {
    shadowColor: color,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}

export interface BitaTheme {
  variant: ThemeVariant;
  colors: BitaColors;
  /** Alias hacia `colors` para compatibilidad interna */
  palette: BitaColors;
  typography: BitaTypography;
  fonts: typeof FONT_FAMILIES;
  fontSizes: typeof FONT_SIZES;
  radii: typeof RADII;
  borders: typeof BORDERS;
  iconSizes: typeof ICON_SIZES;
  timeline: typeof TIMELINE_METRICS;
  spacing: typeof SPACING;
  metrics: typeof ACCESSIBILITY_METRICS;
  shadow: ViewStyle;
}

export function createBitaTheme(variant: ThemeVariant = 'cream'): BitaTheme {
  return {
    variant,
    colors: COLORS,
    palette: COLORS,
    typography: TYPOGRAPHY,
    fonts: FONT_FAMILIES,
    fontSizes: FONT_SIZES,
    radii: RADII,
    borders: BORDERS,
    iconSizes: ICON_SIZES,
    timeline: TIMELINE_METRICS,
    spacing: SPACING,
    metrics: ACCESSIBILITY_METRICS,
    shadow: softShadow(COLORS.shadow),
  };
}
