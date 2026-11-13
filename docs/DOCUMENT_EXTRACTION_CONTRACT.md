# Contrato de Extracción de Documentos de Salud (Bita — Fase 2.6)

Este documento define el contrato de integración entre la app móvil **Bita** (React Native / Expo) y el futuro backend de procesamiento con **Gemini Flash**.

Todos los tipos TypeScript y objetos JSON Schema viven en un único archivo fuente:
- [`src/contracts/documentExtraction.ts`](file:///Users/fersand/Desktop/Bita/src/contracts/documentExtraction.ts)

---

## 1. Versión del esquema y firma del servicio

- **Versión actual:** `schemaVersion: "1.0.0"` (`EXTRACTION_SCHEMA_VERSION`).
- **Interfaz cliente (`DocumentExtractionService`):**
  ```ts
  extract(
    file: DocumentFileInput,
    forcedType?: 'prescription' | 'consultation' | 'lab_result' | 'other'
  ): Promise<DocumentExtractionResult>;
  ```
- **Entrada (`DocumentFileInput`):**
  - `source`: `'camera' | 'gallery' | 'pdf'`
  - `mimeType`: `'image/jpeg' | 'image/png' | 'application/pdf'`
  - `sizeBytes`: límite máximo recomendado `10 MB` (si lo supera o el MIME no es compatible, devolver error `'unsupported_file'`).
  - `forcedType` (opcional): cuando el usuario selecciona explícitamente el tipo en los chips de escaneo o cambia el chip `"Detectamos: [tipo]"` en la pantalla de confirmación.

---

## 2. Estructura uniforme de campo (`ExtractedField<T>`)

Cada campo extraído utiliza el envoltorio:

```ts
export type ReviewReason = 'ilegible' | 'ambiguo' | 'faltante';

export interface ExtractedField<T> {
  value: T | null;
  needsReview: boolean;
  reason?: ReviewReason | null;
  rawText?: string | null;
}
```

### Regla de fechas (`dd/mm/aaaa` → ISO `YYYY-MM-DD`)
1. Los documentos físicos en español expresan fechas como `dd/mm/aaaa` (p. ej. `18/10/2026`).
2. La propiedad `value` de todo campo de fecha (`dateIso`) **siempre** se entrega en formato ISO `YYYY-MM-DD` (o `null` si falta/es ilegible).
3. **Ambigüedad día/mes:** si tanto el día como el mes son `<= 12` y distintos entre sí (p. ej. `05/11/2026`) y no hay nombre de mes explícito, el backend normaliza asumiendo `dd/mm/aaaa` (`2026-11-05`), pero **debe** marcar `needsReview: true` y `reason: "ambiguo"`.

### Regla de sellos al guardar en la app
- **No se permite guardar ningún documento sin fecha (`dateIso`).**
- Si al guardar persiste algún campo con `needsReview: true` sin confirmar ni corregir por el usuario, el registro queda con el sello ámbar **`"Revisar datos"`** (`stampVariant: 'review'`).
- Si el usuario confirmó o editó todos los campos con `needsReview: true` (o ninguno lo tenía), el registro se guarda con el sello salvia **`"Verificada"`** (`stampVariant: 'verified'`).

---

## 3. Tipos de documento y campos por tipo

| `DocumentKind` | Etiqueta UI | Campos en `fields` | Reglas específicas |
| :--- | :--- | :--- | :--- |
| `'prescription'` | **Receta** | `dateIso`, `specialty`, `doctorName`, `medications[]` (`name`, `dose`, `frequency`, `duration`), `indications` | Permite múltiples medicamentos por receta. |
| `'consultation'` | **Cita / Consulta** | `specialty`, `doctorName`, `dateIso`, `time`, `location`, `notes` | Reutiliza el tipo consulta existente: si `dateIso > getToday()`, la app la muestra como **Cita** en la sección `"Próximas"`; si `dateIso <= getToday()`, como consulta en la línea de tiempo. |
| `'lab_result'` | **Resultado** | `examType`, `dateIso`, `laboratory`, `orderingDoctor`, `note` | **PROHIBIDO** extraer valores numéricos individuales de analitos, rangos de referencia o interpretar como normal/anormal. Solo metadatos del documento. |
| `'other'` | **Otro** | `title`, `dateIso`, `note` | Resúmenes de alta, constancias de vacunación, certificados u otros documentos clínicos. |

---

## 4. Subconjunto de JSON Schema soportado por Gemini y estrategia de selección

De acuerdo con la documentación vigente de **Gemini Structured Outputs** (`gemini-api-guides/structured-output.md#json-schema-support`):
- **Tipos soportados en `type`:** `string`, `number`, `integer`, `boolean`, `object`, `array` y `null` (usando arreglos como `["string", "null"]` para campos anulables).
- **Propiedades soportadas:** `properties`, `required`, `additionalProperties`, `enum`, `format` (`date`, `date-time`, `time`), `items`, `minItems`, `maxItems`, `title`, `description`.
- **Limitación de uniones y anidamiento:** Las uniones discriminadas (`oneOf` / `anyOf` complejas) no forman parte del subconjunto garantizado y esquemas demasiado grandes o anidados pueden ser rechazados.

### Cómo elige el esquema el backend (`EXTRACTION_JSON_SCHEMAS_BY_KIND`)
1. **Con `forcedType` presente:**
   - El backend omite la clasificación y llama directamente a Gemini Flash pasando `EXTRACTION_JSON_SCHEMAS_BY_KIND[forcedType]` en `response_format: { type: "text", mime_type: "application/json", schema }`.
2. **Sin `forcedType` (modo `Automático`):**
   - **Paso 1 (Clasificación ligera):** llamada rápida con `DOCUMENT_CLASSIFICATION_JSON_SCHEMA` (`{ isHealthDocument, isLegible, detectedKind }`).
     - Si `isHealthDocument === false` → responde error `not_health_document`.
     - Si `isLegible === false` → responde error `illegible`.
   - **Paso 2 (Extracción tipada):** llamada con `EXTRACTION_JSON_SCHEMAS_BY_KIND[detectedKind]`, garantizando un esquema plano, pequeño y 100% compatible con Gemini Flash.

---

## 5. Códigos de error (`DocumentExtractionErrorCode`)

| Código | Cuándo se devuelve | `retryable` |
| :--- | :--- | :--- |
| `'illegible'` | Imagen borrosa, oscura, cortada o sin texto legible. | `true` |
| `'not_health_document'` | El archivo no parece ser una receta, cita, resultado ni documento médico. | `true` |
| `'network_error'` | Sin conexión de red desde el dispositivo. | `true` |
| `'server_error'` | Error 5xx del backend o timeout de Gemini Flash. | `true` |
| `'unsupported_file'` | Formato distinto de JPG/PNG/PDF o archivo mayor al tamaño permitido. | `false` |

---

## 6. Dependencias nativas pendientes para conectar el backend real

En Fase 2.6 la selección de archivos se simula mediante el servicio mock sin añadir paquetes nuevos. Al integrar la captura real con el backend:

1. Instalar los selectores oficiales de Expo:
   ```bash
   npx expo install expo-image-picker expo-document-picker
   ```
2. Configurar los permisos y plugins en `app.json`:
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-image-picker",
           {
             "cameraPermission": "Bita necesita acceso a la cámara para fotografiar tus recetas y documentos médicos.",
             "photosPermission": "Bita necesita acceso a tus fotos para elegir imágenes de tus documentos de salud."
           }
         ],
         "expo-document-picker"
       ]
     }
   }
   ```

