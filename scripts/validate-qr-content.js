#!/usr/bin/env node

/**
 * Script de validación de contenido QR
 * 
 * Uso:
 * npm run validate:qr
 * node scripts/validate-qr-content.js [deeplink]
 * 
 * Features:
 * - Validación de contenido QR
 * - Comparación con deeplink original  
 * - Testing de integridad de datos
 * - Detección de corrupción
 * - Análisis de capacidad de datos
 */

import qrcodeTerminal from 'qrcode-terminal';
import { createInterface } from 'readline';
import { performance } from 'perf_hooks';

// Límites teóricos de capacidad QR por nivel de error correction
const QR_CAPACITY_LIMITS = {
  L: { // ~7% error correction
    alphanumeric: 4296,
    numeric: 7089,
    binary: 2953
  },
  M: { // ~15% error correction  
    alphanumeric: 3391,
    numeric: 5596,
    binary: 2331
  },
  Q: { // ~25% error correction
    alphanumeric: 2420,
    numeric: 3993,
    binary: 1663
  },
  H: { // ~30% error correction
    alphanumeric: 1852,
    numeric: 3057,
    binary: 1273
  }
};

class QRContentValidator {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Analiza el contenido del deeplink
   */
  analyzeDeeplinkContent(deeplink) {
    const analysis = {
      totalLength: deeplink.length,
      protocol: this.extractProtocol(deeplink),
      hasTransactionManifest: deeplink.includes('transactionManifest'),
      hasMessage: deeplink.includes('message'),
      hasMetadata: deeplink.includes('metadata'),
      encodedContent: this.analyzeEncoding(deeplink),
      estimatedQRVersion: this.estimateQRVersion(deeplink.length)
    };
    
    return analysis;
  }

  /**
   * Extrae el protocolo del deeplink
   */
  extractProtocol(deeplink) {
    if (deeplink.startsWith('radixwallet://')) {
      return { type: 'radixwallet', secure: false };
    } else if (deeplink.startsWith('https://wallet.radixdlt.com/')) {
      return { type: 'web', secure: true };
    } else if (deeplink.startsWith('https://radixwallet.com/')) {
      return { type: 'web-alt', secure: true };
    } else {
      return { type: 'unknown', secure: false };
    }
  }

  /**
   * Analiza el tipo de encoding del contenido
   */
  analyzeEncoding(deeplink) {
    const urlEncodedChars = (deeplink.match(/%[0-9A-Fa-f]{2}/g) || []).length;
    const alphanumericChars = (deeplink.match(/[A-Za-z0-9]/g) || []).length;
    const numericChars = (deeplink.match(/[0-9]/g) || []).length;
    const specialChars = deeplink.length - alphanumericChars;
    
    return {
      urlEncodedChars,
      alphanumericChars,
      numericChars,
      specialChars,
      encodingRatio: urlEncodedChars / deeplink.length,
      dataType: this.determineDataType(deeplink)
    };
  }

  /**
   * Determina el tipo de datos predominante
   */
  determineDataType(content) {
    const numericOnly = /^[0-9]+$/.test(content);
    const alphanumericOnly = /^[A-Z0-9 $%*+\-./:]+$/i.test(content);
    
    if (numericOnly) return 'numeric';
    if (alphanumericOnly) return 'alphanumeric';
    return 'binary';
  }

  /**
   * Estima la versión QR necesaria basada en longitud
   */
  estimateQRVersion(length) {
    // Estimación simplificada basada en capacidad typical
    if (length <= 25) return { version: 1, modules: 21 };
    if (length <= 47) return { version: 2, modules: 25 };
    if (length <= 77) return { version: 3, modules: 29 };
    if (length <= 114) return { version: 4, modules: 33 };
    if (length <= 154) return { version: 5, modules: 37 };
    if (length <= 195) return { version: 6, modules: 41 };
    if (length <= 224) return { version: 7, modules: 45 };
    if (length <= 279) return { version: 8, modules: 49 };
    if (length <= 335) return { version: 9, modules: 53 };
    if (length <= 395) return { version: 10, modules: 57 };
    
    // Para longitudes mayores, estimación lineal
    const estimatedVersion = Math.min(40, Math.ceil(length / 50) + 5);
    const estimatedModules = 17 + (estimatedVersion * 4);
    
    return { 
      version: estimatedVersion, 
      modules: estimatedModules,
      estimated: true 
    };
  }

