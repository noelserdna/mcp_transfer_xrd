#!/usr/bin/env node
/**
 * Script de testing independiente para QR codes con qrcode-terminal
 * Permite testing rápido sin necesidad del servidor MCP
 */

import qrcode from 'qrcode-terminal';
import { createInterface } from 'readline';

// Configuraciones de testing predefinidas
const TEST_CONFIGS = {
  current: {
    name: "Configuración Actual (L + SVG optimizado)",
    description: "Error correction L para máxima capacidad de datos",
    options: { small: false, inverse: false }
  },
  radix: {
    name: "Configuración Radix Oficial (H + SVG)",
    description: "Error correction H para máxima confiabilidad",
    options: { small: false, inverse: false }
  },
  compact: {
    name: "Configuración Compacta (Terminal pequeño)",
    description: "QR compacto para terminales con espacio limitado",
    options: { small: true, inverse: false }
  },
  inverse: {
    name: "Configuración Inversa (Fondo oscuro)",
    description: "Colores invertidos para terminales de fondo oscuro",
    options: { small: false, inverse: true }
  }
};

// Deep links de ejemplo para testing
const SAMPLE_DEEPLINKS = {
  short: "radixwallet://transaction/simple?amount=10",
  medium: "radixwallet://transaction/send?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=100.5&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc",
  long: "radixwallet://connect?sessionId=645b0930-df7f-4a57-998f-91656c352322&request=eyJpbnRlcmFjdGlvbklkIjoiMjY3OTA0NDItMjA4Mi00MDE0LWIxMGYtZGRhNTNjNGJiMDc5IiwibWV0YWRhdGEiOnsidmVyc2lvbiI6MiwibmV0d29ya0lkIjoyLCJkQXBwRGVmaW5pdGlvbkFkZHJlc3MiOiJhY2NvdW50X3RkeF8yXzEyOGc3MHF1ejN1Z3hxcmo5NHM3ajB1YzR4eThqZXlnczB2dXRqZmFtbjMwdXJueG4zczUyY3QiLCJvcmlnaW4iOiJodHRwczovL3dlbGxyYWRpeC5wYWdlcy5kZXYvIn0sIml0ZW1zIjp7ImRpc2NyaW1pbmF0b3IiOiJ0cmFuc2FjdGlvbiIsInNlbmQiOnsidHJhbnNhY3Rpb25NYW5pZmVzdCI6IkNBTExfTUVUSE9EXG4gICAgQWRkcmVzcyhcImFjY291bnRfdGR4XzJfMTI4ZzcwcXV6M3VneHFyajk0czdqMHVjNHh5OGpleWdzMHZ1dGpmYW1uMzB1cm54bjNzNTJjdFwiKVxuICAgIFwid2l0aGRyYXdcIlxuICAgIEFkZHJlc3MoXCJyZXNvdXJjZV90ZHhfMl8xdGtueHh4eHh4eHJhZHhyZHh4eHh4eHh4eHgwMDk5MjM1NTQ3OTh4eHh4eHh4eHh0ZmQyamNcIilcbiAgICBEZWNpbWFsKFwiMlwiKVxuO1xuVEFLRV9GUk9NX1dPUktUT1BcbiAgICBBZGRyZXNzKFwicmVzb3VyY2VfdGR4XzJfMXRrbnl4eHh4eHh4eHJhZHhyZHh4eHh4eHh4eHgwMDk5MjM1NTQ3OTh4eHh4eHh4eHh0ZmQyamNcIilcbiAgICBEZWNpbWFsKFwiMlwiKVxuICAgIEJ1Y2tldChcImJ1Y2tldDFcIilcbjtcbkNBTExfTUVUSE9EXG4gICAgQWRkcmVzcyhcImFjY291bnRfdGR4XzJfMTJ4MDJ0YWh4NmF5Nm43c2d6MDk0bG03ZjByZWM0N3Nrc2tjdDQwMHQzZXBzZm5tdGxrdHh3bVwiKVxuICAgIFwidHJ5X2RlcG9zaXRfb3JfYWJvcnRcIlxuICAgIEJ1Y2tldChcImJ1Y2tldDFcIilcbiAgICBFbnVtPDB1OD4oKVxuOyIsInZlcnNpb24iOjEsIm1lc3NhZ2UiOiJUcmFuc2ZlcmVuY2lhIFhSRCB2aWEgUVIifX19&signature=e00d4b510e099e6659fb46767a4aaee8b322f986c454faca6b87394f803fb1e160f0e1688ea177f1087e5892b7bdb6b656cdbcb347d4e8b36221e6360e382507&publicKey=9964f3e5c4b34b1e39f87dbd37a2411c5692f7f1c14b1d25abf29fc2b90a887c"
};

