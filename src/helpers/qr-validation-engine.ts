/**
 * QRValidationEngine - Motor de validación y calidad de QR codes
 * Valida contenido, métricas de calidad y comparación entre métodos
 * Arquitectura: Capa 3 - Validation & Quality Assurance Layer
 */

import { QRHybridConfig, QRContext } from './qr-config-hybrid.js';
import { QRTerminalOptions } from './qr-terminal-renderer.js';

export interface QRValidationResult {
  isValid: boolean;
  score: number;           // Puntuación de calidad 0-100
  warnings: string[];
  errors: string[];
  recommendations: string[];
  metrics: QRQualityMetrics;
}

export interface QRQualityMetrics {
  contentValidation: {
    isRadixDeepLink: boolean;
    protocolSupported: boolean;
    lengthScore: number;        // 0-100 basado en longitud óptima
    contentIntegrity: number;   // 0-100 basado en estructura del deeplink
  };
  generationMetrics: {
    estimatedScanSuccess: number;  // % probabilidad de escaneado exitoso
    capacityUtilization: number;   // % de capacidad QR utilizada
    errorRecovery: number;         // % de corrección de errores disponible
    densityScore: number;          // 0-100, menor = mejor legibilidad
  };
  contextMetrics: {
    mobileCompatibility: number;   // 0-100 compatibilidad móvil
    terminalCompatibility: number; // 0-100 compatibilidad terminal
    webCompatibility: number;      // 0-100 compatibilidad web
    printCompatibility: number;    // 0-100 compatibilidad impresión
  };
}

export interface QRComparisonResult {
  methods: {
    method: string;
    config: any;
    validation: QRValidationResult;
    estimatedPerformance: number;
  }[];
  recommendation: {
    bestMethod: string;
    reasoning: string;
    alternativeOptions: string[];
  };
  summary: {
    totalMethods: number;
    avgQualityScore: number;
    bestScore: number;
    worstScore: number;
  };
}

/**
 * Motor central de validación y análisis de calidad para QR codes
 */
export class QRValidationEngine {
  // Patrones de validación para deep links Radix
  private static readonly RADIX_PATTERNS = {
    protocols: [
      /^radixwallet:\/\//i,
      /^https:\/\/wallet\.radixdlt\.com\//i,
      /^https:\/\/radixwallet\.com\//i
    ],
    validStructure: /^(radixwallet:\/\/|https:\/\/(wallet\.)?radix(wallet|dlt)\.com\/).+/i
  };

  // Umbrales de calidad
  private static readonly QUALITY_THRESHOLDS = {
    excellent: 90,
    good: 75,
    acceptable: 60,
    poor: 40,
    unacceptable: 20
  };

  // Longitudes óptimas por contexto
  private static readonly OPTIMAL_LENGTHS = {
    [QRContext.MOBILE_SCAN]: { min: 50, optimal: 300, max: 1200 },
    [QRContext.TERMINAL_RENDER]: { min: 20, optimal: 150, max: 800 },
    [QRContext.WEB_EMBED]: { min: 50, optimal: 400, max: 1500 },
    [QRContext.HIGH_QUALITY]: { min: 50, optimal: 200, max: 800 },
    [QRContext.DESKTOP_DISPLAY]: { min: 50, optimal: 350, max: 1300 }
  };

