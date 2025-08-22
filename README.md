# Radix MCP Server - Sistema de Transferencias XRD

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.0.0-green.svg)](https://modelcontextprotocol.io/)
[![RadixDLT](https://img.shields.io/badge/RadixDLT-Stokenet-purple.svg)](https://www.radixdlt.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.0-yellow.svg)](https://vitest.dev/)

**Servidor MCP (Model Context Protocol) avanzado en TypeScript** que proporciona integración completa con RadixDLT blockchain para transferencias de XRD en Stokenet testnet. Incluye validaciones automáticas, verificación de balances en tiempo real, generación de códigos QR y deep links para Radix Wallet móvil.

## 🎯 Características Principales

### 🔧 Herramientas MCP Disponibles

1. **`xrd_transaccion`** - Genera deep links para transferencias XRD con validaciones automáticas
   - ✅ Validación instantánea de direcciones Stokenet
   - ✅ Verificación de balance en tiempo real vía Radix Gateway API
   - ✅ Generación de manifiestos de transacción seguros
   - ✅ Mensajes informativos en español

2. **`deeplink_to_qr`** - Convierte deep links a códigos QR escaneables
   - 📱 Formatos SVG (escalable) y PNG (universal)
   - 🔍 Optimizado para deep links largos de Radix Wallet
   - 📊 Base64 ready para integración web
   - ⚡ Generación rápida y confiable

3. **`deeplink_to_qr_local`** - Genera QR codes como archivos PNG locales para Claude Desktop
   - 🖼️ Archivos PNG persistentes con compatibilidad de artefactos
   - 📁 Gestión automática de archivos en `qrimages/` con limpieza inteligente  
   - 🎯 Optimización de calidad para escaneado móvil confiable
   - 🔄 Nombres únicos SHA-256 basados evitan duplicados

4. **`test_qr_terminal`** - Sistema completo de testing QR con qrcode-terminal (Development)
   - 🔬 Testing inmediato con 4 modos: render, compare, validate, demo
   - 📊 Análisis automático de compatibilidad de terminal y recomendaciones
   - 🎯 Renderizado directo en terminal para debugging instantáneo
   - ⚙️ Comparaciones en tiempo real entre métodos de generación QR

### 💡 Prompts MCP Interactivos

- **`transferir_xrd`** - Guía interactiva para crear transferencias XRD
  - 🛡️ Explicación de validaciones automáticas habilitadas
  - 📋 Instrucciones paso a paso en español
  - 💡 Información sobre beneficios de QR codes
  - 🎯 Casos de uso y ejemplos prácticos

### 🛡️ Sistema de Validación Avanzado

- **AddressValidator**: Validación local instantánea de direcciones Stokenet
- **BalanceChecker**: Verificación de balances XRD vía Gateway API
- **RadixAPIHelper**: Cliente HTTP optimizado con cache y retry logic
- **QRGenerator**: Generador robusto de códigos QR con múltiples formatos

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 20+
- npm 9+

### Instalación
```bash
# Clonar el repositorio
git clone <tu-repo>
cd radix_stdio

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build
```

## ⚡ Uso Rápido

### Iniciar el servidor MCP
```bash
npm start
```

### Ejecutar tests
```bash
# Todos los tests
npm test

# Tests en modo watch
npm run test:watch

# UI interactiva de tests
npm run test:ui
```

### Tests específicos
```bash
# Tests de integración del servidor
npx vitest tests/server.test.ts

# Tests de generación QR
npx vitest tests/deeplink-to-qr.test.ts

# Tests de validación
npx vitest tests/validators.test.ts

# Tests de API Radix
npx vitest tests/radix-api.test.ts
```

### 🔬 QR Testing y Debugging (Development)
```bash
# Testing interactivo QR con terminal
npm run debug:qr

# Testing rápido con datos de ejemplo
npm run test:qr

# Benchmark de configuraciones QR
npm run benchmark:qr

# Validación de contenido QR
npm run validate:qr

# Demo interactivo de QR terminal
npm run demo:qr
```

## 🏗️ Arquitectura del Sistema

### Estructura del Proyecto (Optimizada para Producción)
```
radix_stdio/
├── 📁 src/                           # Código fuente principal
│   ├── 📄 index.ts                     # Servidor MCP principal
│   ├── 📁 helpers/
│   │   ├── address-validator.ts        # Validación de direcciones
│   │   ├── balance-checker.ts          # Verificación de balances
│   │   ├── qr-generator.ts            # Generación QR con optimizaciones
│   │   ├── qr-terminal-renderer.ts     # 🆕 QR terminal rendering
│   │   ├── local-qr-manager.ts         # Gestión archivos PNG locales
│   │   └── radix-api.ts              # Cliente Gateway API
│   └── 📁 types/
│       ├── radix-types.ts            # Tipos para Radix
│       ├── qr-types.ts              # Tipos para QR
│       └── qr-terminal-types.ts      # 🆕 Tipos QR terminal
├── 📁 tests/                         # 8+ suites de tests completas
├── 📁 investigaciones/               # 📚 Documentación técnica consolidada
├── 📁 docs/                         # Guías de referencia Radix core
├── 📄 .gitignore                   # ✨ Optimizado para producción limpia
├── 📄 CLAUDE.md                     # Instrucciones del proyecto actualizadas
└── 📄 README.md                     # Esta documentación

# Archivos excluidos por .gitignore optimizado:
# ⛔ qrimages/           - QR generados (temporales)
# ⛔ scripts/            - Herramientas de desarrollo
# ⛔ *.png, *.jpg        - Capturas y assets temporales
# ⛔ debug-*.js          - Scripts de debugging
# ⛔ Archivos de análisis temporal (analysis/, architecture/, risks/, etc.)
```

### Flujo de Validación Integrado
```
Usuario → xrd_transaccion → Validar direcciones → Verificar balance 
     → Generar manifest → Crear deep link → Respuesta enriquecida
```

### Componentes Clave

#### 🔐 **RadixConnectManager** (src/index.ts)
- Maneja la integración con Radix Wallet
- Genera relay transport para deep links
- Gestiona callbacks de solicitudes de transacción

#### 🛡️ **Sistema de Validación** (src/helpers/)
- **AddressValidator**: Validación local de formato y red
- **BalanceChecker**: Consultas a Gateway API con cache inteligente
- **RadixAPIHelper**: Cliente HTTP robusto con retry logic

#### 📱 **QRGenerator & Terminal System** (src/helpers/)
- **qr-generator.ts**: SVG/PNG con optimizaciones para deep links largos
- **qr-terminal-renderer.ts**: 🆕 Renderizado terminal con qrcode-terminal
- **local-qr-manager.ts**: Gestión PNG locales con limpieza automática
- Base64 encoding para integración web y validación robusta

## 🌐 Integración RadixDLT

### Configuración de Red
- **Red**: Stokenet (testnet) - networkId: 2
- **Recurso XRD**: `resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc`
- **dApp Definition**: `account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct`
- **Origin**: `https://wellradix.pages.dev/`

### Patrón de Manifest de Transacción
```
CALL_METHOD Address("origen") "withdraw" Address("XRD_RESOURCE") Decimal("cantidad")
TAKE_ALL_FROM_WORKTOP Address("XRD_RESOURCE") Bucket("bucket1")
CALL_METHOD Address("destino") "try_deposit_or_abort" Bucket("bucket1")
```

## 🧪 Testing Comprehensivo

### Suites de Tests (8 archivos)
- ✅ **server.test.ts**: Tests de integración del servidor MCP
- ✅ **deeplink-to-qr.test.ts**: Tests de generación QR
- ✅ **validators.test.ts**: Tests de validación de direcciones
- ✅ **radix-api.test.ts**: Tests de API Gateway
- ✅ **integration.test.ts**: Tests end-to-end completos
- ✅ **functional-demo.test.ts**: Demos funcionales
- ✅ **integration-simple.test.ts**: Tests de integración simples
- ✅ **echo-tool.test.ts**: Tests legacy de herramienta echo

### Configuración de Testing
- **Framework**: Vitest con Node environment
- **Timeout**: 10 segundos por test
- **Coverage**: Reporte con v8 provider
- **Módulos**: ESM con TypeScript strict mode

## 📚 Documentación Técnica

### Carpeta `investigaciones/` - Documentación Avanzada
- 📄 **radix-gateway-api.md** - Gateway API completa actualizada
- 📄 **radix-dapp-toolkit-integration.md** - Migración a RDT oficial
- 📄 **github-integration-summary.md** - Roadmap de mejoras
- 📄 **address-validation-patterns.md** - Algoritmos de validación
- 📄 **balance-verification-methods.md** - Métodos de verificación
- 📄 **error-handling-strategies.md** - Manejo de errores localizado
- 📄 **validation-implementation.md** - Patrones implementados

### Carpeta `docs/` - Referencias Radix
- Guías completas de RadixDLT, Radix Engine Toolkit, Radix Connect
- Patrones de programación y flujos de desarrollo
- Referencias de nivel experto

## 🔧 Dependencias Principales

### Runtime Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.0",         // MCP Protocol
  "@radixdlt/babylon-gateway-api-sdk": "^1.10.1", // Gateway API
  "@radixdlt/radix-dapp-toolkit": "^2.2.1",     // Futuro: RDT oficial
  "radix-connect": "^0.3.0",                    // Actual: Deep links
  "axios": "^1.11.0",                           // HTTP client
  "decimal.js": "^10.6.0",                      // Aritmética decimal
  "qrcode": "^1.5.4",                          // Generación QR
  "zod": "^3.25.76"                            // Validación schemas
}
```

### Development Dependencies
```json
{
  "@types/qrcode": "^1.5.5",                   // Types para QR
  "@types/qrcode-terminal": "^0.12.2",         // 🆕 Types para terminal QR
  "qrcode-terminal": "^0.12.0",                // 🆕 Terminal QR rendering
  "vitest": "^2.0.0",                          // Framework de testing
  "@vitest/ui": "^2.0.0",                      // UI interactiva
  "typescript": "^5.0.0"                       // Compilador TS
}
```

## 🎯 Casos de Uso

### 1. Transferencia Básica XRD
```bash
# Usar herramienta xrd_transaccion
{
  "fromAddress": "account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql",
  "toAddress": "account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct",
  "amount": "10.5",
  "message": "Pago de servicios"
}
```

### 2. Generación de QR Code
```bash
# QR como archivos PNG locales (Claude Desktop)
# Usar herramienta deeplink_to_qr_local
{
  "deeplink": "radixwallet://transaction_intent?...",
  "tamaño": 1024,    # Píxeles (default optimizado)
  "calidad": "high"    # Calidad para escaneado móvil
}

# QR como Base64 (integración web)
# Usar herramienta deeplink_to_qr
{
  "deeplink": "radixwallet://transaction_intent?...",
  "formato": "both",  # SVG y PNG
  "tamaño": 512      # Píxeles para PNG
}
```

### 3. Testing QR (Development)
```bash
# Testing completo con terminal rendering
# Usar herramienta test_qr_terminal
{
  "deeplink": "radixwallet://transaction_intent?...",
  "modo": "demo",        # render, compare, validate, demo
  "comparar_con": ["local_png", "base64_png"]
}
```

### 4. Guía Interactiva
```bash
# Usar prompt transferir_xrd para obtener instrucciones paso a paso
```

## ⚡ Performance y Optimización

### Cache Inteligente
- **Balances**: Cache de 15 segundos para consultas Gateway
- **Validaciones**: Direcciones se validan localmente (instantáneo)
- **QR Local**: Gestión automática con limpieza de 7 días

### Configuraciones de Timeout
- **Validaciones de red**: 10 segundos máximo
- **Generación QR**: 5 segundos máximo (⚡ <300ms para PNG locales)
- **Tests**: 10 segundos por test individual
- **Terminal QR**: Renderizado instantáneo (<100ms)

### Retry Logic
- **Gateway API**: 3 reintentos automáticos con backoff exponencial
- **QR Generation**: 2 reintentos con optimización automática para deep links largos
- **Terminal Compatibility**: Detección automática y fallbacks

### 📁 Repository Management
- **.gitignore optimizado**: Separación clara producción/desarrollo
- **Archivos temporales excluidos**: QR generados, scripts debug, documentación temporal
- **Build limpio**: Solo archivos esenciales en deployment

## 🛡️ Manejo de Errores

### Tipos de Error Estructurados
```typescript
enum ErrorType {
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR'
}
```

### Mensajes Localizados en Español
- ❌ Errores específicos con sugerencias de corrección
- 💡 Recomendaciones constructivas para resolver problemas  
- ⚠️ Advertencias informativas sin bloquear funcionalidad
- ✅ Confirmaciones detalladas de validaciones exitosas

## 🔮 Roadmap y Mejoras Futuras

### Fase 5: Migración a radix-dapp-toolkit
- Migración gradual de radix-connect a RDT oficial
- ManifestBuilder type-safe para construcción de transacciones
- RadixEngineToolkit native para validación de direcciones

### Optimizaciones Planificadas  
- WebSocket para actualizaciones de balance en tiempo real
- Cache distribuido para múltiples instancias del servidor
- Soporte para múltiples tokens (no solo XRD)

### Funcionalidades Adicionales
- Historial de transacciones
- Estimación de fees automática  
- Soporte para transacciones multi-componente
- API REST complementaria al protocolo MCP

## 🤝 Contribución

### Configuración de Desarrollo
1. Fork del repositorio
2. `npm install` para instalar dependencias
3. `npm run test:watch` para desarrollo con tests automáticos
4. Seguir patrones existentes en `src/helpers/`

### Estándares de Código
- TypeScript strict mode obligatorio
- Tests para todas las funcionalidades nuevas  
- Mensajes de error en español
- Documentación actualizada en `investigaciones/`

### Proceso de PR
1. Tests pasando: `npm test`
2. Build exitoso: `npm run build` 
3. Linting: Configurado automáticamente
4. Documentación actualizada según cambios

## 📄 Licencia

MIT License - Ver archivo LICENSE para detalles completos.

## 🎯 Estado del Proyecto

**🟢 Estable y en Producción + Herramientas de Development Avanzadas**
- ✅ Fase 4 (Integración) completada exitosamente
- ✅ Sistema de validación completamente implementado  
- ✅ Generación QR funcional y optimizada con múltiples formatos
- ✅ 🆕 Sistema completo de testing QR con terminal integration
- ✅ Tests comprehensivos con 8+ suites completas
- ✅ Documentación técnica consolidada y .gitignore optimizado
- ✅ Development tools y debugging infrastructure completa

**📈 Métricas de Calidad**
- Cobertura de tests: Completa para funcionalidades principales + QR terminal testing
- Compatibilidad: 100% con MCP SDK 1.0 + qrcode-terminal integration
- Performance: Respuestas < 30 segundos validaciones, <300ms QR generation
- UX: Detección temprana de errores, mensajes informativos y debugging tools
- Repository: Optimizado para producción limpia con development tools completos

---

*Desarrollado con ❤️ para la comunidad RadixDLT - Integrando blockchain de forma simple y segura*