/**
 * Interface para validador de seguridad
 * Previene ataques de path traversal y valida permisos de directorios
 */

import {
  SecurityValidationResult,
  SecurityViolation,
  SecurityPolicy,
  RateLimitState
} from '../types/mcp-roots-types.js';

export interface ISecurityValidator {
  /**
   * Valida un path de directorio completo con todas las verificaciones de seguridad
   * @param path Path de directorio a validar
   * @returns Resultado detallado de validación
   */
  validateDirectoryPath(path: string): Promise<SecurityValidationResult>;

  /**
   * Verifica si un path está permitido según la política actual
   * @param path Path a verificar
   * @returns True si el path está permitido
   */
  isPathAllowed(path: string): boolean;

  /**
   * Sanitiza un path removiendo elementos peligrosos
   * @param path Path original a sanitizar
   * @returns Path sanitizado y normalizado
   */
  sanitizePath(path: string): string;

  /**
   * Verifica permisos de escritura en un directorio
   * @param path Path del directorio a verificar
   * @returns True si tiene permisos de escritura
   */
  checkWritePermissions(path: string): Promise<boolean>;

  /**
   * Detecta patrones de path traversal en un string
   * @param path Path a analizar
   * @returns Lista de violaciones encontradas
   */
  detectPathTraversal(path: string): SecurityViolation[];

  /**
   * Normaliza path cross-platform (Windows/Unix)
   * @param path Path a normalizar
   * @returns Path normalizado para la plataforma actual
   */
  normalizePath(path: string): string;

  /**
   * Valida contra whitelist de directorios permitidos
   * @param path Path a validar
   * @returns True si está en whitelist o cumple patrones permitidos
   */
  isInWhitelist(path: string): boolean;

  /**
   * Actualiza la política de seguridad en tiempo real
   * @param policy Nueva política a aplicar
   */
  updateSecurityPolicy(policy: Partial<SecurityPolicy>): void;

  /**
   * Obtiene la política de seguridad actual
   * @returns Copia de la política actual
   */
  getCurrentPolicy(): SecurityPolicy;

  /**
   * Verifica rate limiting para operaciones de cambio
   * @param identifier Identificador de la operación
   * @returns Estado actual del rate limiting
   */
  checkRateLimit(identifier: string): RateLimitState;

  /**
   * Registra una violación de seguridad para auditoría
   * @param violation Violación a registrar
   */
  logSecurityViolation(violation: SecurityViolation): void;

  /**
   * Obtiene historial de violaciones recientes
   * @param limit Número máximo de violaciones a retornar
   * @returns Array de violaciones ordenadas por timestamp
   */
  getRecentViolations(limit?: number): SecurityViolation[];

  /**
   * Verifica si un directorio puede ser creado de forma segura
   * @param path Path del directorio a crear
   * @returns True si es seguro crear el directorio
   */
  canCreateDirectory(path: string): Promise<boolean>;

  /**
   * Calcula el espacio en disco disponible en un path
   * @param path Path a verificar
   * @returns Bytes disponibles o -1 si no se puede calcular
   */
  getAvailableDiskSpace(path: string): Promise<number>;
}