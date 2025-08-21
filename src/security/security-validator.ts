/**
 * SecurityValidator - Validación robusta de seguridad para directorios MCP Roots
 * Previene path traversal attacks y valida permisos de directorio
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ISecurityValidator,
  IConfigurationObserver
} from '../interfaces/roots-interfaces.js';
import {
  RootsValidationResult,
  SecurityAuditLog,
  SecurityValidationOptions,
  SecurityPolicy
} from '../types/mcp-roots-types.js';

export class SecurityValidator implements ISecurityValidator {
  private auditLogs: SecurityAuditLog[] = [];
  private lastValidationTime = 0;
  private readonly rateLimit: number;
  private readonly enableAuditLog: boolean;
  private readonly policy: SecurityPolicy;
  private readonly allowedRoots: string[];

  constructor(options: SecurityValidationOptions) {
    this.policy = options.policy;
    this.allowedRoots = options.allowedRoots || [];
    this.enableAuditLog = options.enableAuditLog;
    this.rateLimit = options.rateLimit || 1; // 1 cambio por segundo por defecto
  }

  /**
   * Valida que un directorio sea seguro para uso
   */
  async validateDirectorySecurity(
    directory: string,
    options?: SecurityValidationOptions
  ): Promise<RootsValidationResult> {
    const startTime = Date.now();
    const effectiveOptions = options || {};
    
    try {
      // Rate limiting
      if (!this.checkRateLimit()) {
        return this.createValidationResult(
          null,
          false,
          'Rate limit excedido. Máximo 1 cambio por segundo.',
          ['Rate limit violation'],
          Date.now() - startTime
        );
      }

      // Normalizar path
      const normalizedPath = this.normalizePath(directory);
      
      // Validaciones de seguridad
      const securityChecks = await this.performSecurityChecks(normalizedPath);
      
      if (!securityChecks.isValid) {
        await this.logSecurityEvent({
          id: this.generateLogId(),
          timestamp: new Date(),
          attemptedPath: directory,
          result: 'blocked',
          reason: securityChecks.reason,
          riskLevel: securityChecks.riskLevel,
          metadata: { normalizedPath, policy: this.policy }
        });

        return this.createValidationResult(
          null,
          false,
          securityChecks.reason,
          securityChecks.errors,
          Date.now() - startTime
        );
      }

      // Verificar permisos de escritura
      const hasWritePermissions = await this.checkWritePermissions(normalizedPath);
      if (!hasWritePermissions) {
        await this.logSecurityEvent({
          id: this.generateLogId(),
          timestamp: new Date(),
          attemptedPath: directory,
          result: 'blocked',
          reason: 'Sin permisos de escritura',
          riskLevel: 'medium',
          metadata: { normalizedPath }
        });

        return this.createValidationResult(
          null,
          false,
          'El directorio no tiene permisos de escritura requeridos.',
          ['Write permissions denied'],
          Date.now() - startTime
        );
      }

      // Validación de whitelist si está configurada
      if (this.allowedRoots.length > 0 && !this.isDirectoryAllowed(normalizedPath, this.allowedRoots)) {
        await this.logSecurityEvent({
          id: this.generateLogId(),
          timestamp: new Date(),
          attemptedPath: directory,
          result: 'blocked',
          reason: 'Directorio no está en la whitelist',
          riskLevel: 'high',
          metadata: { normalizedPath, allowedRoots: this.allowedRoots }
        });

        return this.createValidationResult(
          null,
          false,
          'El directorio no está permitido según la configuración de seguridad.',
          ['Directory not in whitelist'],
          Date.now() - startTime
        );
      }

      // Log de éxito
      await this.logSecurityEvent({
        id: this.generateLogId(),
        timestamp: new Date(),
        attemptedPath: directory,
        result: 'allowed',
        reason: 'Validación exitosa',
        riskLevel: 'low',
        metadata: { normalizedPath, policy: this.policy }
      });

      return this.createValidationResult(
        normalizedPath,
        true,
        'Directorio validado exitosamente.',
        [],
        Date.now() - startTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      await this.logSecurityEvent({
        id: this.generateLogId(),
        timestamp: new Date(),
        attemptedPath: directory,
        result: 'error',
        reason: `Error durante validación: ${errorMessage}`,
        riskLevel: 'critical',
        metadata: { error: errorMessage }
      });

      return this.createValidationResult(
        null,
        false,
        `Error durante la validación: ${errorMessage}`,
        [errorMessage],
        Date.now() - startTime
      );
    }
  }

  /**
   * Verifica permisos de escritura de forma asíncrona
   */
  async checkWritePermissions(directory: string): Promise<boolean> {
    try {
      await fs.access(directory, fs.constants.F_OK);
      await fs.access(directory, fs.constants.W_OK);
      return true;
    } catch (error) {
      // Si el directorio no existe, intentar crearlo
      try {
        await fs.mkdir(directory, { recursive: true });
        return true;
      } catch (createError) {
        return false;
      }
    }
  }

  /**
   * Normaliza un path para el sistema operativo actual
   */
  normalizePath(inputPath: string): string {
    // Expandir ~ para directorio home
    let expandedPath = inputPath;
    if (inputPath.startsWith('~')) {
      expandedPath = path.join(os.homedir(), inputPath.slice(1));
    }

    // Resolver path absoluto y normalizar
    const absolutePath = path.resolve(expandedPath);
    return path.normalize(absolutePath);
  }

  /**
   * Verifica si un directorio está en la whitelist
   */
  isDirectoryAllowed(directory: string, allowedRoots: string[]): boolean {
    const normalizedDirectory = this.normalizePath(directory);
    
    return allowedRoots.some(allowedRoot => {
      const normalizedRoot = this.normalizePath(allowedRoot);
      return normalizedDirectory === normalizedRoot || 
             normalizedDirectory.startsWith(normalizedRoot + path.sep);
    });
  }

  /**
   * Registra un evento de auditoría de seguridad
   */
  async logSecurityEvent(log: SecurityAuditLog): Promise<void> {
    if (!this.enableAuditLog) return;

    this.auditLogs.push(log);
    
    // Mantener solo los últimos 1000 logs para evitar memory leaks
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(-1000);
    }

    // En un entorno de producción, aquí se enviarían a un sistema de logging
    if (log.riskLevel === 'critical' || log.riskLevel === 'high') {
      console.warn(`[SECURITY] ${log.riskLevel.toUpperCase()}: ${log.reason}`, {
        path: log.attemptedPath,
        timestamp: log.timestamp.toISOString()
      });
    }
  }

  /**
   * Obtiene los logs de auditoría recientes
   */
  getRecentAuditLogs(limit: number = 100): SecurityAuditLog[] {
    return this.auditLogs.slice(-limit);
  }

  /**
   * Realiza verificaciones específicas de seguridad
   */
  private async performSecurityChecks(normalizedPath: string): Promise<{
    isValid: boolean;
    reason: string;
    errors: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  }> {
    const errors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // 1. Verificar path traversal attacks
    if (this.containsPathTraversal(normalizedPath)) {
      errors.push('Path traversal attack detected');
      riskLevel = 'critical';
    }

    // 2. Verificar caracteres peligrosos
    if (this.containsDangerousCharacters(normalizedPath)) {
      errors.push('Dangerous characters detected in path');
      riskLevel = 'high';
    }

    // 3. Verificar longitud de path
    if (normalizedPath.length > 260 && process.platform === 'win32') {
      errors.push('Path too long for Windows filesystem');
      riskLevel = 'medium';
    }

    // 4. Verificar null bytes
    if (normalizedPath.includes('\0')) {
      errors.push('Null byte injection detected');
      riskLevel = 'critical';
    }

    // 5. Política específica de seguridad
    const policyCheck = this.checkSecurityPolicy(normalizedPath);
    if (!policyCheck.isValid) {
      errors.push(...policyCheck.errors);
      riskLevel = policyCheck.riskLevel;
    }

    const isValid = errors.length === 0;
    const reason = isValid 
      ? 'Todas las validaciones de seguridad pasaron'
      : `Validación de seguridad falló: ${errors.join(', ')}`;

    return { isValid, reason, errors, riskLevel };
  }

  /**
   * Detecta intentos de path traversal
   */
  private containsPathTraversal(normalizedPath: string): boolean {
    const dangerousPatterns = [
      '../',
      '..\\',
      '....///',
      '....\\\\\\',
      '%2e%2e%2f',
      '%2e%2e%5c',
      '..%2f',
      '..%5c'
    ];

    const pathLower = normalizedPath.toLowerCase();
    return dangerousPatterns.some(pattern => pathLower.includes(pattern));
  }

  /**
   * Detecta caracteres peligrosos en paths
   */
  private containsDangerousCharacters(normalizedPath: string): boolean {
    // Caracteres peligrosos que podrían ser usados para ataques
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    return dangerousChars.test(normalizedPath);
  }

  /**
   * Verifica políticas específicas de seguridad
   */
  private checkSecurityPolicy(normalizedPath: string): {
    isValid: boolean;
    errors: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const errors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    switch (this.policy) {
      case SecurityPolicy.STRICT:
        // Política estricta: solo directorios específicos permitidos
        if (!this.allowedRoots.length) {
          errors.push('Strict policy requires configured allowed roots');
          riskLevel = 'high';
        }
        break;

      case SecurityPolicy.STANDARD:
        // Política estándar: evitar directorios sistema críticos
        const criticalDirs = ['/etc', '/bin', '/sbin', '/usr/bin', 'C:\\Windows', 'C:\\Program Files'];
        if (criticalDirs.some(dir => normalizedPath.startsWith(this.normalizePath(dir)))) {
          errors.push('Access to critical system directory not allowed');
          riskLevel = 'high';
        }
        break;

      case SecurityPolicy.PERMISSIVE:
        // Política permisiva: validaciones mínimas
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      riskLevel
    };
  }

  /**
   * Verifica rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const timeSinceLastValidation = now - this.lastValidationTime;
    const minInterval = 1000 / this.rateLimit; // ms entre validaciones

    if (timeSinceLastValidation < minInterval) {
      return false;
    }

    this.lastValidationTime = now;
    return true;
  }

  /**
   * Crea un resultado de validación estandarizado
   */
  private createValidationResult(
    validDirectory: string | null,
    isValid: boolean,
    message: string,
    errors: string[],
    processingTime: number
  ): RootsValidationResult {
    return {
      validDirectory,
      isValid,
      message,
      errors,
      processingTime
    };
  }

  /**
   * Genera un ID único para logs
   */
  private generateLogId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}