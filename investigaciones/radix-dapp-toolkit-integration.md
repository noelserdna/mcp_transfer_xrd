# Investigación: Radix dApp Toolkit - Integración y Mejores Prácticas

## 📋 Resumen Ejecutivo

El Radix dApp Toolkit (RDT) es el sucesor oficial de radix-connect, ofreciendo APIs más robustas, mejor manejo de deep links automáticos para wallets móviles, y soporte nativo TypeScript. Para el proyecto MCP, RDT proporciona alternativas superiores para construcción de transacciones XRD, validación de direcciones, y manejo de errores estructurado.

## 🎯 Objetivo de la Investigación

Analizar el radix-dapp-toolkit oficial para identificar patrones, mejores prácticas y funcionalidades que puedan mejorar la implementación actual del servidor MCP que maneja transferencias XRD en Stokenet, comparando con radix-connect actualmente usado.

## 🔍 Metodología

Análisis exhaustivo del repositorio https://github.com/radixdlt/radix-dapp-toolkit, explorando packages, examples, documentación y código fuente. Revisión específica de implementaciones TypeScript/JavaScript para transacciones, validaciones y patrones de integración con wallets.

## 📊 Hallazgos

### Arquitectura General del Toolkit

**Estructura Monorepo**:
```
radix-dapp-toolkit/
├── packages/
│   ├── rdt/                    # Core toolkit
│   ├── connect-button/         # UI component
│   └── wallet-sdk/            # Wallet integration
├── examples/
│   ├── vanilla-js-dapp/       # Ejemplo básico
│   └── react-dapp/           # Ejemplo React
└── apps/
    └── sandbox/              # Ambiente de pruebas
```

**Diferencias Clave vs radix-connect**:
- **RDT es el sucesor oficial** - radix-connect está deprecated
- **Mejor manejo de deep links automáticos** para mobile/desktop
- **APIs más consistentes** con TypeScript nativo
- **Error handling estructurado** con patrones `.isErr()`

### Integración con Wallets

**Patrón de Inicialización**:
```typescript
import { RadixDappToolkit, DataRequestBuilder } from '@radixdlt/radix-dapp-toolkit'

const rdt = RadixDappToolkit({
  dAppDefinitionAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
  networkId: 2, // Stokenet
  applicationName: 'RadixMCP',
  applicationVersion: '1.0.0',
})

// State management automático
rdt.walletApi.setRequestData(DataRequestBuilder.accounts().exactly(1))
rdt.walletApi.dataRequestControl(walletData => {
  console.log('Wallet conectada:', walletData.accounts)
})
```

**Ventajas vs Implementación Actual**:
1. **State management automático** de conexiones wallet
2. **Detección automática** mobile vs desktop
3. **Callbacks estructurados** para cambios de estado
4. **Validaciones nativas** de direcciones Radix

### Construcción de Transacciones XRD

**Método 1: Template Strings (Simple)**:
```typescript
const manifest = `
CALL_METHOD
    Address("${fromAddress}")
    "withdraw"
    Address("${XRD_RESOURCE}")
    Decimal("${amount}");

TAKE_FROM_WORKTOP
    Address("${XRD_RESOURCE}")
    Decimal("${amount}")
    Bucket("bucket1");

CALL_METHOD
    Address("${toAddress}")
    "try_deposit_or_abort"
    Bucket("bucket1")
    Enum<0u8>();
`
```

**Método 2: ManifestBuilder (Avanzado)**:
```typescript
import { ManifestBuilder } from '@radixdlt/radix-engine-toolkit'

const manifest = new ManifestBuilder()
  .withdrawFromAccount(fromAddress, XRD_RESOURCE, amount)
  .takeFromWorktop(XRD_RESOURCE, amount, "bucket1")
  .callMethod(toAddress, "try_deposit_or_abort", ["Bucket(\"bucket1\")", "Enum<0u8>()"])
  .build()
  .toString()
```

