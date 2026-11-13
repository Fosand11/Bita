import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { HealthLogRecord } from '../../data/healthLog';
import { BORDERS, RADII, SPACING, useBitaTheme, useMedicationInk } from '../../theme';
import { BitaCard } from './BitaCard';
import { Icon } from './Icon';
import { IconTile } from './IconTile';
import { ReviewBadge } from './ReviewBadge';

export interface HealthRecordCardProps {
  record: HealthLogRecord;
  onPress?: () => void;
}

/**
 * Contenido específico de una Receta (`prescription`) dentro del contenedor `BitaCard`.
 */
const PrescriptionRecordBody: React.FC<{ record: HealthLogRecord }> = ({ record }) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const ink = useMedicationInk(record.inkTarget);

  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <IconTile icon={record.icon} inkKey={ink.key} />
        <View style={styles.headerTexts}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{record.title}</Text>
          {record.meta ? (
            <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
              {record.meta}
            </Text>
          ) : null}
        </View>
      </View>

      {record.stampVariant ? <ReviewBadge variant={record.stampVariant} /> : null}

      {record.subtitle ? (
        <View style={[styles.dividedBox, { borderTopColor: colors.border }]}>
          <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
            {record.subtitle}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Contenido específico de un Resultado de Examen (`lab_result`) dentro del contenedor `BitaCard`.
 * Tiene icono (`flask`), tinta propia (`menta`) y píldora de laboratorio, manteniendo los sellos
 * "Revisar datos" / "Verificada". Nunca muestra valores de analitos ni interpretaciones.
 */
const LabResultRecordBody: React.FC<{ record: HealthLogRecord }> = ({ record }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;
  const ink = useMedicationInk(record.inkTarget);
  const labName =
    record.details.kind === 'lab_result' ? record.details.laboratory : record.meta;

  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <IconTile icon="flask" inkKey={ink.key} />
        <View style={styles.headerTexts}>
          {labName ? (
            <View style={[styles.labTag, { backgroundColor: ink.subtleCircle }]}>
              <Icon name="flask" size={iconSizes.xs} color={ink.color} weight="regular" />
              <Text style={[typography.label, styles.labTagText, { color: colors.textPrimary }]}>
                {labName}
              </Text>
            </View>
          ) : null}
          <Text
            style={[
              typography.cardTitle,
              { color: colors.textPrimary, marginTop: labName ? SPACING.xxs : 0 },
            ]}
          >
            {record.title}
          </Text>
        </View>
      </View>

      {record.stampVariant ? <ReviewBadge variant={record.stampVariant} /> : null}

      {record.subtitle ? (
        <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
          {record.subtitle}
        </Text>
      ) : null}
    </View>
  );
};

/**
 * Contenido específico de una Consulta pasada (`consultation`) dentro del contenedor `BitaCard`.
 */
const ConsultationRecordBody: React.FC<{ record: HealthLogRecord }> = ({ record }) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const ink = useMedicationInk(record.inkTarget);

  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <IconTile icon={record.icon} inkKey={ink.key} />
        <View style={styles.headerTexts}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{record.title}</Text>
          <Text
            style={[
              typography.secondaryText,
              { color: colors.textSecondary, marginTop: SPACING.xxs },
            ]}
          >
            {record.subtitle}
          </Text>
        </View>
      </View>
      {record.stampVariant ? <ReviewBadge variant={record.stampVariant} /> : null}
    </View>
  );
};

/**
 * Contenido específico de "Otro" documento de salud (`other`) dentro del contenedor `BitaCard`.
 */
const OtherRecordBody: React.FC<{ record: HealthLogRecord }> = ({ record }) => {
  const { theme } = useBitaTheme();
  const { colors, typography } = theme;
  const ink = useMedicationInk(record.inkTarget);

  return (
    <View style={styles.stack}>
      <View style={styles.headerRow}>
        <IconTile icon="note" inkKey={ink.key} />
        <View style={styles.headerTexts}>
          <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>{record.title}</Text>
          {record.subtitle ? (
            <Text
              style={[
                typography.secondaryText,
                { color: colors.textSecondary, marginTop: SPACING.xxs },
              ]}
            >
              {record.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {record.stampVariant ? <ReviewBadge variant={record.stampVariant} /> : null}
    </View>
  );
};

/**
 * Tarjeta de registro de la línea de tiempo que delega el contenido por tipo
 * manteniendo `BitaCard` únicamente como contenedor de superficie.
 */
export const HealthRecordCard: React.FC<HealthRecordCardProps> = ({ record, onPress }) => {
  const surfaceVariant = record.kind === 'consultation' ? 'consultation' : 'base';

  return (
    <BitaCard
      compact
      variant={surfaceVariant}
      onPress={onPress}
      accessibilityLabel={`${record.title}. ${record.subtitle}`}
      accessibilityHint="Abre el detalle del documento"
    >
      {record.kind === 'prescription' ? <PrescriptionRecordBody record={record} /> : null}
      {record.kind === 'lab_result' ? <LabResultRecordBody record={record} /> : null}
      {record.kind === 'consultation' ? <ConsultationRecordBody record={record} /> : null}
      {record.kind === 'other' ? <OtherRecordBody record={record} /> : null}
    </BitaCard>
  );
};

/**
 * Tarjeta compacta para la sección "Próximas" arriba del Historial (citas con fecha futura).
 * Da protagonismo a la fecha y la hora con una composición más compacta.
 */
export const UpcomingAppointmentCard: React.FC<HealthRecordCardProps> = ({ record, onPress }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, iconSizes } = theme;
  const ink = useMedicationInk(record.inkTarget);

  const timeText =
    record.details.kind === 'consultation' && record.details.time
      ? record.details.time
      : 'Por confirmar';
  const dateBadgeText = `${Number(record.day)} ${record.month} · ${timeText}`;

  return (
    <BitaCard
      compact
      variant="base"
      onPress={onPress}
      accessibilityLabel={`Próxima cita: ${record.title}, ${dateBadgeText}. ${record.subtitle}`}
      accessibilityHint="Abre el detalle de la cita"
    >
      <View style={styles.upcomingStack}>
        <View style={styles.upcomingTopRow}>
          <View style={[styles.upcomingDatePill, { backgroundColor: colors.surfaceTonal }]}>
            <Icon name="calendar" size={iconSizes.xs} color={colors.primary} weight="regular" />
            <Text style={[typography.label, { color: colors.primaryText }]}>{dateBadgeText}</Text>
          </View>
          {record.stampVariant === 'review' ? <ReviewBadge variant="review" /> : null}
        </View>

        <View style={styles.upcomingMainRow}>
          <IconTile icon="stethoscope" inkKey={ink.key} />
          <View style={styles.headerTexts}>
            <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
              {record.title}
            </Text>
            <Text
              style={[
                typography.secondaryText,
                { color: colors.textSecondary, marginTop: SPACING.xxs },
              ]}
            >
              {record.subtitle}
            </Text>
          </View>
        </View>
      </View>
    </BitaCard>
  );
};

const styles = StyleSheet.create({
  stack: {
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  headerTexts: {
    flex: 1,
    minWidth: SPACING.screenBottom * 3,
  },
  dividedBox: {
    borderTopWidth: BORDERS.width,
    paddingTop: SPACING.sm,
  },
  labTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xxs,
    paddingHorizontal: SPACING.xs,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.tag,
  },
  labTagText: {
    flexShrink: 1,
  },
  upcomingStack: {
    gap: SPACING.sm,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  upcomingDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    borderRadius: RADII.pill,
  },
  upcomingMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});
