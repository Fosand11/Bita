import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { RADII, SPACING, useBitaTheme } from '../../theme';
import { BitaCard } from './BitaCard';
import { IconTile } from './IconTile';

export type EditorialProcessingStage = 'digitizing' | 'reading' | 'structuring';

export interface ProcessingLoaderProps {
  stage?: EditorialProcessingStage;
  customHeadline?: string;
  customDetail?: string;
  /** Si es false se dibuja sin tarjeta propia, para colocarlo dentro de otra (p. ej. el panel de escaneo). */
  framed?: boolean;
  style?: StyleProp<ViewStyle>;
}

const STAGE_COPY: Record<EditorialProcessingStage, { headline: string; detail: string }> = {
  digitizing: {
    headline: 'Digitalizando documento...',
    detail: 'Ajustando el contraste y la nitidez de tu documento de salud.',
  },
  reading: {
    headline: 'Leyendo documento...',
    detail: 'Identificando fechas, especialista y datos clave para tu bitácora.',
  },
  structuring: {
    headline: 'Preparando el borrador...',
    detail: 'Podrás revisar y confirmar cada dato antes de guardarlo.',
  },
};

/** Indicador de lectura de documento de salud (estático, sin animaciones hasta la Fase 3). */
export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({
  stage = 'digitizing',
  customHeadline,
  customDetail,
  framed = true,
  style,
}) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing } = theme;
  const ink = colors.inks.celeste;

  const copy = STAGE_COPY[stage];
  const headline = customHeadline ?? copy.headline;
  const detail = customDetail ?? copy.detail;

  const content = (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${headline} ${detail}`}
      accessibilityLiveRegion="polite"
      style={styles.container}
    >
      <IconTile icon="file-text" inkKey="celeste" />

      <Text style={[typography.sectionHeader, { color: colors.textPrimary, marginTop: spacing.md }]}>
        {headline}
      </Text>

      <Text style={[typography.body, { color: colors.textOnTonal, marginTop: spacing.xs }]}>
        {detail}
      </Text>

      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.surfaceTonalStrong, marginTop: spacing.lg },
        ]}
      >
        <View style={[styles.progressBar, { backgroundColor: ink.color }]} />
      </View>
    </View>
  );

  if (!framed) {
    return <View style={style}>{content}</View>;
  }

  return (
    <BitaCard variant="base" style={style}>
      {content}
    </BitaCard>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  progressTrack: {
    width: '100%',
    height: SPACING.xs,
    borderRadius: RADII.pill,
    overflow: 'hidden',
  },
  progressBar: {
    width: '45%',
    height: '100%',
    borderRadius: RADII.pill,
  },
});
