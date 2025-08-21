/**
 * Tipos TypeScript para funcionalidad de generación QR PNG local
 * Extensión de funcionalidad existente para almacenamiento en archivo local
 */

/**
 * Parámetros para generación de QR PNG local
 */
export interface LocalQRGenerationParams {
  /** Deep link de Radix Wallet a convertir en QR */
  deeplink: string;
  /** Tamaño del QR en píxeles (default: 512) */
  size?: number;
  /** Calidad del QR para escaneado móvil */
  quality?: 'low' | 'medium' | 'high' | 'max';
  /** Mantener relación de aspecto 1:1 */
  preserveAspect?: boolean;
  /** Directorio de salida personalizado (default: qrimages) */
  outputDir?: string;
}

/**
 * Resultado de generación de QR PNG local
 */
export interface LocalQRGenerationResult {
  /** Ruta absoluta del archivo PNG generado */
  filePath: string;
  /** Nombre del archivo generado */
  filename: string;
  /** Tamaño del archivo en bytes */
  fileSize: number;
  /** Hash único del deep link usado para generar el nombre */
  hash: string;
  /** Timestamp de generación */
  timestamp: number;
  /** Dimensiones del QR generado */
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * Configuración para DirectoryManager
 */
export interface DirectoryConfig {
  /** Directorio base para almacenar QR (default: qrimages) */
  baseDir: string;
  /** Crear directorio automáticamente si no existe */
  autoCreate: boolean;
  /** Validar permisos de escritura */
  validatePermissions: boolean;
  /** Configuración de limpieza automática */
  cleanup?: {
    /** Habilitar limpieza automática */
    enabled: boolean;
    /** Días después de los cuales eliminar archivos antiguos */
    maxAge: number;
    /** Tamaño máximo del directorio en MB */
    maxSize?: number;
  };
}

/**
 * Información de directorio
 */
export interface DirectoryInfo {
  /** Ruta absoluta del directorio */
  path: string;
  /** Si el directorio existe */
  exists: boolean;
  /** Si tiene permisos de escritura */
  writable: boolean;
  /** Número de archivos QR existentes */
  fileCount: number;
  /** Tamaño total en bytes */
  totalSize: number;
}

/**
 * Configuración para FilenameGenerator
 */
export interface FilenameConfig {
  /** Prefijo para nombres de archivo (default: qr) */
  prefix: string;
  /** Longitud del hash en caracteres (default: 8) */
  hashLength: number;
  /** Incluir timestamp en el nombre */
  includeTimestamp: boolean;
  /** Extensión de archivo (default: png) */
  extension: string;
}

/**
 * Resultado de generación de nombre único
 */
export interface FilenameResult {
  /** Nombre completo del archivo */
  filename: string;
  /** Hash del deep link */
  hash: string;
  /** Timestamp usado */
  timestamp: number;
  /** Ruta completa del archivo */
  fullPath: string;
}

/**
 * Configuración para LocalQRGenerator
 */
export interface LocalPNGConfig {
  /** Tamaño en píxeles */
  size: number;
  /** Margen alrededor del QR */
  margin: number;
  /** Nivel de corrección de errores */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  /** Color de fondo (hex) */
  background: string;
  /** Color de primer plano (hex) */
  foreground: string;
}

/**
 * Resultado de generación PNG local
 */
export interface LocalPNGResult {
  /** Buffer del PNG generado */
  buffer: Buffer;
  /** Tamaño del archivo en bytes */
  size: number;
  /** Dimensiones de la imagen */
  dimensions: {
    width: number;
    height: number;
  };
  /** Configuración usada */
  config: LocalPNGConfig;
}

/**
 * Configuración para LocalQRManager
 */
export interface LocalQRManagerConfig {
  /** Configuración de directorio */
  directory: DirectoryConfig;
  /** Configuración de nombres de archivo */
  filename: FilenameConfig;
  /** Configuración de PNG */
  png: LocalPNGConfig;
  /** Validación estricta de deep links */
  strictValidation: boolean;
}

/**
 * Errores específicos para funcionalidad local
 */
export class LocalQRError extends Error {
  constructor(
    message: string,
    public code: 'DIRECTORY_ERROR' | 'FILE_ERROR' | 'PERMISSION_ERROR' | 'GENERATION_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'LocalQRError';
  }
}

/**
 * Métricas de performance para monitoreo
 */
export interface LocalQRMetrics {
  /** Tiempo total de generación en ms */
  generationTime: number;
  /** Tiempo de validación en ms */
  validationTime: number;
  /** Tiempo de escritura de archivo en ms */
  fileWriteTime: number;
  /** Uso de memoria en bytes */
  memoryUsage: number;
  /** Éxito de la operación */
  success: boolean;
  /** Errores encontrados */
  errors?: string[];
}