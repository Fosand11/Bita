import React, { useEffect, useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  BORDERS,
  FLOATING_TAB_BAR,
  MOTION_DURATIONS,
  MOTION_EASINGS,
  RADII,
  SPACING,
  SQUIRCLE_CARD_STYLE,
  squircle,
  useBitaTheme,
} from '../../theme';
import { DocumentFileInput } from '../../contracts/documentExtraction';
import { Icon } from './Icon';

export interface ScanProcessingViewProps {
  file: DocumentFileInput | null;
  style?: StyleProp<ViewStyle>;
}

const STATUS_MESSAGES = [
  {
    headline: 'Leyendo el documento...',
    detail: 'Digitalizando el texto y ajustando nitidez...',
  },
  {
    headline: 'Identificando datos clave...',
    detail: 'Detectando fechas, especialista e indicaciones...',
  },
  {
    headline: 'Preparando el borrador...',
    detail: 'Podrás revisar y confirmar cada dato antes de guardar.',
  },
];

const THUMBNAIL_HEIGHT = 200;
const THUMBNAIL_WIDTH = 150;

/**
 * Vista de procesamiento de escaneo:
 * - Muestra la miniatura real del documento o tarjeta de PDF.
 * - Línea láser que barre verticalmente de arriba a abajo mientras procesa.
 * - Textos de estado que cambian con fundido suave.
 * - Con Reducir movimiento: indicador estático sin barrido.
 */
export const ScanProcessingView: React.FC<ScanProcessingViewProps> = ({ file, style }) => {
  const { theme } = useBitaTheme();
  const { colors, typography, spacing, iconSizes } = theme;
  const reducedMotion = useReducedMotion();

  const [messageIndex, setMessageIndex] = useState(0);
  const laserTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      laserTranslateY.value = 0;
      laserTranslateY.value = withRepeat(
        withTiming(THUMBNAIL_HEIGHT - 6, {
          duration: MOTION_DURATIONS.laserSweep,
          easing: MOTION_EASINGS.easeInOut,
        }),
        -1,
        true
      );
    }
  }, [reducedMotion, laserTranslateY]);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 1400);

    return () => clearInterval(timer);
  }, []);

  const animatedLaserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserTranslateY.value }],
  }));

  const currentStatus = STATUS_MESSAGES[messageIndex];
  const isImage = file?.uri && (file.mimeType.startsWith('image/') || file.source !== 'pdf');

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${currentStatus.headline} ${currentStatus.detail}`}
      accessibilityLiveRegion="polite"
      style={[styles.container, style]}
    >
      {/* Marco de la miniatura con barrido láser */}
      <View
        style={[
          styles.thumbnailContainer,
          squircle(RADII.control),
          { backgroundColor: colors.surfaceTonalStrong, borderColor: colors.surfaceTonalStrong },
        ]}
      >
        {isImage && file?.uri ? (
          <Image
            source={{ uri: file.uri }}
            style={styles.thumbnailImage}
            resizeMode="cover"
            accessibilityLabel={`Documento capturado: ${file.fileName}`}
          />
        ) : (
          <View style={[styles.pdfPlaceholder, { backgroundColor: colors.surface }]}>
            <Icon
              name={file?.source === 'pdf' ? 'file-pdf' : 'file-text'}
              size={iconSizes.xl}
              color={colors.primary}
              weight="light"
            />
            <Text
              numberOfLines={2}
              style={[typography.label, styles.pdfFileName, { color: colors.textPrimary }]}
            >
              {file?.fileName ?? 'documento.pdf'}
            </Text>
          </View>
        )}

        {/* Línea de escaneo láser */}
        {!reducedMotion ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.laserLine,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
              animatedLaserStyle,
            ]}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              styles.laserLineStatic,
              { backgroundColor: colors.primary },
            ]}
          />
        )}
      </View>

      {/* Textos de estado rotatorios con fundido */}
      <View style={styles.textContainer}>
        <Animated.View
          key={messageIndex}
          entering={
            reducedMotion
              ? undefined
              : FadeIn.duration(MOTION_DURATIONS.statusCrossfade)
          }
          exiting={
            reducedMotion
              ? undefined
              : FadeOut.duration(MOTION_DURATIONS.statusCrossfade)
          }
          style={styles.textBlock}
        >
          <Text
            style={[
              typography.sectionHeader,
              styles.headline,
              { color: colors.textPrimary },
            ]}
          >
            {currentStatus.headline}
          </Text>
          <Text
            style={[
              typography.body,
              styles.detail,
              { color: colors.textOnTonal, marginTop: spacing.xs },
            ]}
          >
            {currentStatus.detail}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  thumbnailContainer: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: BORDERS.width,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
  },
  pdfFileName: {
    textAlign: 'center',
    marginTop: SPACING.xxs,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  laserLineStatic: {
    position: 'absolute',
    top: THUMBNAIL_HEIGHT / 2,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  textContainer: {
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
  },
  headline: {
    textAlign: 'center',
  },
  detail: {
    textAlign: 'center',
  },
});

