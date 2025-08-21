// Helper para generación de códigos QR
// Fase 2.2: Implementación de funciones de generación SVG/PNG

import QRCode from 'qrcode';
import { 
  DeepLinkToQRParams, 
  QRGenerationResult, 
  QRMetadata, 
  QRConfig, 
  QR_CONFIG_DEFAULT, 
  QR_SIZE_DEFAULT 
} from '../types/qr-types.js';

export class QRGenerator {
  private config: QRConfig;

  constructor(config: QRConfig = QR_CONFIG_DEFAULT) {
    this.config = config;
  }

  /**
   * Valida que el deep link sea válido para Radix Wallet
   */
  private validateDeepLink(deeplink: string): boolean {
    if (!deeplink || typeof deeplink !== 'string') {
      return false;
    }

    // Verificar que sea un deep link de Radix Wallet
    const radixProtocols = [
      'radixwallet://',
      'https://wallet.radixdlt.com/',
      'https://radixwallet.com/'
    ];

    return radixProtocols.some(protocol => 
      deeplink.toLowerCase().startsWith(protocol.toLowerCase())
    );
  }

  /**
   * Genera código QR en formato SVG
   */
  async generateSVG(deeplink: string): Promise<string> {
    if (!this.validateDeepLink(deeplink)) {
      throw new Error('Deep link inválido para Radix Wallet');
    }

    try {
      const svgString = await QRCode.toString(deeplink, {
        type: 'svg',
        errorCorrectionLevel: this.config.errorCorrectionLevel,
        margin: this.config.margin,
        color: this.config.color
      });

      return svgString;
    } catch (error) {
      throw new Error(`Error generando SVG: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera código QR en formato PNG como base64
   */
  async generatePNG(deeplink: string, size: number = QR_SIZE_DEFAULT): Promise<string> {
    if (!this.validateDeepLink(deeplink)) {
      throw new Error('Deep link inválido para Radix Wallet');
    }

    if (size <= 0 || size > 2048) {
      throw new Error('Tamaño debe estar entre 1 y 2048 píxeles');
    }

    try {
      const pngBuffer = await QRCode.toBuffer(deeplink, {
        errorCorrectionLevel: this.config.errorCorrectionLevel,
        margin: this.config.margin,
        color: this.config.color,
        width: size
      });

      return pngBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Error generando PNG: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera códigos QR en los formatos especificados
   */
  async generateQR(params: DeepLinkToQRParams): Promise<QRGenerationResult> {
    const { deeplink, formato = 'both', tamaño = QR_SIZE_DEFAULT } = params;

    if (!this.validateDeepLink(deeplink)) {
      throw new Error('❌ Deep link inválido. Debe ser un enlace válido de Radix Wallet.');
    }

    const formatosGenerados: string[] = [];
    let svg: string | undefined;
    let png_base64: string | undefined;

    try {
      // Generar según formato solicitado
      if (formato === 'svg' || formato === 'both') {
        svg = await this.generateSVG(deeplink);
        formatosGenerados.push('SVG');
      }

      if (formato === 'png' || formato === 'both') {
        png_base64 = await this.generatePNG(deeplink, tamaño);
        formatosGenerados.push('PNG');
      }

      // Crear metadatos
      const metadatos: QRMetadata = {
        url_original: deeplink,
        tamaño_png: tamaño,
        formatos_generados: formatosGenerados,
        timestamp: new Date().toISOString()
      };

      return {
        svg,
        png_base64,
        metadatos
      };

    } catch (error) {
      throw new Error(`Error generando código QR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
}

// Instancia por defecto exportada
export const qrGenerator = new QRGenerator();