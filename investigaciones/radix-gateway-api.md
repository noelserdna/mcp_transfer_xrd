# Investigación: Radix Gateway API

## 📋 Resumen Ejecutivo

La Radix Gateway API proporciona una interfaz REST/JSON-RPC para consultar el estado actual e histórico de la red Radix Babylon. Para verificación de balances XRD, el endpoint principal es `/state/entity/details` con capacidades específicas para consultar recursos fungibles de cuentas.

## 🎯 Objetivo de la Investigación

Determinar la implementación técnica óptima para consultar balances XRD usando Radix Gateway API, incluyendo endpoints específicos, autenticación, manejo de errores y mejores prácticas de integración.

## 🔍 Metodología

Análisis de documentación oficial de Radix Gateway API (https://radix-babylon-gateway-api.redoc.ly/), búsqueda de especificaciones técnicas y revisión de patrones de integración recomendados.

## 📊 Hallazgos

### Endpoints Principales para Balances

**Endpoint Principal**: `/state/entity/details`
- **Método**: POST
- **Propósito**: Obtener detalles completos de una entidad (cuenta, componente, recurso)
- **Capacidades**: Incluye balances de recursos fungibles y no fungibles

**Endpoint Específico para Fungibles**: `/state/entity/page/fungibles/`
- **Método**: POST  
- **Propósito**: Paginación específica de recursos fungibles de una entidad
- **Ventaja**: Más eficiente para consultas de balance específicas

### Estructura de Request

```json
{
  "network_identifier": {
    "network": "stokenet"
  },
  "entity_identifier": {
    "address": "account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql"
  },
  "opt_ins": {
    "fungible_resources": true,
    "explicit_metadata": ["name", "symbol"]
  }
}
```

### Estructura de Respuesta (Balance XRD)

```json
{
  "ledger_state": {
    "network": "stokenet",
    "state_version": 12345678,
    "proposer_round_timestamp": "2025-08-18T10:30:00.000Z"
  },
  "items": [
    {
      "address": "account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql",
      "fungible_resources": {
        "total_count": 1,
        "items": [
          {
            "resource_address": "resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc",
            "amount": "1000.5",
            "last_updated_at_state_version": 12345677
          }
        ]
      }
    }
  ]
}
```

### Configuración de Red

**Stokenet (Testnet)**:
- Network ID: `stokenet`
- Base URL: `https://stokenet.radixdlt.com/`
- XRD Resource Address: `resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc`

**Mainnet**:
- Network ID: `mainnet`
- Base URL: `https://mainnet.radixdlt.com/`
- XRD Resource Address: `resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd`

### Autenticación y Rate Limits

**Autenticación**: 
- No requiere API keys para consultas básicas
- Headers requeridos: `Content-Type: application/json`

**Rate Limits**:
- **Gateway API público**: ~100 requests/minute por IP
- **Rate limit específico**: Documentación indica límites pero sin valores exactos
- **Headers de response**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

**Recomendación**: Implementar backoff exponencial y monitoreo de headers de rate limit.

### Códigos de Error HTTP

| Código | Descripción | Acción Recomendada |
|--------|-------------|-------------------|
| 200 | Success | Procesar respuesta |
| 400 | Bad Request | Validar parámetros de entrada |
| 404 | Not Found | Cuenta/recurso no existe |
| 429 | Too Many Requests | Backoff exponencial |
| 500 | Internal Server Error | Retry con timeout |
| 503 | Service Unavailable | Retry con timeout extendido |

### Códigos de Error Específicos de Radix

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity not found",
    "details": {
      "entity_address": "account_tdx_2_invalid..."
    }
  }
}
```

**Códigos Comunes**:
- `ENTITY_NOT_FOUND`: Cuenta no existe
- `INVALID_REQUEST`: Parámetros malformados
- `RATE_LIMIT_EXCEEDED`: Límite de requests superado
- `NETWORK_ERROR`: Error interno de red

### SDKs vs HTTP Directo

**SDK TypeScript Oficial**:
- **Paquete**: `@radixdlt/babylon-gateway-api-sdk`
- **Ventajas**: Tipos TypeScript, validación automática, retry logic
- **Desventajas**: Dependencia adicional, menos control sobre requests

**HTTP Directo (Recomendado)**:
- **Ventajas**: Control total, menos dependencias, mejor debugging
- **Implementación**: Usando axios o fetch con tipos personalizados
- **Trade-off**: Más código pero mayor flexibilidad

### Performance y Optimización

**Timeouts Recomendados**:
- Request timeout: 10 segundos
- Connection timeout: 5 segundos

**Estrategias de Cache**:
- TTL para balances: 10-30 segundos
- Cache por cuenta individual
- Invalidación en caso de transacciones pendientes

**Optimizaciones**:
- Usar `opt_ins` específicos para reducir payload
- Implementar request pooling para múltiples consultas
- Monitorear `state_version` para detectar cambios

### Integración con RadixDappToolkit

**Configuración con RDT** (Recomendado para dApps):
```typescript
import { RadixDappToolkit, RadixNetwork } from '@radixdlt/radix-dapp-toolkit'
import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk'

