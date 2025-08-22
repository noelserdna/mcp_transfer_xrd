/**
 * Sistema de Configuración Híbrida para QR Codes
 * Determina automáticamente la configuración óptima L/H basada en longitud de deeplink y contexto
 * Arquitectura: Capa 1 - Configuration Layer
 */

import { QRConfig } from '../types/qr-types.js';

export enum QRContext {
  MOBILE_SCAN = 'mobile_scan',     // Optimizado para escaneado móvil
  DESKTOP_DISPLAY = 'desktop_display', // Optimizado para display desktop
  TERMINAL_RENDER = 'terminal_render',  // Optimizado para renderizado terminal
  WEB_EMBED = 'web_embed',         // Optimizado para embedding web
  HIGH_QUALITY = 'high_quality'    // Máxima calidad sin importar tamaño
}

export interface QRHybridConfig extends QRConfig {
  context: QRContext;
  adaptiveLevel: boolean;
  fallbackStrategy: 'increase_capacity' | 'reduce_size' | 'maintain_quality';
}

export interface QROptimizationResult {
  config: QRHybridConfig;
  expectedCapacity: number;
  estimatedSize: number;
  recommendation: string;
  fallbackConfig?: QRHybridConfig;
}

/**
 * Motor de configuración híbrida que selecciona automáticamente
 * entre configuración 'L' (actual) y 'H' (Radix oficial)
 */
export class QRHybridConfigManager {
  // Configuraciones base predefinidas
  private static readonly CONFIGS = {
    // Configuración actual del proyecto (optimizada para capacidad)
    CURRENT_L: {
      errorCorrectionLevel: 'L' as const,
      margin: 4,
      color: { dark: '#000000', light: '#FFFFFF' },
      context: QRContext.MOBILE_SCAN,
      adaptiveLevel: true,
      fallbackStrategy: 'increase_capacity' as const
    },
    
    // Configuración oficial Radix (optimizada para calidad)
    RADIX_H: {
      errorCorrectionLevel: 'H' as const,
      margin: 6,
      color: { dark: '#000000', light: '#FFFFFF' },
      context: QRContext.HIGH_QUALITY,
      adaptiveLevel: false,
      fallbackStrategy: 'maintain_quality' as const
    },

    // Configuración optimizada para terminal
    TERMINAL_M: {
      errorCorrectionLevel: 'M' as const,
      margin: 2,
      color: { dark: '█', light: ' ' },
      context: QRContext.TERMINAL_RENDER,
      adaptiveLevel: true,
      fallbackStrategy: 'reduce_size' as const
    },

    // Configuración balanceada
    BALANCED_Q: {
      errorCorrectionLevel: 'Q' as const,
      margin: 4,
      color: { dark: '#000000', light: '#FFFFFF' },
      context: QRContext.DESKTOP_DISPLAY,
      adaptiveLevel: true,
      fallbackStrategy: 'increase_capacity' as const
    }
  };

  // Umbrales de longitud para decisiones automáticas
  private static readonly LENGTH_THRESHOLDS = {
    VERY_SHORT: 100,    // URLs cortas - usar H para máxima calidad
    SHORT: 300,         // URLs normales - usar Q balanceado  
    MEDIUM: 800,        // URLs medias - usar M adaptivo
    LONG: 1500,         // URLs largas - usar L para capacidad
    VERY_LONG: 2500     // URLs muy largas - usar L + optimizaciones extremas
  };

  /**
   * Determina la configuración óptima basada en deeplink y contexto
   */
  static getOptimalQRConfig(
    deeplink: string, 
    context: QRContext = QRContext.MOBILE_SCAN,
    preferredLevel?: 'L' | 'M' | 'Q' | 'H'
  ): QROptimizationResult {
    const length = deeplink.length;
    const baseConfig = this.selectBaseConfig(length, context, preferredLevel);
    
    // Aplicar optimizaciones específicas por longitud
    const optimizedConfig = this.applyLengthOptimizations(baseConfig, length, context);
    
    // Calcular métricas esperadas
    const capacity = this.estimateCapacity(optimizedConfig);
    const size = this.estimateQRSize(length, optimizedConfig);
    
    // Generar configuración de fallback si es necesaria
    const fallbackConfig = this.generateFallbackConfig(optimizedConfig, length);
    
    return {
      config: optimizedConfig,
      expectedCapacity: capacity,
      estimatedSize: size,
      recommendation: this.generateRecommendation(optimizedConfig, length, context),
      fallbackConfig
    };
  }

