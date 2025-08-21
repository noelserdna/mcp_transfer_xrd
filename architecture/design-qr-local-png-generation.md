# Diseño Arquitectónico: Generación QR PNG Local

## Overview Arquitectónico

Este documento especifica el diseño arquitectónico para implementar la funcionalidad de generación de archivos PNG físicos para códigos QR de deep links de Radix Wallet. La solución resuelve la incompatibilidad de Claude Desktop con Base64 PNG mediante la generación de archivos locales en directorio `qrimages/` con nombres únicos basados en hash SHA-256 del deep link.

### Principios Arquitectónicos Aplicados

- **Extensibilidad sin Modificación**: Mantiene compatibilidad total con `QRGenerator` existente
- **Single Responsibility**: Cada componente tiene una responsabilidad específica y bien definida  
- **Dependency Injection**: Inyección de dependencias para testing y flexibilidad
- **Error Handling Consistente**: Manejo de errores siguiendo patrones MCP establecidos
- **API-First Design**: Contratos claros de interfaces TypeScript

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP Server (index.ts)                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Tool: deeplink_to_qr_local                       │   │
│  │  ┌─────────────────┐    ┌──────────────────────────────────┐  │   │
│  │  │   Zod Schema    │    │         Tool Handler            │  │   │
│  │  │   Validation    │────│      (MCP Protocol)             │  │   │
│  │  └─────────────────┘    └──────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LocalQRManager (Nuevo)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  Orchestrator Class                          │   │
│  │  • Coordina flujo end-to-end                                 │   │
│  │  • Maneja integración entre componentes                     │   │
│  │  • Controla transacciones de archivos                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │                    │                      │
          ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐   ┌─────────────────┐
│  DirectoryManager│  │ FilenameGenerator│   │  LocalQRGenerator│
│                 │  │                 │   │                 │
│ • Gestión dir   │  │ • Hash SHA-256  │   │ • PNG físico    │
│ • Permisos      │  │ • Anti-colisión │   │ • Reutiliza     │
│ • Cleanup       │  │ • Sanitización  │   │   QRGenerator   │
│ • Verificación  │  │ • Validación    │   │ • File I/O      │
└─────────────────┘  └─────────────────┘   └─────────────────┘
          │                    │                      │
          └────────────────────┼──────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   QRGenerator   │
                    │   (Existing)    │
                    │ • PNG Base64    │
                    │ • SVG           │
                    │ • Validation    │
                    │ • NO CHANGES    │
                    └─────────────────┘
```

## Flujo de Datos End-to-End

```
┌──────────┐    ┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   User   │───▶│ MCP Request  │───▶│ Tool Validation │───▶│ LocalQRManager   │
│          │    │ deeplink_to_ │    │   Zod Schema    │    │  .generateLocal  │
│  Claude  │    │ qr_local     │    │                 │    │                  │
│ Desktop  │    └──────────────┘    └─────────────────┘    └──────────────────┘
└──────────┘                                                        │
     ▲                                                              ▼
     │                                               ┌─────────────────────────┐
     │                                               │  1. DirectoryManager    │
     │                                               │     .ensureDirectory    │
     │  ┌──────────────────┐                        └─────────────────────────┘
     │  │   MCP Response   │                                      │
     │  │  File paths +    │                                      ▼
     │  │   Metadata       │                        ┌─────────────────────────┐
     └──┤                 │                        │  2. FilenameGenerator   │
        │ • PNG file path  │                        │     .generateUnique     │
        │ • File size      │                        │     (SHA-256 hash)      │
        │ • QR metadata    │                        └─────────────────────────┘
        │ • Error handling │                                      │
        └──────────────────┘                                      ▼
                ▲                                   ┌─────────────────────────┐
                │                                   │  3. LocalQRGenerator    │
                │                                   │     .generatePNGFile    │
        ┌──────────────────┐                        └─────────────────────────┘
        │  File System     │                                      │
        │  qrimages/       │                                      ▼
        │                  │                        ┌─────────────────────────┐
        │ • PNG files      │◀──────────────────────│  4. QRGenerator.generatePNG │
        │ • Unique names   │                        │     (Existing, no changes) │
        │ • Cleanup        │                        └─────────────────────────┘
        └──────────────────┘
