/**
 * DirectoryManagerEnhanced - Versión mejorada con validaciones MCP Roots
 * Incluye validaciones de seguridad específicas para paths desde protocolo MCP
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { DirectoryConfig, DirectoryInfo, LocalQRError } from '../types/local-qr-types.js';
import { ISecurityValidator } from '../mcp-roots/interfaces/security-validator.interface.js';
import { QR_LOCAL_DIR_DEFAULT } from '../types/qr-types.js';

export interface DirectoryValidationResult {
  isValid: boolean;
  path: string;
  errors: string[];
  securityIssues: string[];
  canCreate: boolean;
  hasWritePermission: boolean;
}

export class DirectoryManagerEnhanced {
  private config: DirectoryConfig;
  private securityValidator?: ISecurityValidator;

  constructor(
    config?: Partial<DirectoryConfig>, 
    securityValidator?: ISecurityValidator
  ) {
    this.config = {
      baseDir: QR_LOCAL_DIR_DEFAULT,
      autoCreate: true,
      validatePermissions: true,
      cleanup: {
        enabled: true,
        maxAge: 7,
        maxSize: 100
      },
      ...config
    };

    this.securityValidator = securityValidator;
  }

  /**
   * Validar directorio para uso con MCP Roots
   * Aplica todas las validaciones de seguridad
   */
  async validateDirectoryForRoots(directoryPath: string): Promise<DirectoryValidationResult> {
    const result: DirectoryValidationResult = {
      isValid: false,
      path: directoryPath,
      errors: [],
      securityIssues: [],
      canCreate: false,
      hasWritePermission: false
    };

    try {
      // 1. Validación de seguridad si está disponible
      if (this.securityValidator) {
        const securityResult = await this.securityValidator.validateDirectoryPath(directoryPath);
        
        if (!securityResult.isSecure) {
          result.securityIssues = securityResult.violations.map(v => v.description);
          return result;
        }
        
        // Usar path sanitizado
        result.path = securityResult.sanitizedPath;
      }

      // 2. Validación básica de path
      const pathValidation = this.validatePathBasics(result.path);
      if (!pathValidation.valid) {
        result.errors.push(...pathValidation.errors);
        return result;
      }

      // 3. Verificar si el directorio existe
      const directoryInfo = await this.getDirectoryInfo(result.path);
      result.hasWritePermission = directoryInfo.writable;

      if (!directoryInfo.exists) {
        // Verificar si se puede crear
        result.canCreate = await this.canCreateDirectorySafely(result.path);
        
        if (!result.canCreate && !this.config.autoCreate) {
          result.errors.push(`El directorio no existe y autoCreate está deshabilitado`);
          return result;
        }

        if (!result.canCreate && this.config.autoCreate) {
          result.errors.push(`No se puede crear el directorio en la ubicación especificada`);
          return result;
        }
      }

      // 4. Validar permisos si existe
      if (directoryInfo.exists && !result.hasWritePermission && this.config.validatePermissions) {
        result.errors.push(`No hay permisos de escritura en el directorio`);
        return result;
      }

      // 5. Todas las validaciones pasaron
      result.isValid = true;
      return result;

    } catch (error) {
      result.errors.push(`Error durante validación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return result;
    }
  }

  /**
   * Asegurar directorio con verificación de seguridad
   */
  async ensureDirectoryWithSecurityCheck(): Promise<DirectoryInfo> {
    const directoryPath = path.resolve(this.config.baseDir);

    // Aplicar validación de seguridad para roots si está disponible
    if (this.securityValidator) {
      const validation = await this.validateDirectoryForRoots(directoryPath);
      
      if (!validation.isValid) {
        const allErrors = [...validation.errors, ...validation.securityIssues];
        throw new LocalQRError(
          `Directorio no válido para MCP Roots: ${allErrors.join(', ')}`,
          'DIRECTORY_ERROR',
          { 
            path: directoryPath, 
            errors: validation.errors,
            securityIssues: validation.securityIssues
          }
        );
      }

      // Usar path validado por seguridad
      this.config.baseDir = validation.path;
    }

    // Proceder con creación estándar
    return await this.ensureDirectory();
  }

  /**
   * Asegurar directorio (método original)
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
   * Validaciones básicas de path
   */
  private validatePathBasics(directoryPath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!directoryPath || directoryPath.trim() === '') {
      errors.push('Path del directorio no puede estar vacío');
    }

    if (directoryPath.length > 260) { // MAX_PATH Windows
      errors.push('Path del directorio excede la longitud máxima permitida');
    }

    // Caracteres inválidos básicos
    const invalidChars = /[<>"|?*\0]/;
    if (invalidChars.test(directoryPath)) {
      errors.push('Path contiene caracteres inválidos');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Verificar si se puede crear directorio de forma segura
   */
  private async canCreateDirectorySafely(directoryPath: string): Promise<boolean> {
    try {
      const parentDir = path.dirname(directoryPath);
      
      // Verificar que el directorio padre existe
      const parentStat = await fs.stat(parentDir);
      if (!parentStat.isDirectory()) {
        return false;
      }

      // Verificar permisos de escritura en directorio padre
      return await this.checkWritePermissions(parentDir);
    } catch {
      return false;
    }
  }

  /**
   * Métodos heredados del DirectoryManager original
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
        writable = await this.checkWritePermissions(directoryPath);
        
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
            console.warn(`No se pudo leer el archivo ${file}:`, error);
          }
        }
      }
    } catch (error) {
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

      if (this.config.cleanup.maxSize) {
        const updatedInfo = await this.getDirectoryInfo(directoryPath);
        const maxSizeBytes = this.config.cleanup.maxSize * 1024 * 1024;
        
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

  private async cleanupBySize(
    directoryPath: string, 
    maxSizeBytes: number
  ): Promise<{ removedFiles: number; freedBytes: number }> {
    const files = await fs.readdir(directoryPath);
    const qrFiles = files.filter(file => 
      file.startsWith('qr-') && file.endsWith('.png')
    );

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
        continue;
      }
    }

    filesWithStats.sort((a, b) => a.mtime - b.mtime);

    let currentSize = filesWithStats.reduce((sum, file) => sum + file.size, 0);
    let removedFiles = 0;
    let freedBytes = 0;

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

  async getStats(): Promise<DirectoryInfo> {
    const directoryPath = path.resolve(this.config.baseDir);
    return await this.getDirectoryInfo(directoryPath);
  }

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

  /**
   * Actualizar SecurityValidator
   */
  setSecurityValidator(validator: ISecurityValidator): void {
    this.securityValidator = validator;
  }

  /**
   * Verificar si tiene validación de seguridad habilitada
   */
  hasSecurityValidation(): boolean {
    return !!this.securityValidator;
  }
}