import React, { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  ACCESSIBILITY_METRICS,
  BORDERS,
  MOTION_DELAYS,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  RADII,
  SPACING,
  SQUIRCLE_CARD_STYLE,
  SQUIRCLE_CONTROL_STYLE,
  softShadow,
  squircle,
  useBitaTheme,
} from '../../theme';
import {
  BitaButton,
  BitaCard,
  BitaInput,
  CircleIconButton,
  Icon,
  IconTile,
  PressableScale,
  ProcessingLoader,
  ProfileId,
  ReviewBadge,
  ScanFrameIllustration,
  ScanProcessingView,
  ScreenHeader,
  useFloatingTabBarInset,
} from '../../components/ui';
import { hapticLight, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { announceAccessibility } from '../../lib/accessibility';
import {
  DocumentExtractionError,
  DocumentExtractionPayload,
  DocumentFileInput,
  DocumentInputSource,
  DocumentKind,
  ExtractedField,
  parseLocalDateToExtractedIso,
  ReviewReason,
  ScanDocumentTypeOption,
} from '../../contracts/documentExtraction';
import { documentExtractionService } from '../../services/documentExtractionService';
import { api } from '../../lib/api';
import { formatIsoDateParts } from '../../data/healthLog';
import { useProfile } from '../../state/ProfileContext';
import { useHealthLog } from '../../state/HealthLogContext';

type ScanStep = 'capturing' | 'consent' | 'processing' | 'confirming' | 'error';

const SCAN_TYPE_CHIPS: readonly { key: ScanDocumentTypeOption; label: string }[] = [
  { key: 'auto', label: 'Automático' },
  { key: 'prescription', label: 'Receta' },
  { key: 'consultation', label: 'Cita' },
  { key: 'lab_result', label: 'Resultado' },
  { key: 'other', label: 'Otro' },
];

const DETECTED_KIND_LABELS: Record<DocumentKind, string> = {
  prescription: 'Receta',
  consultation: 'Cita',
  lab_result: 'Resultado',
  other: 'Otro',
};

const DETECTED_KIND_OPTIONS: readonly DocumentKind[] = [
  'prescription',
  'consultation',
  'lab_result',
  'other',
];

const REASON_LABELS: Record<ReviewReason, string> = {
  ilegible: 'Texto poco claro en el documento',
  ambiguo: 'Dato ambiguo (verifica el formato)',
  faltante: 'Dato no encontrado en el documento',
};

function buildMockFileInput(source: DocumentInputSource): DocumentFileInput {
  if (source === 'pdf') {
    return {
      id: `doc-${Date.now()}`,
      source: 'pdf',
      fileName: 'documento-salud.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 420_000,
    };
  }
  if (source === 'gallery') {
    return {
      id: `doc-${Date.now()}`,
      source: 'gallery',
      fileName: 'foto-galeria-salud.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1_250_000,
    };
  }
  return {
    id: `doc-${Date.now()}`,
    source: 'camera',
    fileName: 'captura-camara-salud.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1_480_000,
  };
}

interface ReviewableFieldBoxProps {
  field: ExtractedField<string>;
  label: string;
  placeholder?: string;
  errorMessage?: string;
  helperText?: string;
  multiline?: boolean;
  onChangeValue: (nextValue: string) => void;
  onConfirmReview: () => void;
}

/**
 * Envuelve un campo extraído. Si `field.needsReview` es `true`, lo resalta en ámbar suave
 * (`colors.warningSurface`) con el sello "Revisar datos", el motivo y un botón para confirmarlo.
 */
const ReviewableFieldBox: React.FC<ReviewableFieldBoxProps> = ({
  field,
  label,
  placeholder,
  errorMessage,
  helperText,
  multiline = false,
  onChangeValue,
  onConfirmReview,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;

  const handleConfirm = () => {
    hapticSelection();
    announceAccessibility(`Campo ${label} verificado`);
    onConfirmReview();
  };

  if (!field.needsReview) {
    return (
      <BitaInput
        label={label}
        value={field.value ?? ''}
        placeholder={placeholder}
        errorMessage={errorMessage}
        helperText={helperText}
        multiline={multiline}
        onChangeText={onChangeValue}
      />
    );
  }

  const reasonCopy = field.reason ? REASON_LABELS[field.reason] : REASON_LABELS.ambiguo;

  return (
    <View
      style={[
        styles.reviewHighlightBox,
        SQUIRCLE_CARD_STYLE,
        { backgroundColor: colors.warningSurface, padding: spacing.md, gap: spacing.xs },
      ]}
    >
      <View style={styles.reviewHeaderRow}>
        <ReviewBadge variant="review" />
        <PressableScale
          onPress={handleConfirm}
          accessibilityRole="button"
          accessibilityLabel={`Confirmar campo ${label}`}
          style={[
            styles.confirmFieldChip,
            { backgroundColor: colors.surface },
          ]}
        >
          <Icon name="check" size={theme.iconSizes.xs} color={colors.primary} weight="regular" />
          <Text style={[typography.label, { color: colors.primaryText }]}>Confirmar dato</Text>
        </PressableScale>
      </View>

      <Text style={[typography.secondaryText, { color: colors.warning }]}>
        {reasonCopy}
        {field.rawText ? ` (“${field.rawText}”)` : ''}
      </Text>

      <BitaInput
        label={label}
        value={field.value ?? ''}
        placeholder={placeholder}
        errorMessage={errorMessage}
        helperText={helperText}
        multiline={multiline}
        onChangeText={onChangeValue}
      />
    </View>
  );
};

export default function ScanScreen() {
  const router = useRouter();
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const bottomInset = useFloatingTabBarInset();
  const reducedMotion = useReducedMotion();

  const { selectedProfileId, setSelectedProfileId, profiles } = useProfile();
  const { hasAcceptedScanConsent, acceptScanConsent, refreshRecords } = useHealthLog();

  const [step, setStep] = useState<ScanStep>('capturing');
  const [selectedTypeOption, setSelectedTypeOption] = useState<ScanDocumentTypeOption>('auto');

  const [pendingSource, setPendingSource] = useState<DocumentInputSource | null>(null);
  const [permissionDeniedMessage, setPermissionDeniedMessage] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<DocumentFileInput | null>(null);
  const [extractionPayload, setExtractionPayload] = useState<DocumentExtractionPayload | null>(
    null
  );
  const [extractionError, setExtractionError] = useState<DocumentExtractionError | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [targetProfileId, setTargetProfileId] = useState<ProfileId>(selectedProfileId);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showProfilePicker, setShowProfilePicker] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [dateError, setDateError] = useState<string | undefined>(undefined);

  const runExtraction = async (file: DocumentFileInput, forcedKind?: DocumentKind) => {
    setCurrentFile(file);
    setExtractionError(null);
    setDateError(undefined);
    setShowDocumentPreview(false);
    setStep('processing');

    const resolvedForced: DocumentKind | undefined =
      forcedKind ?? (selectedTypeOption === 'auto' ? undefined : selectedTypeOption);

    const response = await documentExtractionService.extract(file, resolvedForced, targetProfileId);

    if (!response.ok) {
      setExtractionError(response.error);
      setStep('error');
      return;
    }

    setExtractionPayload(response.extraction);
    setTargetProfileId(selectedProfileId);
    announceAccessibility('Documento procesado. Datos listos para revisión.');
    setStep('confirming');
  };

  const captureRealDocument = async (
    source: DocumentInputSource
  ): Promise<DocumentFileInput | null> => {
    setPermissionDeniedMessage(null);
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDeniedMessage(
            'Bita necesita acceso a la cámara para fotografiar y registrar tus recetas, comprobantes y resultados médicos. Puedes habilitarlo en la Configuración de tu teléfono.'
          );
          return null;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: false,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return null;
        }
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
          setExtractionError({
            code: 'unsupported_file',
            title: 'Archivo demasiado pesado',
            message:
              'El documento supera el límite de 20 MB. Intenta tomar una foto más cercana o recortarla.',
            retryable: true,
          });
          setStep('error');
          return null;
        }
        return {
          id: `cam-${Date.now()}`,
          source: 'camera',
          fileName: asset.fileName ?? `captura-${Date.now()}.jpg`,
          mimeType: (asset.mimeType as any) ?? 'image/jpeg',
          sizeBytes: asset.fileSize ?? 1_400_000,
          uri: asset.uri,
        };
      }

      if (source === 'gallery') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDeniedMessage(
            'Bita necesita acceso a tu galería para adjuntar fotos de tus documentos de salud. Puedes habilitarlo en la Configuración de tu teléfono.'
          );
          return null;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: false,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return null;
        }
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 20 * 1024 * 1024) {
          setExtractionError({
            code: 'unsupported_file',
            title: 'Archivo demasiado pesado',
            message:
              'La imagen supera el límite de 20 MB. Selecciona una imagen más liviana.',
            retryable: true,
          });
          setStep('error');
          return null;
        }
        return {
          id: `gal-${Date.now()}`,
          source: 'gallery',
          fileName: asset.fileName ?? `documento-${Date.now()}.jpg`,
          mimeType: (asset.mimeType as any) ?? 'image/jpeg',
          sizeBytes: asset.fileSize ?? 1_200_000,
          uri: asset.uri,
        };
      }

      if (source === 'pdf') {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf'],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return null;
        }
        const asset = result.assets[0];
        if (asset.size && asset.size > 20 * 1024 * 1024) {
          setExtractionError({
            code: 'unsupported_file',
            title: 'Archivo demasiado pesado',
            message:
              'El archivo PDF supera el límite de 20 MB. Por favor elige un archivo más liviano.',
            retryable: true,
          });
          setStep('error');
          return null;
        }
        const isPdf =
          asset.mimeType === 'application/pdf' ||
          asset.name?.toLowerCase().endsWith('.pdf');
        if (!isPdf) {
          setExtractionError({
            code: 'unsupported_file',
            title: 'Formato no admitido',
            message: 'Por favor selecciona un archivo PDF válido.',
            retryable: true,
          });
          setStep('error');
          return null;
        }
        return {
          id: `pdf-${Date.now()}`,
          source: 'pdf',
          fileName: asset.name ?? 'documento.pdf',
          mimeType: 'application/pdf',
          sizeBytes: asset.size ?? 450_000,
          uri: asset.uri,
        };
      }
    } catch {
      return buildMockFileInput(source);
    }
    return buildMockFileInput(source);
  };

  const handleTriggerInput = async (source: DocumentInputSource) => {
    if (!hasAcceptedScanConsent) {
      setPendingSource(source);
      setStep('consent');
      return;
    }
    const realFile = await captureRealDocument(source);
    if (realFile) {
      void runExtraction(realFile);
    }
  };

  const handleAcceptConsentAndContinue = async () => {
    acceptScanConsent();
    const nextSource = pendingSource ?? 'camera';
    setPendingSource(null);
    const realFile = await captureRealDocument(nextSource);
    if (realFile) {
      void runExtraction(realFile);
    }
  };

  const handleChangeDetectedType = (newKind: DocumentKind) => {
    setShowTypePicker(false);
    if (!currentFile) {
      return;
    }
    void runExtraction(currentFile, newKind);
  };

  const updateEditedField = (
    current: ExtractedField<string>,
    nextText: string
  ): ExtractedField<string> => ({
    value: nextText,
    needsReview: false,
    reason: null,
  });

  const confirmReviewField = (current: ExtractedField<string>): ExtractedField<string> => ({
    ...current,
    needsReview: false,
    reason: null,
  });

  const resolveValidatedIsoDate = (rawValue: string | null): string | null => {
    const parsed = parseLocalDateToExtractedIso(rawValue);
    return parsed.value;
  };

  const handleSaveConfirmedDocument = async () => {
    if (!extractionPayload || extractionPayload.detectedKind !== 'prescription') {
      return;
    }

    // Regla 5: no se guarda sin fecha válida (admite YYYY-MM-DD o dd/mm/aaaa).
    const validIsoDate = resolveValidatedIsoDate(extractionPayload.fields.dateIso.value);
    if (!validIsoDate) {
      setDateError('Ingresa una fecha válida (por ejemplo 2026-10-18 o 18/10/2026) para guardar.');
      return;
    }
    setDateError(undefined);

    const f = extractionPayload.fields;
    const meds = f.medications.value ?? [];
    const meta = documentExtractionService.getLastPrescriptionMeta();

    setIsSaving(true);
    try {
      if (meta) {
        await Promise.all(
          meds.map((med, idx) => {
            const medicationId = meta.medicationIds[idx];
            if (!medicationId) return Promise.resolve();
            return api.put(`/profiles/${targetProfileId}/medications/${medicationId}`, {
              name: med.name.value?.trim() || 'Medicamento',
              dosage: med.dose.value?.trim() || null,
              frequency: med.frequency.value?.trim() || null,
              instructions: med.duration.value?.trim() || null,
            });
          })
        );
      }

      setSelectedProfileId(targetProfileId);
      await refreshRecords();
      hapticSuccess();
      announceAccessibility('Documento guardado en tu bitácora de salud');
      setStep('capturing');
      setExtractionPayload(null);
      router.replace('/(tabs)');
    } catch {
      setExtractionError({
        code: 'server_error',
        title: 'No se pudo guardar',
        message: 'Hubo un problema al guardar los cambios. Intenta de nuevo.',
        retryable: true,
      });
      setStep('error');
    } finally {
      setIsSaving(false);
    }
  };

  const targetProfileOption =
    profiles.find((p) => p.id === targetProfileId) ?? profiles[0];

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.md,
          paddingBottom: bottomInset,
        }}
      >
        <CircleIconButton
          icon="arrow-left"
          variant="plain"
          accessibilityLabel="Volver"
          onPress={() => {
            if (step !== 'capturing') {
              setStep('capturing');
              return;
            }
            router.back();
          }}
          style={styles.backButton}
        />

        <ScreenHeader
          title="Escanear documento"
          subtitle="Agrega recetas, citas, resultados de exámenes u otros documentos a tu bitácora de salud."
        />


        {/* PASO 1: CAPTURANDO (Selector de tipo + 3 entradas) */}
        {step === 'capturing' ? (
          <>
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.fieldLabel, { color: colors.textPrimary }]}>
                Tipo de documento (opcional)
              </Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Tipo de documento a escanear"
                style={styles.chipsWrap}
              >
                {SCAN_TYPE_CHIPS.map((chip) => {
                  const selected = selectedTypeOption === chip.key;
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() => setSelectedTypeOption(chip.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Tipo ${chip.label}`}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: selected ? colors.surfaceTonalStrong : colors.surface,
                        },
                        !selected && softShadow(colors.shadow),
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          typography.label,
                          { color: selected ? colors.primaryText : colors.textPrimary },
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <BitaCard variant="highlighted" style={{ marginTop: spacing.xxs }}>
              <View style={{ gap: spacing.md }}>
                <ScanFrameIllustration />

                <View style={{ gap: spacing.sm }}>
                  <BitaButton
                    variant="primary"
                    icon="camera"
                    label="Tomar fotografía"
                    onPress={() => handleTriggerInput('camera')}
                  />
                  <BitaButton
                    variant="surface"
                    icon="image"
                    label="Seleccionar de la galería"
                    onPress={() => handleTriggerInput('gallery')}
                  />
                  <BitaButton
                    variant="surface"
                    icon="file-pdf"
                    label="Subir archivo PDF"
                    onPress={() => handleTriggerInput('pdf')}
                  />
                </View>
              </View>
            </BitaCard>

            {permissionDeniedMessage ? (
              <BitaCard variant="warning" style={{ marginTop: spacing.xs }}>
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.cardTitle, { color: colors.warning }]}>
                    Permiso necesario
                  </Text>
                  <Text style={[typography.body, { color: colors.textPrimary }]}>
                    {permissionDeniedMessage}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
                    <BitaButton
                      variant="primary"
                      label="Abrir Configuración"
                      onPress={() => {
                        void Linking.openSettings();
                        setPermissionDeniedMessage(null);
                      }}
                      style={{ flex: 1 }}
                    />
                    <BitaButton
                      variant="surface"
                      label="Cerrar"
                      onPress={() => setPermissionDeniedMessage(null)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              </BitaCard>
            ) : null}

            <BitaCard
              variant="warning"
              icon="shield-warning"
              title="Tú tienes la última palabra"
              subtitle="Podrás revisar y corregir cualquier fecha, especialista o indicación antes de guardarla en tu bitácora."
            />
          </>
        ) : null}

        {/* PASO OPCIONAL: CONSENTIMIENTO PREVIO AL PRIMER ESCANEO */}
        {step === 'consent' ? (
          <BitaCard variant="base">
            <View style={{ gap: spacing.md }}>
              <IconTile icon="shield-warning" inkKey="celeste" />
              <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
                Antes de escanear tu primer documento
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                [Texto de consentimiento informado de ejemplo: Al continuar, autorizas la lectura
                asistida de tu documento de salud únicamente para organizar los datos en tu
                bitácora. Bita no interpreta resultados ni reemplaza la orientación de tu médico.]
              </Text>
              <View style={{ gap: spacing.sm }}>
                <BitaButton
                  variant="primary"
                  icon="check"
                  label="Aceptar y continuar"
                  onPress={handleAcceptConsentAndContinue}
                />
                <BitaButton
                  variant="secondary"
                  label="Ahora no"
                  onPress={() => {
                    setPendingSource(null);
                    setStep('capturing');
                  }}
                />
              </View>
            </View>
          </BitaCard>
        ) : null}

        {/* PASO 2: PROCESANDO */}
        {step === 'processing' ? (
          <BitaCard variant="highlighted">
            <ScanProcessingView file={currentFile} />
          </BitaCard>
        ) : null}

        {/* PASO 3: ERROR CON REINTENTO */}
        {step === 'error' && extractionError ? (
          <Animated.View
            entering={reducedMotion ? undefined : FadeIn.duration(MOTION_DURATIONS.reducedFade)}
          >
            <BitaCard variant="base">
              <View style={{ gap: spacing.md }}>
                <IconTile
                  icon="warning-circle"
                  color={colors.errorIcon}
                  haloColor={colors.errorSurface}
                />
              <View style={{ gap: spacing.xs }}>
                <Text style={[typography.sectionHeader, { color: colors.textPrimary }]}>
                  {extractionError.title}
                </Text>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {extractionError.message}
                </Text>
              </View>

              <View style={{ gap: spacing.sm }}>
                {extractionError.retryable && currentFile ? (
                  <BitaButton
                    variant="primary"
                    icon="arrows-clockwise"
                    label="Reintentar lectura"
                    onPress={() => {
                      void runExtraction(currentFile);
                    }}
                  />
                ) : null}
                <BitaButton
                  variant="secondary"
                  label="Elegir otro archivo"
                  onPress={() => setStep('capturing')}
                />
              </View>
            </View>
          </BitaCard>
          </Animated.View>
        ) : null}

        {/* PASO 4: CONFIRMACIÓN DE DATOS EXTRAÍDOS */}
        {step === 'confirming' && extractionPayload ? (
          <View style={{ gap: spacing.md }}>
            {/* Cabecera con miniatura del documento y chips editables de Tipo y Perfil */}
            <BitaCard variant="base">
              <View style={styles.confirmHeroRow}>
                <View
                  accessible={false}
                  style={[
                    styles.thumbnailFrame,
                    squircle(RADII.control),
                    { backgroundColor: colors.surfaceTonal, overflow: 'hidden' },
                  ]}
                >
                  {currentFile?.uri && currentFile.source !== 'pdf' ? (
                    <Image
                      source={{ uri: currentFile.uri }}
                      style={styles.heroThumbnailImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.paperSheet, { backgroundColor: colors.surface }]}>
                      <Icon
                        name={currentFile?.source === 'pdf' ? 'file-pdf' : 'file-text'}
                        size={iconSizes.lg}
                        color={colors.primary}
                        weight="light"
                      />
                      <View
                        style={[styles.paperLine, { backgroundColor: colors.surfaceTonalStrong }]}
                      />
                      <View
                        style={[
                          styles.paperLine,
                          styles.paperLineShort,
                          { backgroundColor: colors.surfaceTonalStrong },
                        ]}
                      />
                    </View>
                  )}
                </View>

                <View style={styles.confirmHeroMeta}>
                  <Pressable
                    onPress={() => setShowTypePicker((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={`Detectamos ${
                      DETECTED_KIND_LABELS[extractionPayload.detectedKind]
                    }. Toca para cambiar el tipo de documento`}
                    style={({ pressed }) => [
                      styles.editableMetaChip,
                      { backgroundColor: colors.surfaceTonal },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[typography.label, { color: colors.primaryText }]}>
                      Detectamos: {DETECTED_KIND_LABELS[extractionPayload.detectedKind]}
                    </Text>
                    <Icon
                      name="arrows-clockwise"
                      size={iconSizes.xs}
                      color={colors.primary}
                      weight="regular"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => setShowProfilePicker((prev) => !prev)}
                    accessibilityRole="button"
                    accessibilityLabel={`Guardando en ${targetProfileOption?.label ?? 'tu perfil'}. Toca para cambiar de perfil`}
                    style={({ pressed }) => [
                      styles.editableMetaChip,
                      { backgroundColor: colors.surfaceSoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon
                      name={targetProfileOption?.icon ?? 'heart'}
                      size={iconSizes.xs}
                      color={colors.primary}
                      weight="regular"
                    />
                    <Text style={[typography.label, { color: colors.textPrimary }]}>
                      Guardando en: {targetProfileOption?.label ?? 'tu perfil'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Selector desplegable si el usuario toca "Detectamos: [tipo]" */}
              {showTypePicker ? (
                <View
                  style={[
                    styles.inlinePickerBox,
                    { borderTopColor: colors.border, marginTop: spacing.md },
                  ]}
                >
                  <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
                    Cambiar tipo de documento (volverá a leer el archivo):
                  </Text>
                  <View style={styles.chipsWrap}>
                    {DETECTED_KIND_OPTIONS.map((kindOption) => {
                      const isCurrent = extractionPayload.detectedKind === kindOption;
                      return (
                        <Pressable
                          key={kindOption}
                          onPress={() => handleChangeDetectedType(kindOption)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isCurrent }}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: isCurrent
                                ? colors.primary
                                : colors.surfaceTonal,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.label,
                              { color: isCurrent ? colors.onPrimary : colors.primaryText },
                            ]}
                          >
                            {DETECTED_KIND_LABELS[kindOption]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Selector desplegable si el usuario toca "Guardando en: [perfil]" */}
              {showProfilePicker ? (
                <View
                  style={[
                    styles.inlinePickerBox,
                    { borderTopColor: colors.border, marginTop: spacing.md },
                  ]}
                >
                  <Text style={[typography.secondaryText, { color: colors.textSecondary }]}>
                    Elige en qué expediente guardar este documento:
                  </Text>
                  <View style={styles.chipsWrap}>
                    {profiles.map((profileOption) => {
                      const isCurrent = targetProfileId === profileOption.id;
                      return (
                        <Pressable
                          key={profileOption.id}
                          onPress={() => {
                            setTargetProfileId(profileOption.id);
                            setShowProfilePicker(false);
                          }}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isCurrent }}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: isCurrent
                                ? colors.primary
                                : colors.surfaceTonal,
                            },
                            pressed && styles.pressed,
                          ]}
                        >
                          <Text
                            style={[
                              typography.label,
                              { color: isCurrent ? colors.onPrimary : colors.primaryText },
                            ]}
                          >
                            {profileOption.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </BitaCard>

            {/* Vista previa opcional del documento físico */}
            {showDocumentPreview ? (
              <BitaCard
                variant="highlighted"
                icon={currentFile?.source === 'pdf' ? 'file-pdf' : 'image'}
                title={currentFile?.fileName ?? 'Documento escaneado'}
                subtitle="Vista previa del archivo original adjunto a este registro."
              />
            ) : null}

            {/* FORMULARIO DINÁMICO SEGÚN EL TIPO DETECTADO */}
            {extractionPayload.detectedKind === 'prescription' ? (
              <Animated.View
                key="prescription-form"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(MOTION_DURATIONS.segmented)
                }
                exiting={
                  reducedMotion
                    ? undefined
                    : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                }
                style={{ gap: spacing.md }}
              >
                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          0 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Fecha de la receta (AAAA-MM-DD)"
                    field={extractionPayload.fields.dateIso}
                    errorMessage={dateError}
                    placeholder="2026-10-17"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: updateEditedField(extractionPayload.fields.dateIso, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: confirmReviewField(extractionPayload.fields.dateIso),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          1 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Médico tratante"
                    field={extractionPayload.fields.doctorName}
                    placeholder="Nombre del médico"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          doctorName: updateEditedField(extractionPayload.fields.doctorName, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          doctorName: confirmReviewField(extractionPayload.fields.doctorName),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          2 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Especialidad"
                    field={extractionPayload.fields.specialty}
                    placeholder="Ej. Cardiología"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          specialty: updateEditedField(extractionPayload.fields.specialty, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          specialty: confirmReviewField(extractionPayload.fields.specialty),
                        },
                      })
                    }
                  />
                </Animated.View>

                {(extractionPayload.fields.medications.value ?? []).map((med, medIndex) => (
                  <BitaCard key={`med-item-${medIndex}`} variant="base">
                    <View style={{ gap: spacing.sm }}>
                      <Text style={[typography.cardTitle, { color: colors.textPrimary }]}>
                        Medicamento {medIndex + 1}
                      </Text>

                      <ReviewableFieldBox
                        label="Nombre del medicamento"
                        field={med.name}
                        onChangeValue={(text) => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            name: updateEditedField(med.name, text),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                        onConfirmReview={() => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            name: confirmReviewField(med.name),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                      />

                      <ReviewableFieldBox
                        label="Dosis"
                        field={med.dose}
                        onChangeValue={(text) => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            dose: updateEditedField(med.dose, text),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                        onConfirmReview={() => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            dose: confirmReviewField(med.dose),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                      />

                      <ReviewableFieldBox
                        label="Frecuencia"
                        field={med.frequency}
                        onChangeValue={(text) => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            frequency: updateEditedField(med.frequency, text),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                        onConfirmReview={() => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            frequency: confirmReviewField(med.frequency),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                      />

                      <ReviewableFieldBox
                        label="Duración"
                        field={med.duration}
                        onChangeValue={(text) => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            duration: updateEditedField(med.duration, text),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                        onConfirmReview={() => {
                          const list = [...(extractionPayload.fields.medications.value ?? [])];
                          list[medIndex] = {
                            ...list[medIndex],
                            duration: confirmReviewField(med.duration),
                          };
                          setExtractionPayload({
                            ...extractionPayload,
                            fields: {
                              ...extractionPayload.fields,
                              medications: {
                                ...extractionPayload.fields.medications,
                                value: list,
                                needsReview: false,
                              },
                            },
                          });
                        }}
                      />
                    </View>
                  </BitaCard>
                ))}

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          4 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Indicaciones"
                    field={extractionPayload.fields.indications}
                    placeholder="Indicaciones generales de la receta"
                    multiline
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          indications: updateEditedField(extractionPayload.fields.indications, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          indications: confirmReviewField(extractionPayload.fields.indications),
                        },
                      })
                    }
                  />
                </Animated.View>
              </Animated.View>
            ) : null}

            {extractionPayload.detectedKind === 'consultation' ? (
              <Animated.View
                key="consultation-form"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(MOTION_DURATIONS.segmented)
                }
                exiting={
                  reducedMotion
                    ? undefined
                    : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                }
                style={{ gap: spacing.md }}
              >
                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          0 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Especialidad"
                    field={extractionPayload.fields.specialty}
                    placeholder="Ej. Oftalmología"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          specialty: updateEditedField(extractionPayload.fields.specialty, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          specialty: confirmReviewField(extractionPayload.fields.specialty),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          1 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Médico"
                    field={extractionPayload.fields.doctorName}
                    placeholder="Nombre del especialista"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          doctorName: updateEditedField(extractionPayload.fields.doctorName, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          doctorName: confirmReviewField(extractionPayload.fields.doctorName),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          2 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Fecha (AAAA-MM-DD)"
                    field={extractionPayload.fields.dateIso}
                    errorMessage={dateError}
                    placeholder="2026-10-18"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: updateEditedField(extractionPayload.fields.dateIso, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: confirmReviewField(extractionPayload.fields.dateIso),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          3 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Hora"
                    field={extractionPayload.fields.time}
                    placeholder="09:00"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          time: updateEditedField(extractionPayload.fields.time, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          time: confirmReviewField(extractionPayload.fields.time),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          4 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Lugar"
                    field={extractionPayload.fields.location}
                    placeholder="Clínica o consultorio"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          location: updateEditedField(extractionPayload.fields.location, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          location: confirmReviewField(extractionPayload.fields.location),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          5 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Notas"
                    field={extractionPayload.fields.notes}
                    placeholder="Indicaciones o motivos de la cita"
                    multiline
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          notes: updateEditedField(extractionPayload.fields.notes, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          notes: confirmReviewField(extractionPayload.fields.notes),
                        },
                      })
                    }
                  />
                </Animated.View>
              </Animated.View>
            ) : null}

            {extractionPayload.detectedKind === 'lab_result' ? (
              <Animated.View
                key="lab_result-form"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(MOTION_DURATIONS.segmented)
                }
                exiting={
                  reducedMotion
                    ? undefined
                    : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                }
                style={{ gap: spacing.md }}
              >
                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          0 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Tipo de examen"
                    field={extractionPayload.fields.examType}
                    placeholder="Ej. Perfil lipídico y glucosa"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          examType: updateEditedField(extractionPayload.fields.examType, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          examType: confirmReviewField(extractionPayload.fields.examType),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          1 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Fecha (AAAA-MM-DD)"
                    field={extractionPayload.fields.dateIso}
                    errorMessage={dateError}
                    placeholder="2026-10-14"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: updateEditedField(extractionPayload.fields.dateIso, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: confirmReviewField(extractionPayload.fields.dateIso),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          2 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Laboratorio"
                    field={extractionPayload.fields.laboratory}
                    placeholder="Nombre del laboratorio"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          laboratory: updateEditedField(extractionPayload.fields.laboratory, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          laboratory: confirmReviewField(extractionPayload.fields.laboratory),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          3 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Médico solicitante"
                    field={extractionPayload.fields.orderingDoctor}
                    placeholder="Médico que solicitó el estudio"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          orderingDoctor: updateEditedField(
                            extractionPayload.fields.orderingDoctor,
                            text
                          ),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          orderingDoctor: confirmReviewField(extractionPayload.fields.orderingDoctor),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          4 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Nota"
                    field={extractionPayload.fields.note}
                    placeholder="Nota administrativa para tu bitácora"
                    multiline
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          note: updateEditedField(extractionPayload.fields.note, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          note: confirmReviewField(extractionPayload.fields.note),
                        },
                      })
                    }
                  />
                </Animated.View>
              </Animated.View>
            ) : null}

            {extractionPayload.detectedKind === 'other' ? (
              <Animated.View
                key="other-form"
                entering={
                  reducedMotion
                    ? undefined
                    : FadeIn.duration(MOTION_DURATIONS.segmented)
                }
                exiting={
                  reducedMotion
                    ? undefined
                    : FadeOut.duration(MOTION_DURATIONS.reducedFade)
                }
                style={{ gap: spacing.md }}
              >
                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          0 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Título"
                    field={extractionPayload.fields.title}
                    placeholder="Título del documento"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          title: updateEditedField(extractionPayload.fields.title, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          title: confirmReviewField(extractionPayload.fields.title),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          1 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Fecha (AAAA-MM-DD)"
                    field={extractionPayload.fields.dateIso}
                    errorMessage={dateError}
                    placeholder="2026-10-15"
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: updateEditedField(extractionPayload.fields.dateIso, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          dateIso: confirmReviewField(extractionPayload.fields.dateIso),
                        },
                      })
                    }
                  />
                </Animated.View>

                <Animated.View
                  entering={
                    reducedMotion
                      ? undefined
                      : FadeInDown.duration(MOTION_DURATIONS.formStaggerItem).delay(
                          2 * MOTION_DELAYS.staggerBase
                        )
                  }
                >
                  <ReviewableFieldBox
                    label="Nota"
                    field={extractionPayload.fields.note}
                    placeholder="Descripción breve o indicaciones"
                    multiline
                    onChangeValue={(text) =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          note: updateEditedField(extractionPayload.fields.note, text),
                        },
                      })
                    }
                    onConfirmReview={() =>
                      setExtractionPayload({
                        ...extractionPayload,
                        fields: {
                          ...extractionPayload.fields,
                          note: confirmReviewField(extractionPayload.fields.note),
                        },
                      })
                    }
                  />
                </Animated.View>
              </Animated.View>
            ) : null}

            <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
              <BitaButton
                variant="primary"
                icon="check"
                label="Guardar"
                loading={isSaving}
                onPress={() => void handleSaveConfirmedDocument()}
              />
              <BitaButton
                variant="secondary"
                icon="image"
                label={
                  showDocumentPreview ? 'Ocultar imagen del documento' : 'Ver imagen del documento'
                }
                onPress={() => setShowDocumentPreview((prev) => !prev)}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backButton: {
    marginLeft: -SPACING.xs,
    marginBottom: -SPACING.xxs,
  },
  devPanel: {
    borderWidth: BORDERS.width,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  devPanelHeader: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget - SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    minWidth: ACCESSIBILITY_METRICS.minTouchTarget,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  thumbnailFrame: {
    width: SPACING.screenBottom * 2 + SPACING.xs,
    height: SPACING.screenBottom * 2 + SPACING.lg,
    padding: SPACING.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroThumbnailImage: {
    width: '100%',
    height: '100%',
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
  paperLineShort: {
    width: '65%',
  },
  confirmHeroMeta: {
    flex: 1,
    gap: SPACING.sm,
  },
  editableMetaChip: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
  },
  inlinePickerBox: {
    borderTopWidth: BORDERS.width,
    paddingTop: SPACING.md,
    gap: SPACING.xs,
  },
  reviewHighlightBox: {
    borderWidth: 0,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  confirmFieldChip: {
    minHeight: ACCESSIBILITY_METRICS.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADII.pill,
  },
  pressed: {
    opacity: ACCESSIBILITY_METRICS.pressedOpacity,
  },
});
