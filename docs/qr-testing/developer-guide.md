# 👨‍💻 Developer Guide - Sistema QR Testing MCP RadixDLT

## 🎯 Resumen para Desarrolladores

Esta guía proporciona toda la información necesaria para desarrolladores que trabajen con el sistema de testing QR. Incluye setup, estructura de código, APIs principales, y patrones de extensión.

## 🚀 Setup y Instalación

### Prerequisitos
```bash
# Node.js 18+ requerido
node --version  # v18.0.0+

# TypeScript y herramientas de desarrollo
npm install -g typescript vitest

# Verificar instalación MCP SDK
npm list @modelcontextprotocol/sdk
```

### Configuración del Entorno de Desarrollo

```bash
# 1. Clonar y setup inicial
git clone <repo-url>
cd radix_stdio
npm install

# 2. Build inicial
npm run build

# 3. Configurar testing environment
npm run test:setup

# 4. Verificar QR system
npm run test tests/deeplink-to-qr.test.ts
```

### Variables de Entorno

```bash
# .env.development
QR_TEST_MODE=development
QR_OUTPUT_DIR=./qrimages-dev
QR_LOG_LEVEL=debug
QR_ENABLE_METRICS=true

# .env.testing  
QR_TEST_MODE=testing
QR_OUTPUT_DIR=./test-qr-output
QR_LOG_LEVEL=verbose
QR_PARALLEL_TESTS=true

# .env.production
QR_TEST_MODE=production
QR_OUTPUT_DIR=./qrimages
QR_LOG_LEVEL=info
QR_ENABLE_CLEANUP=true
```

## 📁 Estructura de Archivos

### Estructura Actualizada del Proyecto
```
src/
├── helpers/
│   ├── qr-generator.ts              # ✅ Base QR generation (SVG/PNG)
│   ├── local-qr-manager.ts          # ✅ Local PNG file management
│   ├── local-qr-manager-enhanced.ts # ✅ Enhanced with MCP Roots
│   ├── local-qr-generator.ts        # ✅ PNG file creation
│   ├── directory-manager.ts         # 📋 File system operations
│   ├── filename-generator.ts        # 📋 Unique naming logic
│   └── qr-terminal-tester.ts        # 🎯 NEW: Main testing orchestrator
├── types/
│   ├── qr-types.ts                  # ✅ Core QR type definitions
│   ├── local-qr-types.ts            # ✅ Local QR specific types
│   └── qr-testing-types.ts          # 🎯 NEW: Testing specific types
├── validation/
│   ├── qr-validation-engine.ts      # 🎯 NEW: Structure validation
│   ├── mobile-validator.ts          # 🎯 NEW: Mobile scan simulation
│   └── format-validator.ts          # 🎯 NEW: File format validation
├── testing/
│   ├── test-runners/
│   │   ├── comprehensive-runner.ts  # 🎯 NEW: Full test suite
│   │   ├── performance-runner.ts    # 🎯 NEW: Performance benchmarks
│   │   └── compatibility-runner.ts  # 🎯 NEW: Device compatibility
│   └── report-generators/
│       ├── html-report.ts           # 🎯 NEW: HTML test reports
│       ├── json-export.ts           # 🎯 NEW: Machine readable export
│       └── console-reporter.ts      # 🎯 NEW: Terminal output
└── index.ts                         # ✅ Main MCP server entry point

tests/
├── unit/
│   ├── qr-generator.test.ts         # ✅ Unit tests for QR generation
│   ├── local-qr-manager.test.ts     # ✅ Local manager tests
│   ├── validation-engine.test.ts    # 🎯 NEW: Validation tests
│   └── mobile-validator.test.ts     # 🎯 NEW: Mobile simulation tests
├── integration/
│   ├── qr-workflow.test.ts          # 🎯 NEW: End-to-end workflows
│   ├── mcp-tools.test.ts            # 🎯 NEW: MCP tool integration
│   └── file-operations.test.ts      # 🎯 NEW: File system integration
└── performance/
    ├── generation-benchmarks.test.ts # 🎯 NEW: Performance testing
    └── memory-usage.test.ts          # 🎯 NEW: Memory profiling

docs/qr-testing/                     # ✅ Documentation
├── testing-guide.md                 # ✅ User guide
├── config-matrix.md                 # ✅ Configuration comparison
├── architecture.md                  # ✅ Technical architecture
├── developer-guide.md               # ✅ This file
└── testing-procedures.md            # 📋 Testing procedures

Legend: ✅ Exists | 📋 Planned | 🎯 NEW components to implement
```

## 🔧 APIs Principales

### Core QR Generation API