  /**
   * Selecciona configuración base según longitud y contexto
   */
  private static selectBaseConfig(
    length: number, 
    context: QRContext, 
    preferredLevel?: 'L' | 'M' | 'Q' | 'H'
  ): QRHybridConfig {
    // Si hay nivel preferido, usarlo con contexto
    if (preferredLevel) {
      const baseConfig = this.getConfigByLevel(preferredLevel);
      return { ...baseConfig, context, adaptiveLevel: true };
    }

    // Selección automática basada en longitud y contexto
    if (context === QRContext.TERMINAL_RENDER) {
      return { ...this.CONFIGS.TERMINAL_M };
    }

    if (context === QRContext.HIGH_QUALITY && length <= this.LENGTH_THRESHOLDS.SHORT) {
      return { ...this.CONFIGS.RADIX_H };
    }

    // Lógica principal de selección por longitud
    if (length <= this.LENGTH_THRESHOLDS.VERY_SHORT) {
      return { ...this.CONFIGS.RADIX_H, context }; // URLs muy cortas: máxima calidad
    } else if (length <= this.LENGTH_THRESHOLDS.SHORT) {
      return { ...this.CONFIGS.BALANCED_Q, context }; // URLs cortas: balanceado
    } else if (length <= this.LENGTH_THRESHOLDS.MEDIUM) {
      return { ...this.CONFIGS.BALANCED_Q, context, errorCorrectionLevel: 'M' }; // URLs medias: M adaptivo
    } else {
      return { ...this.CONFIGS.CURRENT_L, context }; // URLs largas: máxima capacidad
    }
  }

  /**
   * Obtiene configuración por nivel específico
   */
  private static getConfigByLevel(level: 'L' | 'M' | 'Q' | 'H'): QRHybridConfig {
    switch (level) {
      case 'L': return { ...this.CONFIGS.CURRENT_L };
      case 'M': return { ...this.CONFIGS.TERMINAL_M, color: this.CONFIGS.CURRENT_L.color };
      case 'Q': return { ...this.CONFIGS.BALANCED_Q };
      case 'H': return { ...this.CONFIGS.RADIX_H };
    }
  }

  /**
   * Aplica optimizaciones específicas según longitud
   */
  private static applyLengthOptimizations(
    config: QRHybridConfig, 
    length: number, 
    context: QRContext
  ): QRHybridConfig {
    const optimized = { ...config };

    // Para URLs muy largas, aplicar optimizaciones extremas
    if (length > this.LENGTH_THRESHOLDS.LONG) {
      optimized.margin = Math.max(1, optimized.margin - 2); // Reducir margin
      optimized.errorCorrectionLevel = 'L'; // Forzar L para máxima capacidad
      
      if (length > this.LENGTH_THRESHOLDS.VERY_LONG) {
        optimized.margin = 1; // Margin mínimo
      }
    }

    // Optimizaciones específicas por contexto
    if (context === QRContext.TERMINAL_RENDER) {
      optimized.margin = Math.max(1, Math.min(2, optimized.margin)); // Terminal necesita margin pequeño
    } else if (context === QRContext.WEB_EMBED) {
      optimized.margin = Math.max(2, optimized.margin); // Web necesita margin para claridad
    }

    return optimized;
  }

  /**
   * Estima capacidad máxima de datos para configuración
   */
  private static estimateCapacity(config: QRHybridConfig): number {
    // Capacidades aproximadas por nivel de corrección de error
    const baseCapacities = {
      'L': 2953, // ~7% error correction
      'M': 2331, // ~15% error correction  
      'Q': 1663, // ~25% error correction
      'H': 1273  // ~30% error correction
    };

    let capacity = baseCapacities[config.errorCorrectionLevel];
    
    // Ajustar por margin (margin menor = más espacio para datos)
    const marginPenalty = Math.max(0, (config.margin - 1) * 0.02);
    capacity = Math.floor(capacity * (1 - marginPenalty));

    return capacity;
  }

