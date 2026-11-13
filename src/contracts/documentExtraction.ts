/**
 * Contratos de datos y esquemas JSON Schema para la extracción de documentos de salud en Bita.
 *
 * Basado en la documentación vigente de Gemini Structured Outputs (`response_format` con
 * `mime_type: "application/json"` y `schema`):
 * - Tipos soportados: `string`, `number`, `integer`, `boolean`, `object`, `array`, `null`
 *   (usando arreglo de tipos como `["string", "null"]` para propiedades anulables).
 * - Propiedades soportadas: `properties`, `required`, `additionalProperties`, `enum`, `format`,
 *   `items`, `minItems`, `maxItems`, `title`, `description`.
 * - Las uniones discriminadas complejas (`oneOf` / `anyOf` profundas) no forman parte del
 *   subconjunto recomendado y pueden ser rechazadas por complejidad. Por ello se define un
 *   esquema ligero de clasificación (`DOCUMENT_CLASSIFICATION_JSON_SCHEMA`) y un esquema plano
 *   por cada tipo de documento (`EXTRACTION_JSON_SCHEMAS_BY_KIND`).
 */

export const EXTRACTION_SCHEMA_VERSION = '1.0.0' as const;

/**
 * Flag global de modo demostración leído de la variable de entorno `EXPO_PUBLIC_DEMO_MODE`.
 * - Si `EXPO_PUBLIC_DEMO_MODE` está configurada ('true' o '1'), se activa.
 * - Si está en 'false' o '0', se desactiva.
 * - Si no está definida: en desarrollo (`__DEV__`) se activa para diseño; en producción (`!__DEV__`)
 *   siempre es `false` para que nunca pueda llegar a producción por accidente.
 */
function resolveDemoMode(): boolean {
  const envVal = process.env.EXPO_PUBLIC_DEMO_MODE;
  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }
  return typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : false;
}

export const DEMO_MODE = resolveDemoMode();

/** Fecha de referencia en modo demostración para cuadrar el calendario de octubre 2026. */
const DEMO_TODAY_ISO = '2026-10-17';

/**
 * Función única centralizada para obtener "hoy" en formato ISO local (`YYYY-MM-DD`),
 * calculada con la zona horaria local del dispositivo (nunca `toISOString()` en UTC).
 */