```typescript
import { QRGenerator } from './helpers/qr-generator.js';
import { LocalQRManager } from './helpers/local-qr-manager.js';

// Generación básica SVG/PNG
const qrGen = new QRGenerator();
const result = await qrGen.generateQR({
  deeplink: 'radixwallet://transaction/abc123',
  formato: 'both',
  tamaño: 512
});

// Generación local PNG
const localManager = new LocalQRManager();
const localResult = await localManager.generateQRLocal(
  'radixwallet://transaction/abc123'
);

console.log(`QR saved to: ${localResult.archivo_path}`);
```

### Testing API (Nueva Implementación)

```typescript
import { QRTerminalTester } from './helpers/qr-terminal-tester.js';

// Testing comprehensivo
const tester = new QRTerminalTester({
  validationEngine: new QRValidationEngine(),
  mobileValidator: new MobileValidator(),
  formatValidator: new FormatValidator(),
  configManager: new ConfigurationManager()
});

const testResult = await tester.runComprehensiveTest({
  qrSource: '/path/to/qr-file.png',
  testMode: 'comprehensive',
  validateMobile: true,
  validateStructure: true,
  generateReport: true
});

if (testResult.overall.success) {
  console.log(`QR Test passed with score: ${testResult.overall.score}`);
} else {
  console.error('QR Test failed:', testResult.overall.errors);
}
```

### Validation API

```typescript
import { QRValidationEngine } from './validation/qr-validation-engine.js';

const validator = new QRValidationEngine();

// Validación de estructura QR
const structureResult = await validator.validateStructure('/path/to/qr.png');
console.log(`Structure valid: ${structureResult.isValid}`);
console.log(`Quality score: ${structureResult.score}/100`);

// Detalles de errores y warnings
structureResult.errors.forEach(error => {
  console.error(`Error: ${error.message} at ${error.location}`);
});

structureResult.warnings.forEach(warning => {
  console.warn(`Warning: ${warning.message}`);
});
```

### Mobile Simulation API

```typescript
import { MobileValidator } from './validation/mobile-validator.js';

const mobileValidator = new MobileValidator();

// Configurar dispositivos de prueba
const deviceProfiles = [
  { name: 'iPhone 13', camera: 'standard', conditions: 'normal' },
  { name: 'Samsung S21', camera: 'wide', conditions: 'low_light' },
  { name: 'Pixel 6', camera: 'ultra_wide', conditions: 'bright' }
];

const scanResult = await mobileValidator.simulateScan('/path/to/qr.png', {
  devices: deviceProfiles,
  testConditions: ['normal', 'low_light', 'bright', 'angled'],
  generateHeatmap: true
});

console.log(`Average scan time: ${scanResult.averageTime}ms`);
console.log(`Success rate: ${scanResult.successRate}%`);
```

## 🧪 Testing y Development

### Ejecutar Tests Específicos

```bash
# Tests unitarios de QR generation
npm run test tests/unit/qr-generator.test.ts

# Tests de validación
npm run test tests/unit/validation-engine.test.ts

# Tests de integración completos
npm run test tests/integration/

# Tests de performance
npm run test tests/performance/ --reporter=verbose

# Tests con coverage
npm run test:coverage

# Tests en modo watch para desarrollo
npm run test:watch tests/unit/
```

### Debugging y Development Workflow

```bash
# 1. Desarrollo con hot reload
npm run dev:watch

# 2. Testing continuo durante desarrollo
npm run test:watch

# 3. Lint y format check
npm run lint
npm run format:check

# 4. Build y verificación antes de commit
npm run build
npm run test:integration
npm run test:performance
```

### Crear Tests para Nuevas Features

```typescript
// tests/unit/nueva-feature.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { NuevaFeature } from '../src/helpers/nueva-feature.js';

describe('NuevaFeature', () => {
  let feature: NuevaFeature;

  beforeEach(() => {
    feature = new NuevaFeature();
  });

  it('debe realizar operación básica correctamente', async () => {
    const result = await feature.operacionBasica('input-test');
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.data).toContain('expected-content');
  });

  it('debe manejar errores graciosamente', async () => {
    await expect(feature.operacionBasica('')).rejects.toThrow();
  });

  it('debe cumplir métricas de performance', async () => {
    const start = performance.now();
    await feature.operacionBasica('performance-test');
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // < 100ms
  });
});
```

## 🔌 Extender el Sistema

### Crear un Validator Personalizado

