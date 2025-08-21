/**
 * Implementación del proveedor de configuración para MCP Roots
 * Gestiona precedencia de configuración y cambios dinámicos
 */

import * as path from 'path';
import { IConfigurationProvider } from '../interfaces/configuration-provider.interface.js';
import {
  ConfigSource,
  QRDirectoryConfig,
  PerformanceMetrics
} from '../types/mcp-roots-types.js';

export class ConfigurationProvider implements IConfigurationProvider {
  private currentConfig: QRDirectoryConfig | null = null;
  private configObservers: ((config: QRDirectoryConfig) => void)[] = [];
  private performanceMetrics: PerformanceMetrics[] = [];
  private isInitializedFlag = false;
  
  // Precedencia: MCP_ROOTS > ENVIRONMENT > COMMAND_LINE > DEFAULT
  private readonly precedenceOrder: ConfigSource[] = [
    'MCP_ROOTS',
    'ENVIRONMENT', 
    'COMMAND_LINE',
    'DEFAULT'
  ];

  private mcpRootsConfig: string | null = null;
  private environmentConfig: string | undefined;
  private commandLineConfig: string | undefined;
  private readonly defaultDirectory: string;

  constructor(defaultDir?: string) {
    this.defaultDirectory = defaultDir || path.join(process.cwd(), 'qrimages');
    this.environmentConfig = process.env.QR_DIRECTORY;
    this.commandLineConfig = this.parseCommandLineConfig();
  }

  async initialize(initialConfig?: Partial<QRDirectoryConfig>): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (initialConfig?.path) {
        // Si se proporciona configuración inicial, usarla como base
        this.currentConfig = {
          path: initialConfig.path,
          source: initialConfig.source || 'DEFAULT',
          lastUpdated: new Date(),
          isValid: true,
          metadata: {
            permissions: 'READ_WRITE',
            createdByMcp: false,
            diskSpace: 0,
            ...initialConfig.metadata
          }
        };
      } else {
        // Calcular configuración desde fuentes disponibles
        this.currentConfig = await this.recalculateConfiguration();
      }

