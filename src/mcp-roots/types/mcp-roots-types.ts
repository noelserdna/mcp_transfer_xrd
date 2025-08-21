/**
 * Tipos base para el protocolo MCP Roots
 * Según especificación MCP 2025-06-18
 */

/**
 * Resultado de cambio de roots
 */
export interface RootsChangeResult {
  success: boolean;
  updatedRoots: string[];
  errors: string[];
  securityIssues?: string[];
  timestamp: Date;
}

/**
 * Resultado de validación de roots
 */
export interface RootsValidationResult {
  isValid: boolean;
  validRoots: string[];
  invalidRoots: string[];
  securityViolations: SecurityViolation[];
  performanceMetrics: {
    validationTime: number;
    checkedPaths: number;
  };
}

/**
 * Violación de seguridad detectada
 */
export interface SecurityViolation {
  type: 'PATH_TRAVERSAL' | 'PERMISSION_DENIED' | 'INVALID_PATH' | 'WHITELIST_VIOLATION';
  path: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Resultado de validación de seguridad
 */
export interface SecurityValidationResult {
  isSecure: boolean;
  sanitizedPath: string;
  violations: SecurityViolation[];
  metadata: {
    originalPath: string;
    normalizedPath: string;
    hasWritePermission: boolean;
    isWhitelisted: boolean;
  };
}

/**
 * Política de seguridad para directorios
 */
export interface SecurityPolicy {
  whitelistedDirectories: string[];
  forbiddenPatterns: string[];
  maxPathLength: number;
  allowRelativePaths: boolean;
  requireWritePermission: boolean;
  enableAuditLogging: boolean;
}

/**
 * Fuentes de configuración de directorio QR
 */
export type ConfigSource = 'MCP_ROOTS' | 'ENVIRONMENT' | 'COMMAND_LINE' | 'DEFAULT';

/**
 * Configuración de directorio QR actual
 */
export interface QRDirectoryConfig {
  path: string;
  source: ConfigSource;
  lastUpdated: Date;
  isValid: boolean;
  metadata: {
    permissions: 'READ' | 'WRITE' | 'READ_WRITE';
    createdByMcp: boolean;
    diskSpace: number;
  };
}

/**
 * Notificación MCP roots/list_changed
 */
export interface McpRootsNotification {
  method: 'notifications/roots/list_changed';
  params: {
    roots: string[];
    timestamp?: string;
  };
}

/**
 * Resultado de herramienta MCP para listar directorios
 */
export interface ListAllowedDirectoriesResult {
  allowedDirectories: string[];
  currentQRDirectory: string;
  configurationSource: ConfigSource;
  securityPolicy: Partial<SecurityPolicy>;
}

/**
 * Resultado de información de directorio QR
 */
export interface QRDirectoryInfoResult {
  currentDirectory: string;
  configSource: ConfigSource;
  isWritable: boolean;
  diskSpaceAvailable: number;
  totalQRFiles: number;
  lastQRGenerated?: Date;
  securityStatus: 'SECURE' | 'WARNING' | 'VIOLATION';
}

/**
 * Parámetros para configurar directorio QR
 */
export interface SetQRDirectoryParams {
  path: string;
  validateOnly?: boolean;
  createIfNotExists?: boolean;
}

/**
 * Resultado de configurar directorio QR
 */
export interface SetQRDirectoryResult {
  success: boolean;
  newDirectory: string;
  previousDirectory: string;
  configSource: ConfigSource;
  errors: string[];
  warnings: string[];
}

/**
 * Métricas de performance para operaciones MCP Roots
 */
export interface PerformanceMetrics {
  operationType: 'ROOTS_CHANGED' | 'DIRECTORY_VALIDATION' | 'CONFIG_UPDATE' | 'QR_GENERATION';
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Configuración de rate limiting
 */
export interface RateLimitConfig {
  maxChangesPerSecond: number;
  windowSizeMs: number;
  maxPendingOperations: number;
}

/**
 * Estado de rate limiting
 */
export interface RateLimitState {
  currentRequests: number;
  windowStart: Date;
  isLimited: boolean;
  nextAllowedTime?: Date;
}