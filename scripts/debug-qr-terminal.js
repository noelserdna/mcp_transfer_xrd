#!/usr/bin/env node

/**
 * Script principal de testing rápido QR con qrcode-terminal
 * 
 * Uso:
 * npm run debug:qr [deeplink]
 * node scripts/debug-qr-terminal.js [deeplink]
 * 
 * Features:
 * - Testing rápido con qrcode-terminal
 * - Input de deeplink desde línea de comandos o interactivo
 * - Rendering inmediato en terminal
 * - Opciones de configuración (small, inverse, margin)
 * - Validación interactiva con usuario
 */

import qrcodeTerminal from 'qrcode-terminal';
import { createInterface } from 'readline';

// Configuraciones predefinidas para testing
const CONFIGS = {
  default: {
    small: false,
    errorCorrectionLevel: 'M'
  },
  small: {
    small: true,
    errorCorrectionLevel: 'M'
  },
  large: {
    small: false,
    errorCorrectionLevel: 'H'
  },
  minimal: {
    small: true,
    errorCorrectionLevel: 'L'
  },
  maxQuality: {
    small: false,
    errorCorrectionLevel: 'H'
  }
};

// Samples de deeplinks para testing rápido
const SAMPLE_DEEPLINKS = {
  short: 'radixwallet://transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8',
  medium: 'radixwallet://transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8%22%29%20%22withdraw%22%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2210%22%29%3BTAKE_FROM_WORKTOP%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2210%22%29%20Bucket%28%22bucket1%22%29%3B',
  long: 'https://wallet.radixdlt.com/transaction/v1?transactionManifest=CALL_METHOD%20Address%28%22account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpwgs64p5k8l5k8%22%29%20%22withdraw%22%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2250.5%22%29%3BTAKE_FROM_WORKTOP%20Address%28%22resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc%22%29%20Decimal%28%2250.5%22%29%20Bucket%28%22bucket1%22%29%3BCALL_METHOD%20Address%28%22account_tdx_2_129k0p567mllzxm4zwl5pxgvfa9zcnzun9tcjr4s5wr4xakmehz2zqz%22%29%20%22try_deposit_or_abort%22%20Bucket%28%22bucket1%22%29%20Enum%3C0u8%3E%28%29%3B&message=Transferencia%20de%20XRD%20desde%20script%20de%20testing'
};

class QRTerminalDebugger {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Valida que el deeplink sea válido para Radix Wallet
   */
  validateDeepLink(deeplink) {
    if (!deeplink || typeof deeplink !== 'string') {
      return { valid: false, error: 'Deep link vacío o inválido' };
    }

    const radixProtocols = [
      'radixwallet://',
      'https://wallet.radixdlt.com/',
      'https://radixwallet.com/'
    ];

    const isValid = radixProtocols.some(protocol => 
      deeplink.toLowerCase().startsWith(protocol.toLowerCase())
    );

    return {
      valid: isValid,
      error: isValid ? null : 'Deep link debe ser de Radix Wallet (radixwallet:// o https://wallet.radixdlt.com/)'
    };
  }

  /**
   * Genera QR con configuración específica
   */
  async generateQRWithConfig(deeplink, configName = 'default') {
    const config = CONFIGS[configName] || CONFIGS.default;
    
    console.log(`\n🔧 Configuración: ${configName}`);
    console.log(`   - Small: ${config.small}`);
    console.log(`   - Error Correction: ${config.errorCorrectionLevel}`);
    console.log(`   - Caracteres en deeplink: ${deeplink.length}`);
    
    const startTime = performance.now();
    
    try {
      // Capturar salida del QR
      let qrOutput = '';
      const originalWrite = process.stdout.write;
      process.stdout.write = function(chunk) {
        qrOutput += chunk;
        return originalWrite.apply(process.stdout, arguments);
      };

      qrcodeTerminal.generate(deeplink, config, (qrcode) => {
        process.stdout.write = originalWrite;
        const generationTime = Math.round(performance.now() - startTime);
        
        console.log(`\n📱 QR Code generado en ${generationTime}ms:\n`);
        console.log(qrcode);
        
        // Información adicional
        const lines = qrcode.split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        console.log(`\n📊 Métricas:`);
        console.log(`   - Líneas: ${nonEmptyLines.length}`);
        console.log(`   - Ancho aprox: ${Math.max(...nonEmptyLines.map(l => l.length))} caracteres`);
        console.log(`   - Tiempo generación: ${generationTime}ms`);
        console.log(`   - Tamaño: ${config.small ? 'Small' : 'Normal'}`);
      });
    } catch (error) {
      console.error(`❌ Error generando QR con config ${configName}:`, error.message);
    }
  }

