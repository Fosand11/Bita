import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  BORDERS,
  CALENDAR_METRICS,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  MOTION_SCALES,
  RADII,
  SPACING,
  useBitaTheme,
} from '../../theme';
import { Icon } from './Icon';

/**
 * Estados de adherencia por día (compartidos entre la tira semanal de "Hoy" y el "Calendario" mensual):
 * - 'completed': tomada -> círculo relleno con check (salvia)
 * - 'partial': parcial -> círculo medio relleno
 * - 'missed': omitida -> anillo en pizarra con guion
 * - 'pending': programada -> anillo vacío
 * - 'none' / 'future': sin tomas -> solo el número, sin círculo ni marca
 */
export type DayAdherenceState =
  | 'completed'
  | 'partial'
  | 'missed'
  | 'pending'
  | 'none'
  | 'future';

export interface WeekDayItem {
  /** Clave única de fecha (ej. '2026-10-17') */
  dateIso: string;
  /** Inicial del día: L M M J V S D */
  dayInitial?: 'L' | 'M' | 'J' | 'V' | 'S' | 'D';
  dayNumber: number;
  /** Nombre completo para lectores de pantalla (ej. '17 de octubre') */
  fullLabel: string;
  status: DayAdherenceState;
  isToday?: boolean;
  /** Resumen explícito para lectores de pantalla (ej. '2 tomas, 1 tomada, 1 pendiente') */
  accessibilitySummary?: string;
}

export interface CalendarStatusGlyphProps {
  status: Exclude<DayAdherenceState, 'none' | 'future'>;
}

/**
 * Símbolo geométrico de estado (leyenda y celdas), con trazo regular para ser legible a 16px.
 * Al actualizar su estado (ej. al marcar toma de hoy), escala de 0.9 a 1 con ease-out y sin rebote.
 */
export const CalendarStatusGlyph: React.FC<CalendarStatusGlyphProps> = ({ status }) => {
  const { theme } = useBitaTheme();
  const { colors, iconSizes } = theme;
  const reducedMotion = useReducedMotion();

  const prevStatusRef = useRef(status);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      if (!reducedMotion) {
        scale.value = MOTION_SCALES.glyphInitial;
        scale.value = withTiming(MOTION_SCALES.normal, {
          duration: MOTION_DURATIONS.segmented,
          easing: MOTION_EASINGS.easeOut,
        });
      }
    }
  }, [status, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (status === 'completed') {
    return (
      <Animated.View
        accessible={false}
        style={[
          styles.glyphCircle,
          { backgroundColor: colors.successFill, borderColor: colors.successFill },
          animatedStyle,
        ]}
      >
        <Icon name="check" size={iconSizes.xs} color={colors.onPrimary} weight="regular" />
      </Animated.View>
    );
  }

  if (status === 'missed') {
    return (
      <Animated.View
        accessible={false}
        style={[
          styles.glyphCircle,
          { backgroundColor: colors.slateSurface, borderColor: colors.slateIcon },
          animatedStyle,
        ]}
      >
        <Icon name="minus" size={iconSizes.xs} color={colors.slateIcon} weight="regular" />
      </Animated.View>
    );
  }

  if (status === 'partial') {
    return (
      <Animated.View
        accessible={false}
        style={[
          styles.glyphCircle,
          styles.partialContainer,
          { borderColor: colors.successFill, backgroundColor: colors.surface },
          animatedStyle,
        ]}
      >
        <View style={[styles.partialHalfFill, { backgroundColor: colors.successFill }]} />
      </Animated.View>
    );
  }

  return (
    <Animated.View
      accessible={false}
      style={[
        styles.glyphCircle,
        { backgroundColor: colors.transparent, borderColor: colors.slateIcon },
        animatedStyle,
      ]}
    />
  );
};