      this.isInitializedFlag = true;
      
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, true, {
        source: this.currentConfig.source,
        initialConfig: !!initialConfig
      });
      
    } catch (error) {
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, false, { error: String(error) });
      throw error;
    }
  }

  getQRDirectory(): string {
    if (!this.isInitializedFlag || !this.currentConfig) {
      throw new Error('ConfigurationProvider not initialized');
    }
    return this.currentConfig.path;
  }

  async updateQRDirectory(newPath: string): Promise<void> {
    const startTime = Date.now();
    
    try {
      const previousConfig = this.currentConfig;
      
      this.mcpRootsConfig = newPath;
      
      const updatedConfig: QRDirectoryConfig = {
        path: newPath,
        source: 'MCP_ROOTS',
        lastUpdated: new Date(),
        isValid: true, // Será validado externamente por SecurityValidator
        metadata: {
          permissions: 'READ_WRITE',
          createdByMcp: true,
          diskSpace: 0
        }
      };

      this.currentConfig = updatedConfig;
      
      // Notificar observers
      this.notifyConfigurationChanged(updatedConfig);
      
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, true, {
        previousPath: previousConfig?.path,
        newPath,
        source: 'MCP_ROOTS'
      });
      
    } catch (error) {
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, false, { error: String(error) });
      throw error;
    }
  }

  getConfigurationSource(): ConfigSource {
    if (!this.currentConfig) {
      return 'DEFAULT';
    }
    return this.currentConfig.source;
  }

  getQRDirectoryConfig(): QRDirectoryConfig {
    if (!this.isInitializedFlag || !this.currentConfig) {
      throw new Error('ConfigurationProvider not initialized');
    }
    return { ...this.currentConfig };
  }

  resetToDefault(): void {
    const startTime = Date.now();
    
    try {
      this.mcpRootsConfig = null;
      
      const resetConfig: QRDirectoryConfig = {
        path: this.defaultDirectory,
        source: 'DEFAULT',
        lastUpdated: new Date(),
        isValid: true,
        metadata: {
          permissions: 'READ_WRITE',
          createdByMcp: false,
          diskSpace: 0
        }
      };

      this.currentConfig = resetConfig;
      
      this.notifyConfigurationChanged(resetConfig);
      
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, true, {
        action: 'reset_to_default',
        defaultPath: this.defaultDirectory
      });
      
    } catch (error) {
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, false, { error: String(error) });
    }
  }

  hasPrecedence(source1: ConfigSource, source2: ConfigSource): boolean {
    const index1 = this.precedenceOrder.indexOf(source1);
    const index2 = this.precedenceOrder.indexOf(source2);
    
    // Índice menor = mayor precedencia
    return index1 < index2;
  }

  onConfigurationChanged(callback: (config: QRDirectoryConfig) => void): () => void {
    this.configObservers.push(callback);
    
    // Retornar función para desregistrar
    return () => {
      const index = this.configObservers.indexOf(callback);
      if (index > -1) {
        this.configObservers.splice(index, 1);
      }
    };
  }

  async isCurrentConfigurationValid(): Promise<boolean> {
    if (!this.currentConfig) {
      return false;
    }
    
    try {
      // Validación básica de existencia del directorio
      // La validación de seguridad se hace externamente
      return this.currentConfig.isValid && !!this.currentConfig.path;
    } catch {
      return false;
    }
  }

  getEnvironmentConfiguration(): string | undefined {
    return this.environmentConfig;
  }

  getCommandLineConfiguration(): string | undefined {
    return this.commandLineConfig;
  }

  getDefaultDirectory(): string {
    return this.defaultDirectory;
  }

  async recalculateConfiguration(): Promise<QRDirectoryConfig> {
    const startTime = Date.now();
    
    try {
      // Aplicar precedencia: MCP_ROOTS > ENVIRONMENT > COMMAND_LINE > DEFAULT
      let selectedPath: string;
      let source: ConfigSource;
      
      if (this.mcpRootsConfig) {
        selectedPath = this.mcpRootsConfig;
        source = 'MCP_ROOTS';
      } else if (this.environmentConfig) {
        selectedPath = this.environmentConfig;
        source = 'ENVIRONMENT';
      } else if (this.commandLineConfig) {
        selectedPath = this.commandLineConfig;
        source = 'COMMAND_LINE';
      } else {
        selectedPath = this.defaultDirectory;
        source = 'DEFAULT';
      }

      const config: QRDirectoryConfig = {
        path: selectedPath,
        source,
        lastUpdated: new Date(),
        isValid: true,
        metadata: {
          permissions: 'READ_WRITE',
          createdByMcp: source === 'MCP_ROOTS',
          diskSpace: 0
        }
      };

      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, true, {
        action: 'recalculate',
        source,
        path: selectedPath
      });

      return config;
      
    } catch (error) {
      this.recordMetric('CONFIG_UPDATE', Date.now() - startTime, false, { error: String(error) });
      throw error;
    }
  }

  getConfigurationMetrics(limit: number = 10): PerformanceMetrics[] {
    return this.performanceMetrics
      .filter(metric => metric.operationType === 'CONFIG_UPDATE')
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  shutdown(): void {
    this.configObservers = [];
    this.performanceMetrics = [];
    this.currentConfig = null;
    this.isInitializedFlag = false;
  }

  private parseCommandLineConfig(): string | undefined {
    const args = process.argv;
    const qrDirIndex = args.findIndex(arg => arg === '--qr-directory' || arg === '--qr-dir');
    
    if (qrDirIndex !== -1 && qrDirIndex + 1 < args.length) {
      return args[qrDirIndex + 1];
    }
    
    // También buscar formato --qr-directory=path
    const qrDirArg = args.find(arg => arg.startsWith('--qr-directory=') || arg.startsWith('--qr-dir='));
    if (qrDirArg) {
      return qrDirArg.split('=')[1];
    }
    
    return undefined;
  }

  private notifyConfigurationChanged(config: QRDirectoryConfig): void {
    this.configObservers.forEach(observer => {
      try {
        observer(config);
      } catch (error) {
        console.error('Error notifying configuration observer:', error);
      }
    });
  }

  private recordMetric(
    operationType: PerformanceMetrics['operationType'],
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetrics = {
      operationType,
      duration,
      timestamp: new Date(),
      success,
      metadata
    };

    this.performanceMetrics.push(metric);
    
    // Mantener solo últimas 100 métricas
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }
  }
}