  /**
   * Verifica si el deeplink puede caber en QR con diferentes configs
   */
  validateCapacity(deeplink) {
    const analysis = this.analyzeDeeplinkContent(deeplink);
    const results = {};
    
    Object.entries(QR_CAPACITY_LIMITS).forEach(([level, limits]) => {
      const dataType = analysis.encodedContent.dataType;
      const maxCapacity = limits[dataType] || limits.binary;
      
      results[level] = {
        fits: deeplink.length <= maxCapacity,
        capacity: maxCapacity,
        usage: (deeplink.length / maxCapacity) * 100,
        margin: maxCapacity - deeplink.length
      };
    });
    
    return results;
  }

  /**
   * Genera QR y analiza la salida
   */
  async generateAndAnalyzeQR(deeplink, config) {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      let qrOutput = '';
      let success = false;
      
      // Capturar stdout sin mostrar
      const originalWrite = process.stdout.write;
      process.stdout.write = function(chunk) {
        qrOutput += chunk.toString();
        return true;
      };
      
      try {
        qrcodeTerminal.generate(deeplink, config, (qrcode) => {
          const endTime = performance.now();
          process.stdout.write = originalWrite;
          success = true;
          
          const analysis = this.analyzeQROutput(qrcode);
          
          resolve({
            success: true,
            generationTime: Math.round(endTime - startTime),
            qrcode,
            analysis,
            rawOutput: qrOutput
          });
        });
      } catch (error) {
        process.stdout.write = originalWrite;
        resolve({
          success: false,
          error: error.message,
          generationTime: Math.round(performance.now() - startTime)
        });
      }
      
      // Timeout de seguridad
      setTimeout(() => {
        if (!success) {
          process.stdout.write = originalWrite;
          resolve({
            success: false,
            error: 'Timeout - QR generation took too long',
            generationTime: Math.round(performance.now() - startTime)
          });
        }
      }, 5000);
    });
  }

  /**
   * Analiza la salida del QR generado
   */
  analyzeQROutput(qrcode) {
    const lines = qrcode.split('\n').filter(line => line.trim().length > 0);
    const charCounts = this.countCharacterTypes(qrcode);
    
    return {
      dimensions: {
        height: lines.length,
        width: lines.length > 0 ? Math.max(...lines.map(l => l.length)) : 0
      },
      characterAnalysis: charCounts,
      patterns: this.analyzePatterns(lines),
      quality: this.assessOutputQuality(lines)
    };
  }

  /**
   * Cuenta tipos de caracteres en la salida QR
   */
  countCharacterTypes(qrcode) {
    const chars = qrcode.split('');
    const counts = {};
    
    chars.forEach(char => {
      counts[char] = (counts[char] || 0) + 1;
    });
    
    // Clasificar caracteres
    const whitespace = (counts[' '] || 0) + (counts['\n'] || 0) + (counts['\t'] || 0);
    const blocks = (counts['█'] || 0) + (counts['▀'] || 0) + (counts['▄'] || 0) + (counts['▌'] || 0) + (counts['▐'] || 0);
    const other = Object.values(counts).reduce((a, b) => a + b, 0) - whitespace - blocks;
    
    return {
      total: qrcode.length,
      whitespace,
      blocks,
      other,
      uniqueChars: Object.keys(counts).length,
      distribution: counts
    };
  }

  /**
   * Analiza patrones en el QR
   */
  analyzePatterns(lines) {
    if (lines.length === 0) return { valid: false };
    
    // Verificar patrón cuadrado
    const isSquare = lines.every(line => line.length === lines.length);
    
    // Verificar patrones de finder (esquinas)
    const hasCornerPatterns = this.checkCornerPatterns(lines);
    
    // Verificar alternancia (no debería ser todo igual)
    const hasVariation = this.checkVariation(lines);
    
    return {
      isSquare,
      hasCornerPatterns,
      hasVariation,
      estimatedVersion: this.estimateVersionFromSize(lines.length)
    };
  }

  /**
   * Verifica patrones en las esquinas (finder patterns simplificado)
   */
  checkCornerPatterns(lines) {
    if (lines.length < 7) return false;
    
    // Verificar que las esquinas no estén vacías
    const topLeft = lines[0].substring(0, 7);
    const topRight = lines[0].substring(lines[0].length - 7);
    const bottomLeft = lines[lines.length - 1].substring(0, 7);
    
    return topLeft.trim().length > 0 && 
           topRight.trim().length > 0 && 
           bottomLeft.trim().length > 0;
  }

  /**
   * Verifica que hay variación en el patrón
   */
  checkVariation(lines) {
    if (lines.length === 0) return false;
    
    const firstLine = lines[0];
    const allSame = lines.every(line => line === firstLine);
    
    return !allSame;
  }

  /**
   * Estima versión QR desde tamaño de salida
   */
  estimateVersionFromSize(size) {
    // Los QR tienen dimensiones 21 + (version-1)*4
    // version = (size - 17) / 4
    const estimatedVersion = Math.round((size - 17) / 4);
    return Math.max(1, Math.min(40, estimatedVersion));
  }

  /**
   * Evalúa la calidad de la salida
   */
  assessOutputQuality(lines) {
    if (lines.length === 0) {
      return { score: 0, issues: ['No output generated'] };
    }
    
    const issues = [];
    let score = 1.0;
    
    // Verificar dimensiones
    if (lines.length < 10) {
      issues.push('QR size very small, may be hard to scan');
      score -= 0.2;
    }
    
    if (lines.length > 80) {
      issues.push('QR size very large, may not fit in terminal');
      score -= 0.1;
    }
    
    // Verificar forma
    const isRectangle = lines.every(line => line.length === lines[0].length);
    if (!isRectangle) {
      issues.push('QR is not perfectly square');
      score -= 0.3;
    }
    
    // Verificar contenido
    const totalChars = lines.join('').length;
    const uniqueChars = new Set(lines.join('')).size;
    
    if (uniqueChars < 2) {
      issues.push('QR has no variation, likely corrupted');
      score -= 0.5;
    }
    
    return {
      score: Math.max(0, score),
      issues,
      recommendations: this.generateQualityRecommendations(issues)
    };
  }

  /**
   * Genera recomendaciones basadas en issues de calidad
   */
  generateQualityRecommendations(issues) {
    const recommendations = [];
    
    issues.forEach(issue => {
      switch (true) {
        case issue.includes('very small'):
          recommendations.push('Considera usar error correction nivel H para mejor escaneado');
          break;
        case issue.includes('very large'):
          recommendations.push('Usa error correction nivel L y small:true para reducir tamaño');
          break;
        case issue.includes('not perfectly square'):
          recommendations.push('Verifica configuración del terminal o encoding');
          break;
        case issue.includes('no variation'):
          recommendations.push('Verifica que el deeplink sea válido y no esté corrupto');
          break;
      }
    });
    
    return recommendations;
  }

  /**
   * Ejecuta validación completa
   */
  async runCompleteValidation(deeplink) {
    console.log('🔍 Iniciando Validación Completa de Contenido QR');
    console.log('================================================\n');
    
    // 1. Análisis del deeplink original
    console.log('📋 1. Análisis del Deeplink Original');
    console.log('-----------------------------------');
    const contentAnalysis = this.analyzeDeeplinkContent(deeplink);
    
    console.log(`Longitud total: ${contentAnalysis.totalLength} caracteres`);
    console.log(`Protocolo: ${contentAnalysis.protocol.type} (${contentAnalysis.protocol.secure ? 'seguro' : 'no seguro'})`);
    console.log(`Manifest incluido: ${contentAnalysis.hasTransactionManifest ? 'Sí' : 'No'}`);
    console.log(`Mensaje incluido: ${contentAnalysis.hasMessage ? 'Sí' : 'No'}`);
    console.log(`Tipo de datos: ${contentAnalysis.encodedContent.dataType}`);
    console.log(`Versión QR estimada: ${contentAnalysis.estimatedQRVersion.version} (${contentAnalysis.estimatedQRVersion.modules}x${contentAnalysis.estimatedQRVersion.modules} módulos)`);
    
    // 2. Análisis de capacidad
    console.log('\n📊 2. Análisis de Capacidad por Nivel de Error Correction');
    console.log('----------------------------------------------------------');
    const capacityAnalysis = this.validateCapacity(deeplink);
    
    Object.entries(capacityAnalysis).forEach(([level, data]) => {
      const status = data.fits ? '✅' : '❌';
      console.log(`${status} Nivel ${level}: ${data.usage.toFixed(1)}% usado (${data.margin} caracteres ${data.fits ? 'disponibles' : 'excedidos'})`);
    });
    
    // 3. Generación y análisis de QR con diferentes configuraciones
    console.log('\n🎯 3. Testing de Generación QR');
    console.log('------------------------------');
    
    const testConfigs = [
      { name: 'Minimal (L)', small: true, errorCorrectionLevel: 'L' },
      { name: 'Standard (M)', small: false, errorCorrectionLevel: 'M' },
      { name: 'High Quality (H)', small: false, errorCorrectionLevel: 'H' }
    ];
    
    const results = [];
    
    for (const config of testConfigs) {
      console.log(`Testing ${config.name}...`);
      const result = await this.generateAndAnalyzeQR(deeplink, config);
      results.push({ config, result });
      
      if (result.success) {
        console.log(`  ✅ Generado en ${result.generationTime}ms`);
        console.log(`  📐 Dimensiones: ${result.analysis.dimensions.width}x${result.analysis.dimensions.height}`);
        console.log(`  🎯 Calidad: ${(result.analysis.quality.score * 100).toFixed(1)}%`);
        
        if (result.analysis.quality.issues.length > 0) {
          console.log(`  ⚠️  Issues: ${result.analysis.quality.issues.join(', ')}`);
        }
      } else {
        console.log(`  ❌ Error: ${result.error}`);
      }
    }
    
    // 4. Recomendaciones finales
    this.generateFinalRecommendations(deeplink, capacityAnalysis, results);
  }

  /**
   * Genera recomendaciones finales
   */
  generateFinalRecommendations(deeplink, capacityAnalysis, results) {
    console.log('\n💡 4. Recomendaciones Finales');
    console.log('============================\n');
    
    const successfulResults = results.filter(r => r.result.success);
    
    if (successfulResults.length === 0) {
      console.log('❌ No se pudo generar QR con ninguna configuración.');
      console.log('🔧 Recomendaciones:');
      console.log('   - Verifica que el deeplink sea válido');
      console.log('   - Considera acortar el contenido');
      console.log('   - Usa un acortador de URLs');
      return;
    }
    
    // Encontrar la mejor configuración
    const bestResult = successfulResults.reduce((best, current) => {
      const bestScore = best.result.analysis.quality.score;
      const currentScore = current.result.analysis.quality.score;
      return currentScore > bestScore ? current : best;
    });
    
    console.log(`🏆 Configuración recomendada: ${bestResult.config.name}`);
    console.log(`   Razón: Mejor calidad general (${(bestResult.result.analysis.quality.score * 100).toFixed(1)}%)\n`);
    
    // Recomendaciones específicas por contexto
    console.log('📋 Recomendaciones por caso de uso:');
    
    if (capacityAnalysis.L.fits) {
      console.log('   🚀 Para máxima velocidad: Usar nivel L (menor overhead)');
    }
    
    if (capacityAnalysis.H.fits) {
      console.log('   📱 Para escaneado móvil: Usar nivel H (mejor error correction)');
    }
    
    if (deeplink.length > 500) {
      console.log('   📏 Para deeplinks largos: Considera usar small:true para reducir tamaño visual');
    }
    
    // Advertencias
    const failedLevels = Object.entries(capacityAnalysis)
      .filter(([level, data]) => !data.fits)
      .map(([level]) => level);
    
    if (failedLevels.length > 0) {
      console.log(`\n⚠️  Advertencia: No cabe en niveles de error correction: ${failedLevels.join(', ')}`);
      console.log('   Considera reducir el contenido del deeplink o usar acortador de URLs');
    }
  }

  /**
   * Función principal
   */
  async run() {
    let deeplink = process.argv[2];
    
    if (!deeplink) {
      deeplink = await new Promise((resolve) => {
        this.rl.question('📝 Ingresa el deeplink de Radix Wallet para validar: ', resolve);
      });
    }
    
    if (!deeplink || deeplink.trim().length === 0) {
      console.error('❌ Error: Deeplink requerido');
      this.rl.close();
      return;
    }
    
    try {
      await this.runCompleteValidation(deeplink.trim());
    } catch (error) {
      console.error('❌ Error durante validación:', error);
    } finally {
      this.rl.close();
    }
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new QRContentValidator();
  validator.run().catch((error) => {
    console.error('❌ Error ejecutando validador:', error);
    process.exit(1);
  });
}

export { QRContentValidator };