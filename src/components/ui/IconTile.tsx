import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  MedicationInkKey,
  RADII,
  useBitaTheme,
  useMedicationInk,
} from '../../theme';
import { Icon, IconName } from './Icon';

export interface IconTileProps {
  icon: IconName;
  /** Clave de tinta o identificador de medicamento para asignar su color fijo de tinta. */
  inkKey?: MedicationInkKey | string;
  /** Color explícito opcional (p. ej. advertencia ámbar). */
  color?: string;
  /** Color del halo cuando se usa `color` explícito. */
  haloColor?: string;
  /** Muestra un círculo muy sutil detrás del icono. */
  withSubtleCircle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Icono en peso light con el color de tinta y un halo circular muy sutil (sin cajas pastel). */
export const IconTile: React.FC<IconTileProps> = ({
  icon,
  inkKey = 'celeste',
  color,
  haloColor,
  withSubtleCircle = true,
  style,
}) => {
  const { theme } = useBitaTheme();
  const ink = useMedicationInk(inkKey);
  const resolvedColor = color ?? ink.color;
  const resolvedHalo = color ? haloColor ?? theme.colors.warningSurface : ink.subtleCircle;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.container,
        withSubtleCircle && { backgroundColor: resolvedHalo },
        style,
      ]}
    >
      <Icon name={icon} size={theme.iconSizes.xl} color={resolvedColor} weight="light" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: ACCESSIBILITY_METRICS.minTouchTarget,
    height: ACCESSIBILITY_METRICS.minTouchTarget,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