```

## Especificaciones de Componentes

### 1. LocalQRManager (Orchestrator)

**Archivo**: `src/helpers/local-qr-manager.ts`

**Responsabilidades**:
- Coordina el flujo completo de generación PNG local
- Maneja transacciones de archivos (rollback en caso de error)
- Integra todos los componentes sin acoplamientos fuertes
- Proporciona interfaz clean para el tool MCP

**Interface TypeScript**:
```typescript
export interface LocalQRGenerationParams {
  deeplink: string;
  tamaño?: number;  // Default: 256
  prefijo_archivo?: string;  // Default: 'qr_'
}

export interface LocalQRGenerationResult {
  archivo_png: string;  // Absolute path al archivo PNG
  tamaño_archivo: number;  // Bytes
  nombre_archivo: string;  // Filename únicamente
  hash_deeplink: string;  // SHA-256 hash para referencia
  metadatos: LocalQRMetadata;
}

export interface LocalQRMetadata {
  url_original: string;
  tamaño_png: number;
  timestamp: string;
  directorio: string;
  hash_algoritmo: 'sha256';
}

export class LocalQRManager {
  constructor(
    private directoryManager: DirectoryManager,
    private filenameGenerator: FilenameGenerator,
    private localQRGenerator: LocalQRGenerator
  ) {}

  async generateLocalQR(params: LocalQRGenerationParams): Promise<LocalQRGenerationResult>
  async cleanup(olderThanDays?: number): Promise<number>  // Returns files deleted count
}
```

### 2. DirectoryManager (File System Management)

**Archivo**: `src/helpers/directory-manager.ts`

**Responsabilidades**:
- Gestiona directorio `qrimages/` de forma segura
- Maneja permisos y creación de directorios
- Verifica espacio disponible y limits de archivos
- Proporciona funciones de cleanup y mantenimiento

**Interface TypeScript**:
```typescript
export interface DirectoryConfig {
  baseDirectory: string;  // Default: './qrimages'
  maxFiles: number;      // Default: 1000
  maxSizeMB: number;     // Default: 100
  autoCleanupDays: number; // Default: 7
}

export interface DirectoryInfo {
  path: string;
  exists: boolean;
  writable: boolean;
  fileCount: number;
  sizeBytes: number;
  freeSpaceBytes: number;
}

export class DirectoryManager {
  constructor(private config: DirectoryConfig = DEFAULT_DIRECTORY_CONFIG) {}

  async ensureDirectory(): Promise<void>
  async getDirectoryInfo(): Promise<DirectoryInfo>
  async checkDiskSpace(requiredBytes: number): Promise<boolean>
  async cleanupOldFiles(olderThanDays: number): Promise<string[]>
  async validateDirectoryPermissions(): Promise<void>
}
```

### 3. FilenameGenerator (Unique Naming)

**Archivo**: `src/helpers/filename-generator.ts`

**Responsabilidades**:
- Genera nombres únicos usando SHA-256 del deep link
- Sanitiza nombres de archivos para cross-platform compatibility
- Previene colisiones de nombres
- Maneja prefijos y sufijos configurables

**Interface TypeScript**:
```typescript
export interface FilenameConfig {
  prefijo: string;        // Default: 'qr_'
  incluir_timestamp: boolean; // Default: false
  longitud_hash: number;  // Default: 12 (primeros 12 chars del SHA-256)
  extension: string;      // Default: '.png'
}

export interface FilenameResult {
  filename: string;       // Nombre completo con extensión
  hash: string;          // SHA-256 completo (64 chars)
  collision_suffix?: string; // Si se detectó colisión
}

export class FilenameGenerator {
  constructor(private config: FilenameConfig = DEFAULT_FILENAME_CONFIG) {}

  generateUnique(deeplink: string, existingFiles: string[]): FilenameResult
  private hashDeeplink(deeplink: string): string
  private sanitizeFilename(filename: string): string
  private handleCollision(baseFilename: string, existingFiles: string[]): string
}
```

### 4. LocalQRGenerator (PNG File Generation)

**Archivo**: `src/helpers/local-qr-generator.ts`

**Responsabilidades**:
- Genera archivos PNG físicos en file system
- Reutiliza `QRGenerator` existente para PNG Base64
- Maneja conversión Base64 → Buffer → File
- Valida integridad de archivos generados

**Interface TypeScript**:
```typescript
export interface LocalPNGConfig {
  quality: number;        // Default: 1.0
  compression: number;    // Default: 6
  validateOutput: boolean; // Default: true
}

export interface LocalPNGResult {
  filepath: string;       // Absolute path
  sizeBytes: number;
  width: number;
  height: number;
  checksum: string;       // MD5 del archivo para integridad
}