**Método 3: SimpleTransactionBuilder (Recomendado)**:
```typescript
import { SimpleTransactionBuilder } from '@radixdlt/radix-dapp-toolkit'

const transactionManifest = SimpleTransactionBuilder()
  .transferFungible({
    from: fromAddress,
    to: toAddress,
    resourceAddress: XRD_RESOURCE,
    amount: amount
  })
  .message(message || "XRD Transfer via MCP")
  .build()
```

### Manejo de Errores Estructurado

**Patrón Error Handling**:
```typescript
const result = await rdt.walletApi.sendTransaction({
  transactionManifest: manifest,
  version: 1
})

if (result.isErr()) {
  const error = result.error
  switch (error.errorType) {
    case 'rejectedByUser':
      throw new Error('Transacción rechazada por el usuario')
    case 'failedToBuildTransaction':
      throw new Error('Error construyendo transacción: ' + error.error)
    case 'submissionFailed':
      throw new Error('Error enviando transacción: ' + error.error)
    default:
      throw new Error('Error desconocido: ' + error.error)
  }
}

// Success path
const txId = result.value.transactionIntentHash
return `radixwallet://transaction/${txId}`
```

### Validación de Direcciones

**Validador Nativo**:
```typescript
import { isValidAddress } from '@radixdlt/radix-dapp-toolkit'

function validateRadixAddress(address: string, networkId: number): boolean {
  return isValidAddress(address) && address.includes(
    networkId === 1 ? 'rdx' : 'tdx_2'
  )
}

// Validación específica para Stokenet accounts
function validateStokeNetAccount(address: string): boolean {
  return isValidAddress(address) && 
         address.startsWith('account_tdx_2_') &&
         address.length === 68
}
```

### Configuración Multi-Network

**Configuración Declarativa**:
```typescript
const networks = {
  stokenet: {
    networkId: 2,
    gatewayUrl: 'https://stokenet.radixdlt.com',
    xrdResource: 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
  },
  mainnet: {
    networkId: 1,
    gatewayUrl: 'https://mainnet.radixdlt.com',
    xrdResource: 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd'
  }
}

const config = networks.stokenet // Para MCP project
```

### Patterns de Testing Encontrados

**Estructura de Tests**:
```typescript
// Mock wallet responses
const mockWalletApi = {
  sendTransaction: jest.fn(),
  dataRequestControl: jest.fn(),
}

describe('XRD Transfer Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should build valid transaction manifest', () => {
    const manifest = buildXRDTransferManifest({
      from: 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
      to: 'account_tdx_2_128evrrwfp8gj9240qq0m06ukhwaj2cmejluxxreanzjwq62vmlf8r4',
      amount: '100',
      message: 'Test transfer'
    })
    
    expect(manifest).toContain('withdraw')
    expect(manifest).toContain('try_deposit_or_abort')
    expect(manifest).toContain('100')
  })
})
```

### Transaction Callbacks y UX

**Mejores Patrones UX**:
```typescript
const sendTransaction = async (txData) => {
  // 1. Pre-validation
  if (!validateTransaction(txData)) {
    throw new Error('Datos de transacción inválidos')
  }

  // 2. Build manifest
  const manifest = buildManifest(txData)

  // 3. Send with callbacks
  const result = await rdt.walletApi.sendTransaction({
    transactionManifest: manifest,
    version: 1,
    onProgress: (status) => {
      console.log(`Estado: ${status}`)
    }
  })

  // 4. Handle result
  return processTransactionResult(result)
}
```

### Comparación Directa: radix-connect vs RDT

| Característica | radix-connect (Actual) | Radix dApp Toolkit (RDT) |
|---------------|------------------------|--------------------------|
| **Estado** | Deprecated | Oficial y activo |
| **Deep Links** | Manual | Automático móvil/desktop |
| **TypeScript** | Tipos básicos | Tipos nativos completos |
| **Error Handling** | Manual | Estructurado con `.isErr()` |
| **State Management** | Manual | Automático |
| **Validaciones** | Custom | Nativas incluidas |
| **Testing** | Sin patterns | Patterns establecidos |
| **Documentación** | Limitada | Completa con ejemplos |

## 💡 Recomendaciones

### Migración Recomendada (Fases)

**Fase 1: PoC con RDT**
```typescript
// Crear rama experimental
// Implementar tool básico con RDT
// Comparar performance vs implementación actual
```

**Fase 2: Migración del Tool**
```typescript
// Migrar xrd_transaccion tool
// Implementar error handling mejorado  
// Agregar validaciones nativas
```

**Fase 3: Mejoras UX**
```typescript
// Agregar transaction callbacks
// Implementar state management
// Mejorar documentación prompts
```

### Implementación Inmediata Sugerida

**1. Helper de Validación Mejorado**:
```typescript
import { isValidAddress } from '@radixdlt/radix-dapp-toolkit'

