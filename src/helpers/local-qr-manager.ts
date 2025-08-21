/**
 * LocalQRManager - Orchestrador principal para generación QR PNG local
 * Coordina DirectoryManager, FilenameGenerator y LocalQRGenerator
 */

import * as path from 'path';
import { DirectoryManager } from './directory-manager.js';
import { FilenameGenerator } from './filename-generator.js';
import { LocalQRGenerator } from './local-qr-generator.js';
import { QRGenerator } from './qr-generator.js';
import {
  LocalQRManagerConfig,
  LocalQRGenerationParams,
  LocalQRGenerationResult,
  LocalQRMetrics,
  LocalQRError
} from '../types/local-qr-types.js';
import {
  QRLocalGenerationResult,
  QRLocalMetadata,
  QR_LOCAL_SIZE_DEFAULT,
  QR_LOCAL_DIR_DEFAULT
} from '../types/qr-types.js';

export class LocalQRManager {
  private directoryManager: DirectoryManager;
  private filenameGenerator: FilenameGenerator;
  private localQRGenerator: LocalQRGenerator;
  private config: LocalQRManagerConfig;

  constructor(config?: Partial<LocalQRManagerConfig>) {
    // Configuración por defecto
    this.config = {
      directory: {
        baseDir: QR_LOCAL_DIR_DEFAULT,
        autoCreate: true,
        validatePermissions: true,
        cleanup: {
          enabled: true,
          maxAge: 7,
          maxSize: 100
        }
      },
      filename: {
        prefix: 'qr',
        hashLength: 8,
        includeTimestamp: true,
        extension: 'png'
      },
      png: {
        size: QR_LOCAL_SIZE_DEFAULT,
        margin: 4,
        errorCorrectionLevel: 'H',
        background: '#FFFFFF',
        foreground: '#000000'
      },
      strictValidation: true,
      ...config
    };

    // Inicializar componentes con dependency injection
    this.directoryManager = new DirectoryManager(this.config.directory);
    this.filenameGenerator = new FilenameGenerator(this.config.filename);
    this.localQRGenerator = new LocalQRGenerator(new QRGenerator(), this.config.png);
  }

