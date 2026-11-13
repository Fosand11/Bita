import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BORDERS,
  RADII,
  SPACING,
  softShadow,
  squircle,
  useBitaTheme,
  useMedicationInk,
} from '../theme';
import {
  BitaButton,
  BitaCard,
  CircleIconButton,
  Icon,
  IconName,
  ReviewBadge,
} from '../components/ui';
import { useHealthLog } from '../state/HealthLogContext';
import { DocumentKind } from '../contracts/documentExtraction';

const THUMBNAIL_ICON_BY_KIND: Record<DocumentKind, IconName> = {
  prescription: 'prescription',
  consultation: 'calendar',
  lab_result: 'flask',
  other: 'note',
};

interface EditorialFieldProps {
  label: string;
  value: string;
}

/**
 * Campo informativo en estilo editorial (etiqueta pequeña + valor como texto, sin caja de input).
 */
const EditorialField: React.FC<EditorialFieldProps> = ({ label, value }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;

  return (
    <View style={[styles.editorialField, { borderBottomColor: colors.border }]}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[typography.body, { color: colors.textPrimary, marginTop: spacing.xxs }]}>
        {value}
      </Text>
    </View>
  );
};

interface PrescriptionMedicationCardProps {
  medicationId: string;
  name: string;
  subtitle: string;
  onPress: () => void;
}

const PrescriptionMedicationCard: React.FC<PrescriptionMedicationCardProps> = ({
  medicationId,
  name,
  subtitle,
  onPress,
}) => {
  const medInk = useMedicationInk(medicationId);
  return (
    <BitaCard
      variant="base"
      icon="pill"
      inkKey={medInk.key}
      title={name}
      subtitle={subtitle}
      onPress={onPress}
    />
  );
};

