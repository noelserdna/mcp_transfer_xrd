/**
 * LocalQRGenerator - Generación de archivos PNG locales usando QRGenerator existente
 * Reutiliza QRGenerator sin modificaciones, agregando capacidad de archivo local
 */

import { promises as fs } from 'fs';
import { QRGenerator } from './qr-generator.js';
import { 
  LocalPNGConfig, 
  LocalPNGResult, 
  LocalQRError 
} from '../types/local-qr-types.js';
import { 
  QRConfig, 
  QR_CONFIG_DEFAULT, 
  QR_LOCAL_SIZE_DEFAULT 
} from '../types/qr-types.js';

export class LocalQRGenerator {
  private qrGenerator: QRGenerator;
  private config: LocalPNGConfig;

  constructor(
    qrGenerator?: QRGenerator,
    config?: Partial<LocalPNGConfig>
  ) {
    // Dependency injection para testing - usar instancia existente o crear nueva
    this.qrGenerator = qrGenerator || new QRGenerator();
    
    this.config = {
      size: QR_LOCAL_SIZE_DEFAULT,
      margin: QR_CONFIG_DEFAULT.margin,
      errorCorrectionLevel: 'H', // Alto nivel de corrección para escaneado móvil
      background: QR_CONFIG_DEFAULT.color.light,
      foreground: QR_CONFIG_DEFAULT.color.dark,
      ...config
    };
  }

  /**
   * Generar PNG buffer usando QRGenerator existente
   */
  async generatePNGBuffer(deeplink: string): Promise<LocalPNGResult> {
    const startTime = performance.now();
    
    try {
      // Usar QRGenerator existente para obtener PNG base64
      const base64PNG = await this.qrGenerator.generatePNG(deeplink, this.config.size);
      
      // Convertir base64 a Buffer
      const buffer = Buffer.from(base64PNG, 'base64');
      
      const generationTime = performance.now() - startTime;
      
      // Validar que el buffer sea válido
      if (buffer.length === 0) {
        throw new LocalQRError(
          'Buffer PNG generado está vacío',
          'GENERATION_ERROR',
          { deeplink, config: this.config }
        );
      }

      return {
        buffer,
        size: buffer.length,
        dimensions: {
          width: this.config.size,
          height: this.config.size
        },
        config: { ...this.config }
      };

    } catch (error) {
      const generationTime = performance.now() - startTime;
      
      if (error instanceof Error && error.message.includes('Deep link inválido')) {
        throw new LocalQRError(
          `Deep link inválido para generación local: ${error.message}`,
          'GENERATION_ERROR',
          { deeplink, generationTime }
        );
      }

      throw new LocalQRError(
        `Error generando PNG buffer: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'GENERATION_ERROR',
        { 
          originalError: error, 
          deeplink, 
          generationTime,
          config: this.config 
        }
      );
    }
  }

  /**
   * Generar y guardar archivo PNG local
   */
  async generatePNGFile(deeplink: string, outputPath: string): Promise<{
    filePath: string;
    fileSize: number;
    generationTime: number;
    result: LocalPNGResult;
  }> {
    const overallStartTime = performance.now();
    
    try {
      // Generar PNG buffer
      const result = await this.generatePNGBuffer(deeplink);
      const bufferTime = performance.now() - overallStartTime;
      
      // Escribir archivo al disco
      const writeStartTime = performance.now();
      await this.writePNGFile(outputPath, result.buffer);
      const writeTime = performance.now() - writeStartTime;
      
      const totalTime = performance.now() - overallStartTime;
      
      return {
        filePath: outputPath,
        fileSize: result.size,
        generationTime: totalTime,
        result
      };

    } catch (error) {
      if (error instanceof LocalQRError) {
        throw error;
      }

      throw new LocalQRError(
        `Error generando archivo PNG: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'FILE_ERROR',
        { 
          originalError: error, 
          deeplink, 
          outputPath,
          generationTime: performance.now() - overallStartTime
        }
      );
    }
  }