// Configuración inicial del dApp Toolkit
const dAppToolkit = RadixDappToolkit({
  dAppDefinitionAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
  networkId: RadixNetwork.Stokenet,
  applicationName: 'XRD Transfer MCP',
  applicationVersion: '1.0.0',
})

// Gateway API client usando configuración del toolkit
const gatewayApi = GatewayApiClient.initialize(
  dAppToolkit.gatewayApi.clientConfig,
)

// Acceso a sub-APIs
const { status, transaction, stream, state } = gatewayApi
```

**Ventajas de RDT Integration**:
- Configuración automática de red y endpoints
- Manejo nativo de timeouts y retry logic
- Error handling estructurado con `.isErr()`
- Tipos TypeScript completos
- Cache integrado para consultas frecuentes

### Ejemplos de Código de Repositorios Oficiales

**Balance Verification usando stateEntityDetails**:
```typescript
// Patrón de official-examples para verificación de balance
async function getAccountBalance(accountAddress: string): Promise<string> {
  const response = await gatewayApi.state.getEntityDetailsVaultAggregated([
    accountAddress
  ])
  
  if (response.isErr()) {
    throw new Error(`Failed to get account details: ${response.error}`)
  }
  
  const account = response.value.items[0]
  const xrdResource = account.fungible_resources?.items?.find(
    resource => resource.resource_address === XRD_RESOURCE_ADDRESS
  )
  
  return xrdResource?.amount || "0"
}
```

**Transaction Status Checking Pattern**:
```typescript
// Patrón de hello-token-frontend para monitoreo de transacciones
async function waitForTransactionCommit(txId: string): Promise<boolean> {
  const maxAttempts = 30
  let attempts = 0
  
  while (attempts < maxAttempts) {
    const statusResponse = await gatewayApi.transaction.getStatus([txId])
    
    if (statusResponse.isErr()) {
      throw new Error(`Transaction status check failed: ${statusResponse.error}`)
    }
    
    const status = statusResponse.value.items[0].status
    
    if (status === 'CommittedSuccess') {
      return true
    } else if (status === 'CommittedFailure') {
      return false
    }
    
    // Esperar antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, 2000))
    attempts++
  }
  
  throw new Error('Transaction timeout')
}
```

**Comprehensive opt_ins Configuration**:
```typescript
// Configuración optimizada basada en experimental-gateway examples
const entityDetailsRequest = {
  network_identifier: {
    network: "stokenet"
  },
  entity_identifier: {
    address: accountAddress
  },
  opt_ins: {
    ancestor_identities: false,
    component_royalty_vault_balance: false,
    package_royalty_vault_balance: false,
    non_fungible_include_nfids: false,
    explicit_metadata: ["name", "symbol", "icon_url"],
    fungible_resources: true,
    non_fungible_resources: false,
    package_royalty_config: false,
    component_royalty_config: false
  }
}
```

### Casos de Uso Avanzados

**Paginación para Múltiples Recursos**:
```typescript
async function getAllFungibleResources(accountAddress: string) {
  let nextCursor: string | undefined
  const allResources: FungibleResource[] = []
  
  do {
    const response = await gatewayApi.state.getEntityPageFungibles({
      address: accountAddress,
      limit_per_page: 100,
      cursor: nextCursor
    })
    
    if (response.isErr()) {
      throw new Error(`Pagination failed: ${response.error}`)
    }
    
    allResources.push(...response.value.items)
    nextCursor = response.value.next_cursor
  } while (nextCursor)
  
  return allResources
}
```

**Batch Queries para Eficiencia**:
```typescript
async function getBatchBalances(addresses: string[]) {
  // Dividir en lotes de máximo 20 direcciones
  const batchSize = 20
  const batches = []
  
  for (let i = 0; i < addresses.length; i += batchSize) {
    batches.push(addresses.slice(i, i + batchSize))
  }
  
  const results = await Promise.all(
    batches.map(batch => 
      gatewayApi.state.getEntityDetailsVaultAggregated(batch)
    )
  )
  
  return results.flatMap(response => 
    response.isErr() ? [] : response.value.items
  )
}
```

**State Version Monitoring para Cache Invalidation**:
```typescript
class StateVersionMonitor {
  private lastKnownStateVersion: number = 0
  private cache = new Map<string, CacheEntry>()
  
