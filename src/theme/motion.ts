import { Easing } from 'react-native-reanimated';

/**
 * Tokens de movimiento de Bita.
 * Duraciones entre 100ms y 350ms, curvas de desaceleración suaves (ease-out),
 * sin rebotes ni resortes exagerados, respetando accesibilidad.
 */
export const MOTION_DURATIONS = {
  instant: 0,
  press: 100,
  reducedFade: 150,
  chip: 150,
  tabTransition: 150,
  segmented: 200,
  layoutTransition: 200,
  tabBarIndicator: 250,
  calendarSlide: 250,
  stampSettle: 250,
  statusCrossfade: 250,
  formStaggerItem: 220,
  screenEntry: 250,
  laserSweep: 1400,
} as const;

export const MOTION_EASINGS = {
  /** Desaceleración suave, estándar para entradas y asentamientos */
  easeOut: Easing.out(Easing.cubic),
  /** Transiciones simétricas de posición (indicador deslizante, tabs) */
  easeInOut: Easing.inOut(Easing.cubic),
  /** Movimiento lineal uniforme (ej. barrido de láser) */
  linear: Easing.linear,
} as const;

export const MOTION_DELAYS = {
  staggerBase: 45,
  maxStaggerItems: 6,
  maxTotalDelay: 300,
} as const;

export const MOTION_SCALES = {
  press: 0.98,
  pressedOpacity: 0.88,
  glyphInitial: 0.9,
  stampInitial: 1.1,
  normal: 1.0,
} as const;

