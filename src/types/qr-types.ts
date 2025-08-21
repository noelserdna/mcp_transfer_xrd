// Types específicos para generación de códigos QR
// Fase 1.2: Definición de interfaces TypeScript

export interface DeepLinkToQRParams {
  deeplink: string;
  formato?: 'svg' | 'png' | 'both';
  tamaño?: number; // Para PNG, default: 256px
}

export interface QRGenerationResult {
  svg?: string;
  png_base64?: string;
  metadatos: QRMetadata;
}

export interface QRMetadata {
  url_original: string;
  tamaño_png: number;
  formatos_generados: string[];
  timestamp: string;
}

// Configuración para generación QR
export interface QRConfig {
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  color: {
    dark: string;
    light: string;
  };
}

// Enum para formatos soportados
export enum FormatoQR {
  SVG = 'svg',
  PNG = 'png',
  BOTH = 'both'
}

// Constantes de configuración
export const QR_CONFIG_DEFAULT: QRConfig = {
  errorCorrectionLevel: 'M', // Nivel medio para deep links largos
  margin: 4,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
};

export const QR_SIZE_DEFAULT = 256; // Tamaño PNG por defecto