```typescript
// src/validation/custom-validator.ts
import { ValidationResult, ValidatorPlugin } from '../types/qr-testing-types.js';

export class CustomValidator implements ValidatorPlugin {
  name = 'CustomValidator';
  version = '1.0.0';

  async validate(qrSource: string): Promise<ValidationResult> {
    try {
      // Implementar lógica de validación personalizada
      const analysis = await this.performCustomAnalysis(qrSource);
      
      return {
        isValid: analysis.passed,
        score: analysis.qualityScore,
        errors: analysis.errors,
        warnings: analysis.warnings,
        metrics: {
          executionTime: analysis.duration,
          memoryUsage: process.memoryUsage().heapUsed,
          customMetric: analysis.customValue
        }
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  configure(config: CustomValidatorConfig): void {
    this.config = { ...this.defaultConfig, ...config };
  }

  private async performCustomAnalysis(qrSource: string) {
    // Implementar análisis específico
    // Por ejemplo: validación de deep link específico de Radix
    // o análisis de patrones de uso específicos
  }
}

// Registrar el validator
const customValidator = new CustomValidator();
const tester = new QRTerminalTester({
  // ... otros dependencies
  customValidators: [customValidator]
});
```

### Crear un Report Generator Personalizado

```typescript
// src/testing/report-generators/custom-report.ts
import { ReportGenerator, TestResult, Report } from '../../types/qr-testing-types.js';

export class CustomReportGenerator implements ReportGenerator {
  exportFormats = ['pdf', 'excel', 'custom-json'];

  async generate(results: TestResult): Promise<Report> {
    const report: Report = {
      format: 'custom-json',
      generatedAt: new Date().toISOString(),
      summary: this.createSummary(results),
      details: await this.createDetailedAnalysis(results),
      recommendations: this.generateRecommendations(results),
      attachments: await this.createAttachments(results)
    };

    return report;
  }

  private createSummary(results: TestResult) {
    return {
      overallScore: results.overall.score,
      passedValidations: results.validations.filter(v => v.passed).length,
      failedValidations: results.validations.filter(v => !v.passed).length,
      performance: {
        averageTime: results.performance.averageTime,
        memoryPeak: results.performance.memoryPeak
      }
    };
  }

  private async createDetailedAnalysis(results: TestResult) {
    // Crear análisis detallado
    // Incluir gráficos, métricas, comparaciones, etc.
  }
}
```

### Agregar una Nueva MCP Tool

```typescript
// En src/index.ts, agregar nueva tool
server.tool(
  "advanced_qr_test",
  "Testing avanzado de QR con análisis predictivo",
  {
    qrSource: z.string().describe("Path al archivo QR o deep link"),
    testProfile: z.enum(['basic', 'advanced', 'production', 'ai-analysis']),
    deviceSet: z.array(z.string()).optional(),
    generatePrediction: z.boolean().optional()
  },
  async (params) => {
    try {
      const advancedTester = new AdvancedQRTester();
      const result = await advancedTester.runPredictiveAnalysis({
        source: params.qrSource,
        profile: params.testProfile,
        devices: params.deviceSet || DEFAULT_DEVICE_SET,
        prediction: params.generatePrediction ?? false
      });

      return {
        content: [{
          type: "text",
          text: advancedTester.formatAdvancedReport(result)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text", 
          text: `❌ Error en testing avanzado: ${error.message}`
        }]
      };
    }
  }
);
```

## 📊 Métricas y Performance

### Monitoring de Performance

```typescript
// src/utils/performance-monitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  startOperation(operationName: string): string {
    const operationId = `${operationName}-${Date.now()}`;
    this.metrics.set(operationId, {
      name: operationName,
      startTime: performance.now(),
      startMemory: process.memoryUsage().heapUsed
    });
    return operationId;
  }

  endOperation(operationId: string): PerformanceResult {
    const metric = this.metrics.get(operationId);
    if (!metric) throw new Error(`Operation ${operationId} not found`);

    const result = {
      operationName: metric.name,
      duration: performance.now() - metric.startTime,
      memoryDelta: process.memoryUsage().heapUsed - metric.startMemory,
      timestamp: new Date().toISOString()
    };

    this.metrics.delete(operationId);
    return result;
  }
}

// Uso en código
const monitor = new PerformanceMonitor();

async function optimizedQRGeneration(deeplink: string) {
  const opId = monitor.startOperation('qr-generation');
  
  try {
    const result = await generateQR(deeplink);
    const perf = monitor.endOperation(opId);
    
    // Log metrics si excede thresholds
    if (perf.duration > 300) {
      console.warn(`Slow QR generation: ${perf.duration}ms`);
    }
    
    return result;
  } catch (error) {
    monitor.endOperation(opId); // Cleanup
    throw error;
  }
}
```

### Profiling de Memory

```typescript
// src/utils/memory-profiler.ts
export class MemoryProfiler {
  async profileQROperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; profile: MemoryProfile }> {
    
    // Force garbage collection si está disponible
    if (global.gc) global.gc();
    
    const beforeMemory = process.memoryUsage();
    const startTime = performance.now();
    
    const result = await operation();
    
    const afterMemory = process.memoryUsage();
    const endTime = performance.now();
    
    const profile: MemoryProfile = {
      operationName,
      duration: endTime - startTime,
      heapUsedDelta: afterMemory.heapUsed - beforeMemory.heapUsed,
      heapTotalDelta: afterMemory.heapTotal - beforeMemory.heapTotal,
      externalDelta: afterMemory.external - beforeMemory.external,
      arrayBuffersDelta: afterMemory.arrayBuffers - beforeMemory.arrayBuffers
    };
    
    return { result, profile };
  }
}
```

