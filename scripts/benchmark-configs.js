#!/usr/bin/env node

/**
 * Script de benchmarking comparativo de configuraciones QR
 * 
 * Uso:
 * npm run benchmark:qr
 * node scripts/benchmark-configs.js
 * 
 * Features:
 * - Testing comparativo automático
 * - Configuración actual vs Radix oficial vs híbrido
 * - Métricas de tiempo y calidad
 * - Reportes de performance
 * - Exportar resultados a JSON
 */

import qrcodeTerminal from 'qrcode-terminal';
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';

// Configuraciones para benchmarking
const BENCHMARK_CONFIGS = {
  // Configuración actual del proyecto
  current: {
    name: 'Current Project',
    small: false,
    errorCorrectionLevel: 'M'
  },
  
  // Configuración oficial Radix recomendada
  radixOfficial: {
    name: 'Radix Official',
    small: false,
    errorCorrectionLevel: 'H'
  },
  
  // Configuración híbrida L/H según análisis
  hybridL: {
    name: 'Hybrid Low EC',
    small: true,
    errorCorrectionLevel: 'L'
  },
  
  hybridH: {
    name: 'Hybrid High EC',
    small: false,
    errorCorrectionLevel: 'H'
  },
  
  // Configuraciones extremas para testing
  minimal: {
    name: 'Minimal Size',
    small: true,
    errorCorrectionLevel: 'L'
  },
  
  maxQuality: {
    name: 'Maximum Quality',
    small: false,
    errorCorrectionLevel: 'H'
  }
};

// Deeplinks de diferentes tamaños para benchmarking
const BENCHMARK_DEEPLINKS = {
  small: {
    name: 'Small Transaction',
    length: 'short',
    deeplink: 'radixwallet://transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8%22%29%20%22withdraw%22'
  },
  
  medium: {
    name: 'Medium Transaction',
    length: 'medium',
    deeplink: 'radixwallet://transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8%22%29%20%22withdraw%22%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2210%22%29%3BTAKE_FROM_WORKTOP%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2210%22%29%20Bucket%28%22bucket1%22%29%3BCALL_METHOD%20Address%28%22account_tdx_2_129k0p567mllzxm4zwl5pxgvfa9zcnzun9tcjr4s5wr4xakmehz2zqz%22%29%20%22try_deposit_or_abort%22%20Bucket%28%22bucket1%22%29%20Enum%3C0u8%3E%28%29%3B'
  },
  
  large: {
    name: 'Large Transaction',
    length: 'long',
    deeplink: 'https://wallet.radixdlt.com/transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8%22%29%20%22withdraw%22%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2250.5%22%29%3BTAKE_FROM_WORKTOP%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2250.5%22%29%20Bucket%28%22bucket1%22%29%3BCALL_METHOD%20Address%28%22account_tdx_2_129k0p567mllzxm4zwl5pxgvfa9zcnzun9tcjr4s5wr4xakmehz2zqz%22%29%20%22try_deposit_or_abort%22%20Bucket%28%22bucket1%22%29%20Enum%3C0u8%3E%28%29%3B&message=Transferencia%20de%20XRD%20con%20mensaje%20largo%20para%20testing%20de%20capacidad%20maxima%20del%20sistema%20QR&metadata=additional_data_for_testing_purposes'
  }
};

