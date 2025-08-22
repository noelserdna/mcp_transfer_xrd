# 🧪 Procedimientos de Testing QR - Manual y Automatizado

## 📋 Resumen de Procedimientos

Esta documentación establece los procedimientos estándar para testing de códigos QR en el sistema MCP RadixDLT. Incluye tanto procedimientos manuales como automatizados, criterios de aceptación, y workflows de validación para diferentes escenarios.

## 🎯 Categorías de Testing

### 1. Testing Funcional
- ✅ **Generación QR**: Verificar que los QR se generan correctamente
- ✅ **Validación de Formato**: PNG, SVG, estructura válida
- ✅ **Escaneado Móvil**: Compatibilidad con dispositivos
- ✅ **Deep Link**: Funcionalidad del enlace de Radix

### 2. Testing de Performance
- ⚡ **Tiempo de Generación**: < 300ms objetivo
- 💾 **Uso de Memoria**: Monitoring de heap usage
- 📏 **Tamaño de Archivo**: < 50KB objetivo
- 🔄 **Throughput**: QRs por segundo

### 3. Testing de Compatibilidad
- 📱 **Dispositivos Móviles**: iOS, Android
- 📷 **Apps de Cámara**: Nativa, QR readers
- 🌐 **Navegadores**: Chrome, Safari, Firefox
- 🖥️ **Plataformas**: Windows, macOS, Linux

### 4. Testing de Calidad
- 🎯 **Precisión de Escaneado**: > 95% tasa de éxito
- 🔍 **Legibilidad**: Diferentes condiciones de luz
- 📐 **Tamaños**: Múltiples resoluciones
- 🛡️ **Error Correction**: Recuperación de daños

## 🔧 Procedimientos Manuales

### Procedimiento 1: Testing Básico de Generación

#### Objetivo
Verificar que el sistema puede generar QR codes válidos para deep links de Radix.

#### Prerequisitos
- Servidor MCP ejecutándose
- Acceso a herramientas MCP
- Deep link válido de prueba

#### Pasos de Ejecución

```bash
# Paso 1: Generar transacción de prueba
xrd_transaccion {
  "fromAddress": "account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct",
  "toAddress": "account_tdx_2_128abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567",
  "amount": "1.0",
  "message": "Test QR Generation"
}
```

```bash
# Paso 2: Generar QR local
deeplink_to_qr_local {
  "deeplink": "[deeplink_from_step_1]",
  "tamaño": 512,
  "calidad": "high"
}
```

#### Criterios de Aceptación
- ✅ QR generado sin errores
- ✅ Archivo PNG creado en directorio correcto
- ✅ Tamaño de archivo < 50KB
- ✅ Dimensiones correctas (512x512px)
- ✅ Hash único generado
- ✅ Metadata completa

#### Verificación Manual
```bash
# Verificar archivo creado
ls -la qrimages/qr-*.png

# Verificar tamaño
du -h qrimages/qr-*.png

# Verificar dimensiones (si tienes imagemagick)
identify qrimages/qr-*.png
```

### Procedimiento 2: Testing de Escaneado Móvil

#### Objetivo
Verificar que los QR codes son escaneables desde dispositivos móviles reales.

#### Prerequisitos
- QR code generado del Procedimiento 1
- Dispositivo móvil con cámara
- App Radix Wallet instalada
- Apps de QR scanner de terceros (opcional)

#### Pasos de Ejecución

**Fase A: Escaneado con Cámara Nativa**
1. Abrir app de cámara nativa del dispositivo
2. Enfocar el QR code en pantalla o impreso
3. Verificar detección automática del QR
4. Tocar la notificación o enlace detectado
5. Verificar que abre Radix Wallet

**Fase B: Escaneado con Apps QR**
1. Usar app QR Scanner de terceros
2. Escanear el mismo QR code
3. Verificar que detecta el deep link
4. Copiar/abrir el deep link
5. Verificar que abre Radix Wallet

**Fase C: Testing en Condiciones Adversas**
1. Escaneado con luz baja
2. Escaneado desde ángulo inclinado
3. Escaneado desde distancia mayor
4. Escaneado con reflejo en pantalla

#### Criterios de Aceptación
- ✅ Detección < 3 segundos en condiciones normales
- ✅ Funciona con cámara nativa iOS/Android
- ✅ Compatible con apps QR populares
- ✅ Abre Radix Wallet correctamente
- ✅ > 90% éxito en condiciones adversas