  /**
   * Escribir buffer PNG a archivo con validación
   */
  private async writePNGFile(filePath: string, buffer: Buffer): Promise<void> {
    try {
      // Verificar que el directorio padre existe
      const dirPath = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'));
      
      if (dirPath) {
        await fs.access(dirPath);
      }

      // Escribir archivo de forma atómica (escribir a temp, luego rename)
      const tempPath = `${filePath}.tmp`;
      
      await fs.writeFile(tempPath, buffer);
      await fs.rename(tempPath, filePath);

    } catch (error) {
      // Limpiar archivo temporal si existe
      try {
        await fs.unlink(`${filePath}.tmp`);
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }

      throw new LocalQRError(
        `Error escribiendo archivo PNG: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'FILE_ERROR',
        { originalError: error, filePath }
      );
    }
  }

  /**
   * Validar que un archivo PNG existente es válido
   */
  async validatePNGFile(filePath: string): Promise<{
    isValid: boolean;
    fileSize?: number;
    error?: string;
  }> {
    try {
      const stat = await fs.stat(filePath);
      
      if (!stat.isFile()) {
        return {
          isValid: false,
          error: 'La ruta no corresponde a un archivo'
        };
      }

      if (stat.size === 0) {
        return {
          isValid: false,
          fileSize: 0,
          error: 'El archivo está vacío'
        };
      }

      // Verificar signature PNG básica (primeros 8 bytes)
      const buffer = await fs.readFile(filePath);
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
        return {
          isValid: false,
          fileSize: stat.size,
          error: 'El archivo no tiene formato PNG válido'
        };
      }

      return {
        isValid: true,
        fileSize: stat.size
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): Readonly<LocalPNGConfig> {
    return { ...this.config };
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<LocalPNGConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new LocalQRError(
        `Configuración inválida: ${validation.errors.join(', ')}`,
        'GENERATION_ERROR',
        { errors: validation.errors }
      );
    }

    // Actualizar configuración del QRGenerator subyacente si es posible
    if (this.qrGenerator && 'config' in this.qrGenerator) {
      const qrConfig: QRConfig = {
        errorCorrectionLevel: this.config.errorCorrectionLevel,
        margin: this.config.margin,
        color: {
          dark: this.config.foreground,
          light: this.config.background
        }
      };
      
      // @ts-ignore - acceso privado necesario para actualizar configuración
      this.qrGenerator.config = qrConfig;
    }
  }

  /**
   * Validar configuración actual
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.size <= 0 || this.config.size > 4096) {
      errors.push('size debe estar entre 1 y 4096 píxeles');
    }

    if (this.config.margin < 0 || this.config.margin > 20) {
      errors.push('margin debe estar entre 0 y 20');
    }

    const validErrorLevels: Array<LocalPNGConfig['errorCorrectionLevel']> = ['L', 'M', 'Q', 'H'];
    if (!validErrorLevels.includes(this.config.errorCorrectionLevel)) {
      errors.push('errorCorrectionLevel debe ser L, M, Q o H');
    }

    // Validar formato de colores hex
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(this.config.background)) {
      errors.push('background debe ser un color hex válido (#RRGGBB)');
    }

    if (!hexPattern.test(this.config.foreground)) {
      errors.push('foreground debe ser un color hex válido (#RRGGBB)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcular tamaño estimado del archivo para una configuración
   */
  estimateFileSize(deeplink: string): number {
    // Estimación básica basada en tamaño y complejidad del QR
    const baseSize = Math.pow(this.config.size / 100, 2) * 1000; // Aproximación
    const complexityFactor = Math.min(deeplink.length / 100, 2); // Factor de complejidad
    
    return Math.round(baseSize * (1 + complexityFactor));
  }

  /**
   * Obtener métricas de performance para monitoreo
   */
  async benchmarkGeneration(deeplink: string, iterations: number = 5): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    averageSize: number;
    successRate: number;
  }> {
    const times: number[] = [];
    const sizes: number[] = [];
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      try {
        const startTime = performance.now();
        const result = await this.generatePNGBuffer(deeplink);
        const endTime = performance.now();
        
        times.push(endTime - startTime);
        sizes.push(result.size);
        successes++;
        
      } catch (error) {
        // Contar como fallo, continuar con siguiente iteración
        continue;
      }
    }

    return {
      averageTime: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      minTime: times.length > 0 ? Math.min(...times) : 0,
      maxTime: times.length > 0 ? Math.max(...times) : 0,
      averageSize: sizes.length > 0 ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
      successRate: successes / iterations
    };
  }
}