import { IconName } from '../components/ui/Icon';
import { ProfileId } from '../components/ui/ProfileSelector';
import { StampVariant } from '../components/ui/ReviewBadge';
import {
  DEMO_MODE,
  DocumentExtractionResult,
  DocumentKind,
  getToday,
} from '../contracts/documentExtraction';
import { MedicationInkKey } from '../theme';

export type HistorialFilterKey = 'all' | 'prescriptions' | 'appointments' | 'results';

export interface HistorialFilterOption {
  key: HistorialFilterKey;
  label: string;
}

export const HISTORIAL_FILTER_OPTIONS: readonly HistorialFilterOption[] = [
  { key: 'all', label: 'Todo' },
  { key: 'prescriptions', label: 'Recetas' },
  { key: 'appointments', label: 'Citas' },
  { key: 'results', label: 'Resultados' },
];

export interface PrescriptionMedicationDetail {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

export type HealthRecordDetails =
  | {
      kind: 'prescription';
      specialty: string;
      doctorName: string;
      medications: readonly PrescriptionMedicationDetail[];
      indications: string;
    }
  | {
      kind: 'consultation';
      specialty: string;
      doctorName: string;
      time?: string;
      location?: string;
      notes: string;
    }
  | {
      kind: 'lab_result';
      examType: string;
      laboratory: string;
      orderingDoctor: string;
      note: string;
    }
  | {
      kind: 'other';
      title: string;
      note: string;
    };

export interface HealthLogRecord {
  id: string;
  profileId: ProfileId;
  /** Fecha en formato ISO YYYY-MM-DD (obligatoria para guardar). */
  dateIso: string;
  /** Día del mes para la columna de margen (ej. '17'). */
  day: string;
  /** Mes abreviado para la columna de margen (ej. 'oct'). */
  month: string;
  /** Fecha legible para cabeceras de detalle (ej. '17 oct 2026, 09:30'). */
  formattedDateLabel: string;
  kind: DocumentKind;
  icon: IconName;
  inkTarget: MedicationInkKey | string;
  title: string;
  meta?: string;
  subtitle: string;
  stampVariant?: StampVariant;
  sourceFileName?: string;
  sourceMimeType?: 'image/jpeg' | 'image/png' | 'application/pdf';
  details: HealthRecordDetails;
}

const MONTH_SHORT_LABELS: readonly string[] = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** Extrae día ('17'), mes corto ('oct') y etiqueta legible desde una fecha ISO `YYYY-MM-DD`. */
export function formatIsoDateParts(
  dateIso: string,
  time?: string
): { day: string; month: string; formattedDateLabel: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateIso.trim());
  if (!match) {
    return {
      day: '--',
      month: '---',
      formattedDateLabel: dateIso,
    };
  }
  const year = match[1];
  const monthIdx = Math.max(0, Math.min(11, Number(match[2]) - 1));
  const dayNum = Number(match[3]);
  const day = String(dayNum).padStart(2, '0');
  const month = MONTH_SHORT_LABELS[monthIdx];
  const timeSuffix = time?.trim() ? `, ${time.trim()}` : '';
  return {
    day,
    month,
    formattedDateLabel: `${dayNum} ${month} ${year}${timeSuffix}`,
  };
}

/** Determina si un registro es una cita futura (consulta con `dateIso > todayIso`). */
export function isUpcomingAppointment(
  record: HealthLogRecord,
  todayIso: string = getToday()
): boolean {
  return record.kind === 'consultation' && record.dateIso > todayIso;
}

/**
 * Formatea el resumen combinado del día para la parte superior del Historial:
 * - Si hay tomas pendientes y cita próxima: `"1 toma hoy · Cita mañana 9:00"`
 * - Si solo hay tomas pendientes: `"Te queda 1 toma hoy · 20:00 h"`
 * - Si solo hay cita próxima: `"Cita mañana 9:00 · Oftalmología"`
 * - Si no hay nada: `null` (no se muestra)
 */
export function buildDailySummaryText(
  pendingDoses: { count: number; nextTime: string } | null,
  nextAppointment: HealthLogRecord | null,
  todayIso: string = getToday()
): string | null {
  let appointmentSegment: string | null = null;

  if (nextAppointment && nextAppointment.details.kind === 'consultation') {
    const rawTime = nextAppointment.details.time?.replace(/\s*h$/i, '') ?? '';
    const cleanTime = rawTime.startsWith('0') ? rawTime.slice(1) : rawTime;
    const isTomorrow = isNextDayIso(todayIso, nextAppointment.dateIso);
    const dayWord = isTomorrow
      ? 'mañana'
      : `${ Number(nextAppointment.day)} ${nextAppointment.month}`;
    appointmentSegment = cleanTime ? `Cita ${dayWord} ${cleanTime}` : `Cita ${dayWord}`;
  }

  if (pendingDoses && appointmentSegment) {
    const dosesLabel =
      pendingDoses.count === 1 ? '1 toma hoy' : `${pendingDoses.count} tomas hoy`;
    return `${dosesLabel} · ${appointmentSegment}`;
  }

  if (pendingDoses) {
    return pendingDoses.count === 1
      ? `Te queda 1 toma hoy · ${pendingDoses.nextTime}`
      : `Te quedan ${pendingDoses.count} tomas hoy · ${pendingDoses.nextTime}`;
  }

  if (appointmentSegment && nextAppointment) {
    return `${appointmentSegment} · ${nextAppointment.title}`;
  }

  return null;
}