## 🔧 Configuración Avanzada

### Configuración por Entorno

```typescript
// src/config/qr-config.ts
export interface QRSystemConfig {
  generation: {
    defaultSize: number;
    maxSize: number;
    defaultErrorCorrection: 'L' | 'M' | 'Q' | 'H';
    adaptiveConfig: boolean;
  };
  
  testing: {
    enableMobileSimulation: boolean;
    defaultDeviceSet: string[];
    performanceThresholds: {
      generationTime: number;
      fileSize: number;
      scanTime: number;
    };
  };
  
  storage: {
    outputDirectory: string;
    enableCleanup: boolean;
    retentionDays: number;
    maxFiles: number;
  };
  
  validation: {
    strictMode: boolean;
    enableAllValidators: boolean;
    customValidators: string[];
  };
}

export const configs: Record<string, QRSystemConfig> = {
  development: {
    generation: {
      defaultSize: 256,
      maxSize: 1024,
      defaultErrorCorrection: 'M',
      adaptiveConfig: false
    },
    testing: {
      enableMobileSimulation: false,
      defaultDeviceSet: ['desktop'],
      performanceThresholds: {
        generationTime: 500,
        fileSize: 100000,
        scanTime: 5000
      }
    },
    // ... resto de configuración
  },
  
  production: {
    generation: {
      defaultSize: 512,
      maxSize: 2048,
      defaultErrorCorrection: 'H',
      adaptiveConfig: true
    },
    testing: {
      enableMobileSimulation: true,
      defaultDeviceSet: ['iphone13', 'samsung-s21', 'pixel6'],
      performanceThresholds: {
        generationTime: 300,
        fileSize: 50000,
        scanTime: 3000
      }
    },
    // ... resto de configuración
  }
};
```

### Hot Configuration Reloading

```typescript
// src/config/config-manager.ts
import { watch } from 'fs';
import { EventEmitter } from 'events';

export class ConfigManager extends EventEmitter {
  private currentConfig: QRSystemConfig;
  private configPath: string;

  constructor(configPath: string) {
    super();
    this.configPath = configPath;
    this.loadConfig();
    this.watchConfig();
  }

  private loadConfig(): void {
    try {
      delete require.cache[require.resolve(this.configPath)];
      this.currentConfig = require(this.configPath);
      this.emit('configLoaded', this.currentConfig);
    } catch (error) {
      console.error('Error loading config:', error);
      this.emit('configError', error);
    }
  }

  private watchConfig(): void {
    watch(this.configPath, { persistent: false }, (eventType) => {
      if (eventType === 'change') {
        console.log('Configuration file changed, reloading...');
        this.loadConfig();
        this.emit('configChanged', this.currentConfig);
      }
    });
  }

  getConfig(): QRSystemConfig {
    return this.currentConfig;
  }
}
```

## 🚀 Deployment y CI/CD

### GitHub Actions para QR Testing

```yaml
# .github/workflows/qr-testing.yml
name: QR System Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  qr-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build project
      run: npm run build
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run QR integration tests
      run: npm run test:qr-integration
    
    - name: Run performance benchmarks
      run: npm run test:performance
    
    - name: Generate test coverage
      run: npm run test:coverage
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
```

### Docker para Testing Environment

```dockerfile
# Dockerfile.testing
FROM node:18-alpine

WORKDIR /app

# Install system dependencies for QR processing
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Create QR output directory
RUN mkdir -p /app/qrimages

# Run tests
CMD ["npm", "run", "test:docker"]
```

## 📚 Referencias y Best Practices

### Coding Standards
- Use TypeScript strict mode
- Implement proper error handling
- Follow SOLID principles  
- Write comprehensive tests
- Document public APIs

### Testing Guidelines
- Test happy path and edge cases
- Mock external dependencies
- Use proper test data management
- Implement performance tests
- Validate memory usage

### Performance Best Practices
- Use async/await for I/O operations
- Implement proper caching
- Monitor memory usage
- Profile critical operations
- Optimize for mobile devices

### Security Considerations
- Validate all inputs
- Sanitize file paths
- Implement proper access controls
- Handle sensitive data carefully
- Regular security audits

Esta guía proporciona toda la información necesaria para trabajar efectivamente con el sistema de testing QR. Para preguntas específicas, consulta la documentación adicional en `docs/qr-testing/`.