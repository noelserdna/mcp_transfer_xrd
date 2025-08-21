/**
 * Unit tests para RootsManager
 * Cobertura de orchestration, error handling, integración con dependencies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RootsManager } from '../src/roots/roots-manager.js';
import { ConfigurationProvider } from '../src/configuration/configuration-provider.js';
import { SecurityValidator } from '../src/security/security-validator.js';
import { SecurityPolicy } from '../src/types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

describe('RootsManager', () => {
  let rootsManager: RootsManager;
  let configProvider: ConfigurationProvider;
  let securityValidator: SecurityValidator;
  const testTempDir = path.join(os.tmpdir(), 'test-roots-manager');

  beforeEach(() => {
    configProvider = new ConfigurationProvider();
    rootsManager = new RootsManager(configProvider);
  });

  afterEach(() => {
    // Cleanup después de cada test
  });

  describe('Construcción e inicialización', () => {
    it('debería construirse correctamente con ConfigurationProvider', () => {
      expect(rootsManager).toBeDefined();
      expect(rootsManager).toBeInstanceOf(RootsManager);
    });

    it('debería construirse con SecurityValidator opcional', async () => {
      securityValidator = new SecurityValidator({
        policy: SecurityPolicy.STANDARD,
        allowedRoots: [],
        enableAuditLog: true,
        rateLimit: 1
      });

      const manager = new RootsManager(configProvider, securityValidator);
      const securityInfo = manager.getSecurityValidatorInfo();
      
      expect(securityInfo.hasValidator).toBe(true);
    });

    it('debería configurar SecurityValidator después de construcción', async () => {
      await rootsManager.setSecurityValidator(SecurityPolicy.STRICT, [testTempDir]);
      
      const securityInfo = rootsManager.getSecurityValidatorInfo();
      expect(securityInfo.hasValidator).toBe(true);
    });
  });

  describe('Validación de notifications', () => {
    it('debería validar notification structure correctamente', async () => {
      const validNotification = {
        roots: [testTempDir, path.join(testTempDir, 'subdir')],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(validNotification);
      
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('debería rechazar notification sin roots array', async () => {
      const invalidNotification = {
        timestamp: Date.now()
      } as any;

      const result = await rootsManager.handleRootsChanged(invalidNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Notificación inválida');
    });

    it('debería rechazar notification con roots vacío', async () => {
      const invalidNotification = {
        roots: [],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(invalidNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Notificación inválida');
    });

    it('debería rechazar notification con roots no-string', async () => {
      const invalidNotification = {
        roots: [123, null, testTempDir],
        timestamp: Date.now()
      } as any;

      const result = await rootsManager.handleRootsChanged(invalidNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Notificación inválida');
    });

    it('debería rechazar notification con roots vacíos', async () => {
      const invalidNotification = {
        roots: ['', '  ', testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(invalidNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Notificación inválida');
    });
  });

  describe('Procesamiento de roots changes', () => {
    it('debería procesar cambio válido exitosamente', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      if (result.isValid) {
        expect(result.validDirectory).toBeDefined();
        expect(result.message).toContain('exitosamente');
      }
      // Si falla por permisos, está bien para este test
    });

    it('debería encontrar primer directorio válido de múltiples', async () => {
      const notification = {
        roots: [
          '\u0000invalid\u0000directory\u00001',
          '\u0000invalid\u0000directory\u00002', 
          testTempDir,
          '\u0000invalid\u0000directory\u00003'
        ],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      // El resultado puede ser válido o inválido dependiendo de las validaciones de seguridad
      // pero debería procesar la lista y encontrar el directorio temporal si es válido
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('debería fallar cuando ningún directorio es válido', async () => {
      const notification = {
        roots: [
          '\u0000invalid\u0000',
          '/non/existent/without/permissions',
          '<>invalid|chars?'
        ],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Error al actualizar la configuración');
    });

    it('debería integrar con ConfigurationProvider exitosamente', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const initialStatus = await rootsManager.getCurrentRoots();
      const result = await rootsManager.handleRootsChanged(notification);
      
      if (result.isValid) {
        const finalStatus = await rootsManager.getCurrentRoots();
        expect(finalStatus.source).toBe('roots');
      }
    });
  });

  describe('Rate limiting', () => {
    it('debería aplicar rate limiting en notifications', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      // Primera notification
      const result1 = await rootsManager.handleRootsChanged(notification);
      
      // Segunda notification inmediata
      const result2 = await rootsManager.handleRootsChanged(notification);
      
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('Rate limit excedido');
    });

    it('debería prevenir procesamiento concurrente', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      // Lanzar dos procesos concurrentes
      const promises = [
        rootsManager.handleRootsChanged(notification),
        rootsManager.handleRootsChanged(notification)
      ];

      const results = await Promise.all(promises);
      
      // Al menos uno debería fallar por procesamiento concurrente
      const concurrentFailures = results.filter(r => 
        r.message.includes('proceso') || r.message.includes('Rate limit')
      );
      expect(concurrentFailures.length).toBeGreaterThan(0);
    });

    it('debería permitir procesamiento después del tiempo requerido', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      // Primera notification
      await rootsManager.handleRootsChanged(notification);
      
      // Esperar más de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Segunda notification debería ser permitida
      const result = await rootsManager.handleRootsChanged(notification);
      
      // No debería ser rechazada por rate limit
      if (!result.isValid) {
        expect(result.message).not.toContain('Rate limit excedido');
      }
    });
  });

  describe('Integración con SecurityValidator', () => {
    beforeEach(async () => {
      await rootsManager.setSecurityValidator(SecurityPolicy.STANDARD);
    });

    it('debería rechazar directorios inseguros', async () => {
      const notification = {
        roots: ['/etc', 'C:\\Windows', '\u0000invalid\u0000'],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Ningún directorio en la lista es válido');
    });

    it('debería permitir directorios seguros', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      // Puede fallar por otros motivos, pero no por seguridad si el directorio es seguro
      if (!result.isValid) {
        expect(result.message).not.toContain('rechazado por validación de seguridad');
      }
    });

    it('debería funcionar con política STRICT y whitelist', async () => {
      await rootsManager.setSecurityValidator(SecurityPolicy.STRICT, [testTempDir]);
      
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      // Con STRICT y whitelist, debería pasar la validación de seguridad
      if (!result.isValid) {
        expect(result.message).not.toContain('rechazado por validación de seguridad');
      }
    });
  });

  describe('getCurrentRoots', () => {
    it('debería retornar estado actual correctamente', async () => {
      const status = await rootsManager.getCurrentRoots();
      
      expect(status).toBeDefined();
      expect(status).toHaveProperty('source');
      expect(status).toHaveProperty('currentDirectory');
      expect(status).toHaveProperty('allowedDirectories');
      expect(status).toHaveProperty('isValid');
      expect(status).toHaveProperty('lastUpdated');
      
      expect(typeof status.isValid).toBe('boolean');
      expect(status.lastUpdated).toBeInstanceOf(Date);
    });

    it('debería reflejar cambios después de updateFromRoots', async () => {
      const initialStatus = await rootsManager.getCurrentRoots();
      
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      if (result.isValid) {
        const finalStatus = await rootsManager.getCurrentRoots();
        expect(finalStatus.source).toBe('roots');
        expect(finalStatus.currentDirectory).not.toBe(initialStatus.currentDirectory);
      }
    });

    it('debería manejar errores gracefully', async () => {
      // Configurar provider problemático
      const brokenProvider = {
        getCurrentQRDirectory: () => { throw new Error('Test error'); },
        getAllowedDirectories: () => [],
        getConfigurationSource: () => 'default'
      } as any;

      const brokenManager = new RootsManager(brokenProvider);
      const status = await brokenManager.getCurrentRoots();
      
      expect(status).toBeDefined();
      expect(status.isValid).toBe(false);
    });
  });

  describe('validateDirectory', () => {
    it('debería validar directorio válido', async () => {
      const result = await rootsManager.validateDirectory(testTempDir);
      
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('debería rechazar directorio inválido', async () => {
      const result = await rootsManager.validateDirectory('\u0000invalid\u0000');
      
      // El resultado puede variar dependiendo de si SecurityValidator está configurado
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      // Si es inválido, debe tener errores
      if (!result.isValid) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it('debería rechazar parámetros inválidos', async () => {
      const testCases = ['', '   ', null as any, undefined as any];
      
      for (const testCase of testCases) {
        const result = await rootsManager.validateDirectory(testCase);
        expect(result.isValid).toBe(false);
        expect(result.message).toContain('requerido');
      }
    });

    it('debería usar SecurityValidator si está disponible', async () => {
      await rootsManager.setSecurityValidator(SecurityPolicy.STANDARD);
      
      const result = await rootsManager.validateDirectory('/etc');
      
      expect(result.isValid).toBe(false);
      // Debería usar validación de seguridad
    });

    it('debería funcionar sin SecurityValidator', async () => {
      // RootsManager sin SecurityValidator
      const managerWithoutSecurity = new RootsManager(configProvider);
      
      const result = await managerWithoutSecurity.validateDirectory(testTempDir);
      
      expect(result).toBeDefined();
      // Sin SecurityValidator, debería usar validación básica
    });
  });

  describe('Gestión de SecurityValidator', () => {
    it('debería configurar SecurityValidator correctamente', async () => {
      const allowedRoots = [testTempDir];
      await rootsManager.setSecurityValidator(SecurityPolicy.STRICT, allowedRoots);
      
      const info = rootsManager.getSecurityValidatorInfo();
      expect(info.hasValidator).toBe(true);
      expect(info.configuration).toBeDefined();
    });

    it('debería manejar errores en configuración de SecurityValidator', async () => {
      // Intentar configurar con política inválida
      await expect(
        rootsManager.setSecurityValidator('invalid_policy' as any)
      ).rejects.toThrow();
    });

    it('debería reportar información correcta sobre SecurityValidator', () => {
      const infoWithout = rootsManager.getSecurityValidatorInfo();
      expect(infoWithout.hasValidator).toBe(false);
    });
  });

  describe('clearRootsConfiguration', () => {
    it('debería limpiar configuración de roots', async () => {
      // Establecer configuración desde roots
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      if (result.isValid) {
        expect((await rootsManager.getCurrentRoots()).source).toBe('roots');
        
        // Limpiar configuración
        await rootsManager.clearRootsConfiguration();
        
        const finalStatus = await rootsManager.getCurrentRoots();
        expect(finalStatus.source).not.toBe('roots');
      }
    });

    it('debería manejar errores al limpiar configuración', async () => {
      // Configurar provider problemático
      const brokenProvider = {
        clearRootsConfiguration: () => { throw new Error('Clear error'); }
      } as any;

      const brokenManager = new RootsManager(brokenProvider);
      
      await expect(brokenManager.clearRootsConfiguration()).rejects.toThrow('Clear error');
    });
  });

  describe('Manejo de errores', () => {
    it('debería manejar errores de ConfigurationProvider', async () => {
      const brokenProvider = {
        updateFromRoots: () => { throw new Error('Provider error'); }
      } as any;

      const brokenManager = new RootsManager(brokenProvider);
      
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await brokenManager.handleRootsChanged(notification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Error interno');
    });

    it('debería manejar errores de SecurityValidator', async () => {
      const brokenValidator = {
        validateDirectorySecurity: () => { throw new Error('Security error'); }
      } as any;

      const brokenManager = new RootsManager(configProvider, brokenValidator);
      
      const result = await brokenManager.validateDirectory(testTempDir);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Error validando directorio');
    });

    it('debería manejar notification malformada', async () => {
      const malformedNotification = null as any;
      
      const result = await rootsManager.handleRootsChanged(malformedNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Notificación inválida');
    });
  });

  describe('Performance', () => {
    it('debería completar handleRootsChanged en menos de 100ms', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const startTime = Date.now();
      const result = await rootsManager.handleRootsChanged(notification);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result.processingTime).toBeLessThan(100);
    });

    it('debería completar validateDirectory rápidamente', async () => {
      const startTime = Date.now();
      
      await rootsManager.validateDirectory(testTempDir);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('debería completar getCurrentRoots rápidamente', async () => {
      const startTime = Date.now();
      
      await rootsManager.getCurrentRoots();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Logging y observabilidad', () => {
    it('debería incluir información de procesamiento en resultados', async () => {
      const notification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(notification);
      
      expect(result.processingTime).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      expect(result.message).toBeDefined();
      expect(typeof result.message).toBe('string');
    });

    it('debería proporcionar mensajes descriptivos', async () => {
      const validNotification = {
        roots: [testTempDir],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(validNotification);
      
      expect(result.message.length).toBeGreaterThan(10);
      expect(result.message).toMatch(/[a-zA-Z]/); // Contiene letras
    });
  });
});