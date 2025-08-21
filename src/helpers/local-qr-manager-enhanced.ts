/**
 * LocalQRManagerEnhanced - Versión mejorada con dependency injection MCP Roots
 * Integra ConfigurationProvider para configuración dinámica de directorios
 */

import * as path from 'path';
import { DirectoryManager } from './directory-manager.js';
import { FilenameGenerator } from './filename-generator.js';
import { LocalQRGenerator } from './local-qr-generator.js';
import { QRGenerator } from './qr-generator.js';
import { IConfigurationProvider } from '../mcp-roots/interfaces/configuration-provider.interface.js';
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

export class LocalQRManagerEnhanced {
  private directoryManager!: DirectoryManager;
  private filenameGenerator!: FilenameGenerator;
  private localQRGenerator!: LocalQRGenerator;
  private config: LocalQRManagerConfig;
  private configurationProvider?: IConfigurationProvider;
  private configurationUnsubscribe?: () => void;

  constructor(
    config?: Partial<LocalQRManagerConfig>,
    configurationProvider?: IConfigurationProvider
  ) {
    // Configuración base
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

    // Configurar proveedor dinámico si está disponible
    this.configurationProvider = configurationProvider;
    
    // Subscribirse a cambios de configuración si el proveedor está disponible
    if (this.configurationProvider) {
      this.configurationUnsubscribe = this.configurationProvider.onConfigurationChanged(
        (newConfig) => this.handleConfigurationChange(newConfig.path)
      );
      
      // Usar directorio del proveedor si está disponible
      if (this.configurationProvider.isInitialized()) {
        try {
          this.config.directory.baseDir = this.configurationProvider.getQRDirectory();
        } catch {
          // Usar directorio por defecto si hay error
        }
      }
    }

    // Inicializar componentes
    this.initializeComponents();
  }

  private initializeComponents(): void {
    this.directoryManager = new DirectoryManager(this.config.directory);
    this.filenameGenerator = new FilenameGenerator(this.config.filename);
    this.localQRGenerator = new LocalQRGenerator(new QRGenerator(), this.config.png);
  }

  private handleConfigurationChange(newDirectoryPath: string): void {
    try {
      // Actualizar configuración de directorio
      this.config.directory.baseDir = newDirectoryPath;
      
      // Recrear DirectoryManager con nuevo directorio
      this.directoryManager = new DirectoryManager(this.config.directory);
      
      console.log(`LocalQRManager: Directorio actualizado a ${newDirectoryPath}`);
    } catch (error) {
      console.error('Error actualizando directorio en LocalQRManager:', error);
    }
  }

  /**
   * Obtener directorio actual (con soporte para configuración dinámica)
   */
  getCurrentDirectory(): string {
    if (this.configurationProvider?.isInitialized()) {
      try {
        return this.configurationProvider.getQRDirectory();
      } catch {
        // Fallback al directorio configurado estáticamente
      }
    }
    
    return this.config.directory.baseDir;
  }

