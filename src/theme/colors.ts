/**
 * Paleta centralizada de Bita (Fase 2.5): fondo blanco azulado, superficies blancas,
 * primario azul cielo y estados suaves con fondo tintado.
 *
 * Contrastes WCAG verificados (calculados, no estimados):
 * - textPrimary #0F2A43 sobre background: 13.9 | textSecondary #5B7088 sobre background: 4.82 / sobre blanco: 5.10
 * - onPrimary sobre primary #2878BC: 4.66 (texto de botón)
 * - primaryText #1F6AAA sobre background: 5.36 / sobre surfaceTonal: 4.77 (texto y etiqueta activa)
 * - Iconos (mínimo 3:1): iconMuted #6B7F95 sobre blanco 4.12; primary #2878BC sobre surfaceTonal 3.92;
 *   warningIcon #B87400 sobre blanco 3.79 (solo icono; el texto ámbar usa `warning` #8A5200, 5.72 sobre su fondo)
 * - Tintas de medicina (iconos, mínimo 3:1 sobre blanco y sobre surfaceTonal).
 */

export type MedicationInkKey = 'celeste' | 'menta' | 'coral' | 'lavanda' | 'ambar' | 'indigo';

export interface MedicationInk {
  key: MedicationInkKey;
  label: string;
  /** Color principal de tinta para iconos y nodos (>= 3:1 sobre blanco y sobre surfaceTonal). */
  color: string;
  /** Halo circular muy sutil que acompaña al icono. */
  subtleCircle: string;
}

/** 6 tintas luminosas y diferenciadas para identificar medicamentos y registros. */
export const MEDICATION_INKS: Record<MedicationInkKey, MedicationInk> = {
  celeste: {
    key: 'celeste',
    label: 'Celeste',
    color: '#2680C2',
    subtleCircle: 'rgba(38, 128, 194, 0.12)',
  },
  menta: {
    key: 'menta',
    label: 'Menta',
    color: '#1C9170',
    subtleCircle: 'rgba(28, 145, 112, 0.12)',
  },
  coral: {
    key: 'coral',
    label: 'Coral',
    color: '#D9553F',
    subtleCircle: 'rgba(217, 85, 63, 0.12)',
  },
  lavanda: {
    key: 'lavanda',
    label: 'Lavanda',
    color: '#7E6BC9',
    subtleCircle: 'rgba(126, 107, 201, 0.12)',
  },
  ambar: {
    key: 'ambar',
    label: 'Ámbar',
    color: '#B87400',
    subtleCircle: 'rgba(184, 116, 0, 0.12)',
  },
  indigo: {
    key: 'indigo',
    label: 'Índigo',
    color: '#4559B8',
    subtleCircle: 'rgba(69, 89, 184, 0.12)',
  },
} as const;

export const MEDICATION_INK_LIST: readonly MedicationInk[] = [
  MEDICATION_INKS.menta,
  MEDICATION_INKS.coral,
  MEDICATION_INKS.celeste,
  MEDICATION_INKS.lavanda,
  MEDICATION_INKS.ambar,
  MEDICATION_INKS.indigo,
];

export const COLORS = {
  /** Fondo blanco azulado muy claro */
  background: '#F5F9FD',
  /** Fondo exterior del marco web de previsualización */
  webBackdrop: '#E4EDF6',
  /** Superficies de tarjetas, controles y barra flotante */
  surface: '#FFFFFF',
  /** Superficie azulada muy suave (notas de consulta) */
  surfaceSoft: '#EBF4FC',
  /** Fondo tonal (bloques destacados, segmentos, botón secundario, ítem activo) */
  surfaceTonal: '#DCEEFB',
  /** Fondo tonal intenso (línea de tiempo, pistas de progreso) */
  surfaceTonalStrong: '#B9DDF7',
  /** Borde de 1px muy claro, solo donde es imprescindible */
  border: '#E3EDF6',
  borderStrong: '#C9DCEC',
  /** Eje y conectores de la línea de tiempo */
  timelineLine: '#B9DDF7',

  /** Texto principal azul grisáceo oscuro */
  textPrimary: '#0F2A43',
  /** Texto secundario */
  textSecondary: '#5B7088',
  /** Texto secundario sobre fondos tonales (contraste AA sobre surfaceTonal) */
  textOnTonal: '#3F566E',
  /** Texto sobre botón primario o círculo relleno */
  onPrimary: '#FFFFFF',

  /** Azul cielo: fondo de botón primario e iconos activos */
  primary: '#2878BC',
  primaryPressed: '#1F6AAA',
  /** Azul para texto y etiquetas activas (AA sobre fondos claros y tonales) */
  primaryText: '#1F6AAA',
  /** Iconos en gris azulado */
  iconMuted: '#6B7F95',

  /** Revisar / atrasada (ámbar reservado para estos casos) */
  warning: '#8A5200',
  warningIcon: '#B87400',
  warningSurface: '#FFF1D6',

  /** Tomada / Verificada (salvia) */
  success: '#2F6B52',
  successIcon: '#2F8A66',
  successFill: '#2F8A66',
  successSurface: '#E6F3EC',

  /** Omitida / programada (pizarra) */
  slate: '#4A5A6C',
  slateIcon: '#5B6B7D',
  slateSurface: '#E9EEF3',

  /** Error */
  error: '#A12026',
  errorIcon: '#B4232A',
  errorSurface: '#FDECEC',

  /** Tinte azul para sombras suaves */
  shadow: '#1B4F82',
  transparent: 'transparent',

  /** Paleta de 6 tintas por medicina */
  inks: MEDICATION_INKS,
} as const;

export type BitaColors = typeof COLORS;
