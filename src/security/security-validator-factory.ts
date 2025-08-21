/**
 * SecurityValidatorFactory - Factory Pattern para creación de SecurityValidator
 * Soporta diferentes políticas de seguridad: strict, standard, permissive
 */

import { SecurityValidator } from './security-validator.js';
import {
  ISecurityValidator,
  ISecurityValidatorFactory
} from '../interfaces/roots-interfaces.js';
import {
  SecurityPolicy,
  SecurityValidationOptions
} from '../types/mcp-roots-types.js';

export class SecurityValidatorFactory implements ISecurityValidatorFactory {
  private static instance: SecurityValidatorFactory;
  private validators: Map<string, ISecurityValidator> = new Map();

  /**
   * Singleton pattern para reutilización de factory
   */
  static getInstance(): SecurityValidatorFactory {
    if (!SecurityValidatorFactory.instance) {
      SecurityValidatorFactory.instance = new SecurityValidatorFactory();
    }
    return SecurityValidatorFactory.instance;
  }

  /**
   * Crea una instancia de SecurityValidator
   */
  async create(
    policy: SecurityPolicy,
    options?: Partial<SecurityValidationOptions>
  ): Promise<ISecurityValidator> {
    // Crear clave única para la configuración
    const configKey = this.createConfigKey(policy, options);
    
    // Reutilizar instancia existente si está disponible
    if (this.validators.has(configKey)) {
      return this.validators.get(configKey)!;
    }

    // Validar configuración
    this.validateConfiguration(policy, options);

    // Crear opciones completas con defaults
    const fullOptions = this.createFullOptions(policy, options);

    // Crear nueva instancia
    const validator = new SecurityValidator(fullOptions);
    
    // Almacenar para reutilización
    this.validators.set(configKey, validator);

    return validator;
  }

  /**
   * Obtiene las políticas disponibles
   */
  getAvailablePolicies(): SecurityPolicy[] {
    return [
      SecurityPolicy.STRICT,
      SecurityPolicy.STANDARD,
      SecurityPolicy.PERMISSIVE
    ];
  }

  /**
   * Crea un SecurityValidator con política strict
   */
  async createStrict(allowedRoots: string[]): Promise<ISecurityValidator> {
    return this.create(SecurityPolicy.STRICT, {
      allowedRoots,
      enableAuditLog: true,
      rateLimit: 1
    });
  }

  /**
   * Crea un SecurityValidator con política standard
   */
  async createStandard(options?: {
    allowedRoots?: string[];
    enableAuditLog?: boolean;
  }): Promise<ISecurityValidator> {
    return this.create(SecurityPolicy.STANDARD, {
      allowedRoots: options?.allowedRoots || [],
      enableAuditLog: options?.enableAuditLog ?? true,
      rateLimit: 2
    });
  }

  /**
   * Crea un SecurityValidator con política permissive
   */
  async createPermissive(): Promise<ISecurityValidator> {
    return this.create(SecurityPolicy.PERMISSIVE, {
      allowedRoots: [],
      enableAuditLog: false,
      rateLimit: 5
    });
  }

  /**
   * Limpia caché de validators
   */
  clearCache(): void {
    this.validators.clear();
  }

  /**
   * Obtiene información sobre validators en caché
   */
  getCacheInfo(): {
    count: number;
    configurations: string[];
  } {
    return {
      count: this.validators.size,
      configurations: Array.from(this.validators.keys())
    };
  }

  /**
   * Crea opciones completas con valores por defecto
   */
  private createFullOptions(
    policy: SecurityPolicy,
    partialOptions?: Partial<SecurityValidationOptions>
  ): SecurityValidationOptions {
    const defaults = this.getDefaultOptions(policy);
    
    return {
      policy,
      allowedRoots: partialOptions?.allowedRoots || defaults.allowedRoots,
      enableAuditLog: partialOptions?.enableAuditLog ?? defaults.enableAuditLog,
      rateLimit: partialOptions?.rateLimit || defaults.rateLimit
    };
  }

  /**
   * Obtiene configuración por defecto para cada política
   */
  private getDefaultOptions(policy: SecurityPolicy): Omit<SecurityValidationOptions, 'policy'> {
    switch (policy) {
      case SecurityPolicy.STRICT:
        return {
          allowedRoots: [],
          enableAuditLog: true,
          rateLimit: 1
        };

      case SecurityPolicy.STANDARD:
        return {
          allowedRoots: [],
          enableAuditLog: true,
          rateLimit: 2
        };

      case SecurityPolicy.PERMISSIVE:
        return {
          allowedRoots: [],
          enableAuditLog: false,
          rateLimit: 5
        };

      default:
        throw new Error(`Política de seguridad no soportada: ${policy}`);
    }
  }

  /**
   * Valida la configuración antes de crear el validator
   */
  private validateConfiguration(
    policy: SecurityPolicy,
    options?: Partial<SecurityValidationOptions>
  ): void {
    // Validar que la política esté soportada
    if (!this.getAvailablePolicies().includes(policy)) {
      throw new Error(`Política de seguridad no válida: ${policy}`);
    }

    // Validaciones específicas por política
    if (policy === SecurityPolicy.STRICT) {
      // Política strict debería tener al menos alguna restricción
      if (options?.allowedRoots && options.allowedRoots.length === 0) {
        console.warn('Política STRICT sin allowedRoots configurados. Se comportará muy restrictiva.');
      }
    }

    // Validar rate limit
    if (options?.rateLimit !== undefined) {
      if (options.rateLimit < 0.1 || options.rateLimit > 100) {
        throw new Error('Rate limit debe estar entre 0.1 y 100 cambios por segundo');
      }
    }

    // Validar allowedRoots
    if (options?.allowedRoots) {
      for (const root of options.allowedRoots) {
        if (typeof root !== 'string' || root.trim().length === 0) {
          throw new Error(`Root directory inválido: ${root}`);
        }
      }
    }
  }

  /**
   * Crea una clave única para la configuración
   */
  private createConfigKey(
    policy: SecurityPolicy,
    options?: Partial<SecurityValidationOptions>
  ): string {
    const allowedRoots = options?.allowedRoots?.sort().join('|') || '';
    const enableAuditLog = options?.enableAuditLog ?? true;
    const rateLimit = options?.rateLimit || this.getDefaultOptions(policy).rateLimit;

    return `${policy}:${allowedRoots}:${enableAuditLog}:${rateLimit}`;
  }
}

/**
 * Exportar instancia singleton por defecto
 */
export const securityValidatorFactory = SecurityValidatorFactory.getInstance();