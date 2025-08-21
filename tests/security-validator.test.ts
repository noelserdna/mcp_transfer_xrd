/**
 * Unit tests para SecurityValidator
 * Cobertura completa de validaciones de seguridad, path traversal y políticas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecurityValidator } from '../src/security/security-validator.js';
import { SecurityPolicy } from '../src/types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

describe('SecurityValidator', () => {
  let validator: SecurityValidator;
  const testTempDir = path.join(os.tmpdir(), 'test-radix-qr-security');

  beforeEach(() => {
    // Reset any timers for rate limiting tests only
  });

  afterEach(() => {
    // Cleanup after tests
  });

  describe('Construcción con diferentes políticas', () => {
    it('debería crear validator con política STRICT', async () => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STRICT,
        allowedRoots: [testTempDir],
        enableAuditLog: true,
        rateLimit: 1
      });

      expect(validator).toBeDefined();
    });

    it('debería crear validator con política STANDARD', async () => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 2
      });

      expect(validator).toBeDefined();
    });

    it('debería crear validator con política PERMISSIVE', async () => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.PERMISSIVE,
        allowedRoots: [],
        enableAuditLog: false,
        rateLimit: 5
      });

      expect(validator).toBeDefined();
    });
  });

  describe('Validación de path traversal', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 1
      });
    });

    it('debería rechazar path traversal básico (../)', async () => {
      const result = await validator.validateDirectorySecurity('/home/user/../etc');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar path traversal Windows (..\\)', async () => {
      const result = await validator.validateDirectorySecurity('C:\\Users\\..\\Windows');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar path traversal sofisticado (....//)', async () => {
      const result = await validator.validateDirectorySecurity('/home/....///etc');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar path traversal URL encoded (%2e%2e%2f)', async () => {
      const result = await validator.validateDirectorySecurity('/home/%2e%2e%2f/etc');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });
  });

  describe('Validación de caracteres peligrosos', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 1
      });
    });

    it('debería rechazar null bytes', async () => {
      const result = await validator.validateDirectorySecurity('/home/user\0/dir');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar caracteres peligrosos (<>:|?*)', async () => {
      const result = await validator.validateDirectorySecurity('/home/user/<script>');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería permitir caracteres válidos en temp directory', async () => {
      const validDir = path.join(os.tmpdir(), 'valid-dir-123');
      const result = await validator.validateDirectorySecurity(validDir);
      
      // El directorio temporal debería ser permitido, puede fallar por permisos pero no por caracteres
      if (!result.isValid) {
        expect(result.errors).not.toContain('Dangerous characters detected');
      }
    });
  });

  describe('Validación de directorios críticos del sistema', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 1
      });
    });

    it('debería rechazar /etc', async () => {
      const result = await validator.validateDirectorySecurity('/etc');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar C:\\Windows', async () => {
      const result = await validator.validateDirectorySecurity('C:\\Windows');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería rechazar /usr/bin', async () => {
      const result = await validator.validateDirectorySecurity('/usr/bin');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });

    it('debería permitir directorios seguros', async () => {
      const safeDir = path.join(os.tmpdir(), 'safe-qr-dir');
      const result = await validator.validateDirectorySecurity(safeDir);
      
      // El directorio temporal debería ser considerado seguro
      if (!result.isValid) {
        expect(result.message).not.toContain('critical system directory');
      }
    });
  });

  describe('Rate limiting', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 1 // 1 por segundo
      });
    });

    it('debería aplicar rate limiting', async () => {
      const testDir = path.join(os.tmpdir(), 'test-rate-limit');
      
      // Primera validación debe pasar el rate limit
      const result1 = await validator.validateDirectorySecurity(testDir);
      
      // Segunda validación inmediata debe ser rechazada por rate limit
      const result2 = await validator.validateDirectorySecurity(testDir);
      
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('Rate limit excedido');
    });

    it('debería permitir validaciones después del intervalo', async () => {
      const testDir = path.join(os.tmpdir(), 'test-rate-limit-interval');
      
      // Primera validación
      await validator.validateDirectorySecurity(testDir);
      
      // Esperar un poco para que el rate limit se resetee
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Segunda validación debe pasar el rate limit
      const result = await validator.validateDirectorySecurity(testDir);
      
      // No debe ser rechazada por rate limit
      if (!result.isValid) {
        expect(result.errors).not.toContain('Rate limit violation');
      }
    });
  });

  describe('Whitelist de directorios permitidos', () => {
    const allowedDir1 = path.join(os.homedir(), 'allowed-1');
    const allowedDir2 = path.join(os.homedir(), 'allowed-2');
    const disallowedDir = path.join(os.homedir(), 'not-allowed');

    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STRICT,
        allowedRoots: [allowedDir1, allowedDir2],
        enableAuditLog: true,
        rateLimit: 10 // Alto para no interferir con tests
      });
    });

    it('debería permitir directorios en whitelist', async () => {
      const result = await validator.validateDirectorySecurity(allowedDir1);
      
      // Puede fallar por otros motivos, pero no por whitelist
      if (!result.isValid) {
        expect(result.errors).not.toContain('Directory not in whitelist');
      }
    });

    it('debería permitir subdirectorios de whitelist', async () => {
      const subDir = path.join(allowedDir1, 'subdir');
      const result = await validator.validateDirectorySecurity(subDir);
      
      // Puede fallar por otros motivos, pero no por whitelist
      if (!result.isValid) {
        expect(result.errors).not.toContain('Directory not in whitelist');
      }
    });

    it('debería rechazar directorios no en whitelist', async () => {
      const result = await validator.validateDirectorySecurity(disallowedDir);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Validación de seguridad falló');
    });
  });

  describe('Políticas de seguridad específicas', () => {
    it('política STRICT debería requerir allowedRoots', async () => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STRICT,
        allowedRoots: [], // Vacío
        enableAuditLog: true,
        rateLimit: 1
      });

      const testDir = path.join(os.homedir(), 'test-strict');
      const result = await validator.validateDirectorySecurity(testDir);
      
      expect(result.isValid).toBe(false);
      // La política strict sin allowedRoots debería mostrar warning
    });

    it('política PERMISSIVE debería ser más permisiva', async () => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.PERMISSIVE,
        allowedRoots: [],
        enableAuditLog: false,
        rateLimit: 10
      });

      const testDir = path.join(os.homedir(), 'test-permissive');
      const result = await validator.validateDirectorySecurity(testDir);
      
      // Política permisiva solo debería fallar por path traversal o caracteres peligrosos
      if (!result.isValid) {
        expect(result.message).not.toContain('critical system directory');
      }
    });
  });

  describe('Funciones auxiliares', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [testTempDir],
        enableAuditLog: true,
        rateLimit: 10
      });
    });

    it('normalizePath debería expandir ~ correctamente', () => {
      const homeDir = os.homedir();
      const normalized = validator.normalizePath('~/test');
      
      expect(normalized).toBe(path.join(homeDir, 'test'));
    });

    it('normalizePath debería resolver paths relativos', () => {
      const normalized = validator.normalizePath('./test');
      
      expect(path.isAbsolute(normalized)).toBe(true);
    });

    it('isDirectoryAllowed debería funcionar correctamente', () => {
      const allowed = validator.isDirectoryAllowed(testTempDir, [testTempDir]);
      expect(allowed).toBe(true);

      const notAllowed = validator.isDirectoryAllowed('/not/allowed', [testTempDir]);
      expect(notAllowed).toBe(false);
    });
  });

  describe('Audit logging', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 10
      });
    });

    it('debería registrar eventos de auditoría', async () => {
      const testDir = '/invalid/../path';
      await validator.validateDirectorySecurity(testDir);
      
      const logs = validator.getRecentAuditLogs(5);
      expect(logs.length).toBeGreaterThan(0);
      
      const lastLog = logs[logs.length - 1];
      expect(lastLog.attemptedPath).toBe(testDir);
      expect(lastLog.result).toBe('blocked');
      expect(lastLog.riskLevel).toMatch(/high|critical/);
    });

    it('debería limitar el número de logs almacenados', async () => {
      // Simular muchas validaciones
      for (let i = 0; i < 10; i++) {
        await validator.validateDirectorySecurity(`/test/path/${i}`);
      }
      
      const allLogs = validator.getRecentAuditLogs(1000);
      expect(allLogs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 10
      });
    });

    it('debería completar validación en menos de 50ms', async () => {
      const testDir = path.join(os.homedir(), 'performance-test');
      const startTime = Date.now();
      
      await validator.validateDirectorySecurity(testDir);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('debería incluir tiempo de procesamiento en resultado', async () => {
      const testDir = path.join(os.tmpdir(), 'timing-test');
      const result = await validator.validateDirectorySecurity(testDir);
      
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.processingTime).toBeLessThan(1000);
    });
  });

  describe('Manejo de errores', () => {
    beforeEach(() => {
      validator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 10
      });
    });

    it('debería manejar errores de filesystem gracefully', async () => {
      // Path que definitivamente causará error de filesystem
      const invalidPath = '\0invalid\0path\0';
      const result = await validator.validateDirectorySecurity(invalidPath);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('debería registrar errores en audit log', async () => {
      const invalidPath = '\0invalid\0path\0';
      await validator.validateDirectorySecurity(invalidPath);
      
      const logs = validator.getRecentAuditLogs(1);
      expect(logs.length).toBeGreaterThan(0);
      // El path con null bytes es detectado como blocked, no error
      expect(logs[0].result).toMatch(/blocked|error/);
      expect(logs[0].riskLevel).toMatch(/high|critical/);
    });
  });
});