class QRTerminalTester {
  constructor() {
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log('🔬 QR Terminal Testing Tool');
    console.log('========================================\n');

    try {
      const mode = await this.selectMode();
      
      switch (mode) {
        case '1':
          await this.quickTest();
          break;
        case '2':
          await this.compareConfigurations();
          break;
        case '3':
          await this.customTest();
          break;
        case '4':
          await this.runAllSamples();
          break;
        default:
          console.log('Opción inválida');
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async selectMode() {
    console.log('Selecciona modo de testing:');
    console.log('1. 🚀 Quick Test - Testing rápido con deep link personalizado');
    console.log('2. ⚖️  Compare - Comparar todas las configuraciones');
    console.log('3. 🛠️  Custom - Testing personalizado avanzado');
    console.log('4. 📋 Samples - Probar con deep links de ejemplo');
    console.log('');

    return await this.question('Selecciona opción (1-4): ');
  }

  async quickTest() {
    console.log('\n🚀 Quick Test Mode');
    console.log('===================\n');

    const deeplink = await this.question('Ingresa deep link para testing: ');
    
    if (!deeplink.trim()) {
      console.log('❌ Deep link requerido');
      return;
    }

    console.log('\n📊 Información del Deep Link:');
    console.log(`📏 Longitud: ${deeplink.length} caracteres`);
    console.log(`🔗 Protocolo: ${this.getProtocol(deeplink)}`);
    console.log(`💡 Recomendación: ${this.getRecommendedConfig(deeplink)}\n`);

    await this.renderQR(deeplink, { small: false });
    
    const again = await this.question('\n¿Probar con otra configuración? (y/n): ');
    if (again.toLowerCase() === 'y') {
      await this.customTest();
    }
  }

  async compareConfigurations() {
    console.log('\n⚖️ Configuration Comparison Mode');
    console.log('==================================\n');

    const deeplink = await this.question('Ingresa deep link para comparar: ');
    
    if (!deeplink.trim()) {
      console.log('❌ Deep link requerido');
      return;
    }

    console.log(`\n🔬 Testing ${deeplink.length} caracteres con todas las configuraciones...\n`);

    for (const [key, config] of Object.entries(TEST_CONFIGS)) {
      console.log(`\n--- ${config.name} ---`);
      console.log(`📝 ${config.description}`);
      
      await this.renderQR(deeplink, config.options);
      
      const feedback = await this.question('¿Funciona correctamente? (y/n/s para skip): ');
      if (feedback.toLowerCase() === 's') break;
      
      console.log(feedback.toLowerCase() === 'y' ? '✅ Funciona' : '❌ No funciona');
      console.log('─'.repeat(50));
    }

    console.log('\n📋 Testing completado. Revisa los resultados arriba.');
  }

  async customTest() {
    console.log('\n🛠️ Custom Test Mode');
    console.log('====================\n');

    const deeplink = await this.question('Deep link: ');
    if (!deeplink.trim()) {
      console.log('❌ Deep link requerido');
      return;
    }

    console.log('\nOpciones de configuración:');
    const small = await this.question('¿QR pequeño? (y/n): ');
    const inverse = await this.question('¿Colores invertidos? (y/n): ');

    const options = {
      small: small.toLowerCase() === 'y',
      inverse: inverse.toLowerCase() === 'y'
    };

    console.log(`\n🎯 Testing con configuración personalizada: ${JSON.stringify(options)}\n`);
    
    await this.renderQR(deeplink, options);
  }

  async runAllSamples() {
    console.log('\n📋 Sample Deep Links Testing');
    console.log('==============================\n');

    for (const [key, deeplink] of Object.entries(SAMPLE_DEEPLINKS)) {
      console.log(`\n🔗 Testing ${key.toUpperCase()} deep link (${deeplink.length} chars)`);
      console.log(`📝 ${deeplink.substring(0, 80)}${deeplink.length > 80 ? '...' : ''}`);
      
      await this.renderQR(deeplink, { small: false });
      
      const continue_test = await this.question('¿Continuar con el siguiente? (y/n): ');
      if (continue_test.toLowerCase() === 'n') break;
    }
  }

  async renderQR(deeplink, options = {}) {
    try {
      const startTime = Date.now();
      
      console.log('\n' + '='.repeat(60));
      qrcode.generate(deeplink, options);
      console.log('='.repeat(60));
      
      const renderTime = Date.now() - startTime;
      console.log(`⏱️ Tiempo de renderizado: ${renderTime}ms`);
      console.log(`📱 Escanea con Radix Wallet para validar\n`);
      
    } catch (error) {
      console.error(`❌ Error renderizando QR: ${error.message}`);
    }
  }

  getProtocol(deeplink) {
    if (deeplink.startsWith('radixwallet://')) return 'radixwallet://';
    if (deeplink.startsWith('https://wallet.radixdlt.com/')) return 'wallet.radixdlt.com';
    return 'desconocido';
  }

  getRecommendedConfig(deeplink) {
    const length = deeplink.length;
    
    if (length < 400) return 'Error correction H (máxima confiabilidad)';
    if (length < 800) return 'Error correction M (balance óptimo)';
    if (length < 1200) return 'Error correction L (máxima capacidad)';
    return 'Error correction L + optimizaciones especiales';
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Script principal
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new QRTerminalTester();
  tester.run().catch(console.error);
}

export { QRTerminalTester };