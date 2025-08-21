/**
 * Factory para crear instancias de SecurityValidator con configuraciones específicas
 */

import { SecurityValidator } from '../validators/security-validator.js';
import { ISecurityValidator } from '../interfaces/security-validator.interface.js';
import { SecurityPolicy } from '../types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

export interface SecurityValidatorOptions {
  customPolicy?: Partial<SecurityPolicy>;
  strictMode?: boolean;
  development?: boolean;
  allowedDirectories?: string[];
}

export class SecurityValidatorFactory {
  /**
   * Crea una instancia de SecurityValidator con configuración por defecto
   */
  static createDefault(): ISecurityValidator {
    return new SecurityValidator();
  }

  /**
   * Crea una instancia de SecurityValidator con configuración personalizada
   */
  static createWithOptions(options: SecurityValidatorOptions): ISecurityValidator {
    const policy = SecurityValidatorFactory.buildSecurityPolicy(options);
    return new SecurityValidator(policy);
  }

  /**
   * Crea una instancia de SecurityValidator para modo desarrollo
   * Con políticas más permisivas para testing
   */
  static createForDevelopment(): ISecurityValidator {
    const developmentPolicy: Partial<SecurityPolicy> = {
      whitelistedDirectories: [
        process.cwd(),
        path.join(process.cwd(), 'qrimages'),
        path.join(process.cwd(), 'temp'),
        path.join(process.cwd(), 'test-output'),
        path.join(process.cwd(), 'build'),
        path.join(process.cwd(), 'dist'),
        '/tmp',
        path.join(os.tmpdir(), 'qr-tests')
      ],
      allowRelativePaths: true,
      requireWritePermission: false,
      enableAuditLogging: false,
      maxPathLength: 500
    };

    return new SecurityValidator(developmentPolicy);
  }

  /**
   * Crea una instancia de SecurityValidator para modo producción
   * Con políticas estrictas de seguridad
   */
  static createForProduction(): ISecurityValidator {
    const productionPolicy: Partial<SecurityPolicy> = {
      whitelistedDirectories: [
        path.join(process.cwd(), 'qrimages'),
        path.join(process.cwd(), 'output')
      ],
      forbiddenPatterns: [
        '../',
        '..\\',
        './',
        '.\\',
        '/etc',
        '/usr',
        '/bin',
        '/sys',
        '/proc',
        '/root',
        '/home',
        'C:\\Windows',
        'C:\\System32',
        'C:\\Program Files',
        'C:\\Program Files (x86)',
        'C:\\Users\\Administrator',
        'C:\\ProgramData'
      ],
      allowRelativePaths: false,
      requireWritePermission: true,
      enableAuditLogging: true,
      maxPathLength: 260
    };

    return new SecurityValidator(productionPolicy);
  }

  /**
   * Crea una instancia de SecurityValidator para testing
   * Con directorio temporal aislado
   */
  static createForTesting(testDirectory?: string): ISecurityValidator {
    const testDir = testDirectory || path.join(process.cwd(), 'test-qr-temp');
    
    const testingPolicy: Partial<SecurityPolicy> = {
      whitelistedDirectories: [testDir],
      allowRelativePaths: false,
      requireWritePermission: true,
      enableAuditLogging: false,
      maxPathLength: 500
    };

    return new SecurityValidator(testingPolicy);
  }

  /**
   * Crea una instancia de SecurityValidator con directorio específico permitido
   */
  static createWithAllowedDirectory(allowedDirectory: string): ISecurityValidator {
    const policy: Partial<SecurityPolicy> = {
      whitelistedDirectories: [allowedDirectory],
      allowRelativePaths: false,
      requireWritePermission: true,
      enableAuditLogging: true
    };

    return new SecurityValidator(policy);
  }

  /**
   * Crea una instancia de SecurityValidator basada en variables de entorno
   */
  static createFromEnvironment(): ISecurityValidator {
    const envPolicy: Partial<SecurityPolicy> = {};
    
    // Leer configuración desde variables de entorno
    if (process.env.SECURITY_ALLOWED_DIRS) {
      envPolicy.whitelistedDirectories = process.env.SECURITY_ALLOWED_DIRS.split(',');
    }
    
    if (process.env.SECURITY_STRICT_MODE === 'true') {
      envPolicy.allowRelativePaths = false;
      envPolicy.requireWritePermission = true;
      envPolicy.enableAuditLogging = true;
    }
    
    if (process.env.SECURITY_MAX_PATH_LENGTH) {
      envPolicy.maxPathLength = parseInt(process.env.SECURITY_MAX_PATH_LENGTH, 10);
    }

    return new SecurityValidator(envPolicy);
  }

  private static buildSecurityPolicy(options: SecurityValidatorOptions): Partial<SecurityPolicy> {
    const policy: Partial<SecurityPolicy> = {};

    if (options.customPolicy) {
      Object.assign(policy, options.customPolicy);
    }

    if (options.allowedDirectories) {
      policy.whitelistedDirectories = options.allowedDirectories;
    }

    if (options.strictMode) {
      policy.allowRelativePaths = false;
      policy.requireWritePermission = true;
      policy.enableAuditLogging = true;
      policy.maxPathLength = 260;
    }

    if (options.development) {
      policy.allowRelativePaths = true;
      policy.requireWritePermission = false;
      policy.enableAuditLogging = false;
      policy.maxPathLength = 500;
    }

    return policy;
  }
}

// Funciones de conveniencia para creación rápida
export const createSecurityValidator = SecurityValidatorFactory.createDefault;
export const createDevelopmentValidator = SecurityValidatorFactory.createForDevelopment;
export const createProductionValidator = SecurityValidatorFactory.createForProduction;
export const createTestValidator = SecurityValidatorFactory.createForTesting;