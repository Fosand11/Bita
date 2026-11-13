import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import {
  Alarm,
  ArrowLeft,
  ArrowsClockwise,
  CalendarBlank,
  Camera,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  CheckCircle,
  CircleIcon,
  Clock,
  DotsThreeVertical,
  FilePdf,
  FileText,
  Flask,
  Heart,
  House,
  IconProps as PhosphorIconProps,
  Image,
  Minus,
  Note,
  Pill,
  Prescription,
  ShieldWarning,
  Stethoscope,
  User,
  Users,
  WarningCircle,
} from 'phosphor-react-native';
import { ICON_SIZES, useBitaTheme } from '../../theme';

export type IconName =
  | 'house'
  | 'camera'
  | 'pill'
  | 'file-text'
  | 'file-pdf'
  | 'flask'
  | 'note'
  | 'calendar'
  | 'stethoscope'
  | 'user'
  | 'users'
  | 'heart'
  | 'check'
  | 'check-circle'
  | 'clock'
  | 'alarm'
  | 'circle'
  | 'minus'
  | 'warning-circle'
  | 'shield-warning'
  | 'image'
  | 'arrow-left'
  | 'arrows-clockwise'
  | 'caret-left'
  | 'caret-right'
  | 'caret-down'
  | 'caret-up'
  | 'dots-three-vertical'
  | 'prescription';

export type BitaIconWeight = 'light' | 'regular';

const ICON_COMPONENTS: Record<IconName, React.ComponentType<PhosphorIconProps>> = {
  house: House,
  camera: Camera,
  pill: Pill,
  'file-text': FileText,
  'file-pdf': FilePdf,
  flask: Flask,
  note: Note,
  calendar: CalendarBlank,
  stethoscope: Stethoscope,
  user: User,
  users: Users,
  heart: Heart,
  check: Check,
  'check-circle': CheckCircle,
  clock: Clock,
  alarm: Alarm,
  circle: CircleIcon,
  minus: Minus,
  'warning-circle': WarningCircle,
  'shield-warning': ShieldWarning,
  image: Image,
  'arrow-left': ArrowLeft,
  'arrows-clockwise': ArrowsClockwise,
  'caret-left': CaretLeft,
  'caret-right': CaretRight,
  'caret-down': CaretDown,
  'caret-up': CaretUp,
  'dots-three-vertical': DotsThreeVertical,
  prescription: Prescription,
};

export interface IconProps {
  name: IconName;
  /** Tamaño en px desde tokens (`ICON_SIZES`). Por defecto 24 (`lg`). */
  size?: number;
  /** Color. Por defecto gris azulado (`colors.iconMuted`); los activos usan `colors.primary`. */
  color?: string;
  /**
   * Peso de Phosphor. Por defecto "light" para todo; los glifos pequeños (< 20px)
   * usan "regular" porque "light" queda ilegible a 16px (trazo < 1px).
   */
  weight?: BitaIconWeight;
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente centralizado `<Icon name=... />` basado en `phosphor-react-native` (v3.0.6).
 * Pasa `color` y `style.color` (props verificadas en `IconProps`) para que la tinta se vea
 * en iOS (`tintColor` del SVG nativo) y en web (`currentColor`).
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = ICON_SIZES.lg,
  color,
  weight,
  style,
}) => {
  const { theme } = useBitaTheme();
  const resolvedColor = color ?? theme.colors.iconMuted;
  const resolvedWeight: BitaIconWeight =
    weight ?? (size < theme.iconSizes.md ? 'regular' : 'light');

  const IconComponent = ICON_COMPONENTS[name];

  const iconElement = (
    <IconComponent
      size={size}
      color={resolvedColor}
      weight={resolvedWeight}
      style={{ color: resolvedColor }}
    />
  );

  if (!style) {
    return iconElement;
  }

  return <View style={style}>{iconElement}</View>;
};
