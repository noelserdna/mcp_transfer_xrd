# 🏗️ Arquitectura del Sistema QR Testing - MCP RadixDLT

## 📋 Resumen Arquitectónico

El sistema de testing QR está diseñado con una arquitectura de 4 capas modular que permite testing, validación y generación de códigos QR para deep links de Radix Wallet. La arquitectura sigue principios SOLID y utiliza dependency injection para máxima testabilidad y extensibilidad.

## 🏛️ Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ MCP Tools       │  │ CLI Interface   │  │ Test Runner  │ │
│  │ - deeplink_to_qr│  │ - Manual Testing│  │ - Automated  │ │
│  │ - _qr_local     │  │ - Interactive   │  │ - CI/CD      │ │
│  │ - test_qr_term  │  │ - Debug Mode    │  │ - Reports    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE ORCHESTRACIÓN                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ QRTerminalTester│  │ LocalQRManager  │  │ ConfigMgr    │ │
│  │ - Test Coord.   │  │ - File Coord.   │  │ - Dynamic    │ │
│  │ - Validation    │  │ - Generation    │  │ - Adaptive   │ │
│  │ - Reporting     │  │ - Persistence   │  │ - Validation │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE VALIDACIÓN                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │QRValidationEng. │  │ MobileValidator │  │ FormatValid. │ │
│  │ - Structure     │  │ - Scan Sim.     │  │ - PNG/SVG    │ │
│  │ - Content       │  │ - Device Compat │  │ - Metadata   │ │
│  │ - Standards     │  │ - Performance   │  │ - Standards  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE GENERACIÓN                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ QRGenerator     │  │ LocalQRGen      │  │ FileManager  │ │
│  │ - SVG/PNG Gen   │  │ - PNG Files     │  │ - Directory  │ │
│  │ - Base64 Format │  │ - Hash Names    │  │ - Cleanup    │ │
│  │ - Multi-format  │  │ - Persistence   │  │ - Permissions│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Componentes Principales

### Capa 1: Presentación (MCP Interface Layer)

#### MCP Tools
**Responsabilidad**: Interfaz principal del usuario con el sistema
**Componentes**:
- `deeplink_to_qr`: Generación QR Base64/SVG
- `deeplink_to_qr_local`: Generación QR PNG local
- `test_qr_terminal`: Testing comprehensivo de QR

```typescript
interface MCPToolInterface {
  name: string;
  description: string;
  parameters: ZodSchema;
  handler: (params: any) => Promise<MCPResponse>;
}

// Implementación ejemplo
export const testQRTerminalTool: MCPToolInterface = {
  name: "test_qr_terminal",
  description: "Testing comprehensivo de códigos QR con validación móvil",
  parameters: TestQRTerminalSchema,
  handler: async (params) => {
    const tester = new QRTerminalTester();
    return await tester.runComprehensiveTest(params);
  }
};
```

#### CLI Interface  
**Responsabilidad**: Interfaces de línea de comandos para testing manual
**Componentes**:
- Interactive testing mode
- Batch processing mode
- Debug utilities

#### Test Runner
**Responsabilidad**: Automatización de testing para CI/CD
**Componentes**:
- Automated test suites
- Performance benchmarking
- Report generation

### Capa 2: Orchestración (Business Logic Layer)

#### QRTerminalTester
**Responsabilidad**: Coordinar todos los tipos de testing de QR
**Funcionalidades**:
- Orchestrar validaciones múltiples
- Generar reportes comprehensivos
- Manejar diferentes modos de testing

```typescript
export class QRTerminalTester {
  private validationEngine: QRValidationEngine;
  private mobileValidator: MobileValidator;
  private formatValidator: FormatValidator;
  private configManager: ConfigurationManager;

  constructor(dependencies: QRTesterDependencies) {
    this.validationEngine = dependencies.validationEngine;
    this.mobileValidator = dependencies.mobileValidator;
    this.formatValidator = dependencies.formatValidator;
    this.configManager = dependencies.configManager;
  }

  async runComprehensiveTest(params: TestQRParams): Promise<TestResult> {
    const startTime = performance.now();
    
    // Fase 1: Validación de estructura
    const structureResult = await this.validationEngine.validateStructure(params.qrSource);
    
    // Fase 2: Validación de formato
    const formatResult = await this.formatValidator.validate(params.qrSource);
    
    // Fase 3: Simulación de escaneado móvil
    const mobileResult = await this.mobileValidator.simulateScan(params.qrSource);
    
    // Fase 4: Generación de reporte
    return this.generateComprehensiveReport({
      structure: structureResult,
      format: formatResult, 
      mobile: mobileResult,
      executionTime: performance.now() - startTime
    });
  }
}
```

