/**
 * Implementación del gestor principal de MCP Roots
 * Orquesta validación, configuración y actualización de directorios
 */

import { IRootsManager } from '../interfaces/roots-manager.interface.js';
import { ISecurityValidator } from '../interfaces/security-validator.interface.js';
import { IConfigurationProvider } from '../interfaces/configuration-provider.interface.js';
import {
  RootsChangeResult,
  RootsValidationResult,
  SecurityPolicy,
  PerformanceMetrics,
  SecurityViolation
} from '../types/mcp-roots-types.js';

export class RootsManager implements IRootsManager {
  private securityValidator: ISecurityValidator;
  private configurationProvider: IConfigurationProvider;
  private performanceMetrics: PerformanceMetrics[] = [];
  private isReadyFlag = false;
  private isShuttingDown = false;
  
  constructor(
    securityValidator: ISecurityValidator,
    configurationProvider: IConfigurationProvider
  ) {
    this.securityValidator = securityValidator;
    this.configurationProvider = configurationProvider;
  }

  async initialize(): Promise<void> {
    if (!this.configurationProvider.isInitialized()) {
      await this.configurationProvider.initialize();
    }
    
    this.isReadyFlag = true;
  }

  async handleRootsChanged(roots: string[]): Promise<RootsChangeResult> {
    const startTime = Date.now();
    
    if (!this.isReady()) {
      return this.createFailureResult(roots, ['RootsManager not ready']);
    }

    if (this.isShuttingDown) {
      return this.createFailureResult(roots, ['RootsManager is shutting down']);
    }

    try {
      // 1. Validar todos los roots
      const validationResult = await this.validateRoots(roots);
      
      if (!validationResult.isValid) {
        return this.createFailureResult(
          roots, 
          validationResult.invalidRoots.map(root => `Invalid root: ${root}`),
          validationResult.securityViolations.map(v => v.description)
        );
      }

      // 2. Determinar el directorio QR apropiado
      const selectedDirectory = await this.selectQRDirectory(validationResult.validRoots);
      
      if (!selectedDirectory) {
        return this.createFailureResult(roots, ['No suitable directory found in roots']);
      }

      // 3. Validar directorio seleccionado individualmente
      const directoryValidation = await this.securityValidator.validateDirectoryPath(selectedDirectory);
      
      if (!directoryValidation.isSecure) {
        return this.createFailureResult(
          roots,
          [`Selected directory not secure: ${selectedDirectory}`],
          directoryValidation.violations.map(v => v.description)
        );
      }

      // 4. Actualizar configuración
      await this.configurationProvider.updateQRDirectory(directoryValidation.sanitizedPath);

      // 5. Crear resultado exitoso
      const result: RootsChangeResult = {
        success: true,
        updatedRoots: validationResult.validRoots,
        errors: [],
        timestamp: new Date()
      };

      this.recordMetric('ROOTS_CHANGED', Date.now() - startTime, true, {
        rootsCount: roots.length,
        validRootsCount: validationResult.validRoots.length,
        selectedDirectory: directoryValidation.sanitizedPath
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.recordMetric('ROOTS_CHANGED', Date.now() - startTime, false, {
        rootsCount: roots.length,
        error: errorMessage
      });

      return this.createFailureResult(roots, [errorMessage]);
    }
  }

  getCurrentRoots(): string[] {
    if (!this.isReady()) {
      return [];
    }

    try {
      const currentDir = this.configurationProvider.getQRDirectory();
      return [currentDir];
    } catch {
      return [];
    }
  }

  async validateRoots(roots: string[]): Promise<RootsValidationResult> {
    const startTime = Date.now();
    
    if (!roots || roots.length === 0) {
      return {
        isValid: false,
        validRoots: [],
        invalidRoots: [],
        securityViolations: [{
          type: 'INVALID_PATH',
          path: '',
          description: 'No roots provided',
          severity: 'HIGH'
        }],
        performanceMetrics: {
          validationTime: Date.now() - startTime,
          checkedPaths: 0
        }
      };
    }

    const validRoots: string[] = [];
    const invalidRoots: string[] = [];
    const allViolations: SecurityViolation[] = [];

    // Validar cada root individualmente
    for (const root of roots) {
      try {
        if (!root || typeof root !== 'string' || root.trim() === '') {
          invalidRoots.push(root);
          allViolations.push({
            type: 'INVALID_PATH',
            path: root,
            description: 'Empty or invalid root path',
            severity: 'MEDIUM'
          });
          continue;
        }

        const validationResult = await this.securityValidator.validateDirectoryPath(root);
        
        if (validationResult.isSecure) {
          validRoots.push(validationResult.sanitizedPath);
        } else {
          invalidRoots.push(root);
          allViolations.push(...validationResult.violations);
        }
        
      } catch (error) {
        invalidRoots.push(root);
        allViolations.push({
          type: 'INVALID_PATH',
          path: root,
          description: `Validation failed: ${error}`,
          severity: 'HIGH'
        });
      }
    }

    const result: RootsValidationResult = {
      isValid: validRoots.length > 0 && invalidRoots.length === 0,
      validRoots,
      invalidRoots,
      securityViolations: allViolations,
      performanceMetrics: {
        validationTime: Date.now() - startTime,
        checkedPaths: roots.length
      }
    };

    this.recordMetric('DIRECTORY_VALIDATION', Date.now() - startTime, result.isValid, {
      totalRoots: roots.length,
      validCount: validRoots.length,
      violationsCount: allViolations.length
    });

    return result;
  }

  getSecurityPolicy(): SecurityPolicy {
    return this.securityValidator.getCurrentPolicy();
  }

  async updateSecurityPolicy(policy: Partial<SecurityPolicy>): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.securityValidator.updateSecurityPolicy(policy);
      
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, true, {
        action: 'update_security_policy',
        policyKeys: Object.keys(policy)
      });
      
    } catch (error) {
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, false, {
        error: String(error)
      });
      throw error;
    }
  }

  getPerformanceMetrics(limit: number = 10): PerformanceMetrics[] {
    return this.performanceMetrics
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async resetToDefaults(): Promise<RootsChangeResult> {
    const startTime = Date.now();
    
    try {
      const previousRoots = this.getCurrentRoots();
      
      this.configurationProvider.resetToDefault();
      
      const result: RootsChangeResult = {
        success: true,
        updatedRoots: [this.configurationProvider.getDefaultDirectory()],
        errors: [],
        timestamp: new Date()
      };

      this.recordMetric('ROOTS_CHANGED', Date.now() - startTime, true, {
        action: 'reset_to_defaults',
        previousRoots: previousRoots.length,
        defaultDirectory: this.configurationProvider.getDefaultDirectory()
      });

      return result;
      
    } catch (error) {
      this.recordMetric('ROOTS_CHANGED', Date.now() - startTime, false, {
        error: String(error)
      });
      
      return this.createFailureResult([], [String(error)]);
    }
  }

  isReady(): boolean {
    return this.isReadyFlag && 
           !this.isShuttingDown && 
           this.configurationProvider.isInitialized();
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    try {
      this.configurationProvider.shutdown();
      this.performanceMetrics = [];
      this.isReadyFlag = false;
    } catch (error) {
      console.error('Error during RootsManager shutdown:', error);
    }
  }

  private async selectQRDirectory(validRoots: string[]): Promise<string | null> {
    if (validRoots.length === 0) {
      return null;
    }

    // Estrategia: seleccionar el primer root válido
    // En el futuro se puede implementar lógica más sofisticada
    return validRoots[0];
  }

  private createFailureResult(
    roots: string[], 
    errors: string[], 
    securityIssues: string[] = []
  ): RootsChangeResult {
    return {
      success: false,
      updatedRoots: [],
      errors,
      securityIssues: securityIssues.length > 0 ? securityIssues : undefined,
      timestamp: new Date()
    };
  }

  private recordMetric(
    operationType: PerformanceMetrics['operationType'],
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetrics = {
      operationType,
      duration,
      timestamp: new Date(),
      success,
      metadata
    };

    this.performanceMetrics.push(metric);
    
    // Mantener solo últimas 100 métricas
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }
}