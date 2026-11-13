import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BORDERS, RADII, SPACING, useBitaTheme } from '../../theme';
import { DoseStatus } from './DoseActionButton';
import { Icon } from './Icon';

export interface DoseStatusChipProps {
  status: DoseStatus;
}

/**
 * Estado de una toma diferenciado por forma e icono, no solo por color. Los contornos que forman
 * parte del glifo se conservan:
 * - "Pendiente" (programada): cápsula con anillo vacío + icono de círculo.
 * - "Tomada": cápsula rellena salvia + disco con check.
 * - "Omitida": etiqueta rectangular con contorno en pizarra + icono de guion.
 */
export const DoseStatusChip: React.FC<DoseStatusChipProps> = ({ status }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;

  if (status === 'pending') {
    return (
      <View
        accessible
        accessibilityLabel="Toma pendiente"
        style={[styles.pendingRing, { borderColor: colors.slateIcon }]}
      >
        <Icon name="circle" size={iconSizes.xs} color={colors.slateIcon} weight="regular" />
        <Text style={[typography.label, { color: colors.slate }]}>Pendiente</Text>
      </View>
    );
  }

  if (status === 'completed') {
    return (
      <View
        accessible
        accessibilityLabel="Toma registrada como tomada"
        style={[styles.completedPill, { backgroundColor: colors.successSurface }]}
      >
        <View style={[styles.checkDisc, { backgroundColor: colors.successFill }]}>
          <Icon name="check" size={iconSizes.xs} color={colors.onPrimary} weight="regular" />
        </View>
        <Text style={[typography.label, { color: colors.success }]}>Tomada</Text>
      </View>
    );
  }

  return (
    <View
      accessible
      accessibilityLabel="Toma omitida"
      style={[
        styles.skippedTag,
        { backgroundColor: colors.slateSurface, borderColor: colors.slateIcon },
      ]}
    >
      <Icon name="minus" size={iconSizes.xs} color={colors.slateIcon} weight="regular" />
      <Text style={[typography.label, { color: colors.slate }]}>Omitida</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pendingRing: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.pill,
    borderWidth: BORDERS.focusWidth,
  },
  completedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.pill,
  },
  checkDisc: {
    width: SPACING.lg,
    height: SPACING.lg,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skippedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    minHeight: SPACING.xxl,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.tag,
    borderWidth: BORDERS.width,
  },
});