function isNextDayIso(todayIso: string, targetIso: string): boolean {
  const tMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso);
  const dMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(targetIso);
  if (!tMatch || !dMatch) {
    return false;
  }
  const todayDate = new Date(Number(tMatch[1]), Number(tMatch[2]) - 1, Number(tMatch[3]));
  const targetDate = new Date(Number(dMatch[1]), Number(dMatch[2]) - 1, Number(dMatch[3]));
  const diffDays = Math.round(
    (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays === 1;
}

/**
 * Filtra los registros de la línea de tiempo según el chip activo:
 * - `'all'`: Todos
 * - `'prescriptions'`: Recetas (`kind === 'prescription'`)
 * - `'appointments'`: Consultas y citas (`kind === 'consultation'`)
 * - `'results'`: Resultados de examen (`kind === 'lab_result'`)
 */
export function matchesHistorialFilter(
  record: HealthLogRecord,
  filter: HistorialFilterKey
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'prescriptions':
      return record.kind === 'prescription';
    case 'appointments':
      return record.kind === 'consultation';
    case 'results':
      return record.kind === 'lab_result';
  }
}

/**
 * Registros iniciales de demostración (SOLO cuando `DEMO_MODE === true`).
 * Incluye:
 * - Los 4 registros históricos existentes (intactos).
 * - 1 cita próxima (`2026-10-18`, mañana a las 09:00).
 * - 1 resultado de examen (`2026-10-14`, sin valores individuales ni interpretación).
 * Con `DEMO_MODE === false`, devuelve `[]` y la app arranca vacía.
 */
const DEMO_HEALTH_RECORDS: readonly HealthLogRecord[] = [
  {
    id: 'entry-upcoming-ophthal',
    profileId: 'mi-salud',
    dateIso: '2026-10-18',
    day: '18',
    month: 'oct',
    formattedDateLabel: '18 oct 2026, 09:00',
    kind: 'consultation',
    icon: 'calendar',
    inkTarget: 'celeste',
    title: 'Cita de Oftalmología',
    meta: 'Mañana · 09:00 h',
    subtitle: 'Dra. Elena Vargas · Clínica Santa María, Cons. 304',
    stampVariant: 'verified',
    details: {
      kind: 'consultation',
      specialty: 'Oftalmología',
      doctorName: 'Dra. Elena Vargas',
      time: '09:00 h',
      location: 'Clínica Santa María · Consultorio 304',
      notes: 'Acudir con lentes actuales. Control anual de retina.',
    },
  },
  {
    id: 'entry-cardio-rx',
    profileId: 'mi-salud',
    dateIso: '2026-10-17',
    day: '17',
    month: 'oct',
    formattedDateLabel: '17 oct 2026, 09:30',
    kind: 'prescription',
    icon: 'file-text',
    inkTarget: 'med-losartan-50',
    title: 'Receta de Cardiología',
    meta: 'Dr. Roberto Méndez · Hoy, 09:30',
    subtitle: 'Losartán 50 mg, una tableta cada 12 horas por 30 días',
    stampVariant: 'review',
    details: {
      kind: 'prescription',
      specialty: 'Cardiología',
      doctorName: 'Dr. Roberto Méndez',
      medications: [
        {
          id: 'med-losartan-50',
          name: 'Losartán 50 mg',
          dose: '50 mg',
          frequency: 'Una tableta cada 12 horas',
          duration: 'Por 30 días',
        },
      ],
      indications: 'Sin indicaciones adicionales.',
    },
  },
  {
    id: 'entry-lipid-lab',
    profileId: 'mi-salud',
    dateIso: '2026-10-14',
    day: '14',
    month: 'oct',
    formattedDateLabel: '14 oct 2026',
    kind: 'lab_result',
    icon: 'flask',
    inkTarget: 'menta',
    title: 'Perfil lipídico y glucosa',
    meta: 'Laboratorio Clínico San José',
    subtitle: 'Solicitado por Dr. Roberto Méndez · Documento archivado para control',
    stampVariant: 'verified',
    sourceMimeType: 'application/pdf',
    sourceFileName: 'resultado-laboratorio-oct.pdf',
    details: {
      kind: 'lab_result',
      examType: 'Perfil lipídico y química sanguínea',
      laboratory: 'Laboratorio Clínico San José',
      orderingDoctor: 'Dr. Roberto Méndez',
      note: 'Estudio en ayuno entregado para revisión en la próxima consulta de Cardiología.',
    },
  },
  {
    id: 'entry-control-visit',
    profileId: 'mi-salud',
    dateIso: '2026-10-12',
    day: '12',
    month: 'oct',
    formattedDateLabel: '12 oct 2026',
    kind: 'consultation',
    icon: 'calendar',
    inkTarget: 'indigo',
    title: 'Consulta de control',
    meta: 'Medicina Interna',
    subtitle: 'Medicina Interna\nPresión estable (122/78). Continuar con el esquema actual.',
    details: {
      kind: 'consultation',
      specialty: 'Medicina Interna',
      doctorName: 'Dra. Ana Castillo',
      location: 'Consultorio de Medicina Interna',
      notes: 'Presión estable (122/78). Continuar con el esquema actual.',
    },
  },
  {
    id: 'entry-internal-rx',
    profileId: 'mi-salud',
    dateIso: '2026-09-28',
    day: '28',
    month: 'sep',
    formattedDateLabel: '28 sep 2026',
    kind: 'prescription',
    icon: 'file-text',
    inkTarget: 'med-metformina-850',
    title: 'Receta de Medicina Interna',
    meta: 'Dra. Ana Castillo',
    subtitle: 'Metformina 850 mg, una tableta después del desayuno.',
    stampVariant: 'verified',
    details: {
      kind: 'prescription',
      specialty: 'Medicina Interna',
      doctorName: 'Dra. Ana Castillo',
      medications: [
        {
          id: 'med-metformina-850',
          name: 'Metformina 850 mg',
          dose: '850 mg',
          frequency: 'Una tableta después del desayuno',
          duration: 'Uso continuo',
        },
      ],
      indications: 'Tomar junto con los alimentos de la mañana.',
    },
  },
  {
    id: 'entry-general-visit',
    profileId: 'mi-salud',
    dateIso: '2026-08-15',
    day: '15',
    month: 'ago',
    formattedDateLabel: '15 ago 2026',
    kind: 'consultation',
    icon: 'stethoscope',
    inkTarget: 'lavanda',
    title: 'Consulta general',
    meta: 'Medicina General',
    subtitle: 'Medicina General\nControl rutinario.',
    details: {
      kind: 'consultation',
      specialty: 'Medicina General',
      doctorName: 'Dr. Carlos Solís',
      location: 'Centro Médico',
      notes: 'Control rutinario anual.',
    },
  },
];

