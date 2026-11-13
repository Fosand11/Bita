import { TextStyle } from 'react-native';

/**
 * Tipografía centralizada de Bita (`@expo-google-fonts/asap-sharp`), pesos suaves:
 * - Títulos: SemiBold (600). Etiquetas, fechas y botones secundarios: Medium (500). Cuerpo: Regular (400).
 * - Escalas >= 16px y `tabular-nums` en todas las variantes (cifras claras: `50 mg`, `20:00`).
 */
export const FONT_FAMILIES = {
  heading: 'AsapSharp_600SemiBold',
  strong: 'AsapSharp_600SemiBold',
  medium: 'AsapSharp_500Medium',
  body: 'AsapSharp_400Regular',
} as const;

export const FONT_SIZES = {
  doseTime: 34,
  screenTitle: 30,
  header: 24,
  body: 17,
  secondary: 16,
} as const;

const TABULAR_NUMS: TextStyle['fontVariant'] = ['tabular-nums'];

export const TYPOGRAPHY: Record<
  | 'doseTime'
  | 'screenTitle'
  | 'marginDay'
  | 'marginDate'
  | 'sectionHeader'
  | 'fieldLabel'
  | 'cardTitle'
  | 'body'
  | 'bodyMedium'
  | 'button'
  | 'buttonSecondary'
  | 'label'
  | 'secondaryText'
  | 'tabBarLabel'
  | 'tabBarLabelActive',
  TextStyle
> = {
  /** Hora protagonista de la próxima toma (34px, SemiBold) */
  doseTime: {
    fontFamily: FONT_FAMILIES.strong,
    fontSize: FONT_SIZES.doseTime,
    lineHeight: 42,
    letterSpacing: -0.4,
    fontVariant: TABULAR_NUMS,
  },
  /** Título de pantalla (30px, SemiBold) */
  screenTitle: {
    fontFamily: FONT_FAMILIES.heading,
    fontSize: FONT_SIZES.screenTitle,
    lineHeight: 38,
    letterSpacing: -0.3,
    fontVariant: TABULAR_NUMS,
  },
  /** Día grande de la columna de margen (24px, SemiBold) */
  marginDay: {
    fontFamily: FONT_FAMILIES.heading,
    fontSize: FONT_SIZES.header,
    lineHeight: 28,
    letterSpacing: -0.3,
    fontVariant: TABULAR_NUMS,
  },
  /** Mes de la columna de margen (16px, Medium) */
  marginDate: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.secondary,
    lineHeight: 20,
    fontVariant: TABULAR_NUMS,
  },
  /** Encabezados de sección (24px, SemiBold) */
  sectionHeader: {
    fontFamily: FONT_FAMILIES.strong,
    fontSize: FONT_SIZES.header,
    lineHeight: 32,
    letterSpacing: -0.2,
    fontVariant: TABULAR_NUMS,
  },
  /** Etiquetas de bloques y formularios (17px, Medium) */
  fieldLabel: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    fontVariant: TABULAR_NUMS,
  },
  /** Nombres de medicamentos y títulos de tarjeta (17px, SemiBold) */
  cardTitle: {
    fontFamily: FONT_FAMILIES.strong,
    fontSize: FONT_SIZES.body,
    lineHeight: 24,
    fontVariant: TABULAR_NUMS,
  },
  /** Cuerpo, dosis y formularios (17px, Regular) */
  body: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: FONT_SIZES.body,
    lineHeight: 25,
    fontVariant: TABULAR_NUMS,
  },
  /** Cuerpo medio, números de calendario y segmentos (17px, Medium) */
  bodyMedium: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.body,
    lineHeight: 25,
    fontVariant: TABULAR_NUMS,
  },
  /** Botones primarios (17px, SemiBold) */
  button: {
    fontFamily: FONT_FAMILIES.strong,
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    fontVariant: TABULAR_NUMS,
  },
  /** Botones secundarios (17px, Medium) */
  buttonSecondary: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.body,
    lineHeight: 22,
    fontVariant: TABULAR_NUMS,
  },
  /** Etiquetas, horarios y chips (16px, Medium) */
  label: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.secondary,
    lineHeight: 22,
    fontVariant: TABULAR_NUMS,
  },
  /** Texto secundario y dosis (16px, Regular) */
  secondaryText: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: FONT_SIZES.secondary,
    lineHeight: 22,
    fontVariant: TABULAR_NUMS,
  },
  /** Etiqueta de barra inactiva (16px, Regular) */
  tabBarLabel: {
    fontFamily: FONT_FAMILIES.body,
    fontSize: FONT_SIZES.secondary,
    lineHeight: 20,
    fontVariant: TABULAR_NUMS,
  },
  /** Etiqueta del ítem activo de la barra (16px, Medium) */
  tabBarLabelActive: {
    fontFamily: FONT_FAMILIES.medium,
    fontSize: FONT_SIZES.secondary,
    lineHeight: 20,
    fontVariant: TABULAR_NUMS,
  },
} as const;

export type BitaTypography = typeof TYPOGRAPHY;
