# 🔗 radix-connect

> Conectividad con wallets de RadixDLT para autenticación, transacciones y manejo de eventos.

## Configuración y Inicialización

```typescript
import {
  createRadixConnectClient,
  createRadixConnectRelayTransport,
  RadixConnectClient,
  WalletRequest,
  WalletResponse
} from 'radix-connect'

// Configuración del cliente
interface RadixConnectConfig {
  networkId: NetworkId
  dAppDefinitionAddress: string
  origin: string
  enableDebug?: boolean
}

class RadixConnectManager {
  private client: RadixConnectClient
  private config: RadixConnectConfig
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected'

  constructor(config: RadixConnectConfig) {
    this.config = config
    this.client = this.initializeClient()
  }

  private initializeClient(): RadixConnectClient {
    const transport = createRadixConnectRelayTransport({
      handleRequest: this.handleDeepLink.bind(this),
      onConnect: this.onConnect.bind(this),
      onDisconnect: this.onDisconnect.bind(this),
    })

    return createRadixConnectClient({ transport })
  }

  private async handleDeepLink({ deepLink }: { deepLink: string }) {
    if (this.config.enableDebug) {
      console.log('🔗 Deep link received:', deepLink)
    }
    
    // Generar QR code para mostrar al usuario
    await this.generateQRCode(deepLink)
  }

  private onConnect() {
    this.connectionState = 'connected'
    console.log('✅ RadixConnect connected')
  }

  private onDisconnect() {
    this.connectionState = 'disconnected'
    console.log('❌ RadixConnect disconnected')
  }

  async generateQRCode(deepLink: string): Promise<string> {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(deepLink, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: 'M'
    })
  }
}
```

## Autenticación y Login

```typescript
// Authentication patterns
class RadixAuthenticator extends RadixConnectManager {

  // Login con challenge
  async loginWithChallenge(challenge?: string): Promise<WalletResponse> {
    const authChallenge = challenge || this.generateChallenge()
    
    const request: WalletRequest = {
      interactionId: crypto.randomUUID(),
      metadata: {
        version: 2,
        networkId: this.config.networkId,
        dAppDefinitionAddress: this.config.dAppDefinitionAddress,
        origin: this.config.origin,
      },
      items: {
        discriminator: 'authorizedRequest',
        auth: {
          discriminator: 'loginWithChallenge',
          challenge: authChallenge,
        },
      },
    }

    return await this.client.sendRequest(request)
  }

  // Login con proof
  async loginWithProof(identityAddress: string): Promise<WalletResponse> {
    const request: WalletRequest = {
      interactionId: crypto.randomUUID(),
      metadata: {
        version: 2,
        networkId: this.config.networkId,
        dAppDefinitionAddress: this.config.dAppDefinitionAddress,
        origin: this.config.origin,
      },
      items: {
        discriminator: 'authorizedRequest',
        auth: {
          discriminator: 'loginWithProof',
          identityAddress,
        },
      },
    }

    return await this.client.sendRequest(request)
  }

  // Generar challenge único
  private generateChallenge(): string {
    return `${this.config.origin}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Validar respuesta de autenticación
  validateAuthResponse(response: WalletResponse): boolean {
    if (!response.isOk()) {
      console.error('❌ Auth failed:', response.error)
      return false
    }

    const authResponse = response.value
    return authResponse.auth.discriminator === 'loginSuccess'
  }
}
```

## Solicitudes de Transacciones

```typescript
// Transaction request patterns
class RadixTransactionRequester extends RadixAuthenticator {

  // Solicitud de transacción simple
  async requestTransaction(
    manifest: string,
    message?: string
  ): Promise<WalletResponse> {
    const request: WalletRequest = {
      interactionId: crypto.randomUUID(),
      metadata: {
        version: 2,
        networkId: this.config.networkId,
        dAppDefinitionAddress: this.config.dAppDefinitionAddress,
        origin: this.config.origin,
      },
      items: {
        discriminator: 'transaction',
        send: {
          transactionManifest: manifest,
          version: 1,
          message: message || 'Transaction request',
        },
      },
    }

    return await this.client.sendRequest(request)
  }

  // Solicitud de transacción con datos personalizados
  async requestTransactionWithData(
    manifest: string,
    blobs: Uint8Array[],
    message?: string
  ): Promise<WalletResponse> {
    const request: WalletRequest = {
      interactionId: crypto.randomUUID(),
      metadata: {
        version: 2,
        networkId: this.config.networkId,
        dAppDefinitionAddress: this.config.dAppDefinitionAddress,
        origin: this.config.origin,
      },
      items: {
        discriminator: 'transaction',
        send: {
          transactionManifest: manifest,
          version: 1,
          message: message || 'Transaction with data',
          blobs: blobs.map(blob => Array.from(blob)),
        },
      },
    }

    return await this.client.sendRequest(request)
  }