export function getInitialHealthRecords(): readonly HealthLogRecord[] {
  return DEMO_MODE ? DEMO_HEALTH_RECORDS : [];
}

/** Forma cruda de una receta tal como la devuelve el backend Laravel. */
export interface ApiPrescription {
  id: number;
  profile_id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  raw_extraction: DocumentExtractionResult | null;
  failure_reason: string | null;
  signed_url?: string;
  created_at: string;
}

/**
 * Convierte una receta real del backend (ya procesada por Gemini) en un `HealthLogRecord`
 * listo para la bitácora. Devuelve `null` si la receta aún no tiene extracción completada
 * y exitosa (pendiente, procesando o fallida) — esos casos se muestran aparte en el flujo de escaneo.
 */
export function mapPrescriptionToRecord(
  prescription: ApiPrescription,
  profileId: ProfileId
): HealthLogRecord | null {
  if (prescription.status !== 'completed' || !prescription.raw_extraction?.ok) {
    return null;
  }

  const extraction = prescription.raw_extraction.extraction;
  if (extraction.detectedKind !== 'prescription') {
    return null;
  }

  const f = extraction.fields;
  const dateIso = f.dateIso.value ?? prescription.created_at.slice(0, 10);
  const specialty = f.specialty.value?.trim() || 'Medicina General';
  const doctorName = f.doctorName.value?.trim() || 'Médico tratante';
  const meds = (f.medications.value ?? []).map((m, idx) => ({
    id: `rx-${prescription.id}-med-${idx}`,
    name: m.name.value?.trim() || 'Medicamento',
    dose: m.dose.value?.trim() || '',
    frequency: m.frequency.value?.trim() || '',
    duration: m.duration.value?.trim() || '',
  }));
  const firstMed = meds[0];
  const subtitle = firstMed
    ? [firstMed.name, firstMed.dose, firstMed.frequency, firstMed.duration].filter(Boolean).join(', ')
    : f.indications.value?.trim() || 'Receta registrada';
  const dateParts = formatIsoDateParts(dateIso);

  return {
    id: `rx-${prescription.id}`,
    profileId,
    dateIso,
    day: dateParts.day,
    month: dateParts.month,
    formattedDateLabel: dateParts.formattedDateLabel,
    kind: 'prescription',
    icon: 'file-text',
    inkTarget: firstMed ? firstMed.name.toLowerCase() : 'coral',
    title: `Receta de ${specialty}`,
    meta: doctorName,
    subtitle,
    stampVariant: prescription.raw_extraction.hasFieldsToReview ? 'review' : 'verified',
    details: {
      kind: 'prescription',
      specialty,
      doctorName,
      medications: meds,
      indications: f.indications.value?.trim() || 'Sin indicaciones adicionales.',
    },
  };
}

