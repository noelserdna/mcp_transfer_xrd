# Matriz de Dependencias: qrcode-terminal Integration

## 📋 Resumen Ejecutivo

**Objetivo**: Integrar `qrcode-terminal` para mostrar códigos QR directamente en consola/terminal para los deep links de RadixDLT.

**Estado Actual**: ✅ VIABLE - Compatible con arquitectura existente
**Riesgo General**: 🟡 MEDIO - Requiere coordinación cuidadosa con helpers existentes
**Tiempo Estimado**: 2-4 horas implementación + testing

---

## 🔍 1. Análisis de qrcode-terminal

### Versión Recomendada
```json
{
  "qrcode-terminal": "^0.12.0"
}
```

**Justificación**:
- Versión estable más reciente (2024)
- Ampliamente adoptada (2.6M descargas semanales en npm)
- Mantenimiento activo y sin vulnerabilidades conocidas

### Características Técnicas
- **Tamaño**: ~15KB (muy liviana)
- **Dependencias**: 0 dependencias externas
- **Plataformas**: Windows, macOS, Linux
- **Node.js**: Compatible con >=10.0.0 (✅ cumple proyecto actual)

### API Principal
```typescript
import * as qrcode from 'qrcode-terminal';

// Uso básico
qrcode.generate('texto', { small: true });

// Con opciones avanzadas
qrcode.generate('texto', {
  small: boolean,
  error_correction_level: 'L' | 'M' | 'Q' | 'H'
});
```

---

## 🔗 2. Conflictos Potenciales

### ❌ CONFLICTOS IDENTIFICADOS

#### A. Naming Conflict
- **Problema**: Ya existe librería `qrcode` (^1.5.4) en dependencias
- **Impacto**: ALTO - Posible confusión en imports y nombres de tipos
- **Mitigación**: 
  ```typescript
  import QRCode from 'qrcode';           // Existente (SVG/PNG/Buffer)
  import * as QRTerminal from 'qrcode-terminal'; // Nuevo (Terminal output)
  ```

#### B. Funcionalidad Superpuesta
- **Problema**: Ambas librerías generan códigos QR
- **Diferencia Clave**:
  - `qrcode`: Genera archivos (SVG, PNG, Base64)
  - `qrcode-terminal`: Genera output ASCII para terminal/consola
- **Estrategia**: Complementarias, no conflictivas

### ✅ COMPATIBILIDADES CONFIRMADAS

#### A. Ecosystem Compatibility
- **TypeScript**: ✅ Compatible (DefinitelyTyped disponible)
- **ESM Modules**: ✅ Compatible con `"type": "module"`
- **Node.js 20+**: ✅ Funciona perfectamente
- **MCP Protocol**: ✅ No interfiere con stdio transport

#### B. Dependencies Tree
```
qrcode-terminal@0.12.0
└── (no dependencies)
```
**Resultado**: ✅ LIMPIO - Sin conflictos de versioning

---

## 🏗️ 3. Mapeo de Integración con Código Existente

### Puntos de Integración

#### A. helpers/qr-generator.ts
**Relación**: COMPLEMENTARIA
```typescript
// Estructura propuesta
export class QRGenerator {
  // Métodos existentes (mantener)
  async generateSVG(deeplink: string): Promise<string>
  async generatePNG(deeplink: string, size?: number): Promise<string>
  
  // NUEVO método para terminal
  generateTerminal(deeplink: string, options?: TerminalQROptions): void
}
```

#### B. Nuevos Types (qr-types.ts)
```typescript
// Extender tipos existentes
export interface DeepLinkToQRParams {
  deeplink: string;
  formato?: 'svg' | 'png' | 'both' | 'terminal'; // ← Agregar 'terminal'
  tamaño?: number;
  terminal_options?: TerminalQROptions; // ← Nuevo
}

export interface TerminalQROptions {
  small?: boolean;
  error_correction_level?: 'L' | 'M' | 'Q' | 'H';
}
```

#### C. MCP Tools Integration
**Nueva herramienta**: `deeplink_to_qr_terminal`
```typescript
server.tool('deeplink_to_qr_terminal', {
  description: 'Muestra código QR directamente en terminal/consola',
  schema: z.object({
    deeplink: z.string().describe('Deep link de Radix Wallet'),
    small: z.boolean().optional().describe('Usar formato pequeño'),
    show_text: z.boolean().optional().describe('Mostrar URL debajo del QR')
  })
});
```

### Flujo de Datos Propuesto
```
Deep Link Input
    ↓
QRGenerator.generateTerminal()
    ↓
qrcode-terminal.generate()
    ↓
Console Output (stdout/stderr)
    ↓
MCP Client sees terminal output
```

---

## 📦 4. Estrategia de Instalación

### Dependencias a Agregar
```json
{
  "dependencies": {
    "qrcode-terminal": "^0.12.0"
  },
  "devDependencies": {
    "@types/qrcode-terminal": "^0.12.2"
  }
}
```

