/**
 * @fileoverview Tipos y interfaces para el sistema de testing QR Terminal
 * @author AI Assistant
 * @description Definiciones de tipos TypeScript para la arquitectura de 4 capas
 * del sistema de testing QR con qrcode-terminal
 */

// ================================
// TIPOS BÁSICOS Y ENUMS
// ================================

export enum QRTestMode {
  BASIC = 'basic',
  COMPREHENSIVE = 'comprehensive', 
  PRODUCTION = 'production',
  DEBUG = 'debug'
}

export enum QRTerminalFormat {
  SMALL = 'small',
  LARGE = 'large',
  ADAPTIVE = 'adaptive'
}

export enum ValidationLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum'
}

export enum DeviceType {
  IPHONE_OLD = 'iphone_old',
  IPHONE_NEW = 'iphone_new',
  ANDROID_LOW = 'android_low',
  ANDROID_HIGH = 'android_high',
  GENERIC = 'generic'
}

// ================================
// INTERFACES PRINCIPALES
// ================================

/**
 * Parámetros para el testing comprehensivo de QR
 */
export interface QRTestParams {
  /** Deep link a convertir y testear */
  deeplink: string;
  /** Modo de testing a ejecutar */
  testMode: QRTestMode;
  /** Formato del QR terminal a generar */
  terminalFormat?: QRTerminalFormat;
  /** Ejecutar validación de estructura QR */
  validateStructure?: boolean;
  /** Ejecutar simulación de escaneado móvil */
  validateMobile?: boolean;
  /** Generar reporte comprehensivo */
  generateReport?: boolean;
  /** Exportar metadata detallada */
  exportMetadata?: boolean;
  /** Comparar con otros métodos QR existentes */
  compareWithExisting?: boolean;
}

/**
 * Resultado completo del testing QR
 */
export interface QRTestResult {
  /** Resultado general del testing */
  overall: OverallResult;
  /** Resultado de validación de estructura */
  structure: StructureValidationResult;
  /** Resultado de validación de formato */
  format: FormatValidationResult;
  /** Resultado de simulación móvil */
  mobile: MobileScanResult;
  /** Recomendaciones del sistema */
  recommendations: string[];
  /** Metadata del testing */
  metadata: TestMetadata;
  /** Comparación con métodos existentes */
  comparison?: ComparisonResult;
}

/**
 * Resultado general del testing
 */
export interface OverallResult {
  /** Si el testing fue exitoso */
  success: boolean;
  /** Score general (0-100) */
  score: number;
  /** Tiempo total de ejecución en ms */
  executionTime: number;
  /** Resumen de problemas encontrados */
  issues: string[];
  /** Nivel de confianza en el resultado */
  confidence: number;
}

// ================================
// ESTRUCTURA Y VALIDACIÓN
// ================================

/**
 * Resultado de validación de estructura QR
 */
export interface StructureValidationResult extends BaseValidationResult {
  /** Validación de finder patterns */
  finderPatterns: PatternResult;
  /** Validación de timing patterns */
  timingPatterns: PatternResult;
  /** Información de formato extraída */
  formatInfo: FormatInfoResult;
  /** Validación de corrección de errores */
  errorCorrection: ErrorCorrectionResult;
  /** Análisis de densidad de datos */
  dataDensity: DensityAnalysis;
}

/**
 * Resultado base para validaciones
 */
export interface BaseValidationResult {
  /** Si la validación es válida */
  isValid: boolean;
  /** Score de calidad (0-100) */
  score: number;
  /** Errores encontrados */
  errors: ValidationError[];
  /** Advertencias */
  warnings: ValidationWarning[];
  /** Métricas de la validación */
  metrics: ValidationMetrics;
}

/**
 * Resultado de análisis de patrones
 */
export interface PatternResult {
  /** Si el patrón es válido */
  isValid: boolean;
  /** Score del patrón (0-100) */
  score: number;
  /** Detalles específicos del patrón */
  details: PatternDetails;
  /** Problemas encontrados */
  issues: string[];
}

/**
 * Detalles específicos de patrones
 */
export interface PatternDetails {
  /** Posiciones encontradas */
  positions: Position[];
  /** Ratios detectados */
  ratios: number[];
  /** Nivel de precisión */
  precision: number;
}