  /**
   * Generar QR PNG local - método principal con configuración dinámica
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

      // Fase 2: Asegurar que usamos el directorio correcto
      const currentDir = this.getCurrentDirectory();
      
      // Actualizar configuración de directorio si cambió
      if (this.config.directory.baseDir !== currentDir) {
        this.config.directory.baseDir = currentDir;
        this.directoryManager = new DirectoryManager(this.config.directory);
      }

      // Fase 3: Preparación del directorio
      const directoryInfo = await this.directoryManager.ensureDirectory();
      
      if (!directoryInfo.exists || !directoryInfo.writable) {
        throw new LocalQRError(
          `Directorio no disponible para escritura: ${directoryInfo.path}`,
          'DIRECTORY_ERROR',
          { directoryInfo, currentDir }
        );
      }

      // Fase 4: Generación de nombre único
      const filenameResult = this.filenameGenerator.generateUniqueFilename(
        validatedParams.deeplink,
        directoryInfo.path
      );

      // Fase 5: Verificar si ya existe archivo con el mismo hash
      if (await this.checkExistingFile(filenameResult.fullPath, validatedParams.deeplink)) {
        const existingResult = await this.loadExistingFile(filenameResult.fullPath, validatedParams);
        if (existingResult) {
          metrics.success = true;
          metrics.generationTime = performance.now() - startTime;
          return existingResult;
        }
      }

      // Fase 6: Generación del archivo PNG
      const fileWriteStart = performance.now();
      const generationResult = await this.localQRGenerator.generatePNGFile(
        validatedParams.deeplink,
        filenameResult.fullPath
      );
      metrics.fileWriteTime = performance.now() - fileWriteStart;

      // Fase 7: Validación del archivo generado
      const validation = await this.localQRGenerator.validatePNGFile(generationResult.filePath);
      if (!validation.isValid) {
        throw new LocalQRError(
          `Archivo PNG generado no es válido: ${validation.error}`,
          'FILE_ERROR',
          { validation, filePath: generationResult.filePath }
        );
      }

      // Fase 8: Construcción del resultado final
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

      // Fase 9: Limpieza automática si está habilitada
      if (this.config.directory.cleanup?.enabled) {
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
        { originalError: error, params, metrics, currentDirectory: this.getCurrentDirectory() }
      );

      metrics.errors?.push(localError.message);
      throw localError;
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
      tiempo_generacion_ms: Math.round(performance.now() - startTime),
      // Incluir información de configuración
      fuente_directorio: this.configurationProvider?.getConfigurationSource() || 'STATIC'
    };

    return {
      archivo_path: result.filePath,
      nombre_archivo: result.filename,
      tamaño_bytes: result.fileSize,
      metadatos: metadata
    };
  }

  /**
   * Validar y normalizar parámetros (método heredado con pequeños ajustes)
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
      size: params.size || this.config.png.size,
      quality: params.quality || 'high',
      preserveAspect: params.preserveAspect ?? true,
      outputDir: params.outputDir || this.getCurrentDirectory()
    };
  }

  // Métodos privados heredados del LocalQRManager original
  private async checkExistingFile(filePath: string, deeplink: string): Promise<boolean> {
    try {
      const filename = path.basename(filePath);
      return this.filenameGenerator.wouldGenerateSameHash(deeplink, filename);
    } catch (error) {
      return false;
    }
  }

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
        timestamp: Date.now(),
        dimensions: {
          width: params.size,
          height: params.size
        }
      };
    } catch (error) {
      return null;
    }
  }

  private estimateMemoryUsage(bufferSize: number): number {
    return bufferSize * 1.5;
  }

  private async performBackgroundCleanup(): Promise<void> {
    try {
      await this.directoryManager.cleanupOldFiles();
    } catch (error) {
      console.warn('Error durante limpieza automática:', error);
    }
  }

  /**
   * Métodos públicos para compatibilidad con la API existente
   */
  async getDirectoryStats() {
    return await this.directoryManager.getStats();
  }

  async cleanupFiles() {
    return await this.directoryManager.cleanupOldFiles();
  }

  validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const dirValidation = this.directoryManager.validateConfig();
    if (!dirValidation.valid) {
      errors.push(...dirValidation.errors.map(e => `Directory: ${e}`));
    }

    const filenameValidation = this.filenameGenerator.validateConfig();
    if (!filenameValidation.valid) {
      errors.push(...filenameValidation.errors.map(e => `Filename: ${e}`));
    }

    const qrValidation = this.localQRGenerator.validateConfig();
    if (!qrValidation.valid) {
      errors.push(...qrValidation.errors.map(e => `QR: ${e}`));
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfiguration(): Readonly<LocalQRManagerConfig> {
    return JSON.parse(JSON.stringify(this.config));
  }

  updateConfiguration(newConfig: Partial<LocalQRManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.directory) {
      this.directoryManager = new DirectoryManager(this.config.directory);
    }

    if (newConfig.filename) {
      this.filenameGenerator = new FilenameGenerator(this.config.filename);
    }

    if (newConfig.png) {
      this.localQRGenerator.updateConfig(this.config.png);
    }

    const validation = this.validateConfiguration();
    if (!validation.valid) {
      throw new LocalQRError(
        `Configuración inválida: ${validation.errors.join(', ')}`,
        'GENERATION_ERROR',
        { errors: validation.errors }
      );
    }
  }

  /**
   * Información de configuración MCP Roots
   */
  getMCPRootsInfo(): {
    hasProvider: boolean;
    currentSource?: string;
    currentDirectory: string;
  } {
    return {
      hasProvider: !!this.configurationProvider,
      currentSource: this.configurationProvider?.getConfigurationSource(),
      currentDirectory: this.getCurrentDirectory()
    };
  }

  /**
   * Limpiar recursos
   */
  shutdown(): void {
    if (this.configurationUnsubscribe) {
      this.configurationUnsubscribe();
      this.configurationUnsubscribe = undefined;
    }
  }
}