class QRBenchmarker {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      benchmarks: []
    };
  }

  /**
   * Captura la salida del QR sin mostrarla en terminal
   */
  async captureQRGeneration(deeplink, config) {
    return new Promise((resolve, reject) => {
      let qrOutput = '';
      let error = null;
      
      const startTime = performance.now();
      
      // Capturar stdout
      const originalWrite = process.stdout.write;
      process.stdout.write = function(chunk) {
        qrOutput += chunk.toString();
        return true;
      };
      
      try {
        qrcodeTerminal.generate(deeplink, config, (qrcode) => {
          const endTime = performance.now();
          process.stdout.write = originalWrite;
          
          // Calcular métricas
          const lines = qrcode.split('\n').filter(line => line.trim().length > 0);
          const maxWidth = Math.max(...lines.map(l => l.length));
          
          resolve({
            success: true,
            generationTime: Math.round(endTime - startTime),
            qrCode: qrcode,
            metrics: {
              lines: lines.length,
              maxWidth: maxWidth,
              totalCharacters: qrcode.length,
              outputSize: qrOutput.length
            }
          });
        });
      } catch (err) {
        process.stdout.write = originalWrite;
        reject(err);
      }
    });
  }

  /**
   * Evalúa la calidad visual del QR
   */
  evaluateQuality(qrCode, config) {
    const lines = qrCode.split('\n').filter(line => line.trim().length > 0);
    
    // Métricas básicas de calidad
    const density = lines.length > 0 ? lines[0].length / lines.length : 0;
    const uniformity = this.calculateUniformity(lines);
    const readability = this.estimateReadability(lines, config);
    
    return {
      density,
      uniformity,
      readability,
      overallScore: (density * 0.3 + uniformity * 0.3 + readability * 0.4)
    };
  }

  /**
   * Calcula la uniformidad del QR (qué tan consistente es el patrón)
   */
  calculateUniformity(lines) {
    if (lines.length === 0) return 0;
    
    const lengths = lines.map(line => line.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    // Retorna un score de 0-1 donde 1 es muy uniforme
    return Math.max(0, 1 - (variance / (avgLength * avgLength)));
  }

  /**
   * Estima la legibilidad basada en configuración y tamaño
   */
  estimateReadability(lines, config) {
    const size = lines.length;
    
    // Factores que afectan legibilidad
    let score = 0.5; // base score
    
    // El tamaño small puede ser menos legible
    if (config.small) {
      score -= 0.2;
    }
    
    // Error correction más alto = mejor legibilidad
    switch (config.errorCorrectionLevel) {
      case 'L': score += 0.1; break;
      case 'M': score += 0.2; break;
      case 'Q': score += 0.3; break;
      case 'H': score += 0.4; break;
    }
    
    // Tamaño óptimo para terminal
    if (size >= 20 && size <= 40) {
      score += 0.3;
    } else if (size < 15 || size > 50) {
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Ejecuta benchmark para una combinación específica
   */
  async runSingleBenchmark(deeplinkData, configData) {
    console.log(`⏱️  Testing: ${configData.name} + ${deeplinkData.name}...`);
    
    try {
      const result = await this.captureQRGeneration(deeplinkData.deeplink, configData);
      const quality = this.evaluateQuality(result.qrCode, configData);
      
      const benchmark = {
        configName: configData.name,
        deeplinkName: deeplinkData.name,
        deeplinkLength: deeplinkData.deeplink.length,
        config: configData,
        performance: {
          generationTime: result.generationTime,
          ...result.metrics
        },
        quality: quality,
        success: true
      };
      
      console.log(`   ✅ ${result.generationTime}ms - Quality: ${(quality.overallScore * 100).toFixed(1)}%`);
      return benchmark;
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return {
        configName: configData.name,
        deeplinkName: deeplinkData.name,
        deeplinkLength: deeplinkData.deeplink.length,
        config: configData,
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Ejecuta el benchmark completo
   */
  async runFullBenchmark() {
    console.log('🚀 Iniciando Benchmark Comparativo QR Terminal');
    console.log('================================================\n');
    
    const totalTests = Object.keys(BENCHMARK_CONFIGS).length * Object.keys(BENCHMARK_DEEPLINKS).length;
    let currentTest = 0;
    
    for (const [configKey, configData] of Object.entries(BENCHMARK_CONFIGS)) {
      for (const [deeplinkKey, deeplinkData] of Object.entries(BENCHMARK_DEEPLINKS)) {
        currentTest++;
        console.log(`📊 Test ${currentTest}/${totalTests}`);
        
        const benchmark = await this.runSingleBenchmark(deeplinkData, configData);
        this.results.benchmarks.push(benchmark);
        
        // Pequeña pausa para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.generateReport();
    this.exportResults();
  }

  /**
   * Genera reporte de análisis
   */
  generateReport() {
    console.log('\n📈 Análisis de Resultados');
    console.log('=========================\n');
    
    const successful = this.results.benchmarks.filter(b => b.success);
    const failed = this.results.benchmarks.filter(b => !b.success);
    
    console.log(`✅ Tests exitosos: ${successful.length}`);
    console.log(`❌ Tests fallidos: ${failed.length}\n`);
    
    if (successful.length > 0) {
      // Análisis de performance
      const avgTime = successful.reduce((acc, b) => acc + b.performance.generationTime, 0) / successful.length;
      const minTime = Math.min(...successful.map(b => b.performance.generationTime));
      const maxTime = Math.max(...successful.map(b => b.performance.generationTime));
      
      console.log('⚡ Performance:');
      console.log(`   Tiempo promedio: ${avgTime.toFixed(1)}ms`);
      console.log(`   Tiempo mínimo: ${minTime}ms`);
      console.log(`   Tiempo máximo: ${maxTime}ms\n`);
      
      // Análisis de calidad
      const avgQuality = successful.reduce((acc, b) => acc + b.quality.overallScore, 0) / successful.length;
      const bestQuality = successful.reduce((best, current) => 
        current.quality.overallScore > best.quality.overallScore ? current : best
      );
      
      console.log('🎯 Calidad:');
      console.log(`   Calidad promedio: ${(avgQuality * 100).toFixed(1)}%`);
      console.log(`   Mejor configuración: ${bestQuality.configName} (${(bestQuality.quality.overallScore * 100).toFixed(1)}%)\n`);
      
      // Ranking de configuraciones
      const configStats = this.analyzeConfigPerformance(successful);
      console.log('🏆 Ranking de Configuraciones:');
      configStats.forEach((config, index) => {
        console.log(`   ${index + 1}. ${config.name}`);
        console.log(`      Tiempo promedio: ${config.avgTime.toFixed(1)}ms`);
        console.log(`      Calidad promedio: ${(config.avgQuality * 100).toFixed(1)}%`);
        console.log(`      Score combinado: ${config.combinedScore.toFixed(2)}\n`);
      });
    }
    
    if (failed.length > 0) {
      console.log('⚠️  Tests fallidos:');
      failed.forEach(test => {
        console.log(`   ${test.configName} + ${test.deeplinkName}: ${test.error}`);
      });
    }
  }

  /**
   * Analiza performance por configuración
   */
  analyzeConfigPerformance(successfulTests) {
    const configGroups = {};
    
    successfulTests.forEach(test => {
      if (!configGroups[test.configName]) {
        configGroups[test.configName] = [];
      }
      configGroups[test.configName].push(test);
    });
    
    const configStats = Object.entries(configGroups).map(([name, tests]) => {
      const avgTime = tests.reduce((acc, t) => acc + t.performance.generationTime, 0) / tests.length;
      const avgQuality = tests.reduce((acc, t) => acc + t.quality.overallScore, 0) / tests.length;
      
      // Score combinado: favorece menor tiempo y mayor calidad
      const timeScore = Math.max(0, 1 - (avgTime - 50) / 200); // normalizar tiempo
      const qualityScore = avgQuality;
      const combinedScore = (timeScore * 0.4) + (qualityScore * 0.6);
      
      return {
        name,
        avgTime,
        avgQuality,
        combinedScore,
        testCount: tests.length
      };
    });
    
    return configStats.sort((a, b) => b.combinedScore - a.combinedScore);
  }

  /**
   * Exporta resultados a archivo JSON
   */
  exportResults() {
    const filename = `qr-benchmark-${new Date().toISOString().split('T')[0]}.json`;
    
    try {
      writeFileSync(filename, JSON.stringify(this.results, null, 2));
      console.log(`💾 Resultados exportados a: ${filename}`);
    } catch (error) {
      console.error('❌ Error exportando resultados:', error.message);
    }
  }

  /**
   * Genera recomendaciones basadas en resultados
   */
  generateRecommendations() {
    const successful = this.results.benchmarks.filter(b => b.success);
    if (successful.length === 0) return;
    
    const configPerf = this.analyzeConfigPerformance(successful);
    const best = configPerf[0];
    
    console.log('\n💡 Recomendaciones:');
    console.log('===================\n');
    
    console.log(`🥇 Configuración recomendada: ${best.name}`);
    console.log(`   Razón: Mejor balance entre velocidad y calidad\n`);
    
    // Recomendaciones específicas por caso de uso
    const fastestConfig = configPerf.reduce((fastest, current) => 
      current.avgTime < fastest.avgTime ? current : fastest
    );
    
    const highestQualityConfig = configPerf.reduce((highest, current) => 
      current.avgQuality > highest.avgQuality ? current : highest
    );
    
    console.log('📋 Recomendaciones por caso de uso:');
    console.log(`   🚀 Para máxima velocidad: ${fastestConfig.name} (${fastestConfig.avgTime.toFixed(1)}ms)`);
    console.log(`   🎨 Para máxima calidad: ${highestQualityConfig.name} (${(highestQualityConfig.avgQuality * 100).toFixed(1)}%)`);
    console.log(`   ⚖️  Para uso general: ${best.name} (balance óptimo)`);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmarker = new QRBenchmarker();
  
  benchmarker.runFullBenchmark()
    .then(() => {
      benchmarker.generateRecommendations();
      console.log('\n✅ Benchmark completado exitosamente');
    })
    .catch((error) => {
      console.error('❌ Error ejecutando benchmark:', error);
      process.exit(1);
    });
}

export { QRBenchmarker };