#### Registro de Resultados
```markdown
## Test Results - [Date/Time]

### Device: [Device Model/OS Version]
- **Camera Native**: ✅/❌ - [Time to detect]
- **QR App 1**: ✅/❌ - [App name/version]
- **QR App 2**: ✅/❌ - [App name/version]

### Conditions Testing:
- **Normal Light**: ✅/❌
- **Low Light**: ✅/❌ 
- **Angled (30°)**: ✅/❌
- **Angled (45°)**: ✅/❌
- **Distance (arm's length)**: ✅/❌
- **Distance (2x arm's length)**: ✅/❌

### Radix Wallet:
- **Opens correctly**: ✅/❌
- **Transaction loaded**: ✅/❌
- **All parameters present**: ✅/❌
```

### Procedimiento 3: Testing de Configuración Dinámica

#### Objetivo
Verificar que el sistema adapta la configuración según el contenido del deep link.

#### Prerequisitos
- Deep links de diferentes longitudes
- Acceso a configuración del sistema

#### Pasos de Ejecución

**Test Set A: URL Corta (< 100 chars)**
```bash
deeplink_to_qr_local {
  "deeplink": "radixwallet://tx/short",
  "tamaño": 256
}
```

**Test Set B: URL Media (100-500 chars)**
```bash
deeplink_to_qr_local {
  "deeplink": "radixwallet://transaction?data=[250_char_string]",
  "tamaño": 512
}
```

**Test Set C: URL Larga (> 500 chars)**
```bash
deeplink_to_qr_local {
  "deeplink": "radixwallet://transaction?data=[800_char_string]",
  "tamaño": 1024
}
```

#### Criterios de Aceptación
- ✅ URLs cortas: Configuración L level, generación < 150ms
- ✅ URLs medias: Configuración M level, generación < 250ms  
- ✅ URLs largas: Configuración H level, generación < 400ms
- ✅ Calidad apropiada para cada caso
- ✅ Todos los QRs escaneables

### Procedimiento 4: Testing de Error Handling

#### Objetivo
Verificar que el sistema maneja errores graciosamente.

#### Casos de Error a Probar

**Error Set A: Inputs Inválidos**
```bash
# Deep link vacío
deeplink_to_qr_local { "deeplink": "" }

# Deep link no-Radix  
deeplink_to_qr_local { "deeplink": "https://google.com" }

# Tamaño inválido
deeplink_to_qr_local { 
  "deeplink": "radixwallet://test",
  "tamaño": 50000
}
```

**Error Set B: File System Issues**
```bash
# Directorio sin permisos (simular)
# Disco lleno (simular)
# Directorio no existe (simular)
```

#### Criterios de Aceptación
- ✅ Mensajes de error claros en español
- ✅ No crash del servidor MCP
- ✅ Logs apropiados en stderr
- ✅ Fallbacks cuando sea posible
- ✅ Estado consistente del sistema

## 🤖 Procedimientos Automatizados

### Test Suite 1: Performance Benchmarks

#### Configuración del Benchmark
```typescript
// tests/performance/qr-benchmarks.test.ts
import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('QR Performance Benchmarks', () => {
  const PERFORMANCE_THRESHOLDS = {
    shortUrl: 150,   // ms
    mediumUrl: 250,  // ms  
    longUrl: 400,    // ms
    fileSize: 50000  // bytes
  };

  it('should generate short URL QR within threshold', async () => {
    const shortDeeplink = 'radixwallet://tx/abc123';
    
    const start = performance.now();
    const result = await localQRManager.generateQRLocal(shortDeeplink);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.shortUrl);
    expect(result.tamaño_bytes).toBeLessThan(PERFORMANCE_THRESHOLDS.fileSize);
  });

  it('should handle concurrent generation efficiently', async () => {
    const deeplinks = Array(10).fill(0).map((_, i) => 
      `radixwallet://tx/concurrent-${i}`
    );
    
    const start = performance.now();
    const results = await Promise.all(
      deeplinks.map(dl => localQRManager.generateQRLocal(dl))
    );
    const totalDuration = performance.now() - start;
    const avgDuration = totalDuration / deeplinks.length;
    
    expect(avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediumUrl);
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.archivo_path).toBeDefined();
    });
  });
});
```

### Test Suite 2: Compatibility Matrix

#### Device Simulation Framework
```typescript
// tests/compatibility/device-simulation.test.ts
import { describe, it, expect } from 'vitest';

const DEVICE_PROFILES = [
  { name: 'iPhone 13', os: 'iOS 15', camera: 'standard' },
  { name: 'Samsung S21', os: 'Android 12', camera: 'wide' },
  { name: 'Pixel 6', os: 'Android 13', camera: 'ultra_wide' },
  { name: 'iPhone SE', os: 'iOS 14', camera: 'basic' }
];