export function getToday(): string {
  if (DEMO_MODE) {
    return DEMO_TODAY_ISO;
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Tipos de documento de la bitácora de salud:
 * - `'prescription'`: Receta médica
 * - `'consultation'`: Consulta médica o Cita (una cita es una consulta con `dateIso > getToday()`)
 * - `'lab_result'`: Resultado de examen / laboratorio (sin valores de analitos ni interpretación)
 * - `'other'`: Otro documento clínico (resumen, certificado, nota)
 */
export type DocumentKind = 'prescription' | 'consultation' | 'lab_result' | 'other';

/** Opciones del selector de tipo en la pantalla Escanear. */
export type ScanDocumentTypeOption = 'auto' | DocumentKind;

/** Motivo por el que un campo extraído requiere revisión manual del usuario. */
export type ReviewReason = 'ilegible' | 'ambiguo' | 'faltante';

/**
 * Estructura uniforme de cada campo extraído por el modelo.
 * `value` permite `null` cuando el dato no existe o es ilegible.
 */
export interface ExtractedField<T> {
  value: T | null;
  needsReview: boolean;
  reason?: ReviewReason | null;
  /** Texto original tal como apareció en el documento (p. ej. fecha `'05/06/2026'`). */
  rawText?: string | null;
}

/** Medicamento individual extraído dentro de una receta. */
export interface ExtractedMedicationFields {
  name: ExtractedField<string>;
  dose: ExtractedField<string>;
  frequency: ExtractedField<string>;
  duration: ExtractedField<string>;
}

/** Campos extraídos para `receta` (`prescription`). */
export interface PrescriptionExtractedFields {
  dateIso: ExtractedField<string>;
  specialty: ExtractedField<string>;
  doctorName: ExtractedField<string>;
  medications: ExtractedField<ExtractedMedicationFields[]>;
  indications: ExtractedField<string>;
}

/**
 * Campos extraídos para `consulta` / `cita` (`consultation`).
 * Reutiliza el tipo consulta existente; si `dateIso > getToday()`, es una Cita próxima.
 */
export interface ConsultationExtractedFields {
  specialty: ExtractedField<string>;
  doctorName: ExtractedField<string>;
  dateIso: ExtractedField<string>;
  time: ExtractedField<string>;
  location: ExtractedField<string>;
  notes: ExtractedField<string>;
}

/**
 * Campos extraídos para `resultado` de examen (`lab_result`).
 * REGLA CLÍNICA ESTRICTA: prohibido incluir valores numéricos individuales de analitos,
 * rangos de referencia ni juicios de "normal" / "anormal".
 */
export interface LabResultExtractedFields {
  examType: ExtractedField<string>;
  dateIso: ExtractedField<string>;
  laboratory: ExtractedField<string>;
  orderingDoctor: ExtractedField<string>;
  note: ExtractedField<string>;
}

/** Campos extraídos para `otro` documento de salud (`other`). */
export interface OtherDocumentExtractedFields {
  title: ExtractedField<string>;
  dateIso: ExtractedField<string>;
  note: ExtractedField<string>;
}

/** Unión discriminada en TypeScript para el consumo seguro en la interfaz. */
export type DocumentExtractionPayload =
  | {
      detectedKind: 'prescription';
      fields: PrescriptionExtractedFields;
    }
  | {
      detectedKind: 'consultation';
      fields: ConsultationExtractedFields;
    }
  | {
      detectedKind: 'lab_result';
      fields: LabResultExtractedFields;
    }
  | {
      detectedKind: 'other';
      fields: OtherDocumentExtractedFields;
    };

/**
 * Códigos de error posibles durante el escaneo/extracción:
 * - `'illegible'`: imagen borrosa, cortada o sin contraste suficiente.
 * - `'not_health_document'`: el archivo no corresponde a un documento médico.
 * - `'network_error'`: dispositivo sin conexión a internet.
 * - `'server_error'`: fallo del servicio o tiempo de espera agotado (timeout).
 * - `'unsupported_file'`: formato no admitido o archivo demasiado grande.
 */
export type DocumentExtractionErrorCode =
  | 'illegible'
  | 'not_health_document'
  | 'network_error'
  | 'server_error'
  | 'unsupported_file';

export interface DocumentExtractionError {
  code: DocumentExtractionErrorCode;
  title: string;
  message: string;
  retryable: boolean;
}

export type DocumentInputSource = 'camera' | 'gallery' | 'pdf';

export interface DocumentFileInput {
  id: string;
  source: DocumentInputSource;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'application/pdf';
  sizeBytes?: number;
  uri?: string;
}

export type DocumentExtractionResult =
  | {
      ok: true;
      schemaVersion: typeof EXTRACTION_SCHEMA_VERSION;
      file: DocumentFileInput;
      hasFieldsToReview: boolean;
      extraction: DocumentExtractionPayload;
    }
  | {
      ok: false;
      schemaVersion: typeof EXTRACTION_SCHEMA_VERSION;
      file: DocumentFileInput;
      error: DocumentExtractionError;
    };

/** Contrato del servicio intercambiable (Mock en Fase 2.6 -> Backend Gemini Flash en producción). */
export interface DocumentExtractionService {
  extract(
    file: DocumentFileInput,
    forcedType?: DocumentKind
  ): Promise<DocumentExtractionResult>;
}

export interface DateExtractionOptions {
  /** Forzar revisión manual por ambigüedad reportada por el modelo o la fuente */
  forceAmbiguousReview?: boolean;
  /** Tipo de documento para verificar coherencia temporal */
  kind?: DocumentKind;
  /** Formato mixto detectado en el documento (p. ej. texto en inglés mezclado con español) */
  isMixedFormat?: boolean;
}

/**
 * Convierte una fecha local en formato `dd/mm/aaaa` (típica en documentos físicos en español)
 * a un `ExtractedField<string>` con salida ISO (`YYYY-MM-DD`).
 *
 * Reglas de coherencia y ambigüedad:
 * - Asume siempre `dd/mm/aaaa` (primer número día, segundo número mes, tercer número año).
 * - NO marca `needsReview: true` con 'ambiguo' solo porque día y mes sean <= 12 (asunción local segura).
 * - Marca `needsReview: true` con 'ambiguo' SOLO ante señales reales:
 *   1. Señal explícita del modelo / bandera `forceAmbiguousReview` o `isMixedFormat`.
 *   2. Formato o día inválido para el mes (p. ej. 31 de febrero o mes > 12).
 *   3. Incoherencia temporal flagrante:
 *      - Un resultado de examen (`lab_result`) con fecha en el futuro relativo a hoy.
 */
export function parseLocalDateToExtractedIso(
  rawDate: string | null | undefined,
  optionsOrForceAmbiguous: boolean | DateExtractionOptions = false
): ExtractedField<string> {
  const options: DateExtractionOptions =
    typeof optionsOrForceAmbiguous === 'boolean'
      ? { forceAmbiguousReview: optionsOrForceAmbiguous }
      : optionsOrForceAmbiguous;

  const trimmed = rawDate?.trim() ?? '';
  if (!trimmed) {
    return {
      value: null,
      needsReview: true,
      reason: 'faltante',
      rawText: null,
    };
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const daysInMonth = new Date(year, month, 0).getDate();
    const isCalendarValid = month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth;

    if (!isCalendarValid) {
      return {
        value: null,
        needsReview: true,
        reason: 'ambiguo',
        rawText: trimmed,
      };
    }

    const today = getToday();
    const isFutureLabResult = options.kind === 'lab_result' && trimmed > today;
    const needsReview = Boolean(
      options.forceAmbiguousReview || options.isMixedFormat || isFutureLabResult
    );

    return {
      value: trimmed,
      needsReview,
      reason: needsReview ? 'ambiguo' : null,
      rawText: trimmed,
    };
  }

  const localMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (!localMatch) {
    return {
      value: null,
      needsReview: true,
      reason: 'ilegible',
      rawText: trimmed,
    };
  }

  const dayNum = Number(localMatch[1]);
  const monthNum = Number(localMatch[2]);
  const yearNum = Number(localMatch[3]);

  // Validación de calendario (p. ej. día no puede superar los días reales del mes)
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  const isCalendarValid =
    monthNum >= 1 &&
    monthNum <= 12 &&
    dayNum >= 1 &&
    dayNum <= daysInMonth &&
    yearNum >= 1920 &&
    yearNum <= 2100;

  if (!isCalendarValid) {
    return {
      value: null,
      needsReview: true,
      reason: 'ambiguo',
      rawText: trimmed,
    };
  }

  const iso = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  const today = getToday();
  const isFutureLabResult = options.kind === 'lab_result' && iso > today;

  const needsReview = Boolean(
    options.forceAmbiguousReview || options.isMixedFormat || isFutureLabResult
  );

  return {
    value: iso,
    needsReview,
    reason: needsReview ? 'ambiguo' : null,
    rawText: trimmed,
  };
}

/** Determina si algún campo dentro del payload extraído tiene `needsReview: true`. */
export function computePayloadNeedsReview(payload: DocumentExtractionPayload): boolean {
  switch (payload.detectedKind) {
    case 'prescription': {
      const f = payload.fields;
      const medsNeedReview =
        f.medications.needsReview ||
        (f.medications.value ?? []).some(
          (m) =>
            m.name.needsReview ||
            m.dose.needsReview ||
            m.frequency.needsReview ||
            m.duration.needsReview
        );
      return (
        f.dateIso.needsReview ||
        f.specialty.needsReview ||
        f.doctorName.needsReview ||
        f.indications.needsReview ||
        medsNeedReview
      );
    }
    case 'consultation': {
      const f = payload.fields;
      return (
        f.specialty.needsReview ||
        f.doctorName.needsReview ||
        f.dateIso.needsReview ||
        f.time.needsReview ||
        f.location.needsReview ||
        f.notes.needsReview
      );
    }
    case 'lab_result': {
      const f = payload.fields;
      return (
        f.examType.needsReview ||
        f.dateIso.needsReview ||
        f.laboratory.needsReview ||
        f.orderingDoctor.needsReview ||
        f.note.needsReview
      );
    }
    case 'other': {
      const f = payload.fields;
      return f.title.needsReview || f.dateIso.needsReview || f.note.needsReview;
    }
  }
}

// ============================================================================
// ESQUEMAS JSON SCHEMA REUTILIZABLES (Subconjunto oficial de Gemini API)
// ============================================================================

export type GeminiJsonPrimitiveType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

export interface GeminiJsonSchema {
  type: GeminiJsonPrimitiveType | readonly GeminiJsonPrimitiveType[];
  title?: string;
  description?: string;
  format?: 'date' | 'date-time' | 'time';
  enum?: readonly (string | null)[];
  properties?: Record<string, GeminiJsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
  items?: GeminiJsonSchema;
}

const REVIEW_REASON_SCHEMA: GeminiJsonSchema = {
  type: ['string', 'null'],
  enum: ['ilegible', 'ambiguo', 'faltante', null],
  description:
    'Motivo por el que el campo requiere revisión humana. Debe ser null cuando needsReview es false.',
};

/**
 * Construye el esquema JSON Schema reutilizable para `ExtractedField<T>`.
 */
export function createExtractedFieldJsonSchema(
  valueSchema: GeminiJsonSchema,
  description: string
): GeminiJsonSchema {
  return {
    type: 'object',
    description,
    properties: {
      value: valueSchema,
      needsReview: {
        type: 'boolean',
        description:
          'true si el texto es ilegible, ambiguo o está ausente y requiere confirmación del paciente.',
      },
      reason: REVIEW_REASON_SCHEMA,
      rawText: {
        type: ['string', 'null'],
        description: 'Texto literal leído del documento antes de normalizar (opcional).',
      },
    },
    required: ['value', 'needsReview', 'reason'],
    additionalProperties: false,
  };
}

const NULLABLE_STRING_VALUE_SCHEMA: GeminiJsonSchema = {
  type: ['string', 'null'],
};

const NULLABLE_ISO_DATE_VALUE_SCHEMA: GeminiJsonSchema = {
  type: ['string', 'null'],
  format: 'date',
  description:
    'Fecha normalizada a ISO YYYY-MM-DD a partir del formato local dd/mm/aaaa. Si día y mes son <= 12 y puede haber ambigüedad, marcar needsReview=true y reason="ambiguo".',
};

/**
 * Esquema de Paso 1 (Clasificación) cuando el usuario deja el selector en "Automático".
 * Permite al backend detectar si el archivo es un documento de salud válido, si es legible y su tipo,
 * antes de aplicar el esquema plano correspondiente a ese tipo.
 */
export const DOCUMENT_CLASSIFICATION_JSON_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  title: 'DocumentClassification',
  description:
    'Clasificación inicial del documento escaneado antes de extraer los campos específicos por tipo.',
  properties: {
    isHealthDocument: {
      type: 'boolean',
      description: 'false si la imagen o PDF no corresponde a un documento médico o de salud.',
    },
    isLegible: {
      type: 'boolean',
      description: 'false si la imagen está demasiado borrosa, oscura o cortada para leerse.',
    },
    detectedKind: {
      type: ['string', 'null'],
      enum: ['prescription', 'consultation', 'lab_result', 'other', null],
      description: 'Tipo de documento detectado cuando isHealthDocument e isLegible son true.',
    },
  },
  required: ['isHealthDocument', 'isLegible', 'detectedKind'],
  additionalProperties: false,
};

/** Esquema de extracción para `prescription` (Receta médica). */
export const PRESCRIPTION_EXTRACTION_JSON_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  title: 'PrescriptionExtraction',
  description: 'Extracción estructurada de una receta médica.',
  properties: {
    schemaVersion: {
      type: 'string',
      enum: [EXTRACTION_SCHEMA_VERSION],
    },
    detectedKind: {
      type: 'string',
      enum: ['prescription'],
    },
    fields: {
      type: 'object',
      properties: {
        dateIso: createExtractedFieldJsonSchema(
          NULLABLE_ISO_DATE_VALUE_SCHEMA,
          'Fecha de emisión de la receta en ISO YYYY-MM-DD.'
        ),
        specialty: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Especialidad médica que emite la receta.'
        ),
        doctorName: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nombre completo del médico tratante.'
        ),
        medications: createExtractedFieldJsonSchema(
          {
            type: ['array', 'null'],
            items: {
              type: 'object',
              properties: {
                name: createExtractedFieldJsonSchema(
                  NULLABLE_STRING_VALUE_SCHEMA,
                  'Nombre del medicamento.'
                ),
                dose: createExtractedFieldJsonSchema(
                  NULLABLE_STRING_VALUE_SCHEMA,
                  'Dosis o concentración (ej. 50 mg).'
                ),
                frequency: createExtractedFieldJsonSchema(
                  NULLABLE_STRING_VALUE_SCHEMA,
                  'Frecuencia de toma (ej. Cada 12 horas).'
                ),
                duration: createExtractedFieldJsonSchema(
                  NULLABLE_STRING_VALUE_SCHEMA,
                  'Duración del tratamiento (ej. Por 30 días).'
                ),
              },
              required: ['name', 'dose', 'frequency', 'duration'],
              additionalProperties: false,
            },
          },
          'Lista de medicamentos prescritos.'
        ),
        indications: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Indicaciones generales o notas adicionales de la receta.'
        ),
      },
      required: ['dateIso', 'specialty', 'doctorName', 'medications', 'indications'],
      additionalProperties: false,
    },
  },
  required: ['schemaVersion', 'detectedKind', 'fields'],
  additionalProperties: false,
};

