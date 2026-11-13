import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  MOTION_DELAYS,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  SPACING,
  SQUIRCLE_CONTROL_STYLE,
  useBitaTheme,
  useMedicationInk,
} from '../../theme';
import {
  BitaCard,
  CalendarDayCell,
  CalendarStatusGlyph,
  CircleIconButton,
  DoseActionButton,
  DoseStatus,
  DoseStatusChip,
  IconTile,
  PressableScale,
  ScreenHeader,
  WeekCalendarStrip,
  WeekDayItem,
  useFloatingTabBarInset,
} from '../../components/ui';
import { useTodayDoses } from '../../state/TodayDosesContext';
import {
  AVAILABLE_MONTHS,
  FEATURED_DOSE_ID,
  WEEKDAY_FULL_NAMES,
  WEEKDAY_HEADERS,
  buildExistingDosesByDate,
  getToday,
  summarizeDayDoses,
} from '../../data/doses';
import { useFirstSessionMount } from '../../lib/sessionMount';
import { hapticSelection } from '../../lib/haptics';

type MedicationsViewMode = 'today' | 'calendar';

interface MedicationRowProps {
  medicationId: string;
  name: string;
  detail: string;
  time: string;
  status: DoseStatus;
}

/** Fila de una toma: cada medicamento recibe su tinta fija derivada de su `medicationId`. */
const MedicationRow: React.FC<MedicationRowProps> = ({
  medicationId,
  name,
  detail,
  time,
  status,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const ink = useMedicationInk(medicationId);

  return (
    <BitaCard
      compact
      variant="base"
      icon="pill"
      inkKey={ink.key}
      title={name}
      subtitle={detail}
      trailing={
        <View style={styles.rowTrailing}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>{time}</Text>
          <CircleIconButton
            icon="dots-three-vertical"
            variant="plain"
            accessibilityLabel={`Más opciones de ${name}`}
          />
        </View>
      }
    >
      <DoseStatusChip status={status} />
    </BitaCard>
  );
};

export default function MedicationsScreen() {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;
  const { featuredDoseStatus, setFeaturedDoseStatus } = useTodayDoses();
  const bottomInset = useFloatingTabBarInset();
  const todayIso = getToday();
  const isFirstMount = useFirstSessionMount('medications');
  const reducedMotion = useReducedMotion();

  const [viewMode, setViewMode] = useState<MedicationsViewMode>('today');
  const [monthIndex, setMonthIndex] = useState<number>(1); // Octubre 2026
  const [monthSlideDirection, setMonthSlideDirection] = useState<'left' | 'right'>('right');
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  // Segmented control indicator layout
  const [segmentLayouts, setSegmentLayouts] = useState<
    Partial<Record<MedicationsViewMode, { x: number; width: number }>>
  >({});
  const segmentTranslateX = useSharedValue<number>(0);
  const segmentIndicatorWidth = useSharedValue<number>(0);

  const dosesByDate = useMemo(
    () => buildExistingDosesByDate(featuredDoseStatus),
    [featuredDoseStatus]
  );

  const featuredDose = dosesByDate[todayIso]?.find((dose) => dose.id === FEATURED_DOSE_ID);
  const featuredInk = useMedicationInk(featuredDose?.medicationId ?? FEATURED_DOSE_ID);

  const weekDays: readonly WeekDayItem[] = useMemo(() => {
    const dates = [
      { iso: '2026-10-12', num: 12, idx: 0 },
      { iso: '2026-10-13', num: 13, idx: 1 },
      { iso: '2026-10-14', num: 14, idx: 2 },
      { iso: '2026-10-15', num: 15, idx: 3 },
      { iso: '2026-10-16', num: 16, idx: 4 },
      { iso: '2026-10-17', num: 17, idx: 5 },
      { iso: '2026-10-18', num: 18, idx: 6 },
    ];
    return dates.map((d) => {
      const summary = summarizeDayDoses(dosesByDate[d.iso]);
      return {
        dateIso: d.iso,
        dayInitial: WEEKDAY_HEADERS[d.idx],
        dayNumber: d.num,
        fullLabel: `${WEEKDAY_FULL_NAMES[d.idx]} ${d.num} de octubre`,
        status: summary.status,
        isToday: d.iso === todayIso,
        accessibilitySummary: summary.accessibilitySummary,
      };
    });
  }, [dosesByDate, todayIso]);

  const currentMonth = AVAILABLE_MONTHS[monthIndex];

  const monthWeeks: readonly (WeekDayItem | null)[][] = useMemo(() => {
    const cells: (WeekDayItem | null)[] = [];
    for (let i = 0; i < currentMonth.startOffsetMonday; i += 1) {
      cells.push(null);
    }
    for (let dayNum = 1; dayNum <= currentMonth.daysInMonth; dayNum += 1) {
      const paddedMonth = String(currentMonth.monthNumber).padStart(2, '0');
      const paddedDay = String(dayNum).padStart(2, '0');
      const iso = `${currentMonth.year}-${paddedMonth}-${paddedDay}`;
      const summary = summarizeDayDoses(dosesByDate[iso]);

      cells.push({
        dateIso: iso,
        dayNumber: dayNum,
        fullLabel: `${dayNum} de ${currentMonth.monthGenitive}`,
        status: summary.status,
        isToday: iso === todayIso,
        accessibilitySummary: summary.accessibilitySummary,
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const rows: (WeekDayItem | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [currentMonth, dosesByDate, todayIso]);

  const isSelectedToday = selectedDate === todayIso;
  const selectedDayDoses = dosesByDate[selectedDate] ?? [];
  const listedDoses =
    viewMode === 'today' && isSelectedToday
      ? selectedDayDoses.filter((dose) => dose.id !== FEATURED_DOSE_ID)
      : selectedDayDoses;

  const selectedDateHeading = useMemo(() => {
    const parts = selectedDate.split('-');
    const dayNum = Number(parts[2]);
    const monthNum = Number(parts[1]);
    const monthObj = AVAILABLE_MONTHS.find((m) => m.monthNumber === monthNum);
    const monthName = monthObj ? monthObj.monthGenitive : 'octubre';
    return `${dayNum} de ${monthName}${selectedDate === todayIso ? ' · Hoy' : ''}`;
  }, [selectedDate, todayIso]);

  const toggleFeatured = (current: DoseStatus) => {
    setFeaturedDoseStatus(current === 'completed' ? 'pending' : 'completed');
  };

  const handleSelectViewMode = (nextMode: MedicationsViewMode) => {
    if (nextMode === viewMode) return;
    setViewMode(nextMode);
    if (nextMode === 'today') {
      setSelectedDate(todayIso);
    }

  };

  const moveSegmentIndicator = (mode: MedicationsViewMode, animate: boolean) => {
    const layout = segmentLayouts[mode];
    if (!layout) return;
    if (animate && !reducedMotion) {
      const timing = { duration: MOTION_DURATIONS.segmented, easing: MOTION_EASINGS.easeInOut };
      segmentTranslateX.value = withTiming(layout.x, timing);
      segmentIndicatorWidth.value = withTiming(layout.width, timing);
    } else {
      segmentTranslateX.value = layout.x;
      segmentIndicatorWidth.value = layout.width;
    }
  };

  const handleSegmentLayout = (mode: MedicationsViewMode, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setSegmentLayouts((prev) => {
      const current = prev[mode];
      if (current && current.x === x && current.width === width) return prev;
      return { ...prev, [mode]: { x, width } };
    });
  };

  useEffect(() => {
    moveSegmentIndicator(viewMode, segmentIndicatorWidth.value > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, segmentLayouts]);

  const segmentIndicatorStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: SPACING.xxs,
    bottom: SPACING.xxs,
    left: 0,
    width: segmentIndicatorWidth.value,
    opacity: segmentIndicatorWidth.value > 0 ? 1 : 0,
    transform: [{ translateX: segmentTranslateX.value }],
    backgroundColor: colors.primary,
    ...SQUIRCLE_CONTROL_STYLE,
  }));

  const handlePrevMonth = () => {
    if (monthIndex > 0) {
      setMonthSlideDirection('left');
      setMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (monthIndex < AVAILABLE_MONTHS.length - 1) {
      setMonthSlideDirection('right');
      setMonthIndex((prev) => prev + 1);
    }
  };

  const renderDoseList = (doses: typeof listedDoses) =>
    doses.length > 0 ? (
      doses.map((dose, idx) => (
        <Animated.View
          key={dose.id}
          entering={
            isFirstMount && !reducedMotion && idx < MOTION_DELAYS.maxStaggerItems
              ? FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                  idx * MOTION_DELAYS.staggerBase
                )
              : undefined
          }
        >
          <MedicationRow
            medicationId={dose.medicationId}
            name={dose.name}
            detail={dose.detail}
            time={dose.time}
            status={dose.status}
          />
        </Animated.View>
      ))
    ) : (
      <BitaCard
        compact
        variant="consultation"
        title="Sin tomas registradas"
        subtitle="No hay tomas registradas para este día."
      />
    );

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
          title="Mis Medicinas"
          subtitle="Tus tomas de hoy, sin prisas"
          trailing={
            <CircleIconButton
              icon="calendar"
              accessibilityLabel={
                viewMode === 'today' ? 'Cambiar a vista de calendario' : 'Cambiar a vista de hoy'
              }
              onPress={() => handleSelectViewMode(viewMode === 'today' ? 'calendar' : 'today')}
            />
          }
        />

        {/* Selector segmentado "Hoy" / "Calendario" con indicador deslizante (~200ms) */}
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Vista de Mis Medicinas"
          style={[styles.segmentedContainer, { backgroundColor: colors.surfaceTonal }]}
        >
          <Animated.View pointerEvents="none" style={segmentIndicatorStyle} />

          {(
            [
              { id: 'today', label: 'Hoy' },
              { id: 'calendar', label: 'Calendario' },
            ] as const
          ).map((tab) => {
            const isActive = viewMode === tab.id;
            return (
              <PressableScale
                key={tab.id}
                onPress={() => handleSelectViewMode(tab.id)}
                onLayout={(e) => handleSegmentLayout(tab.id, e)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Vista ${tab.label}`}
                style={styles.segmentButton}
              >
                <Text
                  style={[
                    isActive ? typography.button : typography.buttonSecondary,
                    { color: isActive ? colors.onPrimary : colors.textPrimary },
                  ]}
                >
                  {tab.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {viewMode === 'today' ? (
          <Animated.View
            key="today-view"
            entering={reducedMotion ? undefined : FadeIn.duration(MOTION_DURATIONS.segmented)}
            exiting={reducedMotion ? undefined : FadeOut.duration(MOTION_DURATIONS.reducedFade)}
            style={styles.viewContent}
          >
            <WeekCalendarStrip
              days={weekDays}
              selectedDateIso={selectedDate}
              onSelectDay={setSelectedDate}
              style={{ marginTop: spacing.xxs }}
            />

            {/* "Próxima toma": un solo bloque */}
            {isSelectedToday && featuredDose ? (
              <BitaCard variant="highlighted">
                <Text style={[typography.label, { color: colors.textOnTonal }]}>
                  {featuredDoseStatus === 'completed'
                    ? `Toma completada · ${featuredDose.time}`
                    : featuredDoseStatus === 'skipped'
                    ? `Toma omitida · ${featuredDose.time}`
                    : 'Próxima toma'}
                </Text>
                <Text
                  style={[
                    typography.doseTime,
                    { color: colors.textPrimary, marginTop: spacing.xxs },
                  ]}
                >
                  {featuredDose.time}
                </Text>

                <View style={[styles.featuredMedicine, { marginTop: spacing.sm }]}>
                  <IconTile icon="pill" inkKey={featuredInk.key} haloColor={colors.surface} />
                  <View style={styles.featuredText}>
                    <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                      {featuredDose.name}
                    </Text>
                    <Text style={[typography.secondaryText, { color: colors.textOnTonal }]}>
                      {featuredDose.detail}
                    </Text>
                  </View>
                </View>

                <DoseActionButton
                  status={featuredDoseStatus}
                  medicationName={featuredDose.name}
                  scheduledTime="20:00"
                  onPress={toggleFeatured}
                  onSkipPress={() => setFeaturedDoseStatus('skipped')}
                  style={{ marginTop: spacing.md }}
                />
              </BitaCard>
            ) : null}

            <Text
              style={[typography.fieldLabel, { color: colors.textPrimary, marginTop: spacing.xs }]}
            >
              {isSelectedToday ? 'Más temprano' : `Tomas del ${selectedDateHeading}`}
            </Text>

            {renderDoseList(listedDoses)}
          </Animated.View>
        ) : (
          <Animated.View
            key="calendar-view"
            entering={reducedMotion ? undefined : FadeIn.duration(MOTION_DURATIONS.segmented)}
            exiting={reducedMotion ? undefined : FadeOut.duration(MOTION_DURATIONS.reducedFade)}
            style={styles.viewContent}
          >
            {/* Leyenda compacta en grid 2x2 */}
            <BitaCard compact variant="base">
              <View style={styles.legendGrid2x2}>
                <View style={styles.legendRow}>
                  <View style={styles.legendCell}>
                    <CalendarStatusGlyph status="completed" />
                    <Text style={[typography.secondaryText, { color: colors.textPrimary }]}>
                      Tomada
                    </Text>
                  </View>
                  <View style={styles.legendCell}>
                    <CalendarStatusGlyph status="partial" />
                    <Text style={[typography.secondaryText, { color: colors.textPrimary }]}>
                      Parcial
                    </Text>
                  </View>
                </View>
                <View style={styles.legendRow}>
                  <View style={styles.legendCell}>
                    <CalendarStatusGlyph status="pending" />
                    <Text style={[typography.secondaryText, { color: colors.textPrimary }]}>
                      Programada
                    </Text>
                  </View>
                  <View style={styles.legendCell}>
                    <CalendarStatusGlyph status="missed" />
                    <Text style={[typography.secondaryText, { color: colors.textPrimary }]}>
                      Omitida
                    </Text>
                  </View>
                </View>
              </View>
            </BitaCard>

            {/* Calendario mensual con deslizamiento según dirección (~250ms) */}
            <BitaCard compact variant="base">
              <View style={styles.monthHeader}>
                <CircleIconButton
                  icon="caret-left"
                  variant="outlined"
                  accessibilityLabel="Mes anterior"
                  onPress={handlePrevMonth}
                />
                <Text
                  accessibilityRole="header"
                  style={[typography.fieldLabel, styles.monthTitle, { color: colors.textPrimary }]}
                >
                  {currentMonth.label}
                </Text>
                <CircleIconButton
                  icon="caret-right"
                  variant="outlined"
                  accessibilityLabel="Mes siguiente"
                  onPress={handleNextMonth}
                />
              </View>

              <View style={styles.weekHeaderRow}>
                {WEEKDAY_HEADERS.map((letter, idx) => (
                  <View key={`${letter}-${idx}`} style={styles.weekHeaderCell}>
                    <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
                      {letter}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Contenedor del mes con animación horizontal por dirección */}
              <Animated.View
                key={`month-${monthIndex}`}
                entering={
                  reducedMotion
                    ? FadeIn.duration(MOTION_DURATIONS.reducedFade)
                    : monthSlideDirection === 'right'
                    ? SlideInRight.duration(MOTION_DURATIONS.calendarSlide)
                    : SlideInLeft.duration(MOTION_DURATIONS.calendarSlide)
                }
                style={styles.monthGrid}
              >
                {monthWeeks.map((week, rowIdx) => (
                  <View key={`week-${rowIdx}`} style={styles.monthWeekRow}>
                    {week.map((dayItem, colIdx) =>
                      dayItem ? (
                        <CalendarDayCell
                          key={dayItem.dateIso}
                          item={dayItem}
                          isSelected={dayItem.dateIso === selectedDate}
                          onSelectDay={setSelectedDate}
                          style={styles.monthDayCell}
                        />
                      ) : (
                        <View
                          key={`empty-${rowIdx}-${colIdx}`}
                          accessible={false}
                          style={styles.monthDayCell}
                        />
                      )
                    )}
                  </View>
                ))}
              </Animated.View>
            </BitaCard>

            <View style={styles.dayDetailSection}>
              <Text style={[typography.fieldLabel, { color: colors.textPrimary }]}>
                {`Tomas del ${selectedDateHeading}`}
              </Text>
              {renderDoseList(selectedDayDoses)}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  viewContent: {
    gap: SPACING.md,
  },
  segmentedContainer: {
    ...SQUIRCLE_CONTROL_STYLE,
    flexDirection: 'row',
    padding: SPACING.xxs,
    position: 'relative',
  },
  segmentButton: {
    ...SQUIRCLE_CONTROL_STYLE,
    flex: 1,
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredMedicine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featuredText: {
    flex: 1,
  },
  rowTrailing: {
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  legendGrid2x2: {
    gap: SPACING.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    paddingBottom: SPACING.xs,
  },
  weekHeaderCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGrid: {
    gap: SPACING.xxs,
  },
  monthWeekRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  monthDayCell: {
    flex: 1,
  },
  dayDetailSection: {
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
});
