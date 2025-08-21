/**
 * DirectoryManager - Gestión segura del directorio qrimages/
 * Manejo de permisos, creación automática, y limpieza de archivos
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { DirectoryConfig, DirectoryInfo, LocalQRError } from '../types/local-qr-types.js';
import { QR_LOCAL_DIR_DEFAULT } from '../types/qr-types.js';

export class DirectoryManager {
  private config: DirectoryConfig;

  constructor(config?: Partial<DirectoryConfig>) {
    this.config = {
      baseDir: QR_LOCAL_DIR_DEFAULT,
      autoCreate: true,
      validatePermissions: true,
      cleanup: {
        enabled: true,
        maxAge: 7, // 7 días por defecto
        maxSize: 100 // 100 MB por defecto
      },
      ...config
    };
  }

  /**
   * Asegurar que el directorio existe y tiene los permisos correctos
   */
  async ensureDirectory(): Promise<DirectoryInfo> {
    const absolutePath = path.resolve(this.config.baseDir);
    
    try {
      const info = await this.getDirectoryInfo(absolutePath);
      
      if (!info.exists && this.config.autoCreate) {
        await this.createDirectory(absolutePath);
        return await this.getDirectoryInfo(absolutePath);
      }
      
      if (!info.exists && !this.config.autoCreate) {
        throw new LocalQRError(
          `El directorio ${absolutePath} no existe y autoCreate está deshabilitado`,
          'DIRECTORY_ERROR',
          { path: absolutePath }
        );
      }
      
      if (!info.writable && this.config.validatePermissions) {
        throw new LocalQRError(
          `No hay permisos de escritura en el directorio ${absolutePath}`,
          'PERMISSION_ERROR',
          { path: absolutePath }
        );
      }
      
      return info;
    } catch (error) {
      if (error instanceof LocalQRError) {
        throw error;
      }
      
      throw new LocalQRError(
        `Error al gestionar el directorio: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'DIRECTORY_ERROR',
        { originalError: error, path: absolutePath }
      );
    }
  }

  /**
   * Obtener información detallada del directorio
   */
  private async getDirectoryInfo(directoryPath: string): Promise<DirectoryInfo> {
    let exists = false;
    let writable = false;
    let fileCount = 0;
    let totalSize = 0;

    try {
      const stat = await fs.stat(directoryPath);
      exists = stat.isDirectory();
      
      if (exists) {
        // Verificar permisos de escritura intentando crear un archivo temporal
        writable = await this.checkWritePermissions(directoryPath);
        
        // Contar archivos QR y calcular tamaño total
        const files = await fs.readdir(directoryPath);
        const qrFiles = files.filter(file => 
          file.startsWith('qr-') && file.endsWith('.png')
        );
        
        fileCount = qrFiles.length;
        
        for (const file of qrFiles) {
          try {
            const filePath = path.join(directoryPath, file);
            const fileStat = await fs.stat(filePath);
            totalSize += fileStat.size;
          } catch (error) {
            // Ignorar archivos que no se pueden leer
            console.warn(`No se pudo leer el archivo ${file}:`, error);
          }
        }
      }
    } catch (error) {
      // El directorio no existe o no es accesible
      exists = false;
    }

    return {
      path: directoryPath,
      exists,
      writable,
      fileCount,
      totalSize
    };
  }

  /**
   * Crear directorio con manejo de errores
   */
  private async createDirectory(directoryPath: string): Promise<void> {
    try {
      await fs.mkdir(directoryPath, { recursive: true });
    } catch (error) {
      throw new LocalQRError(
        `No se pudo crear el directorio ${directoryPath}`,
        'DIRECTORY_ERROR',
        { originalError: error, path: directoryPath }
      );
    }
  }

  /**
   * Verificar permisos de escritura creando un archivo temporal
   */
  private async checkWritePermissions(directoryPath: string): Promise<boolean> {
    const testFile = path.join(directoryPath, '.write-test-' + Date.now());
    
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Limpiar archivos antiguos basado en configuración
   */
  async cleanupOldFiles(): Promise<{ removedFiles: number; freedBytes: number }> {
    if (!this.config.cleanup?.enabled) {
      return { removedFiles: 0, freedBytes: 0 };
    }

    const directoryPath = path.resolve(this.config.baseDir);
    const info = await this.getDirectoryInfo(directoryPath);
    
    if (!info.exists) {
      return { removedFiles: 0, freedBytes: 0 };
    }

    let removedFiles = 0;
    let freedBytes = 0;
    const maxAgeMs = (this.config.cleanup.maxAge || 7) * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    try {
      const files = await fs.readdir(directoryPath);
      const qrFiles = files.filter(file => 
        file.startsWith('qr-') && file.endsWith('.png')
      );

      for (const file of qrFiles) {
        const filePath = path.join(directoryPath, file);
        
        try {
          const stat = await fs.stat(filePath);
          
          if (stat.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            removedFiles++;
            freedBytes += stat.size;
          }
        } catch (error) {
          console.warn(`Error al procesar archivo ${file} durante limpieza:`, error);
        }
      }

      // Verificar si se excede el tamaño máximo después de limpieza por edad
      if (this.config.cleanup.maxSize) {
        const updatedInfo = await this.getDirectoryInfo(directoryPath);
        const maxSizeBytes = this.config.cleanup.maxSize * 1024 * 1024; // MB a bytes
        
        if (updatedInfo.totalSize > maxSizeBytes) {
          const additionalCleanup = await this.cleanupBySize(directoryPath, maxSizeBytes);
          removedFiles += additionalCleanup.removedFiles;
          freedBytes += additionalCleanup.freedBytes;
        }
      }

    } catch (error) {
      throw new LocalQRError(
        `Error durante limpieza de archivos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        'FILE_ERROR',
        { originalError: error, path: directoryPath }
      );
    }

    return { removedFiles, freedBytes };
  }

  /**
   * Limpiar archivos por tamaño (eliminar los más antiguos primero)
   */
  private async cleanupBySize(
    directoryPath: string, 
    maxSizeBytes: number
  ): Promise<{ removedFiles: number; freedBytes: number }> {
    const files = await fs.readdir(directoryPath);
    const qrFiles = files.filter(file => 
      file.startsWith('qr-') && file.endsWith('.png')
    );

    // Obtener información de archivos con timestamps
    const filesWithStats: Array<{
      name: string;
      path: string;
      size: number;
      mtime: number;
    }> = [];

    for (const file of qrFiles) {
      const filePath = path.join(directoryPath, file);
      try {
        const stat = await fs.stat(filePath);
        filesWithStats.push({
          name: file,
          path: filePath,
          size: stat.size,
          mtime: stat.mtime.getTime()
        });
      } catch (error) {
        // Ignorar archivos que no se pueden leer
        continue;
      }
    }

    // Ordenar por fecha (más antiguos primero)
    filesWithStats.sort((a, b) => a.mtime - b.mtime);

    let currentSize = filesWithStats.reduce((sum, file) => sum + file.size, 0);
    let removedFiles = 0;
    let freedBytes = 0;

    // Eliminar archivos más antiguos hasta llegar al tamaño objetivo
    for (const file of filesWithStats) {
      if (currentSize <= maxSizeBytes) {
        break;
      }

      try {
        await fs.unlink(file.path);
        currentSize -= file.size;
        freedBytes += file.size;
        removedFiles++;
      } catch (error) {
        console.warn(`Error al eliminar archivo ${file.name} durante limpieza por tamaño:`, error);
      }
    }

    return { removedFiles, freedBytes };
  }

  /**
   * Obtener estadísticas actuales del directorio
   */
  async getStats(): Promise<DirectoryInfo> {
    const directoryPath = path.resolve(this.config.baseDir);
    return await this.getDirectoryInfo(directoryPath);
  }

  /**
   * Validar configuración del directorio
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.baseDir || this.config.baseDir.trim() === '') {
      errors.push('baseDir no puede estar vacío');
    }

    if (this.config.cleanup?.enabled) {
      if (this.config.cleanup.maxAge <= 0) {
        errors.push('cleanup.maxAge debe ser mayor a 0');
      }
      
      if (this.config.cleanup.maxSize && this.config.cleanup.maxSize <= 0) {
        errors.push('cleanup.maxSize debe ser mayor a 0');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}