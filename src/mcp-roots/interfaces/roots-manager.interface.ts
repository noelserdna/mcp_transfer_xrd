/**
 * Interface para el gestor principal de MCP Roots
 * Orquesta la validación, configuración y actualización de directorios
 */

import {
  RootsChangeResult,
  RootsValidationResult,
  SecurityPolicy,
  PerformanceMetrics
} from '../types/mcp-roots-types.js';

export interface IRootsManager {
  /**
   * Maneja cambio de roots desde protocolo MCP
   * @param roots Lista de directorios roots recibidos
   * @returns Resultado del cambio con éxito/errores
   */
  handleRootsChanged(roots: string[]): Promise<RootsChangeResult>;

  /**
   * Obtiene los roots actuales configurados
   * @returns Lista de directorios roots válidos
   */
  getCurrentRoots(): string[];

  /**
   * Valida una lista de roots sin aplicar cambios
   * @param roots Lista de directorios a validar
   * @returns Resultado de validación detallado
   */
  validateRoots(roots: string[]): Promise<RootsValidationResult>;

  /**
   * Obtiene la política de seguridad actual
   * @returns Configuración de seguridad aplicada
   */
  getSecurityPolicy(): SecurityPolicy;

  /**
   * Actualiza la política de seguridad
   * @param policy Nueva política de seguridad
   */
  updateSecurityPolicy(policy: Partial<SecurityPolicy>): Promise<void>;

  /**
   * Obtiene métricas de performance de operaciones recientes
   * @param limit Número máximo de métricas a retornar
   * @returns Array de métricas ordenadas por timestamp
   */
  getPerformanceMetrics(limit?: number): PerformanceMetrics[];

  /**
   * Resetea configuración de roots a valores por defecto
   * @returns Resultado de la operación de reset
   */
  resetToDefaults(): Promise<RootsChangeResult>;

  /**
   * Verifica si el manager está listo para procesar cambios
   * @returns True si el estado interno es consistente
   */
  isReady(): boolean;

  /**
   * Detiene el manager y limpia recursos
   */
  shutdown(): Promise<void>;
}