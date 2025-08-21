/**
 * Interfaces para el sistema MCP Roots
 * Contratos de datos y APIs para gestión de directorios
 */

import {
  RootsNotification,
  RootsValidationResult,
  SecurityAuditLog,
  DirectoryInfo,
  ConfigurationStatus,
  ConfigurationChangeEvent,
  SecurityValidationOptions,
  SecurityPolicy,
  ConfigSource
} from '../types/mcp-roots-types.js';

/**
 * Interface principal para la gestión de MCP Roots
 */
export interface IRootsManager {
  /**
   * Procesa una notificación de cambio de roots desde MCP
   * @param notification - Notificación con nuevos directorios roots
   * @returns Resultado de la validación y configuración
   */
  handleRootsChanged(notification: RootsNotification): Promise<RootsValidationResult>;

  /**
   * Obtiene la configuración actual de roots
   * @returns Estado actual de la configuración
   */
  getCurrentRoots(): Promise<ConfigurationStatus>;

  /**
   * Valida un directorio específico
   * @param directory - Directorio a validar
   * @returns Resultado de la validación
   */
  validateDirectory(directory: string): Promise<RootsValidationResult>;
}

/**
 * Interface para validación de seguridad de directorios
 */
export interface ISecurityValidator {
  /**
   * Valida que un directorio sea seguro para uso
   * @param directory - Directorio a validar
   * @param options - Opciones de validación
   * @returns Resultado de la validación de seguridad
   */
  validateDirectorySecurity(
    directory: string,
    options?: SecurityValidationOptions
  ): Promise<RootsValidationResult>;

  /**
   * Verifica permisos de escritura de forma asíncrona
   * @param directory - Directorio a verificar
   * @returns True si es escribible
   */
  checkWritePermissions(directory: string): Promise<boolean>;

  /**
   * Normaliza un path para el sistema operativo actual
   * @param path - Path a normalizar
   * @returns Path normalizado
   */
  normalizePath(path: string): string;

  /**
   * Verifica si un directorio está en la whitelist
   * @param directory - Directorio a verificar
   * @param allowedRoots - Directorios permitidos
   * @returns True si está permitido
   */
  isDirectoryAllowed(directory: string, allowedRoots: string[]): boolean;

  /**
   * Registra un evento de auditoría de seguridad
   * @param log - Información del evento
   */
  logSecurityEvent(log: SecurityAuditLog): Promise<void>;
}

/**
 * Interface para gestión de configuración con precedencia
 */
export interface IConfigurationProvider {
  /**
   * Obtiene el directorio QR actual según precedencia
   * @returns Directorio configurado
   */
  getCurrentQRDirectory(): Promise<string>;

  /**
   * Actualiza la configuración desde roots
   * @param directory - Nuevo directorio desde roots
   * @returns True si la actualización fue exitosa
   */
  updateFromRoots(directory: string): Promise<boolean>;

  /**
   * Obtiene la fuente de la configuración actual
   * @returns Fuente de configuración
   */
  getConfigurationSource(): ConfigSource;

  /**
   * Registra un observer para cambios de configuración
   * @param callback - Función a llamar cuando cambie la configuración
   */
  onConfigurationChange(callback: (event: ConfigurationChangeEvent) => void): void;

  /**
   * Remueve un observer de cambios
   * @param callback - Función a remover
   */
  removeConfigurationObserver(callback: (event: ConfigurationChangeEvent) => void): void;

  /**
   * Obtiene información detallada del directorio actual
   * @returns Información del directorio
   */
  getDirectoryInfo(): Promise<DirectoryInfo>;

  /**
   * Lista todos los directorios permitidos
   * @returns Array de directorios permitidos
   */
  getAllowedDirectories(): string[];

  /**
   * Limpia la configuración de roots (fallback a siguiente precedencia)
   */
  clearRootsConfiguration(): Promise<void>;
}

/**
 * Interface para factory de SecurityValidator
 */
export interface ISecurityValidatorFactory {
  /**
   * Crea una instancia de SecurityValidator
   * @param policy - Política de seguridad a usar
   * @param options - Opciones adicionales
   * @returns Instancia de SecurityValidator
   */
  create(
    policy: SecurityPolicy,
    options?: Partial<SecurityValidationOptions>
  ): Promise<ISecurityValidator>;

  /**
   * Obtiene las políticas disponibles
   * @returns Array de políticas soportadas
   */
  getAvailablePolicies(): SecurityPolicy[];
}

/**
 * Interface para observadores de cambios de configuración
 */
export interface IConfigurationObserver {
  /**
   * Notifica un cambio en la configuración
   * @param event - Evento de cambio
   */
  onConfigurationChanged(event: ConfigurationChangeEvent): void;
}

/**
 * Interface extendida para DirectoryManager con funciones de roots
 */
export interface IDirectoryManagerRoots {
  /**
   * Valida un directorio específicamente para uso con roots
   * @param directory - Directorio a validar
   * @returns Resultado de validación
   */
  validateDirectoryForRoots(directory: string): Promise<RootsValidationResult>;

  /**
   * Asegura que un directorio exista con verificaciones de seguridad
   * @param directory - Directorio a crear/verificar
   * @returns True si el directorio está listo
   */
  ensureDirectoryWithSecurityCheck(directory: string): Promise<boolean>;

  /**
   * Obtiene información detallada de un directorio
   * @param directory - Directorio a analizar
   * @returns Información completa del directorio
   */
  getRootsDirectoryInfo(directory: string): Promise<DirectoryInfo>;
}