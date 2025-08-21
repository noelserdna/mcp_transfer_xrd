/**
 * FilenameGenerator - Generación de nombres únicos para archivos QR
 * Usa SHA-256 del deep link + timestamp para evitar colisiones
 */

import { createHash } from 'crypto';
import * as path from 'path';
import { FilenameConfig, FilenameResult, LocalQRError } from '../types/local-qr-types.js';

export class FilenameGenerator {
  private config: FilenameConfig;

  constructor(config?: Partial<FilenameConfig>) {
    this.config = {
      prefix: 'qr',
      hashLength: 8,
      includeTimestamp: true,
      extension: 'png',
      ...config
    };
  }

  /**
   * Generar nombre de archivo único basado en deep link
   */
  generateUniqueFilename(deeplink: string, outputDir?: string): FilenameResult {
    const validationResult = this.validateInput(deeplink);
    if (!validationResult.valid) {
      throw new LocalQRError(
        `Input inválido para generación de nombre: ${validationResult.errors.join(', ')}`,
        'GENERATION_ERROR',
        { deeplink, errors: validationResult.errors }
      );
    }

    const hash = this.generateHash(deeplink);
    const timestamp = Date.now();
    const filename = this.buildFilename(hash, timestamp);
    const fullPath = outputDir ? path.join(outputDir, filename) : filename;

    return {
      filename,
      hash,
      timestamp,
      fullPath
    };
  }

  /**
   * Generar hash SHA-256 del deep link
   */
  private generateHash(deeplink: string): string {
    try {
      const fullHash = createHash('sha256')
        .update(deeplink.trim())
        .digest('hex');
      
      return fullHash.substring(0, this.config.hashLength);
    } catch (error) {
      throw new LocalQRError(
        `Error al generar hash del deep link: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'GENERATION_ERROR',
        { originalError: error, deeplink }
      );
    }
  }

  /**
   * Construir nombre de archivo con formato configurable
   */
  private buildFilename(hash: string, timestamp: number): string {
    let filename = this.config.prefix;
    
    if (hash) {
      filename += `-${hash}`;
    }
    
    if (this.config.includeTimestamp) {
      filename += `-${timestamp}`;
    }
    
    if (this.config.extension) {
      filename += `.${this.config.extension}`;
    }
    
    return filename;
  }

  /**
   * Validar entrada para generación de nombre
   */
  private validateInput(deeplink: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!deeplink || typeof deeplink !== 'string') {
      errors.push('Deep link es requerido y debe ser string');
    } else {
      if (deeplink.trim().length === 0) {
        errors.push('Deep link no puede estar vacío');
      }
      
      if (deeplink.length > 2048) {
        errors.push('Deep link es demasiado largo (máximo 2048 caracteres)');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extraer información de un nombre de archivo QR existente
   */
  parseFilename(filename: string): {
    isValid: boolean;
    prefix?: string;
    hash?: string;
    timestamp?: number;
    extension?: string;
  } {
    // Patrón: prefix-hash-timestamp.extension
    const pattern = new RegExp(
      `^(${this.config.prefix})-(\\w{${this.config.hashLength}})-(\\d+)\\.(\\w+)$`
    );
    
    const match = filename.match(pattern);
    
    if (!match) {
      return { isValid: false };
    }

    const [, prefix, hash, timestampStr, extension] = match;
    const timestamp = parseInt(timestampStr, 10);

    return {
      isValid: true,
      prefix,
      hash,
      timestamp: isNaN(timestamp) ? undefined : timestamp,
      extension
    };
  }

  /**
   * Verificar si un deep link generaría el mismo hash que un archivo existente
   */
  wouldGenerateSameHash(deeplink: string, existingFilename: string): boolean {
    try {
      const parsedFilename = this.parseFilename(existingFilename);
      
      if (!parsedFilename.isValid || !parsedFilename.hash) {
        return false;
      }

      const newHash = this.generateHash(deeplink);
      return newHash === parsedFilename.hash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generar múltiples nombres alternativos si hay colisión
   */
  generateAlternativeFilenames(
    deeplink: string, 
    baseTimestamp?: number,
    count: number = 3
  ): FilenameResult[] {
    const results: FilenameResult[] = [];
    const hash = this.generateHash(deeplink);
    const startTime = baseTimestamp || Date.now();

    for (let i = 0; i < count; i++) {
      const timestamp = startTime + i;
      const filename = this.buildFilename(hash, timestamp);
      
      results.push({
        filename,
        hash,
        timestamp,
        fullPath: filename // Sin directorio específico
      });
    }

    return results;
  }

  /**
   * Validar configuración del generador
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.prefix || this.config.prefix.trim() === '') {
      errors.push('prefix no puede estar vacío');
    }

    if (this.config.prefix.includes('/') || this.config.prefix.includes('\\')) {
      errors.push('prefix no puede contener separadores de ruta');
    }

    if (this.config.hashLength < 4 || this.config.hashLength > 32) {
      errors.push('hashLength debe estar entre 4 y 32');
    }

    if (!this.config.extension || this.config.extension.trim() === '') {
      errors.push('extension no puede estar vacía');
    }

    if (this.config.extension.includes('.')) {
      errors.push('extension no debe incluir el punto');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generar estadísticas de hash para análisis de colisiones
   */
  analyzeHashDistribution(deeplinks: string[]): {
    totalHashes: number;
    uniqueHashes: number;
    collisionRate: number;
    collisions: Array<{ hash: string; deeplinks: string[] }>;
  } {
    const hashMap = new Map<string, string[]>();

    for (const deeplink of deeplinks) {
      try {
        const hash = this.generateHash(deeplink);
        
        if (!hashMap.has(hash)) {
          hashMap.set(hash, []);
        }
        
        hashMap.get(hash)!.push(deeplink);
      } catch (error) {
        // Ignorar deep links inválidos en el análisis
        continue;
      }
    }

    const totalHashes = deeplinks.length;
    const uniqueHashes = hashMap.size;
    const collisionRate = totalHashes > 0 ? (totalHashes - uniqueHashes) / totalHashes : 0;
    
    const collisions = Array.from(hashMap.entries())
      .filter(([, deeplinks]) => deeplinks.length > 1)
      .map(([hash, deeplinks]) => ({ hash, deeplinks }));

    return {
      totalHashes,
      uniqueHashes,
      collisionRate,
      collisions
    };
  }

  /**
   * Obtener configuración actual
   */
  getConfig(): Readonly<FilenameConfig> {
    return { ...this.config };
  }

  /**
   * Actualizar configuración
   */
  updateConfig(newConfig: Partial<FilenameConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new LocalQRError(
        `Configuración inválida: ${validation.errors.join(', ')}`,
        'GENERATION_ERROR',
        { errors: validation.errors }
      );
    }
  }
}