  /**
   * Menu interactivo para seleccionar configuración
   */
  async selectConfiguration() {
    console.log('\n🎛️  Configuraciones disponibles:');
    Object.entries(CONFIGS).forEach(([name, config], index) => {
      console.log(`   ${index + 1}. ${name} - Small: ${config.small}, EC: ${config.errorCorrectionLevel}`);
    });
    
    const configNames = Object.keys(CONFIGS);
    
    return new Promise((resolve) => {
      this.rl.question('\nSelecciona configuración (1-5) o Enter para default: ', (answer) => {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < configNames.length) {
          resolve(configNames[index]);
        } else {
          resolve('default');
        }
      });
    });
  }

  /**
   * Menu para seleccionar deeplink de muestra
   */
  async selectSampleDeeplink() {
    console.log('\n📋 Deeplinks de muestra disponibles:');
    Object.entries(SAMPLE_DEEPLINKS).forEach(([name, link], index) => {
      const length = link.length;
      const preview = link.substring(0, 80) + (length > 80 ? '...' : '');
      console.log(`   ${index + 1}. ${name} (${length} chars): ${preview}`);
    });
    
    const sampleNames = Object.keys(SAMPLE_DEEPLINKS);
    
    return new Promise((resolve) => {
      this.rl.question('\nSelecciona muestra (1-3) o Enter para ingresar manualmente: ', (answer) => {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < sampleNames.length) {
          resolve(SAMPLE_DEEPLINKS[sampleNames[index]]);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Solicitar validación interactiva del usuario
   */
  async requestUserValidation() {
    console.log('\n❓ Validación interactiva:');
    
    const questions = [
      '¿El QR es legible en tu terminal? (s/n): ',
      '¿Los módulos están bien definidos? (s/n): ',
      '¿El tamaño es apropiado? (s/n): ',
      '¿Podrías escanearlo con tu móvil? (s/n): '
    ];
    
    const results = {};
    
    for (const question of questions) {
      const answer = await new Promise((resolve) => {
        this.rl.question(question, (response) => {
          resolve(response.toLowerCase().startsWith('s'));
        });
      });
      
      const key = question.split('¿')[1].split('?')[0];
      results[key] = answer;
    }
    
    console.log('\n📝 Resultados de validación:');
    Object.entries(results).forEach(([question, result]) => {
      console.log(`   ${result ? '✅' : '❌'} ${question}: ${result ? 'SÍ' : 'NO'}`);
    });
    
    return results;
  }

  /**
   * Función principal
   */
  async run() {
    console.log('🔍 Debug QR Terminal - Testing Rápido');
    console.log('=====================================\n');
    
    let deeplink = process.argv[2];
    
    // Si no se proporciona deeplink, usar menu interactivo
    if (!deeplink) {
      const sampleLink = await this.selectSampleDeeplink();
      
      if (sampleLink) {
        deeplink = sampleLink;
        console.log('✅ Usando deeplink de muestra seleccionado');
      } else {
        deeplink = await new Promise((resolve) => {
          this.rl.question('\n📝 Ingresa el deeplink de Radix Wallet: ', resolve);
        });
      }
    }
    
    // Validar deeplink
    const validation = this.validateDeepLink(deeplink);
    if (!validation.valid) {
      console.error(`❌ ${validation.error}`);
      this.rl.close();
      return;
    }
    
    console.log('✅ Deeplink válido para Radix Wallet');
    
    // Loop para testing con diferentes configuraciones
    let continueLoop = true;
    
    while (continueLoop) {
      const configName = await this.selectConfiguration();
      await this.generateQRWithConfig(deeplink, configName);
      
      // Validación interactiva
      const validation = await this.requestUserValidation();
      
      // Preguntar si continuar
      const shouldContinue = await new Promise((resolve) => {
        this.rl.question('\n🔄 ¿Probar otra configuración? (s/n): ', (answer) => {
          resolve(answer.toLowerCase().startsWith('s'));
        });
      });
      
      continueLoop = shouldContinue;
    }
    
    console.log('\n✅ Testing completado. ¡Hasta pronto!');
    this.rl.close();
  }

  /**
   * Cleanup
   */
  close() {
    this.rl.close();
  }
}

// Manejo de errores global
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Interrumpido por usuario. ¡Hasta pronto!');
  process.exit(0);
});

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const debugger = new QRTerminalDebugger();
  debugger.run().catch((error) => {
    console.error('❌ Error ejecutando debugger:', error);
    debugger.close();
    process.exit(1);
  });
}

export { QRTerminalDebugger };