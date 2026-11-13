import React, { useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  BORDERS,
  MOTION_DELAYS,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  RADII,
  SPACING,
  TIMELINE_METRICS,
  softShadow,
  useBitaTheme,
  useMedicationInk,
} from '../../theme';
import {
  BitaButton,
  BitaCard,
  CircleIconButton,
  HealthRecordCard,
  IconTile,
  PressableScale,
  ProfileChip,
  ScreenHeader,
  UpcomingAppointmentCard,
  useFloatingTabBarInset,
} from '../../components/ui';
import { useProfile } from '../../state/ProfileContext';
import { useTodayDoses } from '../../state/TodayDosesContext';
import { useHealthLog } from '../../state/HealthLogContext';
import {
  buildExistingDosesByDate,
  getPendingTodaySummary,
  getToday,
} from '../../data/doses';
import {
  buildDailySummaryText,
  HealthLogRecord,
  HISTORIAL_FILTER_OPTIONS,
  HistorialFilterKey,
  isUpcomingAppointment,
  matchesHistorialFilter,
} from '../../data/healthLog';
import { useFirstSessionMount } from '../../lib/sessionMount';

interface TimelineRowProps {
  record: HealthLogRecord;
  isLast: boolean;
  onPress: () => void;
}

/**
 * Fila de la bitácora: columna de fecha flexible (`minWidth`, soporta texto grande), eje vertical
 * continuo en celeste claro con nodo de tinta, y tarjeta compacta que cuelga del nodo.
 */
const TimelineRow: React.FC<TimelineRowProps> = ({ record, isLast, onPress }) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const ink = useMedicationInk(record.inkTarget);

  return (
    <View style={styles.timelineRow}>
      <View
        accessible
        accessibilityLabel={`${record.day} de ${record.month}`}
        style={styles.dateColumn}
      >
        <Text style={[typography.marginDay, { color: colors.textPrimary }]}>{record.day}</Text>
        <Text style={[typography.marginDate, { color: colors.textSecondary }]}>
          {record.month}
        </Text>
      </View>

      <View accessible={false} style={styles.axisColumn}>
        <View style={[styles.axisLineTop, { backgroundColor: colors.timelineLine }]} />
        <View style={styles.nodeRow}>
          <View
            style={[
              styles.timelineNode,
              { backgroundColor: ink.color, borderColor: colors.background },
            ]}
          />
          <View style={[styles.nodeConnector, { backgroundColor: colors.timelineLine }]} />
        </View>
        <View
          style={[
            styles.axisLineBottom,
            { backgroundColor: isLast ? colors.transparent : colors.timelineLine },
          ]}
        />
      </View>

      <View style={[styles.cardColumn, !isLast && styles.cardColumnSpacing]}>
        <HealthRecordCard record={record} onPress={onPress} />
      </View>
    </View>
  );
};

interface FilterChipProps {
  option: (typeof HISTORIAL_FILTER_OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}

/**
 * Chip de filtro con transición suave de selección en 150ms y PressableScale.
 */
const FilterChip: React.FC<FilterChipProps> = ({ option, selected, onPress }) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = selected ? 1 : 0;
    } else {
      progress.value = withTiming(selected ? 1 : 0, {
        duration: MOTION_DURATIONS.chip,
        easing: MOTION_EASINGS.easeOut,
      });
    }
  }, [selected, reducedMotion, progress]);

  const animatedChipStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      [colors.surface, colors.surfaceTonalStrong]
    );
    return {
      backgroundColor: bg,
    };
  });

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`Filtro ${option.label}`}
      style={[
        styles.filterChipPressable,
        !selected && softShadow(colors.shadow),
      ]}
    >
      <Animated.View style={[styles.filterChip, animatedChipStyle]}>
        <Text
          style={[
            typography.label,
            { color: selected ? colors.primaryText : colors.textPrimary },
          ]}
        >
          {option.label}
        </Text>
      </Animated.View>
    </PressableScale>
  );
};

