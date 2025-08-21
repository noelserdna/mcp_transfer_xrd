/**
 * Implementación del validador de seguridad para MCP Roots
 * Previene ataques de path traversal y valida permisos
 */

import * as path from 'path';
import fs from 'fs/promises';
import { statSync } from 'fs';
import { ISecurityValidator } from '../interfaces/security-validator.interface.js';
import {
  SecurityValidationResult,
  SecurityViolation,
  SecurityPolicy,
  RateLimitState,
  RateLimitConfig
} from '../types/mcp-roots-types.js';

export class SecurityValidator implements ISecurityValidator {
  private securityPolicy: SecurityPolicy;
  private rateLimitConfig: RateLimitConfig;
  private rateLimitTracker: Map<string, RateLimitState>;
  private violationHistory: SecurityViolation[];

  constructor(initialPolicy?: Partial<SecurityPolicy>) {
    this.securityPolicy = this.createDefaultPolicy(initialPolicy);
    this.rateLimitConfig = {
      maxChangesPerSecond: 1,
      windowSizeMs: 1000,
      maxPendingOperations: 5
    };
    this.rateLimitTracker = new Map();
    this.violationHistory = [];
  }

  private createDefaultPolicy(overrides?: Partial<SecurityPolicy>): SecurityPolicy {
    const defaultPolicy: SecurityPolicy = {
      whitelistedDirectories: [
        process.cwd(),
        path.join(process.cwd(), 'qrimages'),
        path.join(process.cwd(), 'temp'),
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
        'C:\\Windows',
        'C:\\System32',
        'C:\\Program Files'
      ],
      maxPathLength: 260, // Windows MAX_PATH
      allowRelativePaths: false,
      requireWritePermission: true,
      enableAuditLogging: true
    };

    return { ...defaultPolicy, ...overrides };
  }

  async validateDirectoryPath(path: string): Promise<SecurityValidationResult> {
    const startTime = Date.now();
    const originalPath = path;
    
    try {
      // 1. Sanitizar el path
      const sanitizedPath = this.sanitizePath(path);
      
      // 2. Detectar path traversal
      const pathTraversalViolations = this.detectPathTraversal(sanitizedPath);
      
      // 3. Normalizar path cross-platform
      const normalizedPath = this.normalizePath(sanitizedPath);
      
      // 4. Validar longitud
      const lengthViolations = this.validatePathLength(normalizedPath);
      
      // 5. Verificar whitelist
      const whitelistViolations = this.isInWhitelist(normalizedPath) 
        ? [] 
        : [this.createViolation('WHITELIST_VIOLATION', normalizedPath, 'Path not in allowed directories')];
      
      // 6. Verificar permisos de escritura si requerido
      let permissionViolations: SecurityViolation[] = [];
      let hasWritePermission = false;
      
      if (this.securityPolicy.requireWritePermission) {
        try {
          hasWritePermission = await this.checkWritePermissions(normalizedPath);
          if (!hasWritePermission) {
            permissionViolations.push(
              this.createViolation('PERMISSION_DENIED', normalizedPath, 'No write permissions')
            );
          }
        } catch (error) {
          permissionViolations.push(
            this.createViolation('PERMISSION_DENIED', normalizedPath, `Permission check failed: ${error}`)
          );
        }
      }

      // 7. Consolidar violaciones
      const allViolations = [
        ...pathTraversalViolations,
        ...lengthViolations,
        ...whitelistViolations,
        ...permissionViolations
      ];

      // 8. Log violaciones si auditoría está habilitada
      if (this.securityPolicy.enableAuditLogging && allViolations.length > 0) {
        allViolations.forEach(violation => this.logSecurityViolation(violation));
      }

      const result: SecurityValidationResult = {
        isSecure: allViolations.length === 0,
        sanitizedPath: normalizedPath,
        violations: allViolations,
        metadata: {
          originalPath,
          normalizedPath,
          hasWritePermission,
          isWhitelisted: this.isInWhitelist(normalizedPath)
        }
      };

      return result;

    } catch (error) {
      const violation = this.createViolation(
        'INVALID_PATH', 
        originalPath, 
        `Validation failed: ${error}`
      );
      
      if (this.securityPolicy.enableAuditLogging) {
        this.logSecurityViolation(violation);
      }

      return {
        isSecure: false,
        sanitizedPath: originalPath,
        violations: [violation],
        metadata: {
          originalPath,
          normalizedPath: originalPath,
          hasWritePermission: false,
          isWhitelisted: false
        }
      };
    }
  }

  isPathAllowed(path: string): boolean {
    try {
      const normalizedPath = this.normalizePath(this.sanitizePath(path));
      return this.isInWhitelist(normalizedPath) && 
             this.detectPathTraversal(normalizedPath).length === 0;
    } catch {
      return false;
    }
  }

  sanitizePath(inputPath: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('Invalid path: path must be a non-empty string');
    }

