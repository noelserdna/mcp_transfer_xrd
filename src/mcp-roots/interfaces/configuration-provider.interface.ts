/**
 * Interface para proveedor de configuración dinámica
 * Gestiona la precedencia de configuración y cambios en tiempo real
 */

import {
  ConfigSource,
  QRDirectoryConfig,
  PerformanceMetrics
} from '../types/mcp-roots-types.js';

export interface IConfigurationProvider {
  /**
   * Obtiene el directorio QR actual según precedencia establecida
   * @returns Path del directorio QR configurado
   */
  getQRDirectory(): string;

  /**
   * Actualiza el directorio QR desde MCP roots
   * @param path Nuevo path del directorio
   * @returns Promise que resuelve cuando la actualización está completa
   */
  updateQRDirectory(path: string): Promise<void>;

  /**
   * Obtiene la fuente de la configuración actual
   * @returns Fuente de donde proviene la configuración actual
   */
  getConfigurationSource(): ConfigSource;

  /**
   * Obtiene configuración completa del directorio QR
   * @returns Configuración detallada con metadatos
   */
  getQRDirectoryConfig(): QRDirectoryConfig;

  /**
   * Resetea configuración a valores por defecto
   */
  resetToDefault(): void;

  /**
   * Verifica si una fuente de configuración tiene precedencia sobre otra
   * @param source1 Primera fuente a comparar
   * @param source2 Segunda fuente a comparar
   * @returns True si source1 tiene mayor precedencia que source2
   */
  hasPrecedence(source1: ConfigSource, source2: ConfigSource): boolean;

  /**
   * Registra un observer para cambios de configuración
   * @param callback Función llamada cuando cambia la configuración
   * @returns Función para desregistrar el observer
   */
  onConfigurationChanged(callback: (config: QRDirectoryConfig) => void): () => void;

  /**
   * Valida que la configuración actual sea válida
   * @returns True si la configuración actual es válida
   */
  isCurrentConfigurationValid(): Promise<boolean>;

  /**
   * Obtiene configuración desde variable de entorno
   * @returns Path desde variable de entorno o undefined
   */
  getEnvironmentConfiguration(): string | undefined;

  /**
   * Obtiene configuración desde línea de comandos
   * @returns Path desde argumentos CLI o undefined
   */
  getCommandLineConfiguration(): string | undefined;

  /**
   * Obtiene directorio por defecto del sistema
   * @returns Path del directorio por defecto
   */
  getDefaultDirectory(): string;

  /**
   * Fuerza recálculo de configuración consultando todas las fuentes
   * @returns Nueva configuración calculada
   */
  recalculateConfiguration(): Promise<QRDirectoryConfig>;

  /**
   * Obtiene métricas de performance de cambios de configuración
   * @param limit Número máximo de métricas a retornar
   * @returns Array de métricas de configuración
   */
  getConfigurationMetrics(limit?: number): PerformanceMetrics[];

  /**
   * Verifica si el proveedor está inicializado correctamente
   * @returns True si está listo para usar
   */
  isInitialized(): boolean;

  /**
   * Inicializa el proveedor con configuración inicial
   * @param initialConfig Configuración inicial opcional
   */
  initialize(initialConfig?: Partial<QRDirectoryConfig>): Promise<void>;

  /**
   * Limpia recursos y detiene el proveedor
   */
  shutdown(): void;
}