export const validateStokeNetAddresses = (from: string, to: string) => {
  const errors: string[] = []
  
  if (!isValidAddress(from) || !from.startsWith('account_tdx_2_')) {
    errors.push('Dirección origen inválida para Stokenet')
  }
  
  if (!isValidAddress(to) || !to.startsWith('account_tdx_2_')) {
    errors.push('Dirección destino inválida para Stokenet')
  }
  
  return { isValid: errors.length === 0, errors }
}
```

**2. Constructor de Transacciones Mejorado**:
```typescript
export const buildXRDTransferManifest = (params: {
  from: string;
  to: string;
  amount: string;
  message?: string;
}) => {
  return SimpleTransactionBuilder()
    .transferFungible({
      from: params.from,
      to: params.to,
      resourceAddress: STOKENET_XRD_RESOURCE,
      amount: params.amount
    })
    .message(params.message || "Transferencia XRD via MCP")
    .build()
}
```

**3. Error Handler Estructurado**:
```typescript
export const handleTransactionError = (error: any): string => {
  if (error.errorType === 'rejectedByUser') {
    return 'El usuario rechazó la transacción en la wallet'
  }
  if (error.errorType === 'failedToBuildTransaction') {
    return 'Error construyendo la transacción. Verifica los parámetros.'
  }
  if (error.errorType === 'submissionFailed') {
    return 'Error enviando la transacción a la red. Intenta nuevamente.'
  }
  return 'Error desconocido en la transacción'
}
```

### Ventajas de Adopción

1. **Mejor Mantenibilidad**: APIs estables y documentadas
2. **Menos Código Custom**: Validaciones y utilidades incluidas
3. **Mejor UX**: Deep links automáticos y error messages mejorados
4. **Future-proof**: Toolkit oficial con soporte continuo
5. **Better Testing**: Patterns establecidos para blockchain testing

### Plan de Migración Gradual

1. **Week 1**: Instalar RDT y crear PoC básico
2. **Week 2**: Implementar tool paralelo con RDT
3. **Week 3**: Testing comparativo performance/funcionalidad
4. **Week 4**: Migrar tool principal si resultados son positivos
5. **Week 5**: Refactoring y cleanup de código legacy

## 🔗 Referencias

- **Radix dApp Toolkit**: https://github.com/radixdlt/radix-dapp-toolkit
- **Examples Repo**: https://github.com/radixdlt/radix-dapp-toolkit/tree/main/examples
- **Documentation**: https://docs.radixdlt.com/docs/dapp-toolkit
- **NPM Package**: https://www.npmjs.com/package/@radixdlt/radix-dapp-toolkit
- **Vanilla JS Example**: https://github.com/radixdlt/radix-dapp-toolkit/tree/main/examples/vanilla-js-dapp
- **React Example**: https://github.com/radixdlt/radix-dapp-toolkit/tree/main/examples/react-dapp

## 📅 Metadata

- **Fecha**: 2025-08-19
- **Sub-agente**: Research-Integration
- **Estado**: Completado
- **Versión**: 1.0
- **Prioridad**: Alta (Migration recomendada)
- **Impacto**: Mejora significativa en mantenibilidad y UX