export default function HistorialScreen() {
  const router = useRouter();
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;
  const { selectedProfile, selectedProfileId, primaryProfileId } = useProfile();
  const activeProfile = selectedProfile ?? { id: '', label: 'tu perfil', icon: 'heart' as const };
  const { featuredDoseStatus } = useTodayDoses();
  const { records } = useHealthLog();
  const bottomInset = useFloatingTabBarInset();
  const todayIso = getToday();
  const isFirstMount = useFirstSessionMount('historial');
  const reducedMotion = useReducedMotion();

  const [activeFilter, setActiveFilter] = useState<HistorialFilterKey>('all');

  // Registros que pertenecen exclusivamente al perfil activo.
  const profileRecords = useMemo(
    () => records.filter((r) => r.profileId === selectedProfileId),
    [records, selectedProfileId]
  );

  // Citas con fecha futura (ordenadas de la más próxima a la más lejana).
  const upcomingAppointments = useMemo(
    () =>
      profileRecords
        .filter((r) => isUpcomingAppointment(r, todayIso))
        .sort((a, b) => a.dateIso.localeCompare(b.dateIso)),
    [profileRecords, todayIso]
  );

  // Registros de hoy o anteriores para la línea de tiempo.
  const pastOrTodayRecords = useMemo(
    () =>
      profileRecords
        .filter((r) => !isUpcomingAppointment(r, todayIso))
        .sort((a, b) => b.dateIso.localeCompare(a.dateIso)),
    [profileRecords, todayIso]
  );

  // Resumen combinado del día (tomas pendientes de hoy + próxima cita futura si existe).
  const dailySummaryText = useMemo(() => {
    const todayDoses =
      selectedProfileId === primaryProfileId
        ? buildExistingDosesByDate(featuredDoseStatus)[todayIso] ?? []
        : [];
    const pendingDoses = getPendingTodaySummary(todayDoses);
    const nextAppointment = upcomingAppointments[0] ?? null;
    return buildDailySummaryText(pendingDoses, nextAppointment, todayIso);
  }, [featuredDoseStatus, selectedProfileId, primaryProfileId, todayIso, upcomingAppointments]);

  const showUpcomingSection =
    upcomingAppointments.length > 0 &&
    (activeFilter === 'all' || activeFilter === 'appointments');

  const filteredTimelineRecords = useMemo(
    () => pastOrTodayRecords.filter((r) => matchesHistorialFilter(r, activeFilter)),
    [pastOrTodayRecords, activeFilter]
  );

  const hasAnyProfileRecords = profileRecords.length > 0;
  const hasVisibleResults = showUpcomingSection || filteredTimelineRecords.length > 0;

  const openRecordDetail = (recordId: string) => {
    router.push({ pathname: '/prescription', params: { id: recordId } });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: bottomInset,
        }}
      >
        <ScreenHeader
          title="Hola, Fernando"
          subtitle="Tu bitácora de salud"
          trailing={<CircleIconButton icon="user" accessibilityLabel="Mi perfil" />}
        />

        {dailySummaryText ? (
          <BitaCard
            compact
            variant="highlighted"
            icon="clock"
            inkKey="celeste"
            title={dailySummaryText}
          />
        ) : null}

        <ProfileChip
          profile={activeProfile}
          onPress={() => router.push('/(tabs)/family')}
        />

        {/* ESTADO VACÍO GLOBAL: perfil sin ningún documento registrado */}
        {!hasAnyProfileRecords ? (
          <BitaCard variant="base" style={{ marginTop: spacing.xs }}>
            <View style={{ gap: spacing.md }}>
              <IconTile icon="file-text" inkKey="celeste" />
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
                  Aún no hay documentos en {activeProfile.label}
                </Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  Escanea una receta, comprobante de cita o resultado de examen para empezar a
                  construir esta bitácora de salud.
                </Text>
              </View>
              <BitaButton
                variant="primary"
                icon="camera"
                label="Escanear primer documento"
                onPress={() => router.push('/(tabs)/scan')}
              />
            </View>
          </BitaCard>
        ) : (
          <>
            {/* Chips de filtro tonales con transición en 150ms */}
            <View
              accessibilityRole="tablist"
              accessibilityLabel="Filtrar documentos de la bitácora"
              style={styles.filterRow}
            >
              {HISTORIAL_FILTER_OPTIONS.map((option) => (
                <FilterChip
                  key={option.key}
                  option={option}
                  selected={activeFilter === option.key}
                  onPress={() => setActiveFilter(option.key)}
                />
              ))}
            </View>

            {/* Sección "Próximas" arriba para citas con fecha futura */}
            {showUpcomingSection ? (
              <Animated.View
                layout={
                  reducedMotion
                    ? undefined
                    : LinearTransition.duration(MOTION_DURATIONS.layoutTransition)
                }
                style={{ gap: spacing.sm, marginTop: spacing.xxs }}
              >
                <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
                  Próximas
                </Text>
                {upcomingAppointments.map((appointment) => (
                  <Animated.View
                    key={appointment.id}
                    layout={
                      reducedMotion
                        ? undefined
                        : LinearTransition.duration(MOTION_DURATIONS.layoutTransition)
                    }
                    entering={
                      reducedMotion
                        ? undefined
                        : FadeIn.duration(MOTION_DURATIONS.reducedFade)
                    }
                    exiting={
                      reducedMotion
                        ? undefined
                        : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                    }
                  >
                    <UpcomingAppointmentCard
                      record={appointment}
                      onPress={() => openRecordDetail(appointment.id)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            ) : null}

            {/* Estado vacío cuando un filtro no tiene coincidencias */}
            {!hasVisibleResults ? (
              <Animated.View
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(MOTION_DURATIONS.reducedFade)
                }
                exiting={
                  reducedMotion
                    ? undefined
                    : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                }
              >
                <BitaCard variant="consultation" style={{ marginTop: spacing.xs }}>
                  <View style={{ gap: spacing.sm }}>
                    <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                      Sin documentos en este filtro
                    </Text>
                    <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
                      No encontramos registros para esta categoría en el perfil de{' '}
                      {activeProfile.label}.
                    </Text>
                    <BitaButton
                      variant="secondary"
                      label="Ver todo el historial"
                      onPress={() => setActiveFilter('all')}
                    />
                  </View>
                </BitaCard>
              </Animated.View>
            ) : null}

            {/* Línea de tiempo con animaciones de layout (entrada, salida y reordenamiento con fundido) */}
            {filteredTimelineRecords.length > 0 ? (
              <>
                <View style={[styles.sectionRow, { marginTop: spacing.xs }]}>
                  <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
                    Recientes
                  </Text>
                  {activeFilter !== 'all' ? (
                    <PressableScale
                      onPress={() => setActiveFilter('all')}
                      accessibilityRole="button"
                      accessibilityLabel="Ver todo el historial"
                      style={styles.seeAll}
                    >
                      <Text style={[typography.label, { color: colors.primaryText }]}>
                        Ver todos
                      </Text>
                    </PressableScale>
                  ) : null}
                </View>

                <View style={styles.timelineList}>
                  {filteredTimelineRecords.map((record, index) => (
                    <Animated.View
                      key={record.id}
                      layout={
                        reducedMotion
                          ? undefined
                          : LinearTransition.duration(MOTION_DURATIONS.layoutTransition)
                      }
                      entering={
                        isFirstMount && !reducedMotion && index < MOTION_DELAYS.maxStaggerItems
                          ? FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                              index * MOTION_DELAYS.staggerBase
                            )
                          : reducedMotion
                          ? undefined
                          : FadeIn.duration(MOTION_DURATIONS.reducedFade)
                      }
                      exiting={
                        reducedMotion
                          ? undefined
                          : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                      }
                    >
                      <TimelineRow
                        record={record}
                        isLast={index === filteredTimelineRecords.length - 1}
                        onPress={() => openRecordDetail(record.id)}
                      />
                    </Animated.View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  filterChipPressable: {
    borderRadius: RADII.pill,
  },
  filterChip: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  seeAll: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingLeft: SPACING.sm,
  },
  timelineList: {
    marginTop: SPACING.xxs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  dateColumn: {
    minWidth: TIMELINE_METRICS.dateColumnMinWidth,
    paddingTop: SPACING.sm,
    paddingRight: SPACING.xxs,
    alignItems: 'flex-end',
  },
  axisColumn: {
    alignItems: 'center',
    marginRight: SPACING.xxs,
  },
  axisLineTop: {
    width: TIMELINE_METRICS.axisWidth,
    height: SPACING.md,
  },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineNode: {
    width: TIMELINE_METRICS.nodeSize,
    height: TIMELINE_METRICS.nodeSize,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.ringWidth,
  },
  nodeConnector: {
    width: SPACING.xxs,
    height: TIMELINE_METRICS.axisWidth,
  },
  axisLineBottom: {
    width: TIMELINE_METRICS.axisWidth,
    flex: 1,
  },
  cardColumn: {
    flex: 1,
  },
  cardColumnSpacing: {
    paddingBottom: SPACING.md,
  },
});
