// Types específicos para generación de códigos QR
// Fase 1.2: Definición de interfaces TypeScript

export interface DeepLinkToQRParams {
  deeplink: string;
  formato?: 'svg' | 'png' | 'both';
  tamaño?: number; // Para PNG, default: 256px
}

// Extensión para soporte de generación local de archivos PNG
export interface DeepLinkToQRLocalParams {
  deeplink: string;
  tamaño?: number; // Para PNG, default: 512px (mayor para mejor escaneado)
  calidad?: 'low' | 'medium' | 'high' | 'max';
  directorio?: string; // Directorio personalizado, default: qrimages
}

export interface QRGenerationResult {
  svg?: string;
  png_base64?: string;
  metadatos: QRMetadata;
}

// Resultado para generación local con archivo PNG
export interface QRLocalGenerationResult {
  archivo_path: string; // Ruta absoluta del archivo PNG generado
  nombre_archivo: string; // Nombre del archivo sin ruta
  tamaño_bytes: number; // Tamaño del archivo en bytes
  metadatos: QRLocalMetadata;
}

export interface QRMetadata {
  url_original: string;
  tamaño_png: number;
  formatos_generados: string[];
  timestamp: string;
}

// Metadata extendida para archivos locales
export interface QRLocalMetadata extends QRMetadata {
  hash_unico: string; // Hash SHA-256 del deep link para nombre único
  directorio: string; // Directorio donde se guardó
  dimensiones: {
    ancho: number;
    alto: number;
  };
  tiempo_generacion_ms: number; // Tiempo de generación en milisegundos
  fuente_directorio?: string; // Fuente de configuración del directorio
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
export const QR_LOCAL_SIZE_DEFAULT = 512; // Tamaño PNG local por defecto (mayor para mejor escaneado)
export const QR_LOCAL_DIR_DEFAULT = 'qrimages'; // Directorio por defecto para archivos locales