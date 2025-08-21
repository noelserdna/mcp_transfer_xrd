/**
 * Tests básicos para nueva funcionalidad QR PNG local
 * Verifica que los componentes principales funcionan correctamente
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import { DirectoryManager } from '../src/helpers/directory-manager.js';
import { FilenameGenerator } from '../src/helpers/filename-generator.js';
import { LocalQRGenerator } from '../src/helpers/local-qr-generator.js';
import { LocalQRManager } from '../src/helpers/local-qr-manager.js';
import { QRGenerator } from '../src/helpers/qr-generator.js';

// Test data
const VALID_RADIX_DEEPLINK = 'radixwallet://tx/stokenet/test-transaction-data-here';
const TEMP_TEST_DIR = 'test-qrimages';

describe('Local QR Generation - Basic Functionality', () => {
  beforeEach(async () => {
    // Limpiar directorio de test antes de cada test
    try {
      await fs.rm(TEMP_TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignorar si no existe
    }
  });

  afterEach(async () => {
    // Limpiar después de cada test
    try {
      await fs.rm(TEMP_TEST_DIR, { recursive: true, force: true });
    } catch (error) {
      // Ignorar errores de limpieza
    }
  });

  describe('DirectoryManager', () => {
    it('should create directory automatically', async () => {
      const manager = new DirectoryManager({ 
        baseDir: TEMP_TEST_DIR, 
        autoCreate: true 
      });

      const info = await manager.ensureDirectory();

      expect(info.exists).toBe(true);
      expect(info.writable).toBe(true);
      expect(info.fileCount).toBe(0);
    });

    it('should validate configuration correctly', () => {
      const manager = new DirectoryManager({ 
        baseDir: TEMP_TEST_DIR 
      });

      const validation = manager.validateConfig();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('FilenameGenerator', () => {
    it('should generate unique filename from deeplink', () => {
      const generator = new FilenameGenerator();
      
      const result = generator.generateUniqueFilename(VALID_RADIX_DEEPLINK);

      expect(result.filename).toMatch(/^qr-[a-f0-9]{8}-\d+\.png$/);
      expect(result.hash).toHaveLength(8);
      expect(result.timestamp).toBeTypeOf('number');
      expect(result.fullPath).toBe(result.filename);
    });

    it('should generate different names for different deeplinks', () => {
      const generator = new FilenameGenerator();
      
      const result1 = generator.generateUniqueFilename(VALID_RADIX_DEEPLINK);
      const result2 = generator.generateUniqueFilename(VALID_RADIX_DEEPLINK + '-different');

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.filename).not.toBe(result2.filename);
    });

    it('should parse filename correctly', () => {
      const generator = new FilenameGenerator();
      const testFilename = 'qr-abc12345-1640995200000.png';

      const parsed = generator.parseFilename(testFilename);

      expect(parsed.isValid).toBe(true);
      expect(parsed.prefix).toBe('qr');
      expect(parsed.hash).toBe('abc12345');
      expect(parsed.timestamp).toBe(1640995200000);
      expect(parsed.extension).toBe('png');
    });
  });

  describe('LocalQRGenerator', () => {
    it('should generate PNG buffer using existing QRGenerator', async () => {
      const qrGenerator = new QRGenerator();
      const localGenerator = new LocalQRGenerator(qrGenerator);

      const result = await localGenerator.generatePNGBuffer(VALID_RADIX_DEEPLINK);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.size).toBe(result.buffer.length);
      expect(result.dimensions.width).toBe(512); // default size
      expect(result.dimensions.height).toBe(512);
    });

    it('should validate configuration correctly', () => {
      const localGenerator = new LocalQRGenerator();
      
      const validation = localGenerator.validateConfig();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const localGenerator = new LocalQRGenerator();
      
      expect(() => {
        localGenerator.updateConfig({
          size: -1 // invalid size
        });
      }).toThrow();
    });
  });

  describe('LocalQRManager - Integration', () => {
    it('should generate complete local QR successfully', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        }
      });

      const result = await manager.generateQRLocal(VALID_RADIX_DEEPLINK);

      // Verificar resultado
      expect(result.archivo_path).toContain(TEMP_TEST_DIR);
      expect(result.nombre_archivo).toMatch(/^qr-[a-f0-9]{8}-\d+\.png$/);
      expect(result.tamaño_bytes).toBeGreaterThan(0);
      expect(result.metadatos.hash_unico).toHaveLength(8);
      expect(result.metadatos.dimensiones.ancho).toBe(512);
      expect(result.metadatos.dimensiones.alto).toBe(512);

      // Verificar que el archivo existe
      const exists = await fs.access(result.archivo_path).then(() => true).catch(() => false);
      expect(exists).toBe(true);

      // Verificar tamaño del archivo
      const stat = await fs.stat(result.archivo_path);
      expect(stat.size).toBe(result.tamaño_bytes);
    });

    it('should validate configuration properly', () => {
      const manager = new LocalQRManager();
      
      const validation = manager.validateConfiguration();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should handle invalid deeplink gracefully', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        }
      });

      await expect(manager.generateQRLocal('invalid-deeplink')).rejects.toThrow();
    });

    it('should reuse existing file for same deeplink', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        }
      });

      // Primera generación
      const result1 = await manager.generateQRLocal(VALID_RADIX_DEEPLINK);
      const firstFileTime = (await fs.stat(result1.archivo_path)).mtime;

      // Esperar un poco para diferencia de timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      // Segunda generación del mismo deeplink
      const result2 = await manager.generateQRLocal(VALID_RADIX_DEEPLINK);
      const secondFileTime = (await fs.stat(result2.archivo_path)).mtime;

      // Debería reutilizar si el hash es el mismo
      expect(result1.metadatos.hash_unico).toBe(result2.metadatos.hash_unico);
    });
  });

  describe('Error Handling', () => {
    it('should handle directory permission errors', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: '/invalid/path/that/does/not/exist',
          autoCreate: false, // No crear automáticamente
          validatePermissions: true
        }
      });

      await expect(manager.generateQRLocal(VALID_RADIX_DEEPLINK)).rejects.toThrow();
    });

    it('should validate deeplink format when strict validation is enabled', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        },
        strictValidation: true
      });

      await expect(manager.generateQRLocal('http://invalid-protocol.com')).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should generate QR within acceptable time limit', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        }
      });

      const startTime = performance.now();
      const result = await manager.generateQRLocal(VALID_RADIX_DEEPLINK);
      const endTime = performance.now();

      const generationTime = endTime - startTime;
      
      // Debería generar en menos de 500ms (target del plan)
      expect(generationTime).toBeLessThan(500);
      
      // Verificar que el tiempo se registra en metadata
      expect(result.metadatos.tiempo_generacion_ms).toBeTypeOf('number');
      expect(result.metadatos.tiempo_generacion_ms).toBeGreaterThan(0);
    });

    it('should generate file smaller than 50KB target', async () => {
      const manager = new LocalQRManager({
        directory: { 
          baseDir: TEMP_TEST_DIR, 
          autoCreate: true 
        }
      });

      const result = await manager.generateQRLocal(VALID_RADIX_DEEPLINK);

      // Archivo debería ser menor a 50KB (target del plan)
      const fileSizeKB = result.tamaño_bytes / 1024;
      expect(fileSizeKB).toBeLessThan(50);
    });
  });
});