  /**
   * Generar QR PNG local - método principal
   */
  async generateLocalQR(params: LocalQRGenerationParams): Promise<LocalQRGenerationResult> {
    const startTime = performance.now();
    const metrics: Partial<LocalQRMetrics> = {
      generationTime: 0,
      validationTime: 0,
      fileWriteTime: 0,
      memoryUsage: 0,
      success: false,
      errors: []
    };

    try {
      // Fase 1: Validación de entrada
      const validationStart = performance.now();
      const validatedParams = await this.validateAndNormalizeParams(params);
      metrics.validationTime = performance.now() - validationStart;

      // Fase 2: Preparación del directorio
      const directoryInfo = await this.directoryManager.ensureDirectory();
      
      if (!directoryInfo.exists || !directoryInfo.writable) {
        throw new LocalQRError(
          'Directorio no disponible para escritura',
          'DIRECTORY_ERROR',
          { directoryInfo }
        );
      }

      // Fase 3: Generación de nombre único
      const filenameResult = this.filenameGenerator.generateUniqueFilename(
        validatedParams.deeplink,
        directoryInfo.path
      );

      // Fase 4: Verificar si ya existe archivo con el mismo hash
      if (await this.checkExistingFile(filenameResult.fullPath, validatedParams.deeplink)) {
        // Si ya existe un archivo para este deeplink, podemos reutilizarlo
        const existingResult = await this.loadExistingFile(filenameResult.fullPath, validatedParams);
        if (existingResult) {
          metrics.success = true;
          metrics.generationTime = performance.now() - startTime;
          return existingResult;
        }
      }

      // Fase 5: Generación del archivo PNG
      const fileWriteStart = performance.now();
      const generationResult = await this.localQRGenerator.generatePNGFile(
        validatedParams.deeplink,
        filenameResult.fullPath
      );
      metrics.fileWriteTime = performance.now() - fileWriteStart;

      // Fase 6: Validación del archivo generado
      const validation = await this.localQRGenerator.validatePNGFile(generationResult.filePath);
      if (!validation.isValid) {
        throw new LocalQRError(
          `Archivo PNG generado no es válido: ${validation.error}`,
          'FILE_ERROR',
          { validation, filePath: generationResult.filePath }
        );
      }

      // Fase 7: Construcción del resultado final
      const totalTime = performance.now() - startTime;
      metrics.generationTime = totalTime;
      metrics.success = true;
      metrics.memoryUsage = this.estimateMemoryUsage(generationResult.result.size);

      const result: LocalQRGenerationResult = {
        filePath: path.resolve(generationResult.filePath),
        filename: filenameResult.filename,
        fileSize: generationResult.fileSize,
        hash: filenameResult.hash,
        timestamp: filenameResult.timestamp,
        dimensions: generationResult.result.dimensions
      };

      // Fase 8: Limpieza automática si está habilitada
      if (this.config.directory.cleanup?.enabled) {
        // Ejecutar limpieza en background sin bloquear respuesta
        this.performBackgroundCleanup().catch(error => {
          console.warn('Error en limpieza automática:', error);
        });
      }

      return result;

    } catch (error) {
      metrics.success = false;
      metrics.generationTime = performance.now() - startTime;

      if (error instanceof LocalQRError) {
        metrics.errors?.push(error.message);
        throw error;
      }

      const localError = new LocalQRError(
        `Error en generación local de QR: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'GENERATION_ERROR',
        { originalError: error, params, metrics }
      );

      metrics.errors?.push(localError.message);
      throw localError;
    }
  }

  /**
   * Validar y normalizar parámetros de entrada
   */
  private async validateAndNormalizeParams(params: LocalQRGenerationParams): Promise<Required<LocalQRGenerationParams>> {
    if (!params.deeplink || typeof params.deeplink !== 'string') {
      throw new LocalQRError(
        'Deep link es requerido y debe ser string',
        'GENERATION_ERROR',
        { params }
      );
    }

    if (params.deeplink.trim().length === 0) {
      throw new LocalQRError(
        'Deep link no puede estar vacío',
        'GENERATION_ERROR',
        { params }
      );
    }

    // Validación estricta de deep link si está habilitada
    if (this.config.strictValidation) {
      const radixProtocols = [
        'radixwallet://',
        'https://wallet.radixdlt.com/',
        'https://radixwallet.com/'
      ];

      const isValidRadixLink = radixProtocols.some(protocol => 
        params.deeplink.toLowerCase().startsWith(protocol.toLowerCase())
      );

      if (!isValidRadixLink) {
        throw new LocalQRError(
          'Deep link debe ser un enlace válido de Radix Wallet',
          'GENERATION_ERROR',
          { params, validProtocols: radixProtocols }
        );
      }
    }

    return {
      deeplink: params.deeplink.trim(),
      size: params.size || QR_LOCAL_SIZE_DEFAULT,
      quality: params.quality || 'high',
      preserveAspect: params.preserveAspect ?? true,
      outputDir: params.outputDir || QR_LOCAL_DIR_DEFAULT
    };
  }

  /**
   * Verificar si ya existe un archivo para este deeplink
   */
  private async checkExistingFile(filePath: string, deeplink: string): Promise<boolean> {
    try {
      const filename = path.basename(filePath);
      return this.filenameGenerator.wouldGenerateSameHash(deeplink, filename);
    } catch (error) {
      return false;
    }
  }

  /**
   * Cargar archivo existente si es válido
   */
  private async loadExistingFile(
    filePath: string, 
    params: Required<LocalQRGenerationParams>
  ): Promise<LocalQRGenerationResult | null> {
    try {
      const validation = await this.localQRGenerator.validatePNGFile(filePath);
      
      if (!validation.isValid || !validation.fileSize) {
        return null;
      }

      const filenameResult = this.filenameGenerator.generateUniqueFilename(
        params.deeplink,
        path.dirname(filePath)
      );

      return {
        filePath: path.resolve(filePath),
        filename: path.basename(filePath),
        fileSize: validation.fileSize,
        hash: filenameResult.hash,
        timestamp: Date.now(), // Current timestamp para reutilización
        dimensions: {
          width: params.size,
          height: params.size
        }
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Estimar uso de memoria
   */
  private estimateMemoryUsage(bufferSize: number): number {
    // Estimación: buffer original + overhead de procesamiento
    return bufferSize * 1.5;
  }

  /**
   * Limpieza automática en background
   */
  private async performBackgroundCleanup(): Promise<void> {
    try {
      await this.directoryManager.cleanupOldFiles();
    } catch (error) {
      console.warn('Error durante limpieza automática:', error);
    }
  }

  /**
   * Convertir resultado interno a formato MCP compatible
   */
  async generateQRLocal(deeplink: string): Promise<QRLocalGenerationResult> {
    const startTime = performance.now();
    
    const params: LocalQRGenerationParams = {
      deeplink,
      size: this.config.png.size,
      quality: 'high'
    };

    const result = await this.generateLocalQR(params);

    const metadata: QRLocalMetadata = {
      url_original: deeplink,
      tamaño_png: this.config.png.size,
      formatos_generados: ['PNG'],
      timestamp: new Date().toISOString(),
      hash_unico: result.hash,
      directorio: path.dirname(result.filePath),
      dimensiones: {
        ancho: result.dimensions.width,
        alto: result.dimensions.height
      },
      tiempo_generacion_ms: Math.round(performance.now() - startTime)
    };

    return {
      archivo_path: result.filePath,
      nombre_archivo: result.filename,
      tamaño_bytes: result.fileSize,
      metadatos: metadata
    };
  }

  /**
   * Obtener estadísticas del directorio
   */
  async getDirectoryStats() {
    return await this.directoryManager.getStats();
  }

  /**
   * Ejecutar limpieza manual
   */
  async cleanupFiles() {
    return await this.directoryManager.cleanupOldFiles();
  }

  /**
   * Validar configuración completa
   */
  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar DirectoryManager
    const dirValidation = this.directoryManager.validateConfig();
    if (!dirValidation.valid) {
      errors.push(...dirValidation.errors.map(e => `Directory: ${e}`));
    }

    // Validar FilenameGenerator
    const filenameValidation = this.filenameGenerator.validateConfig();
    if (!filenameValidation.valid) {
      errors.push(...filenameValidation.errors.map(e => `Filename: ${e}`));
    }

    // Validar LocalQRGenerator
    const qrValidation = this.localQRGenerator.validateConfig();
    if (!qrValidation.valid) {
      errors.push(...qrValidation.errors.map(e => `QR: ${e}`));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtener configuración actual (solo lectura)
   */
  getConfiguration(): Readonly<LocalQRManagerConfig> {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Actualizar configuración
   */
  updateConfiguration(newConfig: Partial<LocalQRManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Actualizar configuraciones de componentes
    if (newConfig.directory) {
      this.directoryManager = new DirectoryManager(this.config.directory);
    }

    if (newConfig.filename) {
      this.filenameGenerator = new FilenameGenerator(this.config.filename);
    }

    if (newConfig.png) {
      this.localQRGenerator.updateConfig(this.config.png);
    }

    // Validar nueva configuración
    const validation = this.validateConfiguration();
    if (!validation.valid) {
      throw new LocalQRError(
        `Configuración inválida: ${validation.errors.join(', ')}`,
        'GENERATION_ERROR',
        { errors: validation.errors }
      );
    }
  }
}

// Instancia por defecto exportada
export const localQRManager = new LocalQRManager();