export default function DocumentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const { getRecordById } = useHealthLog();

  const record = getRecordById(typeof params.id === 'string' ? params.id : undefined);
  const ink = useMedicationInk(record?.inkTarget ?? 'celeste');
  const [showImagePreview, setShowImagePreview] = useState(false);

  if (!record) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={[styles.safeArea, { backgroundColor: colors.background }]}
      >
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <CircleIconButton
            icon="arrow-left"
            variant="plain"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.edgeLeft}
          />
          <BitaCard
            variant="consultation"
            title="Documento no encontrado"
            subtitle="Este registro ya no está disponible en la sesión actual."
          />
          <BitaButton
            variant="secondary"
            label="Volver al Historial"
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const sheetIcon: IconName =
    record.sourceMimeType === 'application/pdf'
      ? 'file-pdf'
      : THUMBNAIL_ICON_BY_KIND[record.kind];

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.lg, gap: spacing.lg }]}
      >
        <View style={styles.topBar}>
          <CircleIconButton
            icon="arrow-left"
            variant="plain"
            accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={styles.edgeLeft}
          />
          <CircleIconButton
            icon="dots-three-vertical"
            variant="plain"
            accessibilityLabel={`Más opciones de ${record.title}`}
            style={styles.edgeRight}
          />
        </View>

        {/* Cabecera con miniatura del documento físico */}
        <View style={styles.heroRow}>
          <View
            accessible={false}
            style={[
              styles.thumbnailFrame,
              squircle(RADII.control),
              softShadow(colors.shadow),
              { backgroundColor: colors.surfaceTonal },
            ]}
          >
            <View style={[styles.paperSheet, { backgroundColor: colors.surface }]}>
              <Icon name={sheetIcon} size={iconSizes.lg} color={ink.color} weight="light" />
              <View style={[styles.paperLine, { backgroundColor: colors.surfaceTonalStrong }]} />
              <View style={[styles.paperLine, { backgroundColor: colors.surfaceTonalStrong }]} />
              <View
                style={[
                  styles.paperLine,
                  styles.paperLineMedium,
                  { backgroundColor: colors.surfaceTonalStrong },
                ]}
              />
            </View>
          </View>

          <View style={styles.heroTexts}>
            <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
              {record.title}
            </Text>
            <Text
              style={[
                typography.secondaryText,
                { color: colors.textSecondary, marginTop: spacing.xxs },
              ]}
            >
              {record.formattedDateLabel}
            </Text>
            {record.stampVariant ? (
              <ReviewBadge variant={record.stampVariant} style={{ marginTop: spacing.xs }} />
            ) : null}
          </View>
        </View>

        {showImagePreview ? (
          <BitaCard
            variant="highlighted"
            icon={record.sourceMimeType === 'application/pdf' ? 'file-pdf' : 'image'}
            title={record.sourceFileName ?? 'Documento original adjunto'}
            subtitle="Imagen o PDF conservado tal como fue capturado para tu consulta."
          />
        ) : null}

        {/* DETALLE EDITORIAL POR TIPO DE DOCUMENTO */}
        {record.details.kind === 'prescription' ? (
          <>
            <EditorialField label="Médico tratante" value={record.details.doctorName} />
            <EditorialField label="Especialidad" value={record.details.specialty} />

            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.fieldLabel, { color: colors.textPrimary }]}>
                Medicamentos detectados
              </Text>
              {record.details.medications.map((med) => (
                <PrescriptionMedicationCard
                  key={med.id}
                  medicationId={med.id}
                  name={med.name}
                  subtitle={[med.frequency, med.duration].filter(Boolean).join(' · ')}
                  onPress={() => router.push('/(tabs)/medications')}
                />
              ))}
            </View>

            <EditorialField label="Indicaciones adicionales" value={record.details.indications} />

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <BitaButton
                variant="primary"
                label="Agregar a mis medicinas"
                onPress={() => router.push('/(tabs)/medications')}
              />
              <BitaButton
                variant="secondary"
                icon="image"
                label={
                  showImagePreview
                    ? 'Ocultar imagen del documento'
                    : 'Ver imagen del documento'
                }
                onPress={() => setShowImagePreview((prev) => !prev)}
              />
            </View>
          </>
        ) : null}

        {record.details.kind === 'consultation' ? (
          <>
            <EditorialField label="Especialidad" value={record.details.specialty} />
            <EditorialField label="Médico" value={record.details.doctorName} />
            <EditorialField
              label="Fecha y hora"
              value={record.formattedDateLabel}
            />
            {record.details.location ? (
              <EditorialField label="Lugar" value={record.details.location} />
            ) : null}
            <EditorialField label="Notas" value={record.details.notes} />

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <BitaButton
                variant="secondary"
                icon="image"
                label={
                  showImagePreview
                    ? 'Ocultar imagen del documento'
                    : 'Ver imagen del documento'
                }
                onPress={() => setShowImagePreview((prev) => !prev)}
              />
            </View>
          </>
        ) : null}

        {record.details.kind === 'lab_result' ? (
          <>
            <EditorialField label="Tipo de examen" value={record.details.examType} />
            <EditorialField label="Fecha" value={record.formattedDateLabel} />
            <EditorialField label="Laboratorio" value={record.details.laboratory} />
            <EditorialField label="Médico solicitante" value={record.details.orderingDoctor} />
            <EditorialField label="Nota" value={record.details.note} />

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <BitaButton
                variant="secondary"
                icon={record.sourceMimeType === 'application/pdf' ? 'file-pdf' : 'image'}
                label={
                  showImagePreview
                    ? 'Ocultar documento original'
                    : 'Ver imagen del documento'
                }
                onPress={() => setShowImagePreview((prev) => !prev)}
              />
            </View>
          </>
        ) : null}

        {record.details.kind === 'other' ? (
          <>
            <EditorialField label="Título" value={record.details.title} />
            <EditorialField label="Fecha" value={record.formattedDateLabel} />
            <EditorialField label="Nota" value={record.details.note} />

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <BitaButton
                variant="secondary"
                icon="image"
                label={
                  showImagePreview
                    ? 'Ocultar imagen del documento'
                    : 'Ver imagen del documento'
                }
                onPress={() => setShowImagePreview((prev) => !prev)}
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.screenBottom,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -SPACING.xs,
  },
  edgeLeft: {
    marginLeft: -SPACING.xs,
  },
  edgeRight: {
    marginRight: -SPACING.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  thumbnailFrame: {
    width: SPACING.screenBottom * 2 + SPACING.md,
    height: SPACING.screenBottom * 2 + SPACING.xl,
    padding: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperSheet: {
    width: '100%',
    height: '100%',
    borderRadius: RADII.sheet,
    padding: SPACING.xs,
    gap: SPACING.xxs,
  },
  paperLine: {
    width: '100%',
    height: SPACING.xxs,
    borderRadius: RADII.pill,
  },
  paperLineMedium: {
    width: '70%',
  },
  heroTexts: {
    flex: 1,
  },
  editorialField: {
    paddingBottom: SPACING.md,
    borderBottomWidth: BORDERS.width,
  },
});
