/**
 * ConfigurationProvider - Gestión de configuración con precedencia para MCP Roots
 * Precedencia: roots > env > command line > default
 */

import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import {
  IConfigurationProvider,
  IConfigurationObserver
} from '../interfaces/roots-interfaces.js';
import {
  ConfigurationStatus,
  ConfigurationChangeEvent,
  ConfigSource,
  DirectoryInfo
} from '../types/mcp-roots-types.js';

export class ConfigurationProvider implements IConfigurationProvider {
  private rootsDirectory: string | null = null;
  private environmentDirectory: string | null = null;
  private commandLineDirectory: string | null = null;
  private defaultDirectory: string;
  private observers: ((event: ConfigurationChangeEvent) => void)[] = [];
  private allowedDirectories: string[] = [];

  constructor(
    defaultDirectory?: string,
    commandLineDirectory?: string,
    allowedDirectories: string[] = []
  ) {
    this.defaultDirectory = defaultDirectory || this.getDefaultQRDirectory();
    this.commandLineDirectory = commandLineDirectory || null;
    this.allowedDirectories = allowedDirectories;
    
    // Cargar configuración desde variable de entorno
    this.loadEnvironmentConfiguration();
  }

  /**
   * Obtiene el directorio QR actual según precedencia
   */
  async getCurrentQRDirectory(): Promise<string> {
    const current = this.resolveCurrentDirectory();
    
    // Expandir ~ si es necesario
    if (current.startsWith('~')) {
      return path.join(os.homedir(), current.slice(1));
    }
    
    return path.resolve(current);
  }

  /**
   * Actualiza la configuración desde roots
   */
  async updateFromRoots(directory: string): Promise<boolean> {
    const previousStatus = await this.getCurrentStatus();
    
    try {
      // Normalizar y validar el directorio
      const normalizedDirectory = this.normalizePath(directory);
      
      // Verificar que el directorio sea válido
      await this.validateDirectory(normalizedDirectory);
      
      // Actualizar configuración de roots
      this.rootsDirectory = normalizedDirectory;
      
      const currentStatus = await this.getCurrentStatus();
      
      // Notificar observers del cambio
      const changeEvent: ConfigurationChangeEvent = {
        previous: previousStatus,
        current: currentStatus,
        timestamp: new Date(),
        success: true,
        message: `Configuración actualizada desde MCP roots: ${normalizedDirectory}`
      };
      
      this.notifyObservers(changeEvent);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      // Notificar error a observers
      const changeEvent: ConfigurationChangeEvent = {
        previous: previousStatus,
        current: previousStatus, // No cambió debido al error
        timestamp: new Date(),
        success: false,
        message: `Error al actualizar configuración: ${errorMessage}`
      };
      
      this.notifyObservers(changeEvent);
      
      return false;
    }
  }

  /**
   * Obtiene la fuente de la configuración actual
   */
  getConfigurationSource(): ConfigSource {
    if (this.rootsDirectory) return ConfigSource.ROOTS;
    if (this.environmentDirectory) return ConfigSource.ENVIRONMENT;
    if (this.commandLineDirectory) return ConfigSource.COMMAND_LINE;
    return ConfigSource.DEFAULT;
  }

  /**
   * Registra un observer para cambios de configuración
   */
  onConfigurationChange(callback: (event: ConfigurationChangeEvent) => void): void {
    this.observers.push(callback);
  }

