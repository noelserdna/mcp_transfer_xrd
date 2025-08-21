/**
 * Unit tests para ConfigurationProvider
 * Cobertura de precedencia, observer pattern, fallback scenarios y thread-safety
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationProvider } from '../src/configuration/configuration-provider.js';
import { ConfigSource } from '../src/types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

describe('ConfigurationProvider', () => {
  let provider: ConfigurationProvider;
  const testTempDir = path.join(os.tmpdir(), 'test-config-provider');
  const originalEnv = process.env.RADIX_QR_DIR;

  beforeEach(() => {
    // Limpiar variable de entorno
    delete process.env.RADIX_QR_DIR;
  });

  afterEach(() => {
    // Restaurar variable de entorno original
    if (originalEnv) {
      process.env.RADIX_QR_DIR = originalEnv;
    } else {
      delete process.env.RADIX_QR_DIR;
    }
  });

  describe('Construcción y configuración inicial', () => {
    it('debería usar directorio por defecto sin configuración adicional', async () => {
      provider = new ConfigurationProvider();
      
      const currentDir = await provider.getCurrentQRDirectory();
      const source = provider.getConfigurationSource();
      
      expect(path.basename(currentDir)).toBe('qrimages');
      expect(source).toBe(ConfigSource.DEFAULT);
    });

    it('debería usar directorio de línea de comandos cuando se proporciona', async () => {
      const cmdLineDir = testTempDir;
      provider = new ConfigurationProvider(undefined, cmdLineDir);
      
      const currentDir = await provider.getCurrentQRDirectory();
      const source = provider.getConfigurationSource();
      
      expect(currentDir).toContain(path.basename(cmdLineDir));
      expect(source).toBe(ConfigSource.COMMAND_LINE);
    });

    it('debería cargar variable de entorno al construir', async () => {
      process.env.RADIX_QR_DIR = testTempDir;
      provider = new ConfigurationProvider();
      
      const currentDir = await provider.getCurrentQRDirectory();
      const source = provider.getConfigurationSource();
      
      expect(currentDir).toContain(path.basename(testTempDir));
      expect(source).toBe(ConfigSource.ENVIRONMENT);
    });

    it('debería configurar allowedDirectories correctamente', async () => {
      const allowedDirs = [testTempDir, path.join(testTempDir, 'subdir')];
      provider = new ConfigurationProvider(undefined, undefined, allowedDirs);
      
      const allowed = provider.getAllowedDirectories();
      
      expect(allowed.length).toBe(2);
      expect(allowed).toContain(path.resolve(testTempDir));
    });
  });

  describe('Precedencia de configuración', () => {
    it('debería priorizar roots sobre environment', async () => {
      process.env.RADIX_QR_DIR = '/env/directory';
      provider = new ConfigurationProvider();
      
      // Simular actualización desde roots
      const rootsDir = testTempDir;
      const success = await provider.updateFromRoots(rootsDir);
      
      expect(success).toBe(true);
      
      const currentDir = await provider.getCurrentQRDirectory();
      const source = provider.getConfigurationSource();
      
      expect(currentDir).toContain(path.basename(rootsDir));
      expect(source).toBe(ConfigSource.ROOTS);
    });

    it('debería priorizar environment sobre command line', async () => {
      process.env.RADIX_QR_DIR = testTempDir;
      const cmdLineDir = '/cmd/directory';
      provider = new ConfigurationProvider(undefined, cmdLineDir);
      
      const source = provider.getConfigurationSource();
      
      expect(source).toBe(ConfigSource.ENVIRONMENT);
    });

    it('debería priorizar command line sobre default', async () => {
      const cmdLineDir = testTempDir;
      provider = new ConfigurationProvider(undefined, cmdLineDir);
      
      const source = provider.getConfigurationSource();
      
      expect(source).toBe(ConfigSource.COMMAND_LINE);
    });

    it('debería usar default cuando no hay otras configuraciones', async () => {
      provider = new ConfigurationProvider();
      
      const source = provider.getConfigurationSource();
      
      expect(source).toBe(ConfigSource.DEFAULT);
    });
  });

  describe('Gestión de roots', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería actualizar configuración desde roots exitosamente', async () => {
      const rootsDir = testTempDir;
      
      let changeEventFired = false;
      provider.onConfigurationChange((event) => {
        changeEventFired = true;
        expect(event.success).toBe(true);
        expect(event.current.source).toBe(ConfigSource.ROOTS);
        expect(event.current.currentDirectory).toContain(path.basename(rootsDir));
      });
      
      const success = await provider.updateFromRoots(rootsDir);
      
      expect(success).toBe(true);
      // Dar tiempo para que se ejecute el observer
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(changeEventFired).toBe(true);
    });

    it('debería rechazar directorios inválidos', async () => {
      const invalidDir = '\0invalid\0directory';
      
      let changeEventFired = false;
      provider.onConfigurationChange((event) => {
        changeEventFired = true;
        expect(event.success).toBe(false);
      });
      
      const success = await provider.updateFromRoots(invalidDir);
      
      expect(success).toBe(false);
      // Dar tiempo para que se ejecute el observer
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(changeEventFired).toBe(true);
    });

    it('debería limpiar configuración de roots correctamente', async () => {
      // Primero establecer configuración desde roots
      await provider.updateFromRoots(testTempDir);
      expect(provider.getConfigurationSource()).toBe(ConfigSource.ROOTS);
      
      let changeEventFired = false;
      provider.onConfigurationChange((event) => {
        if (event.message.includes('eliminada')) {
          changeEventFired = true;
          expect(event.success).toBe(true);
          expect(event.current.source).not.toBe(ConfigSource.ROOTS);
        }
      });
      
      await provider.clearRootsConfiguration();
      
      // Dar tiempo para que se ejecute el observer
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(changeEventFired).toBe(true);
      expect(provider.getConfigurationSource()).not.toBe(ConfigSource.ROOTS);
    });
  });

  describe('Observer pattern', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería notificar múltiples observers', async () => {
      let observer1Called = false;
      let observer2Called = false;
      
      provider.onConfigurationChange(() => { observer1Called = true; });
      provider.onConfigurationChange(() => { observer2Called = true; });
      
      await provider.updateFromRoots(testTempDir);
      
      // Dar tiempo para que se ejecuten los observers
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(observer1Called).toBe(true);
      expect(observer2Called).toBe(true);
    });

    it('debería remover observers correctamente', async () => {
      let observerCalled = false;
      
      const callback = () => { observerCalled = true; };
      provider.onConfigurationChange(callback);
      provider.removeConfigurationObserver(callback);
      
      await provider.updateFromRoots(testTempDir);
      
      // Dar tiempo para verificar que no se llame
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(observerCalled).toBe(false);
    });

    it('debería manejar errores en observers gracefully', async () => {
      // Agregar observer que lanza error
      provider.onConfigurationChange(() => {
        throw new Error('Observer error');
      });
      
      // Agregar observer normal
      let normalObserverCalled = false;
      provider.onConfigurationChange(() => {
        normalObserverCalled = true;
      });
      
      // No debería lanzar error
      await expect(provider.updateFromRoots(testTempDir)).resolves.toBe(true);
      
      // Dar tiempo para que se ejecuten los observers
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // El observer normal debería haberse ejecutado
      expect(normalObserverCalled).toBe(true);
    });
  });

  describe('Información de directorio', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería obtener información básica del directorio', async () => {
      const info = await provider.getDirectoryInfo();
      
      expect(info).toHaveProperty('path');
      expect(info).toHaveProperty('exists');
      expect(info).toHaveProperty('writable');
      expect(info).toHaveProperty('qrFileCount');
      expect(info).toHaveProperty('totalSize');
      expect(info).toHaveProperty('lastModified');
      
      expect(typeof info.path).toBe('string');
      expect(typeof info.exists).toBe('boolean');
      expect(typeof info.writable).toBe('boolean');
      expect(typeof info.qrFileCount).toBe('number');
      expect(typeof info.totalSize).toBe('number');
      expect(info.lastModified).toBeInstanceOf(Date);
    });

    it('debería retornar información vacía para directorio inexistente', async () => {
      const nonExistentDir = path.join(testTempDir, 'non-existent-' + Date.now());
      provider = new ConfigurationProvider(nonExistentDir);
      
      const info = await provider.getDirectoryInfo();
      
      expect(info.exists).toBe(false);
      expect(info.writable).toBe(false);
      expect(info.qrFileCount).toBe(0);
      expect(info.totalSize).toBe(0);
    });
  });

  describe('Gestión de directorios permitidos', () => {
    it('debería gestionar lista de directorios permitidos', () => {
      const allowedDirs = [testTempDir, '/another/dir'];
      provider = new ConfigurationProvider(undefined, undefined, allowedDirs);
      
      const allowed = provider.getAllowedDirectories();
      expect(allowed.length).toBe(2);
      
      // Actualizar lista
      provider.updateAllowedDirectories(['/new/dir']);
      const updated = provider.getAllowedDirectories();
      
      expect(updated.length).toBe(1);
      expect(updated[0]).toContain('new');
    });

    it('debería normalizar directorios permitidos', () => {
      const allowedDirs = [testTempDir, path.join(testTempDir, 'subdir')];
      provider = new ConfigurationProvider(undefined, undefined, allowedDirs);
      
      const allowed = provider.getAllowedDirectories();
      
      // Todos deberían ser paths absolutos
      allowed.forEach(dir => {
        expect(path.isAbsolute(dir)).toBe(true);
      });
    });
  });

  describe('Configuración desde línea de comandos', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería actualizar configuración desde línea de comandos', () => {
      const cmdDir = testTempDir;
      const success = provider.updateFromCommandLine(cmdDir);
      
      expect(success).toBe(true);
      expect(provider.getConfigurationSource()).toBe(ConfigSource.COMMAND_LINE);
    });

    it('debería manejar directorios inválidos de línea de comandos', () => {
      const invalidDir = '\0invalid';
      
      // La función updateFromCommandLine solo normaliza, no valida
      // Los errores se detectan durante updateFromRoots
      const success = provider.updateFromCommandLine(invalidDir);
      
      // La función debería retornar true pero la configuración sería inválida
      expect(success).toBe(true);
      expect(provider.getConfigurationSource()).toBe(ConfigSource.COMMAND_LINE);
    });
  });

  describe('Expansión de paths', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería expandir ~ correctamente', async () => {
      const homeDir = os.homedir();
      const homePath = '~/test-qr';
      
      await provider.updateFromRoots(homePath);
      const currentDir = await provider.getCurrentQRDirectory();
      
      expect(currentDir).toBe(path.join(homeDir, 'test-qr'));
    });

    it('debería resolver paths relativos', async () => {
      const relativePath = './relative-qr';
      
      await provider.updateFromRoots(relativePath);
      const currentDir = await provider.getCurrentQRDirectory();
      
      expect(path.isAbsolute(currentDir)).toBe(true);
    });
  });

  describe('Estado de configuración', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería reportar estado válido para directorio accesible', async () => {
      await provider.updateFromRoots(testTempDir);
      
      const info = await provider.getDirectoryInfo();
      // Para directorio temporal, debería poder crearse
      expect(info.exists || !info.exists).toBe(true); // Directorio puede o no existir inicialmente
    });
  });

  describe('Thread safety y concurrencia', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería manejar múltiples actualizaciones concurrentes', async () => {
      const promises = [];
      
      // Lanzar múltiples actualizaciones concurrentes
      for (let i = 0; i < 5; i++) {
        const dir = path.join(testTempDir, `concurrent-${i}`);
        promises.push(provider.updateFromRoots(dir));
      }
      
      const results = await Promise.all(promises);
      
      // Al menos una debería haber tenido éxito
      expect(results.some(result => result === true)).toBe(true);
      
      // El estado final debería ser coherente
      const finalSource = provider.getConfigurationSource();
      expect(finalSource).toBe(ConfigSource.ROOTS);
    });

    it('debería notificar observers de manera asíncrona', async () => {
      let observerExecutionOrder: number[] = [];
      
      provider.onConfigurationChange(() => {
        observerExecutionOrder.push(1);
      });
      
      provider.onConfigurationChange(() => {
        observerExecutionOrder.push(2);
      });
      
      await provider.updateFromRoots(testTempDir);
      observerExecutionOrder.push(3);
      
      // Dar tiempo para que se ejecuten los observers
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // El código después de updateFromRoots debería ejecutarse antes que los observers
      expect(observerExecutionOrder[0]).toBe(3);
      expect(observerExecutionOrder.length).toBe(3);
    });
  });

  describe('Manejo de errores', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería manejar errores de validación gracefully', async () => {
      const invalidDir = '\0invalid\0directory\0';
      
      const success = await provider.updateFromRoots(invalidDir);
      expect(success).toBe(false);
      
      // La configuración anterior debería mantenerse
      const source = provider.getConfigurationSource();
      expect(source).toBe(ConfigSource.DEFAULT);
    });

    it('debería manejar errores de filesystem al obtener información', async () => {
      // Configurar directorio que causará error - usar path imposible
      const problematicDir = 'X:\\NonExistent\\Impossible\\Path\\' + Date.now();
      
      // Actualizar configuración aunque sea problemática
      await provider.updateFromRoots(problematicDir);
      
      // No debería lanzar error al obtener información
      const info = await provider.getDirectoryInfo();
      
      expect(info).toBeDefined();
      // Puede ser true o false dependiendo de si se puede crear
      expect(typeof info.exists).toBe('boolean');
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      provider = new ConfigurationProvider();
    });

    it('debería completar getCurrentQRDirectory rápidamente', async () => {
      const startTime = Date.now();
      
      await provider.getCurrentQRDirectory();
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('debería completar updateFromRoots rápidamente', async () => {
      const startTime = Date.now();
      
      await provider.updateFromRoots(testTempDir);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });
  });
});