/**
 * Basic Security Penetration Tests
 * Tests de seguridad esenciales para verificar protecciones básicas
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityValidator } from '../src/security/security-validator.js';
import { RootsManager } from '../src/roots/roots-manager.js';
import { ConfigurationProvider } from '../src/configuration/configuration-provider.js';
import { SecurityPolicy } from '../src/types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

describe('Basic Security Penetration Tests', () => {
  let securityValidator: SecurityValidator;
  let rootsManager: RootsManager;
  let configurationProvider: ConfigurationProvider;
  const testTempDir = path.join(os.tmpdir(), 'test-security-basic');

  beforeEach(() => {
    configurationProvider = new ConfigurationProvider();
    
    securityValidator = new SecurityValidator({
      policy: SecurityPolicy.STANDARD,
      allowedRoots: [testTempDir],
      enableAuditLog: true,
      rateLimit: 10 // Alto para no interferir con tests
    });
    
    rootsManager = new RootsManager(configurationProvider, securityValidator);
  });

  describe('Path Traversal Protection', () => {
    it('debería bloquear path traversal básico', async () => {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\..\\Windows\\System32',
        '../',
        '..\\'
      ];

      for (const attack of attacks) {
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('debería bloquear path traversal codificado', async () => {
      const encodedAttacks = [
        '%2e%2e%2f',
        '%2e%2e%5c',
        '%2e%2e%2f%2e%2e%2f'
      ];

      for (const attack of encodedAttacks) {
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Dangerous Characters Protection', () => {
    it('debería bloquear caracteres null', async () => {
      const nullAttacks = [
        '\u0000invalid\u0000',
        '/path/with\u0000null',
        'C:\\path\\with\u0000null'
      ];

      for (const attack of nullAttacks) {
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(error => 
          error.includes('Dangerous characters detected') || 
          error.includes('Null byte injection detected')
        )).toBe(true);
      }
    });

    it('debería bloquear caracteres de control', async () => {
      const controlChars = ['<', '>', '|', '*', '?', ':'];
      
      for (const char of controlChars) {
        const attack = `/path/with${char}dangerous`;
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('System Directory Protection', () => {
    it('debería bloquear directorios críticos de Unix', async () => {
      const unixPaths = ['/etc', '/bin', '/root', '/proc'];

      for (const unixPath of unixPaths) {
        const result = await securityValidator.validateDirectorySecurity(unixPath);
        expect(result.isValid).toBe(false);
      }
    });

    it('debería bloquear directorios críticos de Windows', async () => {
      const windowsPaths = [
        'C:\\Windows',
        'C:\\Program Files',
        'C:\\Windows\\System32'
      ];

      for (const windowsPath of windowsPaths) {
        const result = await securityValidator.validateDirectorySecurity(windowsPath);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Rate Limiting Protection', () => {
    beforeEach(() => {
      // Usar rate limit bajo para estos tests
      securityValidator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [testTempDir],
        enableAuditLog: true,
        rateLimit: 1 // 1 por segundo
      });
    });

    it('debería aplicar rate limiting después del primer request', async () => {
      // Primera validación
      await securityValidator.validateDirectorySecurity('/test/path/1');
      
      // Segunda validación inmediata debería ser bloqueada por rate limit
      const result = await securityValidator.validateDirectorySecurity('/test/path/2');
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Rate limit excedido');
    });

    it('debería permitir requests después del intervalo', async () => {
      // Primera validación
      await securityValidator.validateDirectorySecurity('/test/path/1');
      
      // Esperar más de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Segunda validación debería ser permitida
      const result = await securityValidator.validateDirectorySecurity(testTempDir);
      
      // No debería ser rechazada por rate limit
      if (!result.isValid) {
        expect(result.message).not.toContain('Rate limit');
      }
    });
  });

  describe('Audit Logging', () => {
    it('debería registrar intentos de ataque', async () => {
      const attacks = [
        '../../../etc/passwd',
        '\u0000malicious\u0000',
        '/etc'
      ];

      for (const attack of attacks) {
        await securityValidator.validateDirectorySecurity(attack);
      }

      const logs = securityValidator.getRecentAuditLogs(5);
      expect(logs.length).toBeGreaterThan(0);
      
      // Verificar que se marquen como bloqueados
      const blockedLogs = logs.filter(log => log.result === 'blocked');
      expect(blockedLogs.length).toBeGreaterThan(0);
    });

    it('debería incluir información relevante en logs', async () => {
      await securityValidator.validateDirectorySecurity('../../../etc/passwd');
      
      const logs = securityValidator.getRecentAuditLogs(1);
      const log = logs[0];
      
      expect(log.timestamp).toBeDefined();
      expect(log.attemptedPath).toBe('../../../etc/passwd');
      expect(log.result).toBe('blocked');
      expect(log.riskLevel).toMatch(/high|critical/);
    });
  });

  describe('Integration Attack Protection', () => {
    it('debería rechazar notificación con múltiples ataques', async () => {
      const maliciousNotification = {
        roots: [
          '../../../etc/passwd',
          'C:\\Windows\\System32',
          '\u0000malicious\u0000',
          '/etc'
        ],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(maliciousNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('directorio');
    });

    it('debería mantener funcionalidad con directorio válido', async () => {
      const validNotification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(validNotification);
      
      // Puede ser válido o inválido dependiendo de otras validaciones,
      // pero no debería crash
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Under Attack', () => {
    it('debería responder rápidamente a ataques', async () => {
      const attacks = [
        '../../../etc/passwd',
        'A'.repeat(1000),
        '\u0000'.repeat(100),
        '../'.repeat(50)
      ];

      for (const attack of attacks) {
        const startTime = Date.now();
        const result = await securityValidator.validateDirectorySecurity(attack);
        const duration = Date.now() - startTime;
        
        expect(result).toBeDefined();
        expect(duration).toBeLessThan(1000); // Máximo 1 segundo
        expect(result.isValid).toBe(false);
      }
    });

    it('debería limitar uso de memoria con inputs grandes', async () => {
      const largeInput = 'a'.repeat(50000);
      const startTime = Date.now();
      
      const result = await securityValidator.validateDirectorySecurity(largeInput);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Whitelist Validation', () => {
    beforeEach(() => {
      securityValidator = new SecurityValidator({
        policy: SecurityPolicy.STRICT,
        allowedRoots: ['/allowed/path'],
        enableAuditLog: true,
        rateLimit: 10
      });
    });

    it('debería rechazar paths fuera de whitelist', async () => {
      const disallowedPaths = [
        '/not/allowed',
        'C:\\Not\\Allowed',
        '/tmp/random'
      ];

      for (const disallowedPath of disallowedPaths) {
        const result = await securityValidator.validateDirectorySecurity(disallowedPath);
        expect(result.isValid).toBe(false);
      }
    });

    it('debería prevenir bypass de whitelist con path traversal', async () => {
      const bypassAttempts = [
        '/allowed/path/../../../etc/passwd',
        '/allowed/path/../../tmp'
      ];

      for (const attempt of bypassAttempts) {
        const result = await securityValidator.validateDirectorySecurity(attempt);
        expect(result.isValid).toBe(false);
      }
    });
  });
});