/** Esquema de extracción para `consultation` (Consulta o Cita médica). */
export const CONSULTATION_EXTRACTION_JSON_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  title: 'ConsultationExtraction',
  description:
    'Extracción estructurada de una consulta médica o comprobante de cita (consulta con fecha futura).',
  properties: {
    schemaVersion: {
      type: 'string',
      enum: [EXTRACTION_SCHEMA_VERSION],
    },
    detectedKind: {
      type: 'string',
      enum: ['consultation'],
    },
    fields: {
      type: 'object',
      properties: {
        specialty: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Especialidad médica de la consulta o cita.'
        ),
        doctorName: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nombre del médico o especialista.'
        ),
        dateIso: createExtractedFieldJsonSchema(
          NULLABLE_ISO_DATE_VALUE_SCHEMA,
          'Fecha de la consulta o cita en ISO YYYY-MM-DD.'
        ),
        time: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Hora programada en formato 24h HH:mm (ej. 09:00).'
        ),
        location: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Clínica, hospital o consultorio.'
        ),
        notes: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Indicaciones previas a la cita o resumen de la consulta.'
        ),
      },
      required: ['specialty', 'doctorName', 'dateIso', 'time', 'location', 'notes'],
      additionalProperties: false,
    },
  },
  required: ['schemaVersion', 'detectedKind', 'fields'],
  additionalProperties: false,
};