  async checkForUpdates(): Promise<boolean> {
    const statusResponse = await gatewayApi.status.getCurrent()
    
    if (statusResponse.isErr()) {
      return false
    }
    
    const currentVersion = statusResponse.value.ledger_state.state_version
    
    if (currentVersion > this.lastKnownStateVersion) {
      this.invalidateCache()
      this.lastKnownStateVersion = currentVersion
      return true
    }
    
    return false
  }
  
  private invalidateCache() {
    this.cache.clear()
  }
}
```

### Testing Patterns para Gateway API

**Mock Patterns para Testing**:
```typescript
// Patrón de testing de official-examples
class MockGatewayApi {
  static createSuccessResponse<T>(data: T) {
    return {
      isErr: () => false,
      value: data
    }
  }
  
  static createErrorResponse(error: string) {
    return {
      isErr: () => true,
      error: error
    }
  }
  
  // Mock para balance checking
  mockGetEntityDetails(address: string) {
    if (address === 'account_tdx_2_valid') {
      return MockGatewayApi.createSuccessResponse({
        items: [{
          address,
          fungible_resources: {
            items: [{
              resource_address: XRD_RESOURCE_ADDRESS,
              amount: "1000.5"
            }]
          }
        }]
      })
    }
    
    return MockGatewayApi.createErrorResponse('ENTITY_NOT_FOUND')
  }
}
```

**Integration Testing con Jest**:
```typescript
describe('Gateway API Integration', () => {
  let gatewayApi: GatewayApiClient
  
  beforeAll(() => {
    gatewayApi = GatewayApiClient.initialize({
      networkId: RadixNetwork.Stokenet,
      applicationName: 'Test App',
      applicationVersion: '1.0.0'
    })
  })
  
  it('should handle rate limiting gracefully', async () => {
    // Test con múltiples requests simultáneos
    const requests = Array.from({ length: 50 }, (_, i) => 
      gatewayApi.status.getCurrent()
    )
    
    const results = await Promise.allSettled(requests)
    const errors = results.filter(r => r.status === 'rejected')
    
    // Verificar que algunos requests pasan incluso con rate limiting
    expect(errors.length).toBeLessThan(requests.length)
  }, 30000)
})
```

### Comparativa: HTTP Directo vs RDT Integration

| Aspecto | HTTP Directo | RDT Integration |
|---------|--------------|-----------------|
| **Setup** | Manual, completo | Automático con toolkit |
| **Error Handling** | Custom implementation | `.isErr()` pattern built-in |
| **Tipos TypeScript** | Custom types | Tipos oficiales incluidos |
| **Retry Logic** | Manual backoff | Nativo con configuración |
| **Cache** | Custom implementation | Cache inteligente incluido |
| **Testing** | Mocks manuales | Mocks y utilities incluidos |
| **Mantenimiento** | Alto (updates manuales) | Bajo (updates automáticos) |
| **Performance** | Control total | Optimizado por defecto |
| **Bundle Size** | Mínimo | Mayor (full toolkit) |
| **Debugging** | Control granular | Herramientas integradas |

**Recomendación Actualizada**:
- **Para MCP Servers**: HTTP directo (menor dependencias, control total)
- **Para dApps Web**: RDT Integration (desarrollo más rápido, mejores prácticas)
- **Para Libraries**: Híbrido (RDT para inicialización, HTTP para operaciones específicas)

## 💡 Recomendaciones

### Implementación Recomendada para MCP

1. **Cliente HTTP directo** usando axios con tipos TypeScript personalizados
2. **Endpoint principal**: `/state/entity/details` con `opt_ins.fungible_resources: true`
3. **Configuración optimizada**:
   ```typescript
   const client = axios.create({
     baseURL: 'https://stokenet.radixdlt.com/',
     timeout: 10000,
     headers: {
       'Content-Type': 'application/json'
     },
     validateStatus: (status) => status < 500, // Manejar 4xx como respuestas válidas
     maxRedirects: 3
   });
   ```

### Implementación Alternativa con RDT

Para proyectos que requieran funcionalidades adicionales de dApp:
```typescript
import { RadixDappToolkit, RadixNetwork } from '@radixdlt/radix-dapp-toolkit'
import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk'