  // Batch de múltiples transacciones
  async requestBatchTransactions(
    transactions: Array<{
      manifest: string
      message?: string
      blobs?: Uint8Array[]
    }>
  ): Promise<WalletResponse[]> {
    const results: WalletResponse[] = []
    
    for (const tx of transactions) {
      try {
        const result = tx.blobs 
          ? await this.requestTransactionWithData(tx.manifest, tx.blobs, tx.message)
          : await this.requestTransaction(tx.manifest, tx.message)
        results.push(result)
      } catch (error) {
        console.error('❌ Batch transaction failed:', error)
        throw error
      }
    }
    
    return results
  }
}
```

## Manejo de Estados de Conexión

```typescript
// Connection state management
class RadixConnectionStateManager extends RadixTransactionRequester {
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000

  // Auto-reconnection logic
  async ensureConnection(): Promise<boolean> {
    if (this.connectionState === 'connected') {
      return true
    }

    this.connectionState = 'connecting'
    
    while (this.reconnectAttempts < this.maxReconnectAttempts) {
      try {
        await this.attemptReconnection()
        this.reconnectAttempts = 0
        return true
      } catch (error) {
        this.reconnectAttempts++
        console.warn(`⚠️ Reconnection attempt ${this.reconnectAttempts} failed`)
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          await this.delay(this.reconnectDelay * this.reconnectAttempts)
        }
      }
    }

    this.connectionState = 'disconnected'
    console.error('❌ Max reconnection attempts reached')
    return false
  }

  private async attemptReconnection(): Promise<void> {
    // Re-initialize client
    this.client = this.initializeClient()
    
    // Test connection with a simple request
    await this.testConnection()
  }

  private async testConnection(): Promise<void> {
    // Send a lightweight request to test connection
    const testRequest: WalletRequest = {
      interactionId: 'connection-test',
      metadata: {
        version: 2,
        networkId: this.config.networkId,
        dAppDefinitionAddress: this.config.dAppDefinitionAddress,
        origin: this.config.origin,
      },
      items: {
        discriminator: 'ping',
      },
    }

    await this.client.sendRequest(testRequest)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Connection health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.testConnection()
      return true
    } catch {
      return false
    }
  }
}
```

## Eventos y Callbacks Avanzados

```typescript
// Event handling patterns
interface RadixConnectEvents {
  onDeepLink?: (deepLink: string, interactionId: string) => void
  onTransactionSubmitted?: (transactionHash: string) => void
  onTransactionSuccess?: (result: any) => void
  onTransactionFailed?: (error: any) => void
  onWalletDisconnected?: () => void
  onNetworkChanged?: (networkId: NetworkId) => void
}

class RadixEventManager extends RadixConnectionStateManager {
  private eventHandlers: RadixConnectEvents = {}

  // Registrar event handlers
  on<K extends keyof RadixConnectEvents>(
    event: K,
    handler: RadixConnectEvents[K]
  ): void {
    this.eventHandlers[event] = handler
  }

  // Ejecutar event handlers
  private emit<K extends keyof RadixConnectEvents>(
    event: K,
    ...args: Parameters<NonNullable<RadixConnectEvents[K]>>
  ): void {
    const handler = this.eventHandlers[event]
    if (handler) {
      // @ts-ignore - Type inference limitation
      handler(...args)
    }
  }

  // Override handleDeepLink para emitir eventos
  protected async handleDeepLink({ deepLink }: { deepLink: string }) {
    await super.handleDeepLink({ deepLink })
    
    // Extraer interaction ID del deep link si es posible
    const interactionId = this.extractInteractionId(deepLink)
    this.emit('onDeepLink', deepLink, interactionId)
  }

  // Procesar respuesta de transacción con eventos
  async processTransactionResponse(response: WalletResponse): Promise<void> {
    if (response.isOk()) {
      const result = response.value
      
      if (result.transactionHash) {
        this.emit('onTransactionSubmitted', result.transactionHash)
        this.emit('onTransactionSuccess', result)
      }
    } else {
      this.emit('onTransactionFailed', response.error)
    }
  }

  private extractInteractionId(deepLink: string): string {
    // Implementar lógica para extraer interaction ID del deep link
    const match = deepLink.match(/interactionId=([^&]+)/)
    return match ? match[1] : 'unknown'
  }
}
```

---

## 📖 Navegación

- **Anterior:** [02-radix-engine-toolkit.md](./02-radix-engine-toolkit.md) - Motor fundamental RadixDLT
- **Siguiente:** [04-radix-web3.md](./04-radix-web3.md) - Cliente Web3 de alto nivel
- **Índice:** [README.md](./README.md) - Volver al índice principal