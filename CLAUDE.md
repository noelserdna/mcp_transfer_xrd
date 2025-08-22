# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server implementation in TypeScript that provides RadixDLT blockchain integration. The server runs over stdio and enables XRD token transfers on the Stokenet testnet through mobile wallet deep links. It uses @modelcontextprotocol/sdk, radix-connect, Zod for validation, and qrcode library for QR generation.

## Development Commands

### Build and Start
```bash
npm run build        # Compile TypeScript to build/ directory
npm start           # Run compiled MCP server on stdio
```

### Testing
```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode  
npm run test:ui     # Run tests with UI interface
```

### Running Single Tests
```bash
npx vitest tests/server.test.ts           # Run server integration tests
npx vitest tests/echo-tool.test.ts        # Run echo tool unit tests
npx vitest tests/deeplink-to-qr.test.ts   # Run QR generation unit tests
```

## Architecture

### MCP Server Structure (src/index.ts)

The server implements the MCP protocol with:

1. **McpServer Instance**: Configures server capabilities and metadata
2. **RadixConnectManager Class**: Handles Radix wallet integration
   - Creates relay transport for deep link generation
   - Manages transaction request callbacks
   - Generates transaction manifests for XRD transfers
3. **Tool Registration**: Registers `xrd_transaccion`, `deeplink_to_qr` and `deeplink_to_qr_local` tools with Zod validation
4. **QRGenerator Helper**: Manages QR code generation with SVG/PNG support
5. **LocalQRManager Helper**: Manages local PNG file generation for Claude Desktop compatibility
6. **Prompt Registration**: Registers `transferir_xrd` prompt for guided transfers

### RadixDLT Integration

**Network Configuration**:
- Target: Stokenet (testnet) - networkId: 2
- XRD Resource: `resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc`
- dApp Definition: `account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct`
- Origin: `https://wellradix.pages.dev/`

**Transaction Manifest Pattern**:
- Uses `withdraw` from source account
- Creates worktop bucket for XRD amount
- Calls `try_deposit_or_abort` on destination account

### Tool Implementation

**xrd_transaccion**: Generates deep links for XRD transfers on Stokenet
- Parameters: `fromAddress`, `toAddress`, `amount`, `message` (optional)
- Validation: Zod schemas with Spanish descriptions
- Returns: Deep link string for Radix Wallet mobile app