  /**
   * Remueve un observer de cambios
   */
  removeConfigurationObserver(callback: (event: ConfigurationChangeEvent) => void): void {
    const index = this.observers.indexOf(callback);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Obtiene información detallada del directorio actual
   */
  async getDirectoryInfo(): Promise<DirectoryInfo> {
    const currentDirectory = await this.getCurrentQRDirectory();
    
    try {
      // Verificar si existe
      const stats = await fs.stat(currentDirectory);
      const exists = stats.isDirectory();
      
      if (!exists) {
        return this.createEmptyDirectoryInfo(currentDirectory);
      }

      // Verificar permisos de escritura
      let writable = false;
      try {
        await fs.access(currentDirectory, fs.constants.W_OK);
        writable = true;
      } catch {
        writable = false;
      }

      // Contar archivos QR
      const files = await fs.readdir(currentDirectory);
      const qrFiles = files.filter(file => 
        file.toLowerCase().endsWith('.png') && 
        file.toLowerCase().includes('qr')
      );

      // Calcular tamaño total
      let totalSize = 0;
      for (const file of files) {
        try {
          const filePath = path.join(currentDirectory, file);
          const fileStats = await fs.stat(filePath);
          if (fileStats.isFile()) {
            totalSize += fileStats.size;
          }
        } catch {
          // Ignorar archivos que no se pueden leer
        }
      }

      return {
        path: currentDirectory,
        exists: true,
        writable,
        qrFileCount: qrFiles.length,
        totalSize,
        lastModified: stats.mtime
      };

    } catch (error) {
      return this.createEmptyDirectoryInfo(currentDirectory);
    }
  }

  /**
   * Lista todos los directorios permitidos
   */
  getAllowedDirectories(): string[] {
    return [...this.allowedDirectories];
  }

  /**
   * Actualiza la lista de directorios permitidos
   */
  updateAllowedDirectories(directories: string[]): void {
    this.allowedDirectories = directories.map(dir => this.normalizePath(dir));
  }

  /**
   * Actualiza configuración desde línea de comandos
   */
  updateFromCommandLine(directory: string): boolean {
    try {
      this.commandLineDirectory = this.normalizePath(directory);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpia la configuración de roots (fallback a siguiente precedencia)
   */
  async clearRootsConfiguration(): Promise<void> {
    const previousStatus = await this.getCurrentStatus();
    this.rootsDirectory = null;
    
    const currentStatus = await this.getCurrentStatus();
    
    const changeEvent: ConfigurationChangeEvent = {
      previous: previousStatus,
      current: currentStatus,
      timestamp: new Date(),
      success: true,
      message: 'Configuración de roots eliminada, usando fallback'
    };
    
    this.notifyObservers(changeEvent);
  }

  /**
   * Obtiene el estado actual de configuración
   */
  private async getCurrentStatus(): Promise<ConfigurationStatus> {
    return {
      source: this.getConfigurationSource(),
      currentDirectory: await this.getCurrentQRDirectory(),
      allowedDirectories: this.getAllowedDirectories(),
      isValid: await this.isCurrentConfigurationValid(),
      lastUpdated: new Date()
    };
  }

  /**
   * Resuelve el directorio actual según precedencia
   */
  private resolveCurrentDirectory(): string {
    // Precedencia: roots > env > command line > default
    if (this.rootsDirectory) return this.rootsDirectory;
    if (this.environmentDirectory) return this.environmentDirectory;
    if (this.commandLineDirectory) return this.commandLineDirectory;
    return this.defaultDirectory;
  }

  /**
   * Carga configuración desde variable de entorno
   */
  private loadEnvironmentConfiguration(): void {
    const envDir = process.env.RADIX_QR_DIR;
    if (envDir) {
      try {
        this.environmentDirectory = this.normalizePath(envDir);
      } catch {
        console.warn(`Variable de entorno RADIX_QR_DIR inválida: ${envDir}`);
      }
    }
  }

  /**
   * Obtiene el directorio por defecto para QR codes
   */
  private getDefaultQRDirectory(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, 'qrimages');
  }

  /**
   * Normaliza un path
   */
  private normalizePath(inputPath: string): string {
    // Expandir ~ para directorio home
    let expandedPath = inputPath;
    if (inputPath.startsWith('~')) {
      expandedPath = path.join(os.homedir(), inputPath.slice(1));
    }

    return path.resolve(expandedPath);
  }

  /**
   * Valida que un directorio sea accesible
   */
  private async validateDirectory(directory: string): Promise<void> {
    try {
      // Intentar crear el directorio si no existe
      await fs.mkdir(directory, { recursive: true });
      
      // Verificar permisos de escritura
      await fs.access(directory, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`Directorio inválido: ${directory}. ${error instanceof Error ? error.message : ''}`);
    }
  }

  /**
   * Verifica si la configuración actual es válida
   */
  private async isCurrentConfigurationValid(): Promise<boolean> {
    try {
      const currentDir = await this.getCurrentQRDirectory();
      await this.validateDirectory(currentDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Crea información de directorio vacía
   */
  private createEmptyDirectoryInfo(directory: string): DirectoryInfo {
    return {
      path: directory,
      exists: false,
      writable: false,
      qrFileCount: 0,
      totalSize: 0,
      lastModified: new Date(0)
    };
  }

  /**
   * Notifica a todos los observers
   */
  private notifyObservers(event: ConfigurationChangeEvent): void {
    // Usar setTimeout para hacer la notificación asíncrona y evitar bloqueos
    setTimeout(() => {
      this.observers.forEach(observer => {
        try {
          observer(event);
        } catch (error) {
          console.error('Error en observer de configuración:', error);
        }
      });
    }, 0);
  }
}