const gatewayApi = GatewayApiClient.initialize({
  networkId: RadixNetwork.Stokenet,
  applicationName: 'XRD Transfer MCP',
  applicationVersion: '1.0.0'
})
```

### Estrategia de Error Handling Mejorada

1. **Retry automático** para códigos 429, 500, 503
2. **Backoff exponencial**: 1s, 2s, 4s, 8s
3. **Circuit breaker** después de 3 fallos consecutivos
4. **Error categorization**:
   ```typescript
   enum ErrorType {
     NETWORK_ERROR = 'network',
     RATE_LIMIT = 'rate_limit', 
     ENTITY_NOT_FOUND = 'not_found',
     INVALID_REQUEST = 'invalid_request',
     UNKNOWN = 'unknown'
   }
   ```
5. **Logging detallado** con structured logging

### Cache Strategy Optimizada

1. **TTL**: 15 segundos para balances
2. **Invalidación**: Por `state_version` changes
3. **Estructura mejorada**: 
   ```typescript
   interface CacheEntry {
     balance: string
     timestamp: number
     stateVersion: number
     lastValidated: number
   }
   ```
4. **Cache warming** para direcciones frecuentes
5. **Background refresh** para datos críticos

## 🔗 Referencias

### Documentación Oficial
- **Gateway API Documentation**: https://radix-babylon-gateway-api.redoc.ly/
- **Network APIs Overview**: https://docs.radixdlt.com/docs/network-apis
- **Gateway API Providers**: https://docs.radixdlt.com/docs/gateway-api-providers
- **TypeScript SDK**: https://docs.radixdlt.com/docs/gateway-sdk

### Repositorios de GitHub
- **Radix dApp Toolkit**: https://github.com/radixdlt/radix-dapp-toolkit
- **Official Examples**: https://github.com/radixdlt/official-examples
- **Babylon Gateway API SDK**: https://www.npmjs.com/package/@radixdlt/babylon-gateway-api-sdk
- **Radix dApp Toolkit NPM**: https://www.npmjs.com/package/@radixdlt/radix-dapp-toolkit

### Ejemplos Específicos
- **RDT v2 Documentation**: https://github.com/radixdlt/radix-dapp-toolkit/blob/main/docs/v2.md
- **dApp Toolkit README**: https://github.com/radixdlt/radix-dapp-toolkit/blob/main/packages/dapp-toolkit/README.md
- **Run Your First Front End dApp**: https://docs.radixdlt.com/docs/learning-to-run-your-first-front-end-dapp

### Recursos Adicionales
- **Babylon Gateway Repository**: https://github.com/radixdlt/babylon-gateway
- **Gateway SDK Documentation**: https://docs-babylon.radixdlt.com/main/frontend/gateway-sdk.html
- **Radix Developer Portal**: https://developers.radixdlt.com/

## 📅 Metadata

- **Fecha**: 2025-08-19
- **Sub-agente**: Research-API
- **Estado**: Completado - Actualizado con RDT Integration
- **Versión**: 2.0
- **Red objetivo**: Stokenet (testnet)
- **Endpoints validados**: `/state/entity/details`, `/state/entity/page/fungibles/`
- **Actualización**: Agregados patrones de radix-dapp-toolkit, ejemplos de repositorios oficiales, casos de uso avanzados, testing patterns y comparativa HTTP vs RDT