/**
 * Esquema de extracción para `lab_result` (Resultado de examen).
 * REGLA ESTRICTA: solo metadatos del estudio; prohibido extraer valores numéricos o interpretaciones.
 */
export const LAB_RESULT_EXTRACTION_JSON_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  title: 'LabResultExtraction',
  description:
    'Extracción de metadatos de un resultado de examen. PROHIBIDO extraer valores de analitos individuales, rangos de referencia o clasificar como normal/anormal.',
  properties: {
    schemaVersion: {
      type: 'string',
      enum: [EXTRACTION_SCHEMA_VERSION],
    },
    detectedKind: {
      type: 'string',
      enum: ['lab_result'],
    },
    fields: {
      type: 'object',
      properties: {
        examType: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nombre o tipo de estudio realizado (ej. Perfil lipídico y glucosa).'
        ),
        dateIso: createExtractedFieldJsonSchema(
          NULLABLE_ISO_DATE_VALUE_SCHEMA,
          'Fecha de toma o emisión del resultado en ISO YYYY-MM-DD.'
        ),
        laboratory: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nombre del laboratorio o centro diagnóstico.'
        ),
        orderingDoctor: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nombre del médico que solicitó el examen.'
        ),
        note: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Nota administrativa o de archivo sin interpretación clínica ni valores numéricos.'
        ),
      },
      required: ['examType', 'dateIso', 'laboratory', 'orderingDoctor', 'note'],
      additionalProperties: false,
    },
  },
  required: ['schemaVersion', 'detectedKind', 'fields'],
  additionalProperties: false,
};

