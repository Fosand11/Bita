import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  ACCESSIBILITY_METRICS,
  BORDERS,
  MedicationInkKey,
  RADII,
  SPACING,
  SQUIRCLE_CARD_STYLE,
  softShadow,
  squircle,
  useBitaTheme,
} from '../../theme';
import { IconName } from './Icon';
import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';
import { ReviewBadge, StampVariant } from './ReviewBadge';

/**
 * Variantes de tarjeta (sin borde: se separan por espacio y sombra sutil con tinte azul):
 * - base: superficie blanca, radio 28, sombra suave.
 * - highlighted: bloque tonal celeste (p. ej. próxima toma, panel de escaneo, resumen del día).
 * - prescription: receta (blanca, sombra, cabecera con sello y divisor fino).
 * - event / consultation: nota de consulta (superficie azulada suave, radio 24, plana).
 * - warning: aviso ámbar tonal.
 */
export type BitaCardVariant =
  | 'base'
  | 'highlighted'
  | 'event'
  | 'consultation'
  | 'prescription'
  | 'warning';

export interface BitaCardProps {
  variant?: BitaCardVariant;
  title?: string;
  subtitle?: string;
  /** Fecha u hora secundaria opcional dentro de la tarjeta. */
  timestamp?: string;
  /** Nombre del icono de Phosphor (`IconName`). */
  icon?: IconName;
  /** Clave de tinta o ID/nombre del medicamento para su color de tinta fijo. */
  inkKey?: MedicationInkKey | string;
  /** Contenido adicional a la derecha (p. ej. hora y menú de opciones). */
  trailing?: React.ReactNode;
  /** En la variante 'prescription' muestra el sello. */
  showReviewBadge?: boolean;
  reviewBadgeLabel?: string;
  stampVariant?: StampVariant;
  /** Reduce el padding interior para entradas compactas. */
  compact?: boolean;
  /** Alineación vertical de la fila (en `compact` por defecto es 'center' para centrar texto con icono). */
  alignItems?: 'flex-start' | 'center';
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Tarjeta unificada de Bita. Toda la tarjeta es tocable (opacidad como feedback) y no lleva chevrons.
 * Receta y consulta se diferencian por composición y superficie, no solo por icono.
 */
export const BitaCard: React.FC<BitaCardProps> = ({
  variant = 'base',
  title,
  subtitle,
  timestamp,
  icon,
  inkKey = 'celeste',
  trailing,
  showReviewBadge = true,
  reviewBadgeLabel,
  stampVariant = 'review',
  compact = false,
  alignItems,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;

  const isWarning = variant === 'warning';
  const isHighlighted = variant === 'highlighted';
  const isConsultation = variant === 'event' || variant === 'consultation';
  const isPrescription = variant === 'prescription';
  const isFlat = isWarning || isHighlighted || isConsultation;

  const contentAlignItems = alignItems ?? (compact ? 'center' : 'flex-start');

  const shapeStyle: ViewStyle = isConsultation
    ? squircle(RADII.consultationCard)
    : SQUIRCLE_CARD_STYLE;

  const backgroundColor = isWarning
    ? colors.warningSurface
    : isHighlighted
    ? colors.surfaceTonal
    : isConsultation
    ? colors.surfaceSoft
    : colors.surface;

  const titleColor = isWarning ? colors.warning : colors.textPrimary;
  const subtitleColor = isWarning
    ? colors.warning
    : isHighlighted
    ? colors.textOnTonal
    : colors.textSecondary;
  const showStamp = isPrescription && showReviewBadge;
  const hasText = Boolean(title || subtitle);
  const cardPadding = compact ? spacing.md : spacing.lg;

  const cardBody = isPrescription ? (
    <View style={styles.prescriptionStack}>
      <View style={styles.prescriptionHeader}>
        {icon ? <IconTile icon={icon} inkKey={inkKey} /> : null}
        <View style={styles.content}>
          {title ? (
            <Text style={[typography.cardTitle, { color: titleColor }]}>{title}</Text>
          ) : null}
          {timestamp ? (
            <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
              {timestamp}
            </Text>
          ) : null}
        </View>
      </View>

      {showStamp ? <ReviewBadge variant={stampVariant} label={reviewBadgeLabel} /> : null}

      {subtitle ? (
        <View style={[styles.prescriptionBodyBox, { borderTopColor: colors.border }]}>
          <Text style={[typography.secondaryText, { color: subtitleColor }]}>{subtitle}</Text>
        </View>
      ) : null}

      {children}
    </View>
  ) : (
    <View style={[styles.row, { alignItems: contentAlignItems }]}>
      {icon ? (
        <IconTile
          icon={icon}
          inkKey={inkKey}
          color={isWarning ? colors.warningIcon : undefined}
          haloColor={isWarning ? colors.surface : isHighlighted ? colors.surface : undefined}
        />
      ) : null}

      <View style={[styles.content, contentAlignItems === 'center' && styles.contentCentered]}>
        {title ? (
          <View
            style={[
              styles.titleRow,
              contentAlignItems === 'center' && styles.titleRowCentered,
            ]}
          >
            <Text style={[typography.cardTitle, styles.title, { color: titleColor }]}>
              {title}
            </Text>
            {timestamp ? (
              <Text style={[typography.marginDate, { color: colors.textSecondary }]}>
                {timestamp}
              </Text>
            ) : null}
          </View>
        ) : null}

        {subtitle ? (
          <Text
            style={[
              typography.secondaryText,
              { color: subtitleColor, marginTop: title ? SPACING.xxs : 0 },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}

        {children ? (
          <View style={hasText ? { marginTop: spacing.sm } : undefined}>{children}</View>
        ) : null}
      </View>

      {trailing}
    </View>
  );

  const surfaceStyle: StyleProp<ViewStyle> = [
    styles.card,
    shapeStyle,
    !isFlat && softShadow(colors.shadow),
    { backgroundColor, padding: cardPadding },
  ];

  if (!onPress) {
    return <View style={[surfaceStyle, style]}>{cardBody}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      style={[
        surfaceStyle,
        styles.pressableCard,
        style,
      ]}
    >
      {cardBody}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 0,
  },
  pressableCard: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget,
  },
  pressedState: {
    opacity: ACCESSIBILITY_METRICS.pressedOpacity,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  prescriptionStack: {
    gap: SPACING.xs,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  prescriptionBodyBox: {
    borderTopWidth: BORDERS.width,
    paddingTop: SPACING.sm,
  },
  content: {
    flex: 1,
    minWidth: SPACING.screenBottom * 3,
  },
  contentCentered: {
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  titleRowCentered: {
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
});