**deeplink_to_qr**: Converts Radix Wallet deep links to QR codes
- Parameters: `deeplink`, `formato` (optional: 'svg', 'png', 'both'), `tamaño` (optional PNG size)
- Validation: Validates Radix deep link protocols (radixwallet://, wallet.radixdlt.com)
- Returns: SVG and/or PNG Base64 QR codes with metadata
- Library: Uses `qrcode` library for robust QR generation
- Formats: SVG (scalable) and PNG (universal compatibility)

**deeplink_to_qr_local**: Generates QR codes as local PNG files for Claude Desktop compatibility
- Parameters: `deeplink`, `tamaño` (optional, default: 1024px), `calidad` (optional: 'high'), `directorio` (optional)
- Validation: Strict validation of Radix deep link protocols with enhanced error handling
- Returns: Local PNG file path with metadata (hash, dimensions, file size, generation time)
- Directory: Auto-creates `qrimages/` directory with automatic cleanup (7-day retention)
- Filename: Unique SHA-256 based naming (`qr-{hash}-{timestamp}.png`) prevents duplicates
- Quality: Optimized for mobile scanning with high error correction level (H)
- Performance: <300ms generation time, optimized file size with high quality
- Compatibility: Resolves Claude Desktop artifact rendering issues with Base64 QR codes

**transferir_xrd** (Prompt): Interactive guide for XRD transfers with QR generation
- Provides Spanish instructions for wallet addresses and amounts
- Explains deep link workflow and wallet integration
- **NEW**: Includes QR code generation instructions and use cases
- Returns formatted guidance with validation status and QR options

### QR Generation Usage Guide

**When to use `deeplink_to_qr_local`** (Recommended for Claude Desktop):
- Working in Claude Desktop environment where artifacts need to be rendered
- Need persistent, reusable QR files for sharing or documentation
- Require high-quality QR codes optimized for mobile camera scanning
- Want automatic file management with duplicate prevention
- Need QR files for external applications or long-term storage

**When to use `deeplink_to_qr`** (Legacy/Base64 format):
- Working in environments other than Claude Desktop
- Need embedded SVG/PNG data for direct integration
- Working with applications that consume Base64 encoded images
- Require both SVG and PNG formats simultaneously
- Need smaller output data without file system interaction

**Workflow Recommendation**:
1. Generate XRD transaction with `xrd_transaccion`
2. Convert to local QR file with `deeplink_to_qr_local` for Claude Desktop compatibility
3. Share or render the generated PNG file as needed

### Testing Architecture

**Integration Tests** (tests/server.test.ts):
- Spawns actual server process using child_process
- Tests server startup and stderr output validation
- Tests JSON-RPC message handling with MCP protocol
- Builds project before test execution

**QR Generation Tests** (tests/deeplink-to-qr.test.ts):
- Unit tests for QRGenerator class with SVG/PNG generation
- Deep link validation tests for Radix protocols
- Format-specific testing (SVG only, PNG only, both)  
- Error handling and edge cases (invalid links, sizes)
- Integration testing with different protocols

**Configuration**:
- Vitest with Node environment and 10s timeout
- Coverage reporting with v8 provider  
- ESM modules with TypeScript strict mode
- Test files pattern: `tests/**/*.test.ts`

## MCP Protocol Details

The server uses stdio transport for MCP communication:
- **stdin**: Receives JSON-RPC requests from MCP clients
- **stdout**: Sends JSON-RPC responses back to clients
- **stderr**: Server logging and status messages
- **Protocol**: Compatible with MCP SDK 1.0.0 and 2025-06-18 specification
- recuerda darme todos los mensajes en español

## Documentación de Investigación

### Carpeta `investigaciones/`
Contiene toda la documentación técnica generada por sub-agentes de investigación durante el desarrollo del proyecto. Consultar siempre estos archivos antes de implementar nuevas funcionalidades relacionadas:

**API y Conexiones**:
- `investigaciones/radix-gateway-api.md` - Documentación completa de Radix Gateway API actualizada con hallazgos de GitHub
- `investigaciones/api-implementation-details.md` - Decisiones de implementación y patrones recomendados

**GitHub Integration & Migration Path (NUEVAS)**:
- `investigaciones/radix-dapp-toolkit-integration.md` - **CRÍTICO**: Análisis de migración de radix-connect a radix-dapp-toolkit oficial
- `investigaciones/official-examples-analysis.md` - Patterns y código extraíble de repositorios oficiales RadixDLT
- `investigaciones/github-integration-summary.md` - **ROADMAP**: Síntesis consolidada con plan de mejoras implementables

**Validación y Verificación**:
- `investigaciones/balance-verification-methods.md` - Métodos de verificación de balances XRD, comparación de opciones y estrategias de cache
- `investigaciones/address-validation-patterns.md` - Algoritmos de validación de direcciones Stokenet, formatos y checksums
- `investigaciones/validation-implementation.md` - Patrones implementados y casos de test

**Manejo de Errores**:
- `investigaciones/error-handling-strategies.md` - Códigos de error, mensajes localizados en español y estrategias de recovery

**Optimización y Testing**:
- `investigaciones/performance-optimization.md` - Optimizaciones implementadas, benchmarks y recomendaciones
- `investigaciones/testing-strategies.md` - Estrategias de testing, casos de carga y validación de performance

### Uso Recomendado

**PRIORIDAD ALTA - Migration Path**:
1. **Para mejoras inmediatas**: Leer `github-integration-summary.md` primero - contiene roadmap completo
2. **Para migración técnica**: Consultar `radix-dapp-toolkit-integration.md` - análisis crítico radix-connect → RDT
3. **Para implementación**: Usar código de `official-examples-analysis.md` - patterns probados y extraíbles

**Durante Desarrollo**:
1. **Antes de implementar**: Consultar archivos relevantes en `investigaciones/`
2. **Durante desarrollo**: Seguir patrones y recomendaciones documentadas
3. **Para troubleshooting**: Gateway API actualizada y error handling strategies
4. **Nuevas investigaciones**: Generar archivos MD usando el formato estándar definido en `investigaciones/README.md`
5. **Futuras funcionalidades**: Actualizar referencias en este CLAUDE.md cuando se agreguen nuevas investigaciones

**NOTA IMPORTANTE**: Las investigaciones de GitHub Integration (Fase 1) proporcionan un plan completo de migración que debe ser consultado antes de realizar cambios significativos al código actual.

### Carpeta `task/`
Contiene planes detallados de implementación y seguimiento de progreso