    // Remover caracteres peligrosos
    let sanitized = inputPath
      .replace(/[<>"|?*]/g, '') // Caracteres inválidos Windows
      .replace(/\0/g, '') // Null bytes
      .trim();

    // Normalizar separadores de directorio
    const separator = path.sep;
    sanitized = sanitized.replace(/[/\\]+/g, separator);
    
    // Remover separadores duplicados
    const duplicateSepRegex = new RegExp(`\\${separator}+`, 'g');
    sanitized = sanitized.replace(duplicateSepRegex, separator);
    
    return sanitized;
  }

  async checkWritePermissions(dirPath: string): Promise<boolean> {
    try {
      // Verificar si el directorio existe
      await fs.access(dirPath);
      
      // Intentar crear archivo temporal para verificar escritura
      const testFile = path.join(dirPath, `.write_test_${Date.now()}.tmp`);
      
      try {
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return true;
      } catch {
        return false;
      }
    } catch {
      // Si el directorio no existe, verificar si se puede crear
      return this.canCreateDirectory(dirPath);
    }
  }

  detectPathTraversal(pathToCheck: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];
    const patterns = ['../', '..\\', './', '.\\'];
    
    for (const pattern of patterns) {
      if (pathToCheck.includes(pattern)) {
        violations.push(this.createViolation(
          'PATH_TRAVERSAL',
          pathToCheck,
          `Detected path traversal pattern: ${pattern}`,
          'HIGH'
        ));
      }
    }

    // Verificar patrones codificados
    const encoded = [
      '%2e%2e%2f', // ../
      '%2e%2e%5c', // ..\\
      '%2e%2e/',   // ../
      '%2e%2e\\',  // ..\\
    ];

    const lowerPath = pathToCheck.toLowerCase();
    for (const pattern of encoded) {
      if (lowerPath.includes(pattern)) {
        violations.push(this.createViolation(
          'PATH_TRAVERSAL',
          pathToCheck,
          `Detected encoded path traversal: ${pattern}`,
          'CRITICAL'
        ));
      }
    }

    return violations;
  }

  normalizePath(pathToNormalize: string): string {
    try {
      return path.resolve(pathToNormalize);
    } catch {
      return pathToNormalize;
    }
  }

  isInWhitelist(pathToCheck: string): boolean {
    const normalizedCheck = this.normalizePath(pathToCheck);
    
    return this.securityPolicy.whitelistedDirectories.some(allowedDir => {
      const normalizedAllowed = this.normalizePath(allowedDir);
      return normalizedCheck.startsWith(normalizedAllowed);
    });
  }

  updateSecurityPolicy(policy: Partial<SecurityPolicy>): void {
    this.securityPolicy = { ...this.securityPolicy, ...policy };
  }

  getCurrentPolicy(): SecurityPolicy {
    return { ...this.securityPolicy };
  }

  checkRateLimit(identifier: string): RateLimitState {
    const now = new Date();
    const existing = this.rateLimitTracker.get(identifier);

    if (!existing || (now.getTime() - existing.windowStart.getTime()) >= this.rateLimitConfig.windowSizeMs) {
      // Nueva ventana de tiempo
      const newState: RateLimitState = {
        currentRequests: 1,
        windowStart: now,
        isLimited: false
      };
      this.rateLimitTracker.set(identifier, newState);
      return newState;
    }

    // Incrementar contador en ventana existente
    existing.currentRequests++;
    existing.isLimited = existing.currentRequests > this.rateLimitConfig.maxChangesPerSecond;
    
    if (existing.isLimited) {
      existing.nextAllowedTime = new Date(
        existing.windowStart.getTime() + this.rateLimitConfig.windowSizeMs
      );
    }

    this.rateLimitTracker.set(identifier, existing);
    return existing;
  }

  logSecurityViolation(violation: SecurityViolation): void {
    const timestampedViolation = {
      ...violation,
      timestamp: new Date()
    };

    this.violationHistory.push(timestampedViolation);

    // Mantener solo últimas 100 violaciones
    if (this.violationHistory.length > 100) {
      this.violationHistory = this.violationHistory.slice(-100);
    }

    // Log a console para debugging
    console.error(`[SECURITY VIOLATION] ${violation.severity}: ${violation.type} - ${violation.description} (Path: ${violation.path})`);
  }

  getRecentViolations(limit: number = 10): SecurityViolation[] {
    return this.violationHistory
      .slice(-limit)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }

  async canCreateDirectory(dirPath: string): Promise<boolean> {
    try {
      const parentDir = path.dirname(dirPath);
      await fs.access(parentDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  async getAvailableDiskSpace(dirPath: string): Promise<number> {
    try {
      const stats = statSync(dirPath);
      if (stats.isDirectory()) {
        // En Node.js no hay API nativa para espacio en disco
        // Retornamos -1 para indicar que no se puede calcular
        return -1;
      }
      return -1;
    } catch {
      return -1;
    }
  }

  private validatePathLength(pathToValidate: string): SecurityViolation[] {
    if (pathToValidate.length > this.securityPolicy.maxPathLength) {
      return [this.createViolation(
        'INVALID_PATH',
        pathToValidate,
        `Path exceeds maximum length of ${this.securityPolicy.maxPathLength} characters`,
        'MEDIUM'
      )];
    }
    return [];
  }

  private createViolation(
    type: SecurityViolation['type'],
    path: string,
    description: string,
    severity: SecurityViolation['severity'] = 'MEDIUM'
  ): SecurityViolation {
    return {
      type,
      path,
      description,
      severity
    };
  }
}