describe('Device Compatibility Matrix', () => {
  DEVICE_PROFILES.forEach(device => {
    it(`should work with ${device.name} (${device.os})`, async () => {
      const qrPath = await generateTestQR();
      const scanResult = await simulateDeviceScan(qrPath, device);
      
      expect(scanResult.success).toBe(true);
      expect(scanResult.detectionTime).toBeLessThan(5000); // 5s max
      expect(scanResult.decodedContent).toMatch(/^radixwallet:\/\//);
    });
  });

  it('should maintain >95% success rate across all devices', async () => {
    const qrPath = await generateTestQR();
    const results = await Promise.all(
      DEVICE_PROFILES.map(device => simulateDeviceScan(qrPath, device))
    );
    
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / results.length) * 100;
    
    expect(successRate).toBeGreaterThan(95);
  });
});
```

### Test Suite 3: End-to-End Workflows

#### Complete Workflow Testing
```typescript
// tests/e2e/complete-workflow.test.ts
describe('Complete QR Workflow E2E', () => {
  it('should complete full transaction QR workflow', async () => {
    // 1. Generate XRD transaction
    const transactionResult = await mcpClient.callTool('xrd_transaccion', {
      fromAddress: TEST_ADDRESSES.from,
      toAddress: TEST_ADDRESSES.to,
      amount: '1.0',
      message: 'E2E Test Transaction'
    });
    
    expect(transactionResult.success).toBe(true);
    const deeplink = extractDeeplink(transactionResult.content);
    
    // 2. Generate local QR
    const qrResult = await mcpClient.callTool('deeplink_to_qr_local', {
      deeplink: deeplink,
      tamaño: 512,
      calidad: 'high'
    });
    
    expect(qrResult.success).toBe(true);
    const qrPath = extractFilePath(qrResult.content);
    
    // 3. Validate generated QR
    const validationResult = await validateQRFile(qrPath);
    expect(validationResult.isValid).toBe(true);
    expect(validationResult.containsDeeplink).toBe(true);
    
    // 4. Test mobile scanning simulation
    const scanResult = await simulateMobileScan(qrPath);
    expect(scanResult.success).toBe(true);
    expect(scanResult.extractedDeeplink).toBe(deeplink);
    
    // 5. Cleanup
    await cleanupTestFiles([qrPath]);
  });

  it('should handle error recovery gracefully', async () => {
    // Test workflow with intentional failures
    // Verify system recovery and state consistency
  });
});
```

### Test Suite 4: Load Testing

#### High Volume Testing
```typescript
// tests/load/volume-testing.test.ts
describe('Load Testing', () => {
  it('should handle 100 concurrent QR generations', async () => {
    const CONCURRENT_COUNT = 100;
    const deeplinks = generateTestDeeplinks(CONCURRENT_COUNT);
    
    const start = performance.now();
    const results = await Promise.allSettled(
      deeplinks.map(dl => localQRManager.generateQRLocal(dl))
    );
    const duration = performance.now() - start;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const successRate = (successful / CONCURRENT_COUNT) * 100;
    
    expect(successRate).toBeGreaterThan(98); // 98% success minimum
    expect(duration).toBeLessThan(30000); // Complete in 30s
    
    // Verify no memory leaks
    const memoryAfter = process.memoryUsage();
    expect(memoryAfter.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB max
  });

  it('should maintain performance under sustained load', async () => {
    const BATCH_SIZE = 20;
    const BATCH_COUNT = 10;
    const BATCH_INTERVAL = 1000; // 1s between batches
    
    const batchResults = [];
    
    for (let i = 0; i < BATCH_COUNT; i++) {
      const deeplinks = generateTestDeeplinks(BATCH_SIZE);
      
      const batchStart = performance.now();
      const results = await Promise.all(
        deeplinks.map(dl => localQRManager.generateQRLocal(dl))
      );
      const batchDuration = performance.now() - batchStart;
      
      batchResults.push({
        batchIndex: i,
        duration: batchDuration,
        avgPerQR: batchDuration / BATCH_SIZE,
        memoryUsage: process.memoryUsage().heapUsed
      });
      
      // Wait between batches
      if (i < BATCH_COUNT - 1) {
        await new Promise(resolve => setTimeout(resolve, BATCH_INTERVAL));
      }
    }
    
    // Analyze performance degradation
    const firstBatchAvg = batchResults[0].avgPerQR;
    const lastBatchAvg = batchResults[BATCH_COUNT - 1].avgPerQR;
    const degradation = (lastBatchAvg - firstBatchAvg) / firstBatchAvg * 100;
    
    expect(degradation).toBeLessThan(20); // Max 20% degradation
  });
});
```

## 📊 Métricas y Criterios de Aceptación

### Métricas de Performance

| Métrica | Target | Warning | Critical |
|---------|--------|---------|----------|
| **Tiempo Generación QR** | < 300ms | > 500ms | > 1000ms |
| **Tamaño Archivo PNG** | < 50KB | > 75KB | > 100KB |
| **Uso Memoria Peak** | < 100MB | > 200MB | > 500MB |
| **Tiempo Escaneado Móvil** | < 3s | > 5s | > 10s |
| **Tasa Éxito Escaneado** | > 95% | < 90% | < 85% |

### Criterios de Calidad

**Funcionalidad**:
- ✅ QR genera correctamente para todos los deep links válidos
- ✅ Archivos PNG tienen formato válido y dimensiones correctas
- ✅ Deep links se extraen correctamente al escanear
- ✅ Radix Wallet abre y carga la transacción

**Compatibilidad**:
- ✅ Funciona en iOS 14+ y Android 10+
- ✅ Compatible con cámaras nativas y apps QR populares
- ✅ Escaneado exitoso en condiciones normales y adversas
- ✅ Soporte para múltiples tamaños de QR

**Performance**:
- ✅ Generación rápida según targets establecidos
- ✅ Uso eficiente de memoria sin leaks
- ✅ Manejo apropiado de carga concurrente
- ✅ Performance consistente bajo load sostenido

**Robustez**:
- ✅ Manejo gracioso de errores con mensajes claros
- ✅ Recovery automático de fallos temporales
- ✅ Estado consistente del sistema tras errores
- ✅ Logging apropiado para debugging

## 🔄 Workflows de CI/CD

### Pre-commit Hooks
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running QR system pre-commit checks..."

# Run QR-specific unit tests
npm run test:qr-unit
if [ $? -ne 0 ]; then
  echo "❌ QR unit tests failed"
  exit 1
fi

# Run quick performance check
npm run test:qr-perf-quick
if [ $? -ne 0 ]; then
  echo "❌ QR performance check failed"
  exit 1
fi

echo "✅ QR system pre-commit checks passed"
```

### Pull Request Testing
```yaml
# .github/workflows/pr-qr-testing.yml
name: PR QR Testing

on:
  pull_request:
    paths:
      - 'src/helpers/*qr*'
      - 'src/types/*qr*'
      - 'tests/**/*qr*'

jobs:
  qr-comprehensive-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Run QR unit tests
        run: npm run test:qr-unit
      
      - name: Run QR integration tests
        run: npm run test:qr-integration
      
      - name: Run QR performance benchmarks
        run: npm run test:qr-performance
      
      - name: Generate QR test report
        run: npm run test:qr-report
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        with:
          name: qr-test-results
          path: test-results/qr/
```

### Production Deployment Testing
```bash
#!/bin/bash
# scripts/production-qr-test.sh

echo "🚀 Production QR System Testing"

# 1. Smoke tests
echo "Running smoke tests..."
npm run test:qr-smoke
if [ $? -ne 0 ]; then
  echo "❌ Smoke tests failed"
  exit 1
fi

# 2. Integration tests
echo "Running integration tests..."
npm run test:qr-integration-prod
if [ $? -ne 0 ]; then
  echo "❌ Integration tests failed"
  exit 1
fi

# 3. Performance validation
echo "Running performance validation..."
npm run test:qr-performance-prod
if [ $? -ne 0 ]; then
  echo "❌ Performance validation failed"
  exit 1
fi

# 4. End-to-end testing
echo "Running E2E tests..."
npm run test:qr-e2e-prod
if [ $? -ne 0 ]; then
  echo "❌ E2E tests failed"
  exit 1
fi

echo "✅ All production QR tests passed"
```

## 📝 Reportes y Documentación

### Reporte de Testing Manual
```markdown
# QR Testing Report - [Date]

## Summary
- **Total Tests**: X
- **Passed**: Y  
- **Failed**: Z
- **Success Rate**: XX%

## Device Testing Results
| Device | OS | Camera App | QR App | Result |
|--------|----|-----------| -------|--------|
| iPhone 13 | iOS 15.6 | ✅ 2.1s | ✅ 1.8s | PASS |
| Samsung S21 | Android 12 | ✅ 2.5s | ✅ 2.0s | PASS |

## Performance Metrics
| Test Case | Generation Time | File Size | Scan Time |
|-----------|----------------|-----------|-----------|
| Short URL | 127ms | 12KB | 1.9s |
| Medium URL | 203ms | 28KB | 2.3s |
| Long URL | 387ms | 45KB | 2.8s |

## Issues Found
1. **Issue #1**: [Description and resolution]
2. **Issue #2**: [Description and resolution]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

### Automated Test Report
Los tests automatizados generan reportes en formato JSON y HTML que incluyen:
- Métricas detalladas de performance
- Resultados de compatibility matrix
- Análisis de tendencias temporales
- Recomendaciones automáticas
- Alertas de regresión

Estos procedimientos aseguran la calidad y confiabilidad del sistema QR en todas las condiciones de uso.