export class LocalQRGenerator {
  constructor(
    private qrGenerator: QRGenerator,  // Dependency injection
    private config: LocalPNGConfig = DEFAULT_LOCAL_PNG_CONFIG
  ) {}

  async generatePNGFile(deeplink: string, filepath: string, size: number): Promise<LocalPNGResult>
  private async base64ToFile(base64Data: string, filepath: string): Promise<void>
  private async validateGeneratedFile(filepath: string): Promise<boolean>
  private calculateFileChecksum(filepath: string): Promise<string>
}
```

## Integración con Arquitectura Existente

### Patrón de Extensión Sin Modificación

**Código Existente INTACTO**:
- `QRGenerator` class permanece sin cambios
- `DeepLinkToQRParams` interface se reutiliza
- `deeplink_to_qr` tool continúa funcionando idénticamente
- Todos los tests existentes siguen pasando

**Extensión Limpia**:
```typescript
// src/index.ts - Nueva herramienta MCP
const LocalDeepLinkToQRSchema = {
  deeplink: z.string().describe("Deep link de Radix Wallet para convertir a archivo PNG local"),
  tamaño: z.number().min(32).max(2048).optional().describe("Tamaño en píxeles para PNG (default: 256)"),
  prefijo_archivo: z.string().optional().describe("Prefijo para nombre de archivo (default: 'qr_')")
};

server.tool(
  "deeplink_to_qr_local", 
  "Genera archivo PNG local de código QR para deep link de Radix Wallet",
  LocalDeepLinkToQRSchema,
  async (params) => {
    // Implementation usando LocalQRManager
  }
);
```

### Dependency Injection Pattern

```typescript
// src/index.ts - Inicialización de dependencias
const directoryManager = new DirectoryManager();
const filenameGenerator = new FilenameGenerator();
const localQRGenerator = new LocalQRGenerator(qrGenerator); // Reutiliza instancia existente
const localQRManager = new LocalQRManager(
  directoryManager,
  filenameGenerator, 
  localQRGenerator
);
```

## Contratos de APIs y Datos

### Schema Zod para MCP Tool

```typescript
export const LocalDeepLinkToQRSchema = {
  deeplink: z.string()
    .min(1)
    .describe("Deep link de Radix Wallet para convertir a archivo PNG local"),
  
  tamaño: z.number()
    .min(32)
    .max(2048)
    .optional()
    .describe("Tamaño en píxeles para PNG (default: 256)"),
    
  prefijo_archivo: z.string()
    .max(20)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe("Prefijo para nombre de archivo (default: 'qr_')")
};
```

### Response Structure

```typescript
export interface LocalQRToolResponse {
  content: [{
    type: "text";
    text: string;  // Formatted response con paths y metadata
  }];
}

// Ejemplo de respuesta formateada
const responseText = `
✅ **Archivo PNG QR generado exitosamente**

📁 **Archivo creado:** ${result.archivo_png}
📊 **Tamaño archivo:** ${(result.tamaño_archivo / 1024).toFixed(2)} KB  
📐 **Dimensiones:** ${result.metadatos.tamaño_png}x${result.metadatos.tamaño_png}px
🔗 **Deep Link:** ${result.metadatos.url_original}
📅 **Generado:** ${new Date(result.metadatos.timestamp).toLocaleString('es-ES')}

💡 **Instrucciones de uso:**
• **Claude Desktop**: El archivo está disponible en el path absoluto mostrado
• **Escaneo móvil**: Abre el archivo PNG y escanéalo con cualquier lector QR
• **Radix Wallet**: Al escanear abrirá directamente la transacción
• **Cleanup**: Los archivos se auto-eliminan después de ${directoryConfig.autoCleanupDays} días
`;
```

## Diagramas de Secuencia

### Caso de Uso Principal: Generación PNG Exitosa

```
User/Claude Desktop → MCP Tool → LocalQRManager → DirectoryManager → FilenameGenerator → LocalQRGenerator → QRGenerator → FileSystem

1. User: deeplink_to_qr_local(deeplink, tamaño)
2. MCP Tool: Zod validation ✓
3. LocalQRManager.generateLocalQR()
4. DirectoryManager.ensureDirectory()
5. DirectoryManager.checkDiskSpace()
6. FilenameGenerator.generateUnique()
7. LocalQRGenerator.generatePNGFile()
8. QRGenerator.generatePNG() [EXISTING]
9. LocalQRGenerator.base64ToFile()
10. LocalQRGenerator.validateGeneratedFile()
11. Return LocalQRGenerationResult
12. Return MCP formatted response