export interface CalendarDayCellProps {
  item: WeekDayItem;
  isSelected: boolean;
  onSelectDay: (dateIso: string) => void;
  showDayInitial?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Celda táctil de día (`minHeight >= 48px`): "seleccionado" se marca con fondo tonal y "hoy" con un
 * pequeño punto, para que no compitan. El número queda despejado y el glifo de estado va debajo.
 */
export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  item,
  isSelected,
  onSelectDay,
  showDayInitial = false,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;

  const hasDoses = item.status !== 'none' && item.status !== 'future';
  const a11yStatus = item.accessibilitySummary ?? getStatusDescription(item.status);
  const a11yLabel = `${item.fullLabel}${item.isToday ? ', hoy' : ''}, ${a11yStatus}`;

  return (
    <Pressable
      onPress={() => onSelectDay(item.dateIso)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={a11yLabel}
      style={({ pressed }) => [
        styles.dayCellTouch,
        { backgroundColor: isSelected ? colors.surfaceTonal : colors.transparent },
        pressed && styles.pressed,
        style,
      ]}
    >
      {showDayInitial && item.dayInitial ? (
        <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
          {item.dayInitial}
        </Text>
      ) : null}

      <View style={styles.dayNumberRow}>
        <Text
          style={[
            isSelected || item.isToday ? typography.bodyMedium : typography.body,
            { color: isSelected || hasDoses ? colors.textPrimary : colors.textSecondary },
          ]}
        >
          {item.dayNumber}
        </Text>
        {item.isToday ? (
          <View
            accessible={false}
            style={[styles.todayDot, { backgroundColor: colors.primary }]}
          />
        ) : null}
      </View>

      <View style={styles.statusSlot}>
        {hasDoses ? (
          <CalendarStatusGlyph
            status={item.status as Exclude<DayAdherenceState, 'none' | 'future'>}
          />
        ) : null}
      </View>
    </Pressable>
  );
};

export interface WeekCalendarStripProps {
  days: readonly WeekDayItem[];
  selectedDateIso: string;
  onSelectDay: (dateIso: string) => void;
  style?: StyleProp<ViewStyle>;
}

/** Tira semanal de "Hoy": mismos estados por forma e icono que el calendario mensual. */
export const WeekCalendarStrip: React.FC<WeekCalendarStripProps> = ({
  days,
  selectedDateIso,
  onSelectDay,
  style,
}) => {
  return (
    <View style={[styles.row, style]}>
      {days.map((item) => (
        <CalendarDayCell
          key={item.dateIso}
          item={item}
          isSelected={item.dateIso === selectedDateIso}
          onSelectDay={onSelectDay}
          showDayInitial
          style={styles.weekColumn}
        />
      ))}
    </View>
  );
};

function getStatusDescription(status: DayAdherenceState): string {
  switch (status) {
    case 'completed':
      return 'tomas completadas';
    case 'partial':
      return 'tomas parcialmente completadas';
    case 'missed':
      return 'toma omitida';
    case 'pending':
      return 'tomas programadas pendientes';
    case 'none':
    case 'future':
    default:
      return 'sin tomas registradas';
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.xxs,
  },
  weekColumn: {
    flex: 1,
  },
  dayCellTouch: {
    minHeight: CALENDAR_METRICS.cellMinHeight,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget - SPACING.xxs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xxs,
    borderRadius: RADII.control,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xxs,
  },
  dayNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xxs,
  },
  todayDot: {
    width: CALENDAR_METRICS.todayDot,
    height: CALENDAR_METRICS.todayDot,
    borderRadius: RADII.pill,
  },
  statusSlot: {
    minHeight: CALENDAR_METRICS.glyphSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphCircle: {
    width: CALENDAR_METRICS.glyphSize,
    height: CALENDAR_METRICS.glyphSize,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.ringWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partialContainer: {
    overflow: 'hidden',
  },
  partialHalfFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
  },
  pressed: {
    opacity: ACCESSIBILITY_METRICS.pressedOpacity,
  },
});