/** Esquema de extracción para `other` (Otro documento de salud). */
export const OTHER_DOCUMENT_EXTRACTION_JSON_SCHEMA: GeminiJsonSchema = {
  type: 'object',
  title: 'OtherHealthDocumentExtraction',
  description: 'Extracción estructurada de cualquier otro documento de salud.',
  properties: {
    schemaVersion: {
      type: 'string',
      enum: [EXTRACTION_SCHEMA_VERSION],
    },
    detectedKind: {
      type: 'string',
      enum: ['other'],
    },
    fields: {
      type: 'object',
      properties: {
        title: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Título descriptivo del documento.'
        ),
        dateIso: createExtractedFieldJsonSchema(
          NULLABLE_ISO_DATE_VALUE_SCHEMA,
          'Fecha del documento en ISO YYYY-MM-DD.'
        ),
        note: createExtractedFieldJsonSchema(
          NULLABLE_STRING_VALUE_SCHEMA,
          'Resumen breve o nota del documento.'
        ),
      },
      required: ['title', 'dateIso', 'note'],
      additionalProperties: false,
    },
  },
  required: ['schemaVersion', 'detectedKind', 'fields'],
  additionalProperties: false,
};

/** Mapa de esquemas JSON Schema por tipo de documento para el backend con Gemini Flash. */
export const EXTRACTION_JSON_SCHEMAS_BY_KIND: Record<DocumentKind, GeminiJsonSchema> = {
  prescription: PRESCRIPTION_EXTRACTION_JSON_SCHEMA,
  consultation: CONSULTATION_EXTRACTION_JSON_SCHEMA,
  lab_result: LAB_RESULT_EXTRACTION_JSON_SCHEMA,
  other: OTHER_DOCUMENT_EXTRACTION_JSON_SCHEMA,
};