#### LocalQRManager
**Responsabilidad**: Gestión completa de archivos QR locales
**Funcionalidades**:
- Coordinación de generación
- Gestión de persistencia  
- Manejo de configuración dinámica

#### ConfigurationManager
**Responsabilidad**: Gestión dinámica de configuraciones
**Funcionalidades**:
- Selección adaptativa de configuración
- Validación de parámetros
- Optimización automática

### Capa 3: Validación (Validation Logic Layer)

#### QRValidationEngine
**Responsabilidad**: Validación técnica de estructura QR
**Funcionalidades**:
- Validación de estructura QR estándar
- Verificación de error correction level
- Análisis de densidad de datos

```typescript
export class QRValidationEngine {
  async validateStructure(qrSource: string): Promise<StructureValidationResult> {
    // Validación de patrón finder
    const finderPatterns = this.detectFinderPatterns(qrSource);
    
    // Validación de timing patterns
    const timingPatterns = this.validateTimingPatterns(qrSource);
    
    // Validación de format information
    const formatInfo = this.extractFormatInformation(qrSource);
    
    // Validación de error correction
    const errorCorrection = this.validateErrorCorrection(qrSource);
    
    return {
      finderPatterns,
      timingPatterns,
      formatInfo,
      errorCorrection,
      overall: this.calculateOverallScore([
        finderPatterns.score,
        timingPatterns.score,
        formatInfo.score,
        errorCorrection.score
      ])
    };
  }

  private detectFinderPatterns(qrSource: string): PatternResult {
    // Algoritmo de detección de finder patterns
    // Busca los cuadrados de esquina característicos
    // Valida ratios 1:1:3:1:1
  }
  
  private validateTimingPatterns(qrSource: string): PatternResult {
    // Validación de timing patterns alternantes
    // Verifica patrones horizontal y vertical
  }
}
```

#### MobileValidator  
**Responsabilidad**: Simulación de escaneado móvil
**Funcionalidades**:
- Simulación de cámaras de dispositivos
- Testing de condiciones adversas
- Validación de performance de escaneado

```typescript
export class MobileValidator {
  private deviceProfiles: DeviceProfile[];
  
  async simulateScan(qrSource: string): Promise<MobileScanResult> {
    const results: DeviceScanResult[] = [];
    
    for (const device of this.deviceProfiles) {
      const scanResult = await this.simulateDeviceScan(qrSource, device);
      results.push(scanResult);
    }
    
    return {
      devices: results,
      averageTime: this.calculateAverageTime(results),
      successRate: this.calculateSuccessRate(results),
      recommendations: this.generateRecommendations(results)
    };
  }
  
  private async simulateDeviceScan(
    qrSource: string, 
    device: DeviceProfile
  ): Promise<DeviceScanResult> {
    // Simular condiciones del dispositivo
    const degradedQR = this.applyDeviceConditions(qrSource, device);
    
    // Intentar decodificación
    const decodeResult = await this.attemptDecode(degradedQR);
    
    // Medir performance
    const performance = this.measurePerformance(decodeResult);
    
    return {
      deviceName: device.name,
      success: decodeResult.success,
      time: decodeResult.time,
      conditions: device.conditions,
      performance
    };
  }
}
```

#### FormatValidator
**Responsabilidad**: Validación de formatos de archivo
**Funcionalidades**:
- Validación PNG/SVG
- Verificación de metadatos
- Cumplimiento de estándares

### Capa 4: Generación (Data Access Layer)

#### QRGenerator
**Responsabilidad**: Generación básica de QR codes
**Funcionalidades**:
- Generación SVG/PNG
- Múltiples formatos de salida
- Configuración flexible

#### LocalQRGenerator
**Responsabilidad**: Generación de archivos QR persistentes
**Funcionalidades**:
- Creación de archivos PNG
- Naming único con hash
- Gestión de metadatos

#### FileManager
**Responsabilidad**: Gestión del sistema de archivos
**Funcionalidades**:
- Creación de directorios
- Gestión de permisos
- Cleanup automático

## 🔄 Flujo de Datos

### Flujo Principal de Testing

```
1. [Usuario] → test_qr_terminal(params)
2. [MCP Tool] → QRTerminalTester.runTest()
3. [Tester] → Parallel execution:
   a. QRValidationEngine.validateStructure()
   b. FormatValidator.validate()  
   c. MobileValidator.simulateScan()
4. [Validators] → Return individual results
5. [Tester] → Aggregate results + generate report
6. [MCP Tool] → Format response for user
7. [Usuario] ← Comprehensive test report
```

