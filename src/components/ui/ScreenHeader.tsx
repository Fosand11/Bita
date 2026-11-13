import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SPACING, useBitaTheme } from '../../theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Elemento a la derecha del título (p. ej. el botón de perfil o de calendario). */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Título de pantalla (30px, Fraunces SemiBold) con subtítulo discreto y un elemento opcional a la derecha. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, trailing, style }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;

  return (
    <View style={[styles.row, style]}>
      <View style={styles.texts}>
        <Text
          accessibilityRole="header"
          style={[typography.screenTitle, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              typography.secondaryText,
              { color: colors.textSecondary, marginTop: spacing.xxs },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  texts: {
    flex: 1,
  },
});