/**
 * Posición en el QR
 */
export interface Position {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Información de formato del QR
 */
export interface FormatInfoResult {
  /** Nivel de corrección de errores */
  errorCorrectionLevel: string;
  /** Patrón de máscara */
  maskPattern: number;
  /** Versión del QR */
  version: number;
  /** Capacidad de datos */
  dataCapacity: number;
}

/**
 * Resultado de corrección de errores
 */
export interface ErrorCorrectionResult {
  /** Nivel detectado */
  level: string;
  /** Porcentaje de redundancia */
  redundancy: number;
  /** Capacidad de recuperación */
  recoveryCapacity: number;
  /** Si puede recuperarse de daños */
  canRecover: boolean;
}

/**
 * Análisis de densidad de datos
 */
export interface DensityAnalysis {
  /** Densidad de información (0-1) */
  density: number;
  /** Distribución de módulos */
  moduleDistribution: ModuleDistribution;
  /** Complejidad visual */
  visualComplexity: number;
}

/**
 * Distribución de módulos en el QR
 */
export interface ModuleDistribution {
  /** Porcentaje de módulos oscuros */
  darkModules: number;
  /** Porcentaje de módulos claros */
  lightModules: number;
  /** Distribución por regiones */
  regionDistribution: RegionStats[];
}

/**
 * Estadísticas por región
 */
export interface RegionStats {
  /** Región del QR */
  region: string;
  /** Densidad en la región */
  density: number;
  /** Complejidad visual */
  complexity: number;
}

// ================================
// VALIDACIÓN DE FORMATO
// ================================

/**
 * Resultado de validación de formato
 */
export interface FormatValidationResult extends BaseValidationResult {
  /** Tipo de formato detectado */
  formatType: string;
  /** Dimensiones del QR */
  dimensions: QRDimensions;
  /** Calidad de renderizado */
  renderQuality: RenderQuality;
  /** Compatibilidad de caracteres */
  characterCompatibility: CharacterCompatibility;
}

/**
 * Dimensiones del QR
 */
export interface QRDimensions {
  /** Ancho en caracteres */
  width: number;
  /** Alto en caracteres */
  height: number;
  /** Tamaño de módulo */
  moduleSize: number;
  /** Zona silenciosa */
  quietZone: number;
}

/**
 * Calidad de renderizado
 */
export interface RenderQuality {
  /** Claridad visual (0-100) */
  clarity: number;
  /** Contraste (0-100) */
  contrast: number;
  /** Definición de bordes */
  edgeDefinition: number;
  /** Problemas de renderizado */
  renderingIssues: string[];
}

/**
 * Compatibilidad de caracteres
 */
export interface CharacterCompatibility {
  /** Compatible con terminal actual */
  terminalCompatible: boolean;
  /** Caracteres utilizados */
  charactersUsed: string[];
  /** Caracteres problemáticos */
  problematicChars: string[];
  /** Nivel de soporte */
  supportLevel: number;
}

// ================================
// SIMULACIÓN MÓVIL
// ================================

/**
 * Resultado de simulación de escaneado móvil
 */
export interface MobileScanResult {
  /** Resultados por dispositivo */
  devices: DeviceScanResult[];
  /** Tiempo promedio de escaneado */
  averageTime: number;
  /** Tasa de éxito general */
  successRate: number;
  /** Recomendaciones específicas */
  recommendations: MobileRecommendation[];
}

/**
 * Resultado de escaneado en dispositivo específico
 */
export interface DeviceScanResult {
  /** Nombre del dispositivo */
  deviceName: string;
  /** Tipo de dispositivo */
  deviceType: DeviceType;
  /** Si el escaneado fue exitoso */
  success: boolean;
  /** Tiempo de escaneado en ms */
  scanTime: number;
  /** Número de intentos necesarios */
  attempts: number;
  /** Condiciones de testing */
  conditions: TestConditions;
  /** Métricas de performance */
  performance: PerformanceMetrics;
  /** Problemas específicos */
  issues: string[];
}

/**
 * Condiciones de testing móvil
 */
export interface TestConditions {
  /** Nivel de iluminación simulado */
  lighting: string;
  /** Distancia de escaneado */
  distance: string;
  /** Ángulo de inclinación */
  angle: number;
  /** Calidad de cámara simulada */
  cameraQuality: string;
}

/**
 * Métricas de performance móvil
 */
export interface PerformanceMetrics {
  /** Tiempo de detección en ms */
  detectionTime: number;
  /** Tiempo de decodificación en ms */
  decodingTime: number;
  /** Confianza en la lectura (0-1) */
  confidence: number;
  /** Calidad de imagen simulada */
  imageQuality: number;
}

/**
 * Recomendación para escaneado móvil
 */
export interface MobileRecommendation {
  /** Tipo de recomendación */
  type: string;
  /** Descripción de la recomendación */
  description: string;
  /** Prioridad (1-5) */
  priority: number;
  /** Impacto esperado */
  expectedImpact: string;
}

// ================================
// COMPARACIÓN Y METADATA
// ================================

/**
 * Resultado de comparación con otros métodos
 */
export interface ComparisonResult {
  /** Comparación con QR PNG local */
  localPNG: ComparisonItem;
  /** Comparación con QR SVG */
  svg: ComparisonItem;
  /** Comparación con QR Base64 PNG */
  base64PNG: ComparisonItem;
  /** Resumen de comparación */
  summary: ComparisonSummary;
}

/**
 * Item de comparación individual
 */
export interface ComparisonItem {
  /** Método comparado */
  method: string;
  /** Score relativo (0-100) */
  relativeScore: number;
  /** Ventajas del terminal QR */
  advantages: string[];
  /** Desventajas del terminal QR */
  disadvantages: string[];
  /** Métricas específicas */
  metrics: ComparisonMetrics;
}

/**
 * Métricas de comparación
 */
export interface ComparisonMetrics {
  /** Tiempo de generación relativo */
  generationTime: number;
  /** Calidad visual relativa */
  visualQuality: number;
  /** Facilidad de uso relativa */
  usability: number;
  /** Compatibilidad relativa */
  compatibility: number;
}

/**
 * Resumen de comparación
 */
export interface ComparisonSummary {
  /** Método recomendado */
  recommendedMethod: string;
  /** Razón de la recomendación */
  reason: string;
  /** Casos de uso óptimos para terminal QR */
  optimalUseCases: string[];
  /** Score general del terminal QR */
  overallScore: number;
}

/**
 * Metadata del testing
 */
export interface TestMetadata {
  /** Timestamp del testing */
  timestamp: number;
  /** Versión del sistema de testing */
  testingVersion: string;
  /** Configuración utilizada */
  configuration: TestConfiguration;
  /** Información del entorno */
  environment: EnvironmentInfo;
  /** Duración total del testing */
  totalDuration: number;
}

/**
 * Configuración del testing
 */
export interface TestConfiguration {
  /** Nivel de validación aplicado */
  validationLevel: ValidationLevel;
  /** Dispositivos simulados */
  simulatedDevices: DeviceType[];
  /** Opciones específicas */
  options: TestOptions;
}

/**
 * Opciones del testing
 */
export interface TestOptions {
  /** Timeout por validación en ms */
  timeout: number;
  /** Número de intentos para simulación móvil */
  maxAttempts: number;
  /** Incluir debugging verbose */
  verbose: boolean;
  /** Guardar artefactos de testing */
  saveArtifacts: boolean;
}

/**
 * Información del entorno
 */
export interface EnvironmentInfo {
  /** Sistema operativo */
  platform: string;
  /** Versión de Node.js */
  nodeVersion: string;
  /** Terminal utilizado */
  terminal: string;
  /** Capacidades del terminal */
  terminalCapabilities: TerminalCapabilities;
}

/**
 * Capacidades del terminal
 */
export interface TerminalCapabilities {
  /** Soporte de Unicode */
  unicodeSupport: boolean;
  /** Soporte de colores */
  colorSupport: boolean;
  /** Ancho del terminal */
  terminalWidth: number;
  /** Alto del terminal */
  terminalHeight: number;
}

// ================================
// ERRORES Y VALIDACIONES
// ================================

/**
 * Error de validación
 */
export interface ValidationError {
  /** Código del error */
  code: string;
  /** Mensaje del error */
  message: string;
  /** Severidad del error */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Ubicación del error */
  location?: string;
  /** Sugerencia de solución */
  suggestion?: string;
}

/**
 * Advertencia de validación
 */
export interface ValidationWarning {
  /** Código de la advertencia */
  code: string;
  /** Mensaje de la advertencia */
  message: string;
  /** Nivel de impacto */
  impact: 'minimal' | 'low' | 'medium' | 'high';
  /** Recomendación */
  recommendation?: string;
}

/**
 * Métricas de validación
 */
export interface ValidationMetrics {
  /** Tiempo de validación en ms */
  validationTime: number;
  /** Número de checks realizados */
  checksPerformed: number;
  /** Porcentaje de checks exitosos */
  successRate: number;
  /** Memoria utilizada en MB */
  memoryUsed: number;
}

// ================================
// INTERFACES DE DEPENDENCIAS
// ================================

/**
 * Dependencias para QRTerminalTester
 */
export interface QRTesterDependencies {
  /** Engine de validación de estructura */
  validationEngine: QRValidationEngine;
  /** Validador de simulación móvil */
  mobileValidator: MobileValidator;
  /** Validador de formato */
  formatValidator: FormatValidator;
  /** Manager de configuración */
  configManager: ConfigurationManager;
}

/**
 * Interface para engine de validación de estructura
 */
export interface QRValidationEngine {
  validateStructure(qrSource: string): Promise<StructureValidationResult>;
  analyzePatterns(qrSource: string): Promise<PatternResult[]>;
  validateErrorCorrection(qrSource: string): Promise<ErrorCorrectionResult>;
}

/**
 * Interface para validador móvil
 */
export interface MobileValidator {
  simulateScan(qrSource: string, devices?: DeviceType[]): Promise<MobileScanResult>;
  simulateDeviceScan(qrSource: string, device: DeviceType): Promise<DeviceScanResult>;
  getDeviceProfiles(): DeviceProfile[];
}

/**
 * Perfil de dispositivo para simulación
 */
export interface DeviceProfile {
  /** Nombre del dispositivo */
  name: string;
  /** Tipo de dispositivo */
  type: DeviceType;
  /** Condiciones de testing */
  conditions: TestConditions;
  /** Capacidades de la cámara */
  cameraCapabilities: CameraCapabilities;
}

/**
 * Capacidades de cámara simulada
 */
export interface CameraCapabilities {
  /** Resolución de la cámara */
  resolution: string;
  /** Calidad de autofocus */
  autofocus: number;
  /** Estabilización */
  stabilization: boolean;
  /** Tiempo de captura */
  captureTime: number;
}

/**
 * Interface para validador de formato
 */
export interface FormatValidator {
  validate(qrSource: string): Promise<FormatValidationResult>;
  validateDimensions(qrSource: string): Promise<QRDimensions>;
  validateCharacterCompatibility(qrSource: string): Promise<CharacterCompatibility>;
}

/**
 * Interface para manager de configuración
 */
export interface ConfigurationManager {
  getConfiguration(deeplink: string): Promise<QRTerminalConfiguration>;
  selectOptimalFormat(deeplink: string): Promise<QRTerminalFormat>;
  validateConfiguration(config: QRTerminalConfiguration): boolean;
}

/**
 * Configuración del QR Terminal
 */
export interface QRTerminalConfiguration {
  /** Formato a utilizar */
  format: QRTerminalFormat;
  /** Nivel de corrección de errores */
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  /** Opciones específicas */
  options: QRTerminalOptions;
}

/**
 * Opciones del QR Terminal
 */
export interface QRTerminalOptions {
  /** Tamaño pequeño para terminal */
  small?: boolean;
  /** Usar bordes */
  border?: boolean;
  /** Caracteres personalizados */
  customChars?: {
    dark: string;
    light: string;
  };
}

// ================================
// TIPOS DE UTILIDAD
// ================================

/**
 * Tipo para callbacks de progreso
 */
export type ProgressCallback = (progress: number, stage: string) => void;

/**
 * Tipo para configuración de timeout
 */
export type TimeoutConfig = {
  validation: number;
  simulation: number;
  generation: number;
  total: number;
};

/**
 * Tipo para opciones de debugging
 */
export type DebugOptions = {
  verbose: boolean;
  saveIntermediateResults: boolean;
  logPerformance: boolean;
  exportDiagnostics: boolean;
};