### Flujo de Generación Local

```
1. [Usuario] → deeplink_to_qr_local(deeplink)
2. [MCP Tool] → LocalQRManager.generateLocalQR()
3. [Manager] → ConfigurationManager.getOptimalConfig()
4. [Manager] → FileManager.ensureDirectory()
5. [Manager] → LocalQRGenerator.generatePNG()
6. [Generator] → QRGenerator.generatePNG()
7. [Generator] → FileManager.writeFile()
8. [Manager] → FormatValidator.validateOutput()
9. [MCP Tool] → Return file path + metadata
10. [Usuario] ← PNG file ready for use
```

## 🎯 Patrones de Diseño Aplicados

### Dependency Injection Pattern
**Uso**: Todas las capas utilizan DI para máxima testabilidad
**Beneficio**: Permite mocking fácil y testing unitario aislado

```typescript
interface QRTesterDependencies {
  validationEngine: QRValidationEngine;
  mobileValidator: MobileValidator;
  formatValidator: FormatValidator;
  configManager: ConfigurationManager;
}

export class QRTerminalTester {
  constructor(private deps: QRTesterDependencies) {}
}
```

### Strategy Pattern
**Uso**: ConfigurationManager para selección dinámica de configuración
**Beneficio**: Configuración adaptativa basada en contenido

```typescript
interface ConfigurationStrategy {
  selectConfig(deeplink: string): QRConfig;
}

class AdaptiveStrategy implements ConfigurationStrategy {
  selectConfig(deeplink: string): QRConfig {
    return this.analyzeAndSelectOptimal(deeplink);
  }
}
```

### Observer Pattern
**Uso**: Monitoreo de cambios de configuración en tiempo real
**Beneficio**: Actualización automática de componentes

### Factory Pattern
**Uso**: Creación de validadores específicos
**Beneficio**: Extensibilidad para nuevos tipos de validación

## 🔌 Interfaces Principales

### Core Interfaces

```typescript
interface QRTestParams {
  qrSource: string;
  testMode: 'basic' | 'comprehensive' | 'production' | 'debug';
  validateMobile?: boolean;
  validateStructure?: boolean;
  generateReport?: boolean;
  exportMetadata?: boolean;
}

interface TestResult {
  overall: {
    success: boolean;
    score: number;
    executionTime: number;
  };
  structure: StructureValidationResult;
  format: FormatValidationResult;
  mobile: MobileScanResult;
  recommendations: string[];
  metadata: TestMetadata;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
}
```

### Extension Interfaces

```typescript
interface ValidatorPlugin {
  name: string;
  version: string;
  validate(qrSource: string): Promise<ValidationResult>;
  configure(config: any): void;
}

interface ReportGenerator {
  generate(results: TestResult): Promise<Report>;
  exportFormats: string[];
}
```

## ⚡ Performance Considerations

### Async Operations
- Todas las operaciones I/O son async
- Validaciones corren en paralelo donde sea posible
- Timeout handling para operaciones largas

### Memory Management
- Streaming para archivos grandes
- Cleanup automático de recursos temporales
- Pooling de objetos reutilizables

### Caching Strategy
- Cache de configuraciones computadas
- Cache de resultados de validación
- Invalidación inteligente

## 🔒 Security Considerations

### Input Validation
- Sanitización de paths de archivos
- Validación de deep links
- Limits de tamaño de archivo

### File System Security  
- Validación de permisos
- Sandbox para archivos temporales
- Cleanup de archivos sensibles

## 📈 Monitoring y Metrics

### Performance Metrics
- Tiempo de generación QR
- Tiempo de validación
- Uso de memoria
- Throughput de testing

### Quality Metrics
- Tasa de éxito de validación
- Scores de calidad promedio
- Distribución de errores
- Cobertura de testing

## 🔧 Configuración y Extensibilidad

### Plugin Architecture
El sistema está diseñado para soportar plugins:
- Validadores personalizados
- Generadores alternativos
- Reportes especializados
- Integraciones externas

### Configuration Management
- Configuración jerárquica (global → proyecto → local)
- Hot-reloading de configuración
- Validación de configuración en startup
- Fallbacks automáticos

Esta arquitectura proporciona una base sólida y extensible para el testing comprehensivo de códigos QR en el contexto del servidor MCP RadixDLT.