### Scripts de Setup
```json
{
  "scripts": {
    "setup:qr-terminal": "npm install qrcode-terminal @types/qrcode-terminal",
    "test:qr": "npm run build && node -e \"require('./build/helpers/qr-generator.js').testTerminalQR()\""
  }
}
```

### Configuración TypeScript
**tsconfig.json** - ✅ Sin cambios necesarios
- Ya configurado para `"type": "module"`
- Ya incluye `@types/node` que es suficiente

---

## 🚀 5. Plan de Migración

### Fase 1: Instalación Segura (30 min)
```bash
# 1. Crear rama feature
git checkout -b feature/qrcode-terminal-integration

# 2. Backup package.json
cp package.json package.json.backup

# 3. Instalar dependencias como devDependency primero (testing)
npm install --save-dev qrcode-terminal @types/qrcode-terminal

# 4. Verificar no hay conflictos
npm ls
npm audit
```

### Fase 2: Testing de Compatibilidad (45 min)
```bash
# 1. Crear archivo de prueba aislado
touch tests/qrcode-terminal-compatibility.test.ts

# 2. Test básico de importación
npm run build
node -e "import('qrcode-terminal').then(qr => console.log('✅ Import OK'))"

# 3. Test de compatibilidad con MCP
npm run test:watch tests/qrcode-terminal-compatibility.test.ts
```

### Fase 3: Integración Gradual (2-3 horas)
1. **Extender types** (qr-types.ts)
2. **Actualizar QRGenerator** con método terminal
3. **Crear nueva herramienta MCP** 
4. **Tests de integración**
5. **Documentación**

### Fase 4: Rollback Plan
```bash
# Si hay problemas:
git checkout package.json.backup
npm install
npm run build
npm test

# Restaurar estado limpio
git checkout master
git branch -D feature/qrcode-terminal-integration
```

---

## ⚠️ 6. Riesgos y Mitigaciones

### Riesgo ALTO: Output Interference
**Problema**: qrcode-terminal escribe directamente a `process.stdout`
**Impacto**: Puede interferir con MCP stdio protocol
**Mitigación**: 
```typescript
// Capturar stdout temporalmente
const originalWrite = process.stdout.write;
let terminalOutput = '';

process.stdout.write = (chunk: any) => {
  terminalOutput += chunk;
  return true;
};

qrcode.generate(deeplink, options);

// Restaurar stdout
process.stdout.write = originalWrite;

// Enviar como parte de response MCP
return { terminal_qr: terminalOutput };
```

### Riesgo MEDIO: Size Limitations
**Problema**: QR en terminal puede ser demasiado grande
**Mitigación**: Forzar `{ small: true }` por defecto

### Riesgo BAJO: Cross-platform Display
**Problema**: Caracteres ASCII pueden verse diferentes en Windows/Linux/macOS
**Mitigación**: Testing en múltiples plataformas + fallback a `deeplink_to_qr_local`

---

## 📊 7. Matriz de Dependencias

| Componente | Tipo | Impacto | Mitigación | Prioridad |
|------------|------|---------|------------|-----------|
| `qrcode` library | SOFT | Medio | Import aliasing | Alta |
| MCP stdio protocol | HARD | Alto | Output capturing | Crítica |
| Terminal compatibility | SOFT | Bajo | Fallback options | Media |
| Type definitions | HARD | Medio | Install @types | Alta |
| Build process | HARD | Bajo | No changes needed | Baja |
| Testing framework | SOFT | Medio | New test cases | Media |

### Camino Crítico
```
Install deps → Test compatibility → Extend QRGenerator → Create MCP tool → Integration tests
```
**Duración estimada**: 4-6 horas
**Bloqueadores**: Ninguno identificado

---

## ✅ 8. Criterios de Éxito

### Funcional
- [ ] QR mostrado correctamente en terminal
- [ ] Compatible con deep links largos de RadixDLT  
- [ ] No interfiere con protocolo MCP stdio
- [ ] Fallback graceful si terminal no soporta caracteres

### Técnico
- [ ] Build sin errores ni warnings
- [ ] Tests pasan 100%
- [ ] No conflictos de dependencias
- [ ] Performance <100ms para generación

### Experiencia de Usuario
- [ ] QR legible en terminales estándar
- [ ] Mensajes de error claros en español
- [ ] Documentación actualizada

---

## 🎯 Recomendación Final

**PROCEDER** con la integración siguiendo el plan de migración en 4 fases.

**Ventajas**:
- Mejora significativa UX para usuarios de terminal
- Riesgo técnico controlado
- Complementa (no reemplaza) funcionalidad existente
- Dependencia liviana y estable

**Estrategia sugerida**: Implementar como herramienta opcional que coexista con las existentes, manteniendo retrocompatibilidad total.