  /**
   * Estima tamaño final del QR en módulos
   */
  private static estimateQRSize(length: number, config: QRHybridConfig): number {
    // Estimación basada en longitud de datos y nivel de corrección
    const baseSize = Math.ceil(Math.sqrt(length * 8.5)); // Aproximación empírica
    const correctionMultiplier = {
      'L': 1.0,
      'M': 1.15,
      'Q': 1.35,
      'H': 1.55
    };

    return Math.ceil(baseSize * correctionMultiplier[config.errorCorrectionLevel]) + (config.margin * 2);
  }

  /**
   * Genera configuración de fallback para casos límite
   */
  private static generateFallbackConfig(
    primary: QRHybridConfig, 
    length: number
  ): QRHybridConfig | undefined {
    // Si la configuración primaria es L, no hay fallback mejor para capacidad
    if (primary.errorCorrectionLevel === 'L' && length > this.LENGTH_THRESHOLDS.MEDIUM) {
      return undefined;
    }

    // Crear fallback con mayor capacidad
    const fallback = { ...primary };
    
    if (primary.errorCorrectionLevel !== 'L') {
      // Degradar nivel de corrección para más capacidad
      const levels = ['H', 'Q', 'M', 'L'];
      const currentIndex = levels.indexOf(primary.errorCorrectionLevel);
      if (currentIndex < levels.length - 1) {
        fallback.errorCorrectionLevel = levels[currentIndex + 1] as 'L' | 'M' | 'Q' | 'H';
        fallback.margin = Math.max(1, fallback.margin - 1);
        fallback.fallbackStrategy = 'increase_capacity';
      }
    }

    return fallback.errorCorrectionLevel !== primary.errorCorrectionLevel ? fallback : undefined;
  }

  /**
   * Genera recomendación en español
   */
  private static generateRecommendation(
    config: QRHybridConfig, 
    length: number, 
    context: QRContext
  ): string {
    const level = config.errorCorrectionLevel;
    const lengthCategory = this.getLengthCategory(length);
    
    let recommendation = `Configuración ${level} `;
    
    switch (lengthCategory) {
      case 'very_short':
        recommendation += `(URLs muy cortas): Máxima calidad de escaneado con corrección ${level}`;
        break;
      case 'short':
        recommendation += `(URLs cortas): Balance entre calidad y capacidad`;
        break;
      case 'medium':
        recommendation += `(URLs medias): Optimizado para escaneado móvil confiable`;
        break;
      case 'long':
        recommendation += `(URLs largas): Máxima capacidad, sacrificando algo de robustez`;
        break;
      case 'very_long':
        recommendation += `(URLs muy largas): Configuración extrema para máxima capacidad`;
        break;
    }

    // Agregar nota específica del contexto
    if (context === QRContext.TERMINAL_RENDER) {
      recommendation += `. Optimizado para display en terminal.`;
    } else if (context === QRContext.HIGH_QUALITY) {
      recommendation += `. Configuración de alta calidad para escaneado crítico.`;
    }

    return recommendation;
  }

  /**
   * Categoriza longitud de deeplink
   */
  private static getLengthCategory(length: number): string {
    if (length <= this.LENGTH_THRESHOLDS.VERY_SHORT) return 'very_short';
    if (length <= this.LENGTH_THRESHOLDS.SHORT) return 'short';
    if (length <= this.LENGTH_THRESHOLDS.MEDIUM) return 'medium';
    if (length <= this.LENGTH_THRESHOLDS.LONG) return 'long';
    return 'very_long';
  }

  /**
   * Valida si una configuración puede manejar la longitud dada
   */
  static validateConfigForLength(config: QRHybridConfig, length: number): {
    isValid: boolean;
    estimatedFit: number; // % de capacidad utilizada
    recommendation?: string;
  } {
    const capacity = this.estimateCapacity(config);
    const utilizationPct = (length / capacity) * 100;
    
    return {
      isValid: length <= capacity,
      estimatedFit: Math.round(utilizationPct),
      recommendation: utilizationPct > 90 ? 
        'Considera usar nivel L o reducir el contenido del deeplink' :
        utilizationPct > 70 ?
        'Utilización alta pero dentro de límites seguros' :
        'Configuración óptima para este contenido'
    };
  }
}