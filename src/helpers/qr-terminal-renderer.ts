/**
 * QRTerminalRenderer - Wrapper para qrcode-terminal
 * Maneja rendering de QR codes directamente en terminal con captura segura de output
 */

import qrcode from 'qrcode-terminal';
import { Writable } from 'stream';

export interface QRTerminalOptions {
  small?: boolean;           // Usar versión pequeña del QR
  inverse?: boolean;         // Invertir colores
  margin?: number;          // Margin alrededor del QR
  colorize?: boolean;       // Usar colores ANSI
}

export interface QRTerminalResult {
  qrString: string;         // QR renderizado como string
  options: QRTerminalOptions;
  deeplink: string;
  renderTime: number;
  success: boolean;
  error?: string;
}

export class QRTerminalRenderer {
  
  /**
   * Renderiza QR code en terminal y captura el output
   */
  async renderQR(deeplink: string, options: QRTerminalOptions = {}): Promise<QRTerminalResult> {
    const startTime = performance.now();
    
    try {
      // Validar deep link básico
      if (!deeplink || typeof deeplink !== 'string') {
        throw new Error('Deep link debe ser una string válida');
      }

      // Configurar opciones por defecto
      const finalOptions: QRTerminalOptions = {
        small: options.small ?? false,
        inverse: options.inverse ?? false,
        margin: options.margin ?? 1,
        colorize: options.colorize ?? true,
        ...options
      };

      // Capturar output de qrcode-terminal
      const qrString = await this.captureQROutput(deeplink, finalOptions);
      
      const renderTime = performance.now() - startTime;

      return {
        qrString,
        options: finalOptions,
        deeplink,
        renderTime,
        success: true
      };

    } catch (error) {
      const renderTime = performance.now() - startTime;
      
      return {
        qrString: '',
        options,
        deeplink,
        renderTime,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Captura el output de qrcode-terminal sin interferir con stdout del proceso principal
   */
  private async captureQROutput(deeplink: string, options: QRTerminalOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      // Buffer para capturar output
      let output = '';
      
      // Stream personalizado para capturar escritura
      const captureStream = new Writable({
        write(chunk: any, encoding: string, callback: Function) {
          output += chunk.toString();
          callback();
        }
      });

      try {
        // Configurar opciones para qrcode-terminal
        const qrOptions = {
          small: options.small,
          ...(options.inverse && { inverse: true })
        };

        // Generar QR con callback
        qrcode.generate(deeplink, { small: qrOptions.small || false }, (qrCode: string) => {
          resolve(qrCode);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Renderiza QR directamente en terminal (para debugging)
   */
  async renderDirectToTerminal(deeplink: string, options: QRTerminalOptions = {}): Promise<void> {
    const qrOptions = {
      small: options.small ?? false,
      ...(options.inverse && { inverse: true })
    };

    console.log('\n=== QR CODE FOR TESTING ===');
    console.log(`Deep link: ${deeplink}`);
    console.log(`Length: ${deeplink.length} characters`);
    console.log(`Options: ${JSON.stringify(qrOptions)}\n`);

    qrcode.generate(deeplink, qrOptions);

    console.log('\n🔍 Escanea este QR con tu móvil para validar');
    console.log('📱 Verifica que abre Radix Wallet correctamente\n');
  }

  /**
   * Valida compatibilidad del terminal con QR codes
   */
  validateTerminalCompatibility(): {
    compatible: boolean;
    features: {
      ansiColors: boolean;
      unicodeSupport: boolean;
      fontSize: 'small' | 'medium' | 'large';
    };
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Detectar soporte ANSI colors
    const ansiColors = process.stdout.isTTY && !!process.env.COLORTERM;
    if (!ansiColors) {
      recommendations.push('Habilita colores ANSI para mejor visualización');
    }

    // Detectar soporte Unicode
    const unicodeSupport = process.stdout.isTTY;
    if (!unicodeSupport) {
      recommendations.push('Terminal con soporte Unicode recomendado');
    }

    // Estimar tamaño de fuente basado en columnas
    const columns = process.stdout.columns || 80;
    const fontSize = columns > 120 ? 'large' : columns > 80 ? 'medium' : 'small';
    
    if (fontSize === 'small') {
      recommendations.push('Considera usar opción small:true para QR más compactos');
    }

    return {
      compatible: ansiColors && unicodeSupport,
      features: {
        ansiColors,
        unicodeSupport,
        fontSize
      },
      recommendations
    };
  }
}

// Instancia singleton para reutilización
export const qrTerminalRenderer = new QRTerminalRenderer();