Result: PNG file created in qrimages/ with unique name
```

### Caso de Error: Disk Space Insuficiente

```
User → MCP Tool → LocalQRManager → DirectoryManager → Error

1. User: deeplink_to_qr_local(deeplink, tamaño=2048)
2. MCP Tool: Zod validation ✓  
3. LocalQRManager.generateLocalQR()
4. DirectoryManager.checkDiskSpace() ❌
5. Throw InsufficientDiskSpaceError
6. LocalQRManager catches error
7. Return error response via MCP

Result: User gets clear error message about disk space
```

## Decisiones Arquitectónicas

### ADR-001: Reutilización de QRGenerator Existente

**Status**: Aceptado

**Contexto**: Se podría implementar generación PNG desde cero o reutilizar código existente.

**Decisión**: Reutilizar `QRGenerator` existente mediante dependency injection.

**Justificación**:
- ✅ Mantiene compatibilidad total con herramienta existente
- ✅ Reduce duplicación de código
- ✅ Aprovecha validaciones y configuraciones ya probadas  
- ✅ Facilita testing al reutilizar mocks existentes

**Consecuencias**:
- LocalQRGenerator depende de QRGenerator (inyección controlada)
- Base64 PNG se convierte a archivo físico (overhead mínimo)

### ADR-002: SHA-256 para Naming de Archivos

**Status**: Aceptado  

**Contexto**: Se necesita naming único pero determinístico para archivos PNG.

**Decisión**: Usar SHA-256 hash del deep link (primeros 12 caracteres) + prefijo.

**Justificación**:
- ✅ Garantiza unicidad para deep links únicos
- ✅ Es determinístico (mismo deep link = mismo filename)  
- ✅ Evita caracteres problemáticos en filenames
- ✅ 12 caracteres proporcionan >68B combinaciones (colisión improbable)

**Consecuencias**:
- Archivos con mismo deep link se sobrescriben (feature, no bug)
- Hash truncado reduce path length en sistemas con limits

### ADR-003: Directorio qrimages/ en Root del Proyecto

**Status**: Aceptado

**Contexto**: Se necesita definir ubicación de archivos PNG generados.

**Decisión**: Crear directorio `qrimages/` en root del proyecto MCP.

**Justificación**:  
- ✅ Paths absolutos predecibles para Claude Desktop
- ✅ Separación clara de archivos temporales vs código
- ✅ Fácil cleanup y gitignore
- ✅ Compatible con permisos de MCP server

**Consecuencias**:
- Directorio se crea automáticamente si no existe
- Requiere permisos de escritura en directorio de proyecto
- Se debe añadir `/qrimages/` a .gitignore

### ADR-004: Auto-cleanup de Archivos Antiguos

**Status**: Aceptado

**Contexto**: Archivos PNG pueden acumularse y consumir espacio en disco.

**Decisión**: Auto-cleanup de archivos mayores a 7 días + cleanup manual opcional.

**Justificación**:
- ✅ Previene acumulación infinita de archivos
- ✅ 7 días permiten reutilización de QRs recientes  
- ✅ Cleanup manual para casos específicos
- ✅ Configurable per deployment

**Consecuencias**:
- Archivos QR se eliminan automáticamente después de 7 días
- LocalQRManager.cleanup() disponible para maintenance

### ADR-005: Error Handling Consistente con MCP Patterns

**Status**: Aceptado

**Contexto**: El proyecto ya tiene patrones establecidos de error handling para MCP tools.

**Decisión**: Seguir mismos patrones que `deeplink_to_qr` tool existente.

**Justificación**:
- ✅ Consistencia en UX para usuario final
- ✅ Reutiliza tipos de error ya definidos
- ✅ Mensajes localizados en español ya implementados
- ✅ Fallback graceful con información útil

**Consecuencias**:
- Errors se devuelven como MCP text responses formateados
- Spanish error messages para consistencia con proyecto
- Structured error codes para programmatic handling si es necesario

## Especificaciones de Testing

### Unit Tests Requeridos

**DirectoryManager Tests**:
```typescript
// tests/directory-manager.test.ts
describe('DirectoryManager', () => {
  test('should create qrimages directory if not exists')
  test('should validate write permissions')  
  test('should check disk space requirements')
  test('should cleanup files older than specified days')
  test('should handle permission errors gracefully')
});
```

**FilenameGenerator Tests**:
```typescript
// tests/filename-generator.test.ts  
describe('FilenameGenerator', () => {
  test('should generate consistent hash for same deep link')
  test('should generate different names for different deep links')
  test('should handle collision detection')
  test('should sanitize problematic characters')
  test('should respect prefix configuration')
});
```

**LocalQRGenerator Tests**:
```typescript
// tests/local-qr-generator.test.ts
describe('LocalQRGenerator', () => {
  test('should create PNG file from base64')
  test('should validate file integrity')
  test('should handle file system errors')
  test('should calculate correct file size')
  test('should generate proper checksums')
});
```

### Integration Tests

**MCP Tool Integration**:
```typescript
// tests/deeplink-to-qr-local.test.ts
describe('deeplink_to_qr_local tool', () => {
  test('should generate PNG file for valid deep link')
  test('should return proper file paths')
  test('should handle invalid deep links')
  test('should cleanup generated files after test')
  test('should respect size parameters')
});
```

## Consideraciones de Performance

### Optimizaciones

1. **Lazy Directory Creation**: Solo crea `qrimages/` cuando se necesita por primera vez
2. **In-Memory Validation**: Valida deep link antes de generar PNG  
3. **Async File Operations**: Todas las operaciones de I/O son asíncronas
4. **Reuse QRGenerator Instance**: Una sola instancia compartida para generación Base64

### Limits y Constraints

- **Max File Size**: PNG limitado a 2048x2048px (≈16MB máximo)
- **Directory Limits**: Máximo 1000 archivos (configurable)
- **Auto-cleanup**: 7 días default (configurable) 
- **Disk Space Check**: Valida espacio antes de generar archivo

### Memory Usage

- Base64 PNG se genera en memoria y se convierte directamente a archivo
- No se almacenan múltiples representaciones simultáneamente
- SHA-256 hash calculation es de complejidad O(n) con input length

## Extensibilidad Futura

### Hooks para Extensión

1. **Custom Filename Strategies**: Interface para diferentes estrategias de naming
2. **Multiple Output Formats**: Extensible a JPEG, WebP, etc.
3. **Cloud Storage Integration**: Interface para storage providers (S3, GCP, etc.)
4. **Batch Generation**: Procesamiento de múltiples deep links  
5. **QR Analytics**: Tracking de generación y uso de codes

### Plugin Architecture Ready

```typescript
export interface QRStorageProvider {
  store(data: Buffer, filename: string): Promise<string>
  retrieve(filename: string): Promise<Buffer>
  delete(filename: string): Promise<void>
  cleanup(olderThanDays: number): Promise<string[]>
}

