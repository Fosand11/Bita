import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BORDERS, RADII, SPACING, softShadow, squircle, useBitaTheme } from '../../theme';
import { Icon } from './Icon';

/** Ilustración del visor de escaneo: marco con esquinas y una receta al centro. Decorativa. */
export const ScanFrameIllustration: React.FC = () => {
  const { theme } = useBitaTheme();
  const { colors, iconSizes } = theme;
  const accent = colors.inks.celeste.color;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.wrap}
    >
      <View style={[styles.corner, styles.topLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.topRight, { borderColor: accent }]} />
      <View style={[styles.corner, styles.bottomLeft, { borderColor: accent }]} />
      <View style={[styles.corner, styles.bottomRight, { borderColor: accent }]} />

      <View
        style={[
          styles.sheet,
          squircle(RADII.badge),
          softShadow(colors.shadow),
          { backgroundColor: colors.surface },
        ]}
      >
        <Icon name="prescription" size={iconSizes.xl} color={accent} weight="light" />
        <View style={[styles.line, { backgroundColor: colors.surfaceTonalStrong }]} />
        <View style={[styles.line, { backgroundColor: colors.surfaceTonalStrong }]} />
        <View
          style={[styles.line, styles.lineShort, { backgroundColor: colors.surfaceTonalStrong }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: SPACING.screenBottom * 5,
    height: SPACING.screenBottom * 4 + SPACING.xl,
    alignSelf: 'center',
    marginVertical: SPACING.xxs,
  },
  corner: {
    position: 'absolute',
    width: SPACING.xxl,
    height: SPACING.xxl,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: BORDERS.cornerWidth,
    borderLeftWidth: BORDERS.cornerWidth,
    borderTopLeftRadius: RADII.badge,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: BORDERS.cornerWidth,
    borderRightWidth: BORDERS.cornerWidth,
    borderTopRightRadius: RADII.badge,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDERS.cornerWidth,
    borderLeftWidth: BORDERS.cornerWidth,
    borderBottomLeftRadius: RADII.badge,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDERS.cornerWidth,
    borderRightWidth: BORDERS.cornerWidth,
    borderBottomRightRadius: RADII.badge,
  },
  sheet: {
    position: 'absolute',
    left: SPACING.screenBottom + SPACING.sm,
    top: SPACING.xxl,
    width: SPACING.screenBottom * 2 + SPACING.md,
    height: SPACING.screenBottom * 3,
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  line: {
    width: '100%',
    height: SPACING.xxs,
    borderRadius: RADII.pill,
  },
  lineShort: {
    width: '60%',
  },
});