  /**
   * Validación completa de QR con deeplink y configuración
   */
  static validateQR(
    deeplink: string,
    config: QRHybridConfig,
    context?: QRContext
  ): QRValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];

    // Validación de contenido
    const contentValidation = this.validateContent(deeplink);
    if (!contentValidation.isRadixDeepLink) {
      warnings.push('Deep link no parece ser de Radix Wallet');
    }
    if (!contentValidation.protocolSupported) {
      errors.push('Protocolo de deep link no soportado');
    }

    // Métricas de generación
    const generationMetrics = this.calculateGenerationMetrics(deeplink, config);
    if (generationMetrics.capacityUtilization > 95) {
      errors.push('Deep link excede capacidad del QR code');
    } else if (generationMetrics.capacityUtilization > 85) {
      warnings.push('Deep link muy largo, puede afectar legibilidad');
      recommendations.push('Considera usar nivel de corrección L para mayor capacidad');
    }

    // Métricas de contexto
    const contextMetrics = this.calculateContextMetrics(deeplink, config, context);
    if (contextMetrics.mobileCompatibility < 70) {
      warnings.push('Compatibilidad móvil por debajo del óptimo');
      recommendations.push('Reduce longitud del deeplink o aumenta tamaño del QR');
    }

    // Calcular puntuación general
    const score = this.calculateOverallScore({
      contentValidation,
      generationMetrics,
      contextMetrics
    });

    // Determinar validez
    const isValid = errors.length === 0 && score >= this.QUALITY_THRESHOLDS.acceptable;

    // Agregar recomendaciones basadas en puntuación
    if (score < this.QUALITY_THRESHOLDS.good) {
      recommendations.push(...this.generateImprovementRecommendations(score, {
        contentValidation,
        generationMetrics,
        contextMetrics
      }));
    }

    return {
      isValid,
      score,
      warnings,
      errors,
      recommendations,
      metrics: {
        contentValidation,
        generationMetrics,
        contextMetrics
      }
    };
  }

  /**
   * Validación específica de contenido del deeplink
   */
  private static validateContent(deeplink: string): QRQualityMetrics['contentValidation'] {
    if (!deeplink || typeof deeplink !== 'string') {
      return {
        isRadixDeepLink: false,
        protocolSupported: false,
        lengthScore: 0,
        contentIntegrity: 0
      };
    }

    // Verificar protocolo Radix
    const isRadixDeepLink = this.RADIX_PATTERNS.protocols.some(pattern => 
      pattern.test(deeplink)
    );

    const protocolSupported = this.RADIX_PATTERNS.validStructure.test(deeplink);

    // Puntuación de longitud (curva optimizada)
    const length = deeplink.length;
    let lengthScore = 100;
    if (length > 1500) {
      lengthScore = Math.max(20, 100 - ((length - 1500) / 100) * 10);
    } else if (length > 800) {
      lengthScore = Math.max(60, 100 - ((length - 800) / 70) * 15);
    } else if (length < 50) {
      lengthScore = Math.max(30, length * 2);
    }

    // Integridad del contenido
    let contentIntegrity = 100;
    if (!isRadixDeepLink) contentIntegrity -= 30;
    if (!protocolSupported) contentIntegrity -= 50;
    if (deeplink.includes(' ')) contentIntegrity -= 10; // Espacios problemáticos
    if (!/^[a-zA-Z0-9:\/\.\-_\?\&\=\%\+]+$/.test(deeplink)) {
      contentIntegrity -= 20; // Caracteres especiales problemáticos
    }

    return {
      isRadixDeepLink,
      protocolSupported,
      lengthScore: Math.max(0, Math.min(100, lengthScore)),
      contentIntegrity: Math.max(0, Math.min(100, contentIntegrity))
    };
  }

  /**
   * Calcula métricas de generación QR
   */
  private static calculateGenerationMetrics(
    deeplink: string,
    config: QRHybridConfig
  ): QRQualityMetrics['generationMetrics'] {
    const length = deeplink.length;

    // Capacidades máximas aproximadas por nivel
    const maxCapacities = { 'L': 2953, 'M': 2331, 'Q': 1663, 'H': 1273 };
    const maxCapacity = maxCapacities[config.errorCorrectionLevel];
    const capacityUtilization = (length / maxCapacity) * 100;

    // Corrección de errores disponible
    const errorRecoveryLevels = { 'L': 7, 'M': 15, 'Q': 25, 'H': 30 };
    const errorRecovery = errorRecoveryLevels[config.errorCorrectionLevel];

    // Estimación de éxito de escaneado
    let estimatedScanSuccess = 95;
    if (capacityUtilization > 90) estimatedScanSuccess -= 20;
    if (capacityUtilization > 80) estimatedScanSuccess -= 10;
    if (config.margin < 2) estimatedScanSuccess -= 5;
    if (length > 1500) estimatedScanSuccess -= 15;

    // Puntuación de densidad (menor = mejor)
    const densityScore = Math.max(0, 100 - (capacityUtilization * 0.8 + length / 30));

    return {
      estimatedScanSuccess: Math.max(30, Math.min(100, estimatedScanSuccess)),
      capacityUtilization: Math.min(100, capacityUtilization),
      errorRecovery,
      densityScore: Math.max(0, Math.min(100, densityScore))
    };
  }

  /**
   * Calcula métricas específicas por contexto
   */
  private static calculateContextMetrics(
    deeplink: string,
    config: QRHybridConfig,
    context?: QRContext
  ): QRQualityMetrics['contextMetrics'] {
    const length = deeplink.length;
    const targetContext = context || config.context;

    // Compatibilidad móvil
    let mobileCompatibility = 90;
    if (length > 1200) mobileCompatibility -= 20;
    if (config.errorCorrectionLevel === 'L' && length > 800) mobileCompatibility -= 10;
    if (config.margin < 3) mobileCompatibility -= 5;

    // Compatibilidad terminal
    let terminalCompatibility = 85;
    if (length > 800) terminalCompatibility -= 30;
    if (config.margin > 4) terminalCompatibility -= 10; // Terminal prefiere margins pequeños
    if (targetContext === QRContext.TERMINAL_RENDER) terminalCompatibility += 10;

    // Compatibilidad web
    let webCompatibility = 88;
    if (length > 1500) webCompatibility -= 15;
    if (config.errorCorrectionLevel === 'H') webCompatibility += 5; // Web prefiere calidad

    // Compatibilidad impresión
    let printCompatibility = 92;
    if (config.errorCorrectionLevel === 'L') printCompatibility -= 15; // Impresión necesita robustez
    if (config.margin < 4) printCompatibility -= 10;
    if (length > 1000) printCompatibility -= 20;

    return {
      mobileCompatibility: Math.max(0, Math.min(100, mobileCompatibility)),
      terminalCompatibility: Math.max(0, Math.min(100, terminalCompatibility)),
      webCompatibility: Math.max(0, Math.min(100, webCompatibility)),
      printCompatibility: Math.max(0, Math.min(100, printCompatibility))
    };
  }

  /**
   * Calcula puntuación general de calidad
   */
  private static calculateOverallScore(metrics: QRQualityMetrics): number {
    const weights = {
      contentValidation: 0.3,
      generationMetrics: 0.4,
      contextMetrics: 0.3
    };

    // Puntuación de validación de contenido
    const contentScore = (
      (metrics.contentValidation.isRadixDeepLink ? 30 : 0) +
      (metrics.contentValidation.protocolSupported ? 30 : 0) +
      (metrics.contentValidation.lengthScore * 0.2) +
      (metrics.contentValidation.contentIntegrity * 0.2)
    );

    // Puntuación de métricas de generación
    const generationScore = (
      metrics.generationMetrics.estimatedScanSuccess * 0.4 +
      (100 - metrics.generationMetrics.capacityUtilization) * 0.3 +
      metrics.generationMetrics.densityScore * 0.3
    );

    // Puntuación de métricas de contexto (promedio ponderado)
    const contextScore = (
      metrics.contextMetrics.mobileCompatibility * 0.4 +
      metrics.contextMetrics.terminalCompatibility * 0.2 +
      metrics.contextMetrics.webCompatibility * 0.2 +
      metrics.contextMetrics.printCompatibility * 0.2
    );

    const overallScore = 
      contentScore * weights.contentValidation +
      generationScore * weights.generationMetrics +
      contextScore * weights.contextMetrics;

    return Math.max(0, Math.min(100, overallScore));
  }

  /**
   * Genera recomendaciones de mejora
   */
  private static generateImprovementRecommendations(
    score: number,
    metrics: QRQualityMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (score < this.QUALITY_THRESHOLDS.poor) {
      recommendations.push('Calidad crítica: considera reducir significativamente el contenido del deeplink');
    }

    if (metrics.contentValidation.lengthScore < 50) {
      recommendations.push('Deep link muy largo: considera usar configuración L para máxima capacidad');
    }

    if (metrics.generationMetrics.estimatedScanSuccess < 70) {
      recommendations.push('Baja probabilidad de escaneado: aumenta tamaño del QR o usa nivel H');
    }

    if (metrics.generationMetrics.capacityUtilization > 85) {
      recommendations.push('Alta utilización de capacidad: usa nivel L o reduce contenido');
    }

    if (metrics.contextMetrics.mobileCompatibility < 60) {
      recommendations.push('Optimiza para móvil: reduce longitud o aumenta corrección de errores');
    }

    if (metrics.contextMetrics.terminalCompatibility < 60) {
      recommendations.push('Para terminal: usa formato small y margin reducido');
    }

    return recommendations;
  }

  /**
   * Compara múltiples métodos de generación QR
   */
  static compareQRMethods(
    deeplink: string,
    methods: Array<{
      name: string;
      config: QRHybridConfig;
      context?: QRContext;
    }>
  ): QRComparisonResult {
    const results = methods.map(method => {
      const validation = this.validateQR(deeplink, method.config, method.context);
      const estimatedPerformance = this.estimatePerformance(validation);

      return {
        method: method.name,
        config: method.config,
        validation,
        estimatedPerformance
      };
    });

    // Encontrar mejor método
    const bestResult = results.reduce((best, current) => 
      current.validation.score > best.validation.score ? current : best
    );

    // Calcular estadísticas
    const scores = results.map(r => r.validation.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      methods: results,
      recommendation: {
        bestMethod: bestResult.method,
        reasoning: this.generateComparisonReasoning(bestResult, results),
        alternativeOptions: this.generateAlternatives(bestResult, results)
      },
      summary: {
        totalMethods: results.length,
        avgQualityScore: Math.round(avgScore),
        bestScore: Math.max(...scores),
        worstScore: Math.min(...scores)
      }
    };
  }

  /**
   * Estima performance general basado en validación
   */
  private static estimatePerformance(validation: QRValidationResult): number {
    const basePerformance = validation.score;
    
    // Ajustes por errores y warnings
    let adjustment = 0;
    adjustment -= validation.errors.length * 15;
    adjustment -= validation.warnings.length * 5;
    adjustment += validation.recommendations.length * 2; // Las recomendaciones ayudan

    return Math.max(0, Math.min(100, basePerformance + adjustment));
  }

  /**
   * Genera razonamiento para la comparación
   */
  private static generateComparisonReasoning(
    best: any,
    all: any[]
  ): string {
    const score = best.validation.score;
    const config = best.config;
    
    let reasoning = `${best.method} obtuvo la mejor puntuación (${score.toFixed(1)}) `;
    
    if (score >= this.QUALITY_THRESHOLDS.excellent) {
      reasoning += 'con calidad excelente';
    } else if (score >= this.QUALITY_THRESHOLDS.good) {
      reasoning += 'con calidad buena';
    } else {
      reasoning += 'con calidad aceptable';
    }

    reasoning += `. Usa corrección ${config.errorCorrectionLevel} con margin ${config.margin}, `;
    reasoning += `optimizado para ${this.getContextDescription(config.context)}.`;

    return reasoning;
  }

  /**
   * Genera opciones alternativas
   */
  private static generateAlternatives(best: any, all: any[]): string[] {
    return all
      .filter(r => r.method !== best.method && r.validation.score >= this.QUALITY_THRESHOLDS.acceptable)
      .sort((a, b) => b.validation.score - a.validation.score)
      .slice(0, 3)
      .map(r => `${r.method} (${r.validation.score.toFixed(1)} pts)`);
  }

  /**
   * Obtiene descripción del contexto
   */
  private static getContextDescription(context: QRContext): string {
    const descriptions = {
      [QRContext.MOBILE_SCAN]: 'escaneado móvil',
      [QRContext.TERMINAL_RENDER]: 'renderizado en terminal',
      [QRContext.WEB_EMBED]: 'embedding web',
      [QRContext.HIGH_QUALITY]: 'alta calidad',
      [QRContext.DESKTOP_DISPLAY]: 'display desktop'
    };
    return descriptions[context] || 'uso general';
  }

  /**
   * Validación rápida sin métricas detalladas
   */
  static quickValidate(deeplink: string): { isValid: boolean; basicScore: number; issues: string[] } {
    const issues: string[] = [];
    let basicScore = 100;

    if (!deeplink || typeof deeplink !== 'string') {
      return { isValid: false, basicScore: 0, issues: ['Deep link inválido'] };
    }

    // Validaciones básicas
    if (deeplink.length > 2000) {
      basicScore -= 30;
      issues.push('Deep link muy largo');
    }

    if (!this.RADIX_PATTERNS.validStructure.test(deeplink)) {
      basicScore -= 40;
      issues.push('No es un deep link de Radix válido');
    }

    if (deeplink.includes(' ')) {
      basicScore -= 10;
      issues.push('Contiene espacios problemáticos');
    }

    return {
      isValid: basicScore >= 60 && issues.length === 0,
      basicScore: Math.max(0, basicScore),
      issues
    };
  }
}