export interface QRNamingStrategy {
  generateFilename(deeplink: string, config: any): FilenameResult
}
```

## Security Considerations

### Input Validation
- Deep link validation usando mismo pattern que herramienta existente
- Filename sanitization para prevenir directory traversal
- Size limits para prevenir DoS via large file generation

### File System Security  
- Restricted file permissions (644) para archivos PNG
- Directory permissions (755) para qrimages/
- No execution de archivos generados
- Path validation para prevenir escritura fuera de qrimages/

### Cleanup Security
- Auto-cleanup previene acumulación infinita
- Manual cleanup requiere configuración explícita  
- File deletion verification después de cleanup

## Deployment Considerations

### Configuration
```typescript
// Configurable via environment variables
export const DEPLOYMENT_CONFIG = {
  QR_IMAGES_DIR: process.env.QR_IMAGES_DIR || './qrimages',
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_QR_FILE_SIZE_MB || '16'),
  AUTO_CLEANUP_DAYS: parseInt(process.env.QR_CLEANUP_DAYS || '7'),
  MAX_FILES: parseInt(process.env.MAX_QR_FILES || '1000')
};
```

### GitIgnore Updates
```gitignore
# QR Images directory (auto-generated files)
qrimages/
*.qr.png
```

### Package.json Dependencies
- No new dependencies required (reutiliza `qrcode` existente)
- Node.js built-in modules: `fs`, `crypto`, `path`

---

**Documento Versión**: 1.0
**Última Actualización**: 2025-08-21
**Arquitecto**: Claude Code (Especialista en Arquitectura de Software)
**Estado**: Listo para Implementación

Este diseño arquitectónico proporciona una base sólida para implementar la generación PNG local manteniendo la integridad de la arquitectura existente y siguiendo principios de software engineering establecidos.