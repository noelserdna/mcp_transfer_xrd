/**
 * Tipos de datos para el sistema MCP Roots
 * Gestión de directorios específicos via protocolo MCP
 */

export interface RootsNotification {
  /** Listado de directorios roots configurados */
  roots: string[];
  /** Timestamp de la notificación */
  timestamp?: number;
}

export interface RootsValidationResult {
  /** Directorio validado exitosamente */
  validDirectory: string | null;
  /** Indica si la validación fue exitosa */
  isValid: boolean;
  /** Mensaje descriptivo del resultado */
  message: string;
  /** Detalles de errores si los hay */
  errors: string[];
  /** Tiempo de procesamiento en ms */
  processingTime: number;
}

export interface SecurityAuditLog {
  /** ID único del log */
  id: string;
  /** Timestamp del evento */
  timestamp: Date;
  /** Directorio que se intentó validar */
  attemptedPath: string;
  /** Resultado de la validación */
  result: 'allowed' | 'blocked' | 'error';
  /** Razón del resultado */
  reason: string;
  /** Nivel de riesgo detectado */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Metadata adicional */
  metadata?: Record<string, any>;
}

export interface DirectoryInfo {
  /** Path absoluto del directorio */
  path: string;
  /** Indica si existe el directorio */
  exists: boolean;
  /** Indica si es escribible */
  writable: boolean;
  /** Número de archivos QR existentes */
  qrFileCount: number;
  /** Tamaño total en bytes */
  totalSize: number;
  /** Última modificación */
  lastModified: Date;
}

export interface ConfigurationStatus {
  /** Fuente de la configuración actual */
  source: ConfigSource;
  /** Directorio actualmente configurado */
  currentDirectory: string;
  /** Directorios permitidos */
  allowedDirectories: string[];
  /** Indica si la configuración es válida */
  isValid: boolean;
  /** Última actualización */
  lastUpdated: Date;
}

export enum SecurityPolicy {
  /** Política más restrictiva - solo directorios específicos */
  STRICT = 'strict',
  /** Política estándar - validaciones estándar */
  STANDARD = 'standard',
  /** Política permisiva - validaciones mínimas */
  PERMISSIVE = 'permissive'
}

export enum ConfigSource {
  /** Configuración desde MCP roots notification */
  ROOTS = 'roots',
  /** Configuración desde variable de entorno */
  ENVIRONMENT = 'environment',
  /** Configuración desde línea de comandos */
  COMMAND_LINE = 'command_line',
  /** Configuración por defecto */
  DEFAULT = 'default'
}

export interface SecurityValidationOptions {
  /** Política de seguridad a aplicar */
  policy: SecurityPolicy;
  /** Directorio de whitelist (opcional) */
  allowedRoots?: string[];
  /** Habilitar logging de auditoría */
  enableAuditLog: boolean;
  /** Rate limit en cambios por segundo */
  rateLimit: number;
}

export interface ConfigurationChangeEvent {
  /** Configuración anterior */
  previous: ConfigurationStatus;
  /** Nueva configuración */
  current: ConfigurationStatus;
  /** Timestamp del cambio */
  timestamp: Date;
  /** Indica si el cambio fue exitoso */
  success: boolean;
  /** Mensaje descriptivo */
  message: string;
}