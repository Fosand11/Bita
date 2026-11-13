import { DoseStatus } from '../components/ui/DoseActionButton';
import { DayAdherenceState } from '../components/ui/WeekCalendarStrip';
import { DEMO_MODE, getToday } from '../contracts/documentExtraction';

export { DEMO_MODE, getToday };

/**
 * Registros de tomas existentes (movidos tal cual desde la pantalla Mis Medicinas para poder
 * compartirlos con el resumen del Historial). No se agregan ni modifican datos médicos.
 */
export interface DoseRecord {
  id: string;
  medicationId: string;
  name: string;
  detail: string;
  time: string;
  status: DoseStatus;
}

export const WEEKDAY_HEADERS: readonly ('L' | 'M' | 'J' | 'V' | 'S' | 'D')[] = [
  'L',
  'M',
  'M',
  'J',
  'V',
  'S',
  'D',
];

export const WEEKDAY_FULL_NAMES: readonly string[] = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export interface MonthDefinition {
  key: string;
  label: string;
  monthGenitive: string;
  year: number;
  monthNumber: number;
  daysInMonth: number;
  /** Desplazamiento 0-indexado empezando en lunes (0 = Lunes, 3 = Jueves, 6 = Domingo) */
  startOffsetMonday: number;
}

export const AVAILABLE_MONTHS: readonly MonthDefinition[] = [
  {
    key: '2026-09',
    label: 'Septiembre 2026',
    monthGenitive: 'septiembre',
    year: 2026,
    monthNumber: 9,
    daysInMonth: 30,
    startOffsetMonday: 1,
  },
  {
    key: '2026-10',
    label: 'Octubre 2026',
    monthGenitive: 'octubre',
    year: 2026,
    monthNumber: 10,
    daysInMonth: 31,
    startOffsetMonday: 3,
  },
  {
    key: '2026-11',
    label: 'Noviembre 2026',
    monthGenitive: 'noviembre',
    year: 2026,
    monthNumber: 11,
    daysInMonth: 30,
    startOffsetMonday: 6,
  },
];

/** Id de la toma destacada de hoy ("Próxima toma"), cuyo estado se comparte vía contexto. */
export const FEATURED_DOSE_ID = '2026-10-17-los';

const METFORMIN = {
  medicationId: 'med-metformina-850',
  name: 'Metformina 850 mg',
  detail: 'Una tableta, después del desayuno',
  time: '08:30 h',
} as const;

const LOSARTAN = {
  medicationId: 'med-losartan-50',
  name: 'Losartán 50 mg',
  detail: 'Una tableta, con un vaso de agua',
  time: '20:00 h',
} as const;

/**
 * Construye los registros de tomas por fecha.
 * Si `DEMO_MODE` está en `false`, la app arranca sin tomas de demostración.
 */
export function buildExistingDosesByDate(
  featuredDoseStatus: DoseStatus
): Record<string, readonly DoseRecord[]> {
  if (!DEMO_MODE) {
    return {};
  }

  return {
    '2026-10-12': [
      { id: '2026-10-12-met', ...METFORMIN, status: 'completed' },
      { id: '2026-10-12-los', ...LOSARTAN, status: 'completed' },
    ],
    '2026-10-13': [
      { id: '2026-10-13-met', ...METFORMIN, status: 'completed' },
      { id: '2026-10-13-los', ...LOSARTAN, status: 'skipped' },
    ],
    '2026-10-14': [
      { id: '2026-10-14-met', ...METFORMIN, status: 'skipped' },
      { id: '2026-10-14-los', ...LOSARTAN, status: 'skipped' },
    ],
    '2026-10-15': [
      { id: '2026-10-15-met', ...METFORMIN, status: 'completed' },
      { id: '2026-10-15-los', ...LOSARTAN, status: 'completed' },
    ],
    '2026-10-16': [
      { id: '2026-10-16-met', ...METFORMIN, status: 'completed' },
      { id: '2026-10-16-los', ...LOSARTAN, status: 'completed' },
    ],
    '2026-10-17': [
      { id: '2026-10-17-met', ...METFORMIN, status: 'completed' },
      { id: FEATURED_DOSE_ID, ...LOSARTAN, status: featuredDoseStatus },
    ],
  };
}

/**
 * Calcula el estado del día y su resumen accesible desde sus tomas reales.
 * Si un día no tiene tomas registradas devuelve 'none' (solo número, sin marca).
 */
export function summarizeDayDoses(doses?: readonly DoseRecord[]): {
  status: DayAdherenceState;
  accessibilitySummary: string;
} {
  if (!doses || doses.length === 0) {
    return { status: 'none', accessibilitySummary: 'sin tomas registradas' };
  }

  const total = doses.length;
  const completedCount = doses.filter((d) => d.status === 'completed').length;
  const skippedCount = doses.filter((d) => d.status === 'skipped').length;
  const pendingCount = doses.filter((d) => d.status === 'pending').length;

  let status: DayAdherenceState = 'pending';
  if (completedCount === total) {
    status = 'completed';
  } else if (skippedCount === total) {
    status = 'missed';
  } else if (completedCount > 0) {
    status = 'partial';
  }

  const parts: string[] = [`${total} ${total === 1 ? 'toma' : 'tomas'}`];
  if (completedCount > 0) {
    parts.push(`${completedCount} ${completedCount === 1 ? 'tomada' : 'tomadas'}`);
  }
  if (pendingCount > 0) {
    parts.push(`${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`);
  }
  if (skippedCount > 0) {
    parts.push(`${skippedCount} ${skippedCount === 1 ? 'omitida' : 'omitidas'}`);
  }

  return { status, accessibilitySummary: parts.join(', ') };
}

/**
 * Resumen de las tomas pendientes de hoy para el Historial. Devuelve `null` si no hay pendientes.
 */
export function getPendingTodaySummary(
  todayDoses: readonly DoseRecord[]
): { count: number; nextTime: string } | null {
  const pending = todayDoses.filter((dose) => dose.status === 'pending');
  if (pending.length === 0) {
    return null;
  }
  const nextTime = [...pending].map((dose) => dose.time).sort()[0];
  return { count: pending.length, nextTime };
}
