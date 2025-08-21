/**
 * RootsManager - Orquestador principal para MCP Roots
 * Gestiona notifications MCP, valida security y actualiza configuración
 */

import { 
  IRootsManager,
  ISecurityValidator,
  IConfigurationProvider
} from '../interfaces/roots-interfaces.js';
import {
  RootsNotification,
  RootsValidationResult,
  ConfigurationStatus,
  SecurityPolicy
} from '../types/mcp-roots-types.js';
import { securityValidatorFactory } from '../security/security-validator-factory.js';

export class RootsManager implements IRootsManager {
  private securityValidator: ISecurityValidator | null = null;
  private configurationProvider: IConfigurationProvider;
  private isProcessing = false;
  private lastProcessingTime = 0;

  constructor(
    configurationProvider: IConfigurationProvider,
    securityValidator?: ISecurityValidator
  ) {
    this.configurationProvider = configurationProvider;
    this.securityValidator = securityValidator || null;
  }

  /**
   * Procesa una notificación de cambio de roots desde MCP
   */
  async handleRootsChanged(notification: RootsNotification): Promise<RootsValidationResult> {
    const startTime = Date.now();
    
    // Prevenir procesamiento concurrente
    if (this.isProcessing) {
      return {
        validDirectory: null,
        isValid: false,
        message: 'Ya hay otro cambio de roots en proceso. Intente nuevamente.',
        errors: ['Concurrent processing detected'],
        processingTime: Date.now() - startTime
      };
    }

    // Rate limiting básico (máximo 1 cambio por segundo)
    const timeSinceLastProcessing = Date.now() - this.lastProcessingTime;
    if (timeSinceLastProcessing < 1000) {
      return {
        validDirectory: null,
        isValid: false,
        message: 'Rate limit excedido. Máximo 1 cambio por segundo.',
        errors: ['Rate limit exceeded'],
        processingTime: Date.now() - startTime
      };
    }

    this.isProcessing = true;
    this.lastProcessingTime = Date.now();

    try {
      console.log(`[RootsManager] Procesando cambio de roots:`, notification);

      // Fase 1: Validar notification
      const notificationValidation = this.validateNotification(notification);
      if (!notificationValidation.isValid) {
        return {
          validDirectory: null,
          isValid: false,
          message: `Notificación inválida: ${notificationValidation.message}`,
          errors: notificationValidation.errors,
          processingTime: Date.now() - startTime
        };
      }

      // Fase 2: Obtener primer directorio válido
      const validDirectory = await this.findFirstValidDirectory(notification.roots);
      if (!validDirectory) {
        return {
          validDirectory: null,
          isValid: false,
          message: 'Ningún directorio en la lista es válido para uso con MCP roots',
          errors: ['No valid directories found'],
          processingTime: Date.now() - startTime
        };
      }

      // Fase 3: Validar seguridad si hay validator
      if (this.securityValidator) {
        const securityResult = await this.securityValidator.validateDirectorySecurity(validDirectory);
        if (!securityResult.isValid) {
          console.warn(`[RootsManager] Directorio rechazado por seguridad: ${validDirectory}`);
          return {
            validDirectory: null,
            isValid: false,
            message: `Directorio rechazado por validación de seguridad: ${securityResult.message}`,
            errors: securityResult.errors,
            processingTime: Date.now() - startTime
          };
        }
      }

      // Fase 4: Actualizar configuración
      const configUpdateSuccess = await this.configurationProvider.updateFromRoots(validDirectory);
      if (!configUpdateSuccess) {
        return {
          validDirectory: null,
          isValid: false,
          message: 'Error al actualizar la configuración con el directorio validado',
          errors: ['Configuration update failed'],
          processingTime: Date.now() - startTime
        };
      }

      // Éxito
      console.log(`[RootsManager] Roots actualizado exitosamente: ${validDirectory}`);
      return {
        validDirectory,
        isValid: true,
        message: `Configuración de directorio QR actualizada exitosamente a: ${validDirectory}`,
        errors: [],
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error(`[RootsManager] Error procesando cambio de roots:`, error);

      return {
        validDirectory: null,
        isValid: false,
        message: `Error interno procesando cambio de roots: ${errorMessage}`,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      };

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Obtiene la configuración actual de roots
   */
  async getCurrentRoots(): Promise<ConfigurationStatus> {
    try {
      const currentDirectory = await this.configurationProvider.getCurrentQRDirectory();
      const allowedDirectories = this.configurationProvider.getAllowedDirectories();
      const source = this.configurationProvider.getConfigurationSource();
      
      // Verificar si la configuración actual es válida
      let isValid = true;
      try {
        if (this.securityValidator) {
          const validation = await this.securityValidator.validateDirectorySecurity(currentDirectory);
          isValid = validation.isValid;
        }
      } catch (error) {
        isValid = false;
        console.warn(`[RootsManager] Error validando configuración actual:`, error);
      }

      return {
        source,
        currentDirectory,
        allowedDirectories,
        isValid,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`[RootsManager] Error obteniendo configuración actual:`, error);
      
      // Retornar estado de error
      return {
        source: this.configurationProvider.getConfigurationSource(),
        currentDirectory: '',
        allowedDirectories: [],
        isValid: false,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Valida un directorio específico
   */
  async validateDirectory(directory: string): Promise<RootsValidationResult> {
    const startTime = Date.now();

    try {
      if (!directory || typeof directory !== 'string' || directory.trim().length === 0) {
        return {
          validDirectory: null,
          isValid: false,
          message: 'Directorio es requerido y debe ser una cadena no vacía',
          errors: ['Invalid directory parameter'],
          processingTime: Date.now() - startTime
        };
      }

      const normalizedDirectory = directory.trim();

      // Usar SecurityValidator si está disponible
      if (this.securityValidator) {
        return await this.securityValidator.validateDirectorySecurity(normalizedDirectory);
      }

      // Validación básica si no hay SecurityValidator
      return {
        validDirectory: normalizedDirectory,
        isValid: true,
        message: 'Directorio validado (validación básica)',
        errors: [],
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return {
        validDirectory: null,
        isValid: false,
        message: `Error validando directorio: ${errorMessage}`,
        errors: [errorMessage],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Configura el SecurityValidator
   */
  async setSecurityValidator(
    policy: SecurityPolicy, 
    allowedRoots?: string[]
  ): Promise<void> {
    try {
      this.securityValidator = await securityValidatorFactory.create(policy, {
        allowedRoots: allowedRoots || [],
        enableAuditLog: true,
        rateLimit: 1
      });
      
      console.log(`[RootsManager] SecurityValidator configurado con política: ${policy}`);
    } catch (error) {
      console.error(`[RootsManager] Error configurando SecurityValidator:`, error);
      throw error;
    }
  }

  /**
   * Obtiene información sobre el SecurityValidator actual
   */
  getSecurityValidatorInfo(): {
    hasValidator: boolean;
    configuration?: string;
  } {
    return {
      hasValidator: this.securityValidator !== null,
      configuration: this.securityValidator ? 'Configurado' : undefined
    };
  }

  /**
   * Limpia la configuración de roots (fallback a siguiente precedencia)
   */
  async clearRootsConfiguration(): Promise<void> {
    try {
      await this.configurationProvider.clearRootsConfiguration();
      console.log(`[RootsManager] Configuración de roots eliminada`);
    } catch (error) {
      console.error(`[RootsManager] Error limpiando configuración de roots:`, error);
      throw error;
    }
  }

  // ===== Métodos auxiliares privados =====

  /**
   * Valida la estructura de la notificación MCP
   */
  private validateNotification(notification: RootsNotification): {
    isValid: boolean;
    message: string;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!notification) {
      errors.push('Notificación es null o undefined');
    } else {
      if (!Array.isArray(notification.roots)) {
        errors.push('notification.roots debe ser un array');
      } else {
        if (notification.roots.length === 0) {
          errors.push('notification.roots no puede estar vacío');
        }

        notification.roots.forEach((root, index) => {
          if (typeof root !== 'string') {
            errors.push(`roots[${index}] debe ser string`);
          } else if (root.trim().length === 0) {
            errors.push(`roots[${index}] no puede estar vacío`);
          }
        });
      }

      if (notification.timestamp !== undefined && typeof notification.timestamp !== 'number') {
        errors.push('notification.timestamp debe ser number si está presente');
      }
    }

    const isValid = errors.length === 0;
    const message = isValid ? 'Notificación válida' : errors.join(', ');

    return { isValid, message, errors };
  }

  /**
   * Encuentra el primer directorio válido de la lista
   */
  private async findFirstValidDirectory(directories: string[]): Promise<string | null> {
    for (const directory of directories) {
      try {
        const normalizedDirectory = directory.trim();
        
        if (normalizedDirectory.length === 0) {
          continue;
        }

        // Validación básica de directorio
        const validation = await this.validateDirectory(normalizedDirectory);
        if (validation.isValid) {
          console.log(`[RootsManager] Directorio válido encontrado: ${normalizedDirectory}`);
          return validation.validDirectory;
        } else {
          console.log(`[RootsManager] Directorio rechazado: ${normalizedDirectory} - ${validation.message}`);
        }

      } catch (error) {
        console.warn(`[RootsManager] Error validando directorio ${directory}:`, error);
        continue;
      }
    }

    return null;
  }
}