import {
  DocumentExtractionResult,
  DocumentExtractionService,
  DocumentFileInput,
  DocumentKind,
  EXTRACTION_SCHEMA_VERSION,
} from '../contracts/documentExtraction';
import { api, ApiError } from '../lib/api';
import { ApiPrescription } from '../data/healthLog';

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 45_000;

export interface SavedPrescriptionMeta {
  prescriptionId: number;
  medicationIds: number[];
}

interface ApiMedication {
  id: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Implementación real del contrato `DocumentExtractionService`: sube el archivo al backend
 * Laravel, que lo guarda en R2 y despacha el Job de extracción con Gemini, y hace polling
 * del estado hasta que termina. Por ahora el backend solo persiste `prescription` (ver
 * alcance acordado); otros tipos se bloquean antes de gastar una llamada real.
 */
export class RealDocumentExtractionService implements DocumentExtractionService {
  private lastMeta: SavedPrescriptionMeta | null = null;

  public getLastPrescriptionMeta(): SavedPrescriptionMeta | null {
    return this.lastMeta;
  }

  public async extract(
    file: DocumentFileInput,
    forcedType?: DocumentKind,
    profileId?: string
  ): Promise<DocumentExtractionResult> {
    if (forcedType && forcedType !== 'prescription') {
      return {
        ok: false,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        file,
        error: {
          code: 'unsupported_file',
          title: 'Próximamente disponible',
          message:
            'Por ahora Bita solo guarda recetas automáticamente. El soporte para citas, resultados y otros documentos llega pronto.',
          retryable: false,
        },
      };
    }

    if (!profileId) {
      return {
        ok: false,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        file,
        error: {
          code: 'server_error',
          title: 'Perfil no seleccionado',
          message: 'No se pudo determinar en qué perfil guardar este documento.',
          retryable: false,
        },
      };
    }

    if (!file.uri) {
      return {
        ok: false,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        file,
        error: {
          code: 'unsupported_file',
          title: 'Archivo no disponible',
          message: 'No se encontró el archivo capturado para subir.',
          retryable: false,
        },
      };
    }

    try {
      const prescription = await api.upload<ApiPrescription>(
        `/profiles/${profileId}/prescriptions`,
        { uri: file.uri, name: file.fileName, type: file.mimeType }
      );

      const finalPrescription = await this.pollUntilDone(profileId, prescription.id);

      if (finalPrescription.status === 'failed' || !finalPrescription.raw_extraction) {
        this.lastMeta = null;
        return {
          ok: false,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          file,
          error: {
            code: 'server_error',
            title: 'No se pudo leer el documento',
            message:
              finalPrescription.failure_reason ??
              'Ocurrió un error al procesar el documento. Intenta de nuevo.',
            retryable: true,
          },
        };
      }

      const result = finalPrescription.raw_extraction;

      if (!result.ok) {
        this.lastMeta = null;
        return { ...result, file };
      }

      const medications = await api
        .get<ApiMedication[]>(`/profiles/${profileId}/medications`)
        .catch(() => []);
      this.lastMeta = {
        prescriptionId: finalPrescription.id,
        medicationIds: medications.map((m) => m.id),
      };

      return { ...result, file };
    } catch (error) {
      this.lastMeta = null;
      if (error instanceof ApiError && error.status === 0) {
        return {
          ok: false,
          schemaVersion: EXTRACTION_SCHEMA_VERSION,
          file,
          error: {
            code: 'network_error',
            title: 'Sin conexión',
            message: 'No se pudo conectar con el servidor. Verifica tu internet e intenta de nuevo.',
            retryable: true,
          },
        };
      }
      return {
        ok: false,
        schemaVersion: EXTRACTION_SCHEMA_VERSION,
        file,
        error: {
          code: 'server_error',
          title: 'Error inesperado',
          message: error instanceof Error ? error.message : 'Ocurrió un error al procesar el documento.',
          retryable: true,
        },
      };
    }
  }

  private async pollUntilDone(profileId: string, prescriptionId: number): Promise<ApiPrescription> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
      const current = await api.get<ApiPrescription>(
        `/profiles/${profileId}/prescriptions/${prescriptionId}`
      );

      if (current.status === 'completed' || current.status === 'failed') {
        return current;
      }

      await sleep(POLL_INTERVAL_MS);
    }

    return {
      id: prescriptionId,
      profile_id: Number(profileId),
      status: 'failed',
      raw_extraction: null,
      failure_reason: 'El documento tardó demasiado en procesarse. Intenta de nuevo.',
      created_at: new Date().toISOString(),
    };
  }
}

export const documentExtractionService = new RealDocumentExtractionService();
