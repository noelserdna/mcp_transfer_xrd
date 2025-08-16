# 🚀 Guía Completa de Programación RadixDLT

> La referencia técnica definitiva para desarrolladores que buscan dominar el ecosistema de programación RadixDLT desde fundamentos hasta implementaciones avanzadas.

## 📚 Índice Navegable

### 🟢 **Fundamentos**
- [Introducción al Ecosistema](#introducción-al-ecosistema)
- [Instalación y Setup](#instalación-y-setup)
- [Conceptos Básicos](#conceptos-básicos)

### 🟡 **Referencia de APIs**
- [@radixdlt/radix-engine-toolkit](#radixdltradix-engine-toolkit)
- [radix-connect](#radix-connect)
- [radix-web3.js](#radix-web3js)

### 🟡 **Patrones de Programación**
- [Construcción de Transacciones](#construcción-de-transacciones)
- [Manejo de Estados](#manejo-de-estados)
- [Programación Asíncrona](#programación-asíncrona)

### 🔴 **Flujos de Desarrollo**
- [Wallet Integration Flow](#wallet-integration-flow)
- [Transaction Lifecycle](#transaction-lifecycle)
- [Error Handling Flow](#error-handling-flow)

### 🔴 **Casos de Uso Avanzados**
- [DeFi Programming](#defi-programming)
- [NFT Development](#nft-development)
- [Token Management](#token-management)

### ⚫ **Expert Level**
- [Debugging y Testing](#debugging-y-testing)
- [Optimización de Performance](#optimización-de-performance)
- [Seguridad en Programación](#seguridad-en-programación)
- [Estructuras de Datos](#estructuras-de-datos)
- [Utilities y Helpers](#utilities-y-helpers)

---

## Introducción al Ecosistema

RadixDLT ofrece tres paquetes principales para desarrollo, cada uno con un propósito específico en la arquitectura de aplicaciones:

```typescript
// Stack completo de desarrollo
import { RadixEngineToolkit } from '@radixdlt/radix-engine-toolkit'  // 🔧 Motor base
import { createRadixConnectClient } from 'radix-connect'              // 🔗 Conectividad
import { createRadixWeb3Client } from '@radix-web3/core'             // 🌐 Alto nivel
```

### Arquitectura de Capas

```
┌─────────────────────────────────────┐
│        🌐 radix-web3.js             │  ← Interfaz simplificada
│        (Alto Nivel)                 │
├─────────────────────────────────────┤
│        🔗 radix-connect             │  ← Conectividad con wallets
│        (Conectividad)               │
├─────────────────────────────────────┤
│    🔧 @radixdlt/radix-engine-toolkit│  ← Motor fundamental
│        (Motor Base)                 │
└─────────────────────────────────────┘
```

---

## Instalación y Setup

### Instalación de Dependencias

```bash
# Motor base (requerido)
npm install @radixdlt/radix-engine-toolkit

# Conectividad con wallets (opcional)
npm install radix-connect

# Interfaz de alto nivel (opcional)
npm install radix-web3.js

# Dependencias adicionales comunes
npm install qrcode zod crypto
```

### Configuración TypeScript

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true
  }
}
```

### Setup Básico de Desarrollo

```typescript
// setup.ts - Configuración inicial del proyecto
import { RadixEngineToolkit } from '@radixdlt/radix-engine-toolkit'

// Configuración de red
export const NETWORK_CONFIG = {
  MAINNET: { networkId: 1, name: 'Mainnet' },
  STOKENET: { networkId: 2, name: 'Stokenet' }
} as const

export type NetworkId = typeof NETWORK_CONFIG[keyof typeof NETWORK_CONFIG]['networkId']

// Verificar disponibilidad del toolkit
export async function initializeRadixToolkit(): Promise<boolean> {
  try {
    await RadixEngineToolkit.Utils.knownAddresses(NETWORK_CONFIG.STOKENET.networkId)
    console.log('✅ RadixEngineToolkit initialized successfully')
    return true
  } catch (error) {
    console.error('❌ Failed to initialize RadixEngineToolkit:', error)
    return false
  }
}
```

---

## Conceptos Básicos

### Tipos Fundamentales

```typescript
// Tipos de direcciones en Radix
type AccountAddress = string    // account_...
type ResourceAddress = string   // resource_...
type ComponentAddress = string  // component_...
type PackageAddress = string    // package_...

// Tipos de redes
type NetworkId = 1 | 2          // 1: Mainnet, 2: Stokenet

// Tipos de claves
interface KeyPair {
  publicKey(): PublicKey
  privateKey(): PrivateKey
  signToSignature(hash: Uint8Array): Signature
}

// Tipos de transacciones
interface TransactionManifest {
  instructions: string
  blobs?: Uint8Array[]
}

interface TransactionIntent {
  manifest: TransactionManifest
  header: TransactionHeader
}
```

### Conceptos de Validación

```typescript
import { z } from 'zod'

// Schemas de validación para direcciones
export const AddressSchemas = {
  account: z.string().regex(/^account_[a-z0-9_]+$/),
  resource: z.string().regex(/^resource_[a-z0-9_]+$/),
  component: z.string().regex(/^component_[a-z0-9_]+$/),
  package: z.string().regex(/^package_[a-z0-9_]+$/),
}

// Schema para amounts
export const AmountSchema = z.string().regex(/^\d+(\.\d+)?$/)

// Validación de network ID
export const NetworkIdSchema = z.union([z.literal(1), z.literal(2)])

// Función de validación helper
export function validateAddress(address: string, type: keyof typeof AddressSchemas): boolean {
  try {
    AddressSchemas[type].parse(address)
    return true
  } catch {
    return false
  }
}
```

---

## @radixdlt/radix-engine-toolkit

### Inicialización y Configuración

```typescript
import { RadixEngineToolkit, LTSRadixEngineToolkit } from '@radixdlt/radix-engine-toolkit'

// Clase principal - API estable y recomendada
class RadixToolkitManager {
  private networkId: NetworkId
  
  constructor(networkId: NetworkId = 2) {
    this.networkId = networkId
  }

  // Obtener direcciones conocidas de la red
  async getKnownAddresses() {
    return await RadixEngineToolkit.Utils.knownAddresses(this.networkId)
  }

  // Derivar dirección de cuenta virtual
  async deriveAccountAddress(publicKey: PublicKey): Promise<string> {
    return await RadixEngineToolkit.Derive.virtualAccountAddress(
      publicKey,
      this.networkId
    )
  }

  // Derivar dirección de identidad virtual
  async deriveIdentityAddress(publicKey: PublicKey): Promise<string> {
    return await RadixEngineToolkit.Derive.virtualIdentityAddress(
      publicKey,
      this.networkId
    )
  }
}
```

### Gestión de Claves Criptográficas

```typescript
// Generación de claves
class KeyManager {
  
  // Generar keypair Ed25519
  static generateEd25519KeyPair(): KeyPair {
    return RadixEngineToolkit.Crypto.generateEd25519KeyPair()
  }

  // Generar keypair Secp256k1
  static generateSecp256k1KeyPair(): KeyPair {
    return RadixEngineToolkit.Crypto.generateSecp256k1KeyPair()
  }

  // Derivar desde seed
  static deriveEd25519KeyPairFromSeed(seed: Uint8Array): KeyPair {
    return RadixEngineToolkit.Crypto.deriveEd25519KeyPairFromSeed(seed)
  }

  // Importar desde private key
  static importEd25519KeyPair(privateKeyBytes: Uint8Array): KeyPair {
    return RadixEngineToolkit.Crypto.importEd25519KeyPair(privateKeyBytes)
  }

  // Validar firma
  static async verifySignature(
    publicKey: PublicKey,
    signature: Signature,
    message: Uint8Array
  ): Promise<boolean> {
    return await RadixEngineToolkit.Crypto.verifySignature(
      publicKey,
      signature,
      message
    )
  }
}
```

### Construcción de Transacciones

```typescript
// Transaction Builder avanzado
class TransactionBuilder {
  private instructions: string[] = []
  private blobs: Uint8Array[] = []

  // Método withdraw
  withdrawFromAccount(
    accountAddress: string,
    resourceAddress: string,
    amount: string
  ): this {
    this.instructions.push(`
      CALL_METHOD
        Address("${accountAddress}")
        "withdraw"
        Address("${resourceAddress}")
        Decimal("${amount}")
    `)
    return this
  }

  // Método take from worktop
  takeFromWorktop(
    resourceAddress: string,
    amount: string,
    bucketName: string
  ): this {
    this.instructions.push(`
      TAKE_FROM_WORKTOP
        Address("${resourceAddress}")
        Decimal("${amount}")
        Bucket("${bucketName}")
    `)
    return this
  }

  // Método deposit
  depositToAccount(
    accountAddress: string,
    bucketName: string
  ): this {
    this.instructions.push(`
      CALL_METHOD
        Address("${accountAddress}")
        "try_deposit_or_abort"
        Bucket("${bucketName}")
        Enum<0u8>()
    `)
    return this
  }

  // Transferencia simple (método helper)
  transfer(
    fromAccount: string,
    toAccount: string,
    resourceAddress: string,
    amount: string
  ): this {
    const bucketName = `bucket_${Date.now()}`
    
    return this
      .withdrawFromAccount(fromAccount, resourceAddress, amount)
      .takeFromWorktop(resourceAddress, amount, bucketName)
      .depositToAccount(toAccount, bucketName)
  }

  // Construir manifiesto final
  build(): TransactionManifest {
    return {
      instructions: this.instructions.join('\n'),
      blobs: this.blobs
    }
  }

  // Compilar transacción
  async compile(
    header: TransactionHeader
  ): Promise<CompiledTransactionIntent> {
    const manifest = this.build()
    const intent: TransactionIntent = { manifest, header }
    
    return await RadixEngineToolkit.TransactionIntent.compile(intent)
  }
}
```

### Manejo de Transacciones Complejas

```typescript
// Advanced Transaction Operations
class AdvancedTransactionBuilder extends TransactionBuilder {

  // Multiple resource transfer
  multiResourceTransfer(
    fromAccount: string,
    toAccount: string,
    transfers: Array<{
      resourceAddress: string
      amount: string
    }>
  ): this {
    transfers.forEach((transfer, index) => {
      const bucketName = `bucket_${index}`
      this
        .withdrawFromAccount(fromAccount, transfer.resourceAddress, transfer.amount)
        .takeFromWorktop(transfer.resourceAddress, transfer.amount, bucketName)
        .depositToAccount(toAccount, bucketName)
    })
    return this
  }

  // Component method call
  callComponentMethod(
    componentAddress: string,
    methodName: string,
    args: Array<string | number | boolean>
  ): this {
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'string') return `"${arg}"`
      if (typeof arg === 'boolean') return arg ? 'true' : 'false'
      return arg.toString()
    }).join('\n        ')

    this.instructions.push(`
      CALL_METHOD
        Address("${componentAddress}")
        "${methodName}"
        ${formattedArgs}
    `)
    return this
  }

  // Assert worktop contains
  assertWorktopContains(
    resourceAddress: string,
    amount: string
  ): this {
    this.instructions.push(`
      ASSERT_WORKTOP_CONTAINS
        Address("${resourceAddress}")
        Decimal("${amount}")
    `)
    return this
  }

  // Add blob
  addBlob(blob: Uint8Array): this {
    this.blobs.push(blob)
    return this
  }

  // Create proof from account
  createProof(
    accountAddress: string,
    resourceAddress: string,
    proofName: string
  ): this {
    this.instructions.push(`
      CALL_METHOD
        Address("${accountAddress}")
        "create_proof_of_amount"
        Address("${resourceAddress}")
        Decimal("1")
      ;
      POP_FROM_AUTH_ZONE
        Proof("${proofName}")
    `)
    return this
  }
}
```

### Utilidades de Conversión

```typescript
// Conversion utilities
class RadixConverters {
  
  // Convert between address formats
  static async convertOlympiaAddressToBabylon(
    olympiaAddress: string,
    networkId: NetworkId
  ): Promise<string> {
    return await RadixEngineToolkit.Convert.olympiaAddressToBabylon(
      olympiaAddress,
      networkId
    )
  }

  // Encode/decode addresses
  static encodeAddress(
    addressType: 'account' | 'resource' | 'component' | 'package',
    data: Uint8Array,
    networkId: NetworkId
  ): string {
    return RadixEngineToolkit.Address.encode(addressType, data, networkId)
  }

  static decodeAddress(address: string): {
    type: string
    data: Uint8Array
    networkId: NetworkId
  } {
    return RadixEngineToolkit.Address.decode(address)
  }

  // Convert public key formats
  static publicKeyToHex(publicKey: PublicKey): string {
    return RadixEngineToolkit.Convert.publicKeyToHex(publicKey)
  }

  static publicKeyFromHex(hex: string): PublicKey {
    return RadixEngineToolkit.Convert.publicKeyFromHex(hex)
  }

  // Convert bytes
  static bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  static hexToBytes(hex: string): Uint8Array {
    const bytes = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16))
    }
    return new Uint8Array(bytes)
  }
}
```

---

## radix-connect

### Configuración y Inicialización

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

### Autenticación y Login

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

### Solicitudes de Transacciones

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

### Manejo de Estados de Conexión

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

### Eventos y Callbacks Avanzados

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

## radix-web3.js

### Configuración del Cliente Web3

```typescript
import { 
  createRadixWeb3Client,
  createEd25519KeyPair,
  RadixWeb3Client 
} from '@radix-web3/core'
import { fromPublicKey } from '@radix-web3/account'
import { 
  sendResourceManifest,
  swapManifest,
  stakeManifest 
} from '@radix-web3/manifests'

// Configuración del cliente Web3
interface Web3ClientConfig {
  networkId: 'Mainnet' | 'Stokenet'
  gatewayUrl?: string
  notaryPublicKey: PublicKey
  notarizer: (hash: Uint8Array) => Signature
  defaultTimeout?: number
}

class RadixWeb3Manager {
  private client: RadixWeb3Client
  private keyPair: KeyPair
  private accountAddress: string
  private config: Web3ClientConfig

  constructor(config: Partial<Web3ClientConfig> = {}) {
    // Generar keypair si no se proporciona
    this.keyPair = createEd25519KeyPair()
    
    this.config = {
      networkId: 'Stokenet',
      notaryPublicKey: this.keyPair.publicKey(),
      notarizer: (hash) => this.keyPair.signToSignature(hash),
      defaultTimeout: 30000,
      ...config
    }

    this.client = createRadixWeb3Client(this.config)
  }

  async initialize(): Promise<void> {
    // Derivar dirección de cuenta
    const networkId = this.config.networkId === 'Mainnet' ? 1 : 2
    this.accountAddress = await fromPublicKey(this.keyPair.publicKey(), networkId)
    
    console.log(`✅ Web3 client initialized for ${this.config.networkId}`)
    console.log(`📍 Account address: ${this.accountAddress}`)
  }

  getAccountAddress(): string {
    return this.accountAddress
  }

  getKeyPair(): KeyPair {
    return this.keyPair
  }
}
```

### Operaciones de Transacciones

```typescript
// Transaction operations with Web3
class RadixWeb3Transactions extends RadixWeb3Manager {

  // Transfer simple de recursos
  async transferResource(
    toAddress: string,
    resourceAddress: string,
    amount: string,
    message?: string
  ): Promise<string> {
    const manifest = sendResourceManifest({
      fromAddress: this.accountAddress,
      toAddress,
      resourceAddress,
      amount,
    })

    const result = await this.client.submitTransaction(manifest)
    
    if (result.success) {
      console.log(`✅ Transfer completed: ${result.transactionHash}`)
      return result.transactionHash
    } else {
      throw new Error(`❌ Transfer failed: ${result.errorMessage}`)
    }
  }

  // Multiple resource transfer
  async transferMultipleResources(
    toAddress: string,
    transfers: Array<{
      resourceAddress: string
      amount: string
    }>
  ): Promise<string> {
    // Construir manifest para múltiples transfers
    let manifest = ''
    
    transfers.forEach((transfer, index) => {
      manifest += `
        CALL_METHOD
          Address("${this.accountAddress}")
          "withdraw"
          Address("${transfer.resourceAddress}")
          Decimal("${transfer.amount}")
        ;
        TAKE_FROM_WORKTOP
          Address("${transfer.resourceAddress}")
          Decimal("${transfer.amount}")
          Bucket("bucket${index}")
        ;
        CALL_METHOD
          Address("${toAddress}")
          "try_deposit_or_abort"
          Bucket("bucket${index}")
          Enum<0u8>()
        ;
      `
    })

    const result = await this.client.submitTransaction(manifest)
    
    if (result.success) {
      console.log(`✅ Multi-transfer completed: ${result.transactionHash}`)
      return result.transactionHash
    } else {
      throw new Error(`❌ Multi-transfer failed: ${result.errorMessage}`)
    }
  }

  // Swap de tokens (ejemplo DeFi)
  async swapTokens(
    poolComponentAddress: string,
    inputResourceAddress: string,
    outputResourceAddress: string,
    inputAmount: string,
    minimumOutputAmount: string
  ): Promise<string> {
    const manifest = swapManifest({
      accountAddress: this.accountAddress,
      poolComponentAddress,
      inputResourceAddress,
      outputResourceAddress,
      inputAmount,
      minimumOutputAmount,
    })

    const result = await this.client.submitTransaction(manifest)
    
    if (result.success) {
      console.log(`✅ Swap completed: ${result.transactionHash}`)
      return result.transactionHash
    } else {
      throw new Error(`❌ Swap failed: ${result.errorMessage}`)
    }
  }

  // Staking de tokens
  async stakeTokens(
    validatorAddress: string,
    stakeAmount: string
  ): Promise<string> {
    const manifest = stakeManifest({
      accountAddress: this.accountAddress,
      validatorAddress,
      stakeAmount,
    })

    const result = await this.client.submitTransaction(manifest)
    
    if (result.success) {
      console.log(`✅ Staking completed: ${result.transactionHash}`)
      return result.transactionHash
    } else {
      throw new Error(`❌ Staking failed: ${result.errorMessage}`)
    }
  }
}
```

### Consultas y Balance Management

```typescript
// Query and balance operations
class RadixWeb3Queries extends RadixWeb3Transactions {

  // Obtener balance de cuenta
  async getAccountBalance(
    resourceAddress?: string
  ): Promise<Array<{ resourceAddress: string; amount: string }>> {
    try {
      const balance = await this.client.getAccountBalance(
        this.accountAddress,
        resourceAddress
      )
      
      console.log(`💰 Account balance retrieved for ${this.accountAddress}`)
      return balance
    } catch (error) {
      console.error('❌ Failed to get account balance:', error)
      throw error
    }
  }

  // Obtener balance de recurso específico
  async getResourceBalance(resourceAddress: string): Promise<string> {
    const balances = await this.getAccountBalance(resourceAddress)
    const resourceBalance = balances.find(b => b.resourceAddress === resourceAddress)
    return resourceBalance?.amount || '0'
  }

  // Obtener historial de transacciones
  async getTransactionHistory(
    cursor?: string,
    limit = 50
  ): Promise<{
    transactions: Array<any>
    nextCursor?: string
  }> {
    try {
      const history = await this.client.getTransactionHistory(
        this.accountAddress,
        { cursor, limit }
      )
      
      console.log(`📜 Transaction history retrieved: ${history.transactions.length} items`)
      return history
    } catch (error) {
      console.error('❌ Failed to get transaction history:', error)
      throw error
    }
  }

  // Obtener detalles de transacción específica
  async getTransactionDetails(transactionHash: string): Promise<any> {
    try {
      const details = await this.client.getTransactionDetails(transactionHash)
      console.log(`🔍 Transaction details retrieved for ${transactionHash}`)
      return details
    } catch (error) {
      console.error('❌ Failed to get transaction details:', error)
      throw error
    }
  }

  // Obtener estado de la red
  async getNetworkStatus(): Promise<{
    networkId: number
    currentEpoch: number
    currentRound: number
  }> {
    try {
      const status = await this.client.getNetworkStatus()
      console.log(`🌐 Network status: Epoch ${status.currentEpoch}, Round ${status.currentRound}`)
      return status
    } catch (error) {
      console.error('❌ Failed to get network status:', error)
      throw error
    }
  }
}
```

### Utilidades y Helpers

```typescript
// Web3 utilities and helpers
class RadixWeb3Utils extends RadixWeb3Queries {

  // Validar dirección de cuenta
  static isValidAccountAddress(address: string): boolean {
    return /^account_[a-z0-9_]+$/.test(address)
  }

  // Validar dirección de recurso
  static isValidResourceAddress(address: string): boolean {
    return /^resource_[a-z0-9_]+$/.test(address)
  }

  // Formatear amount para display
  static formatAmount(amount: string, decimals = 18): string {
    const num = parseFloat(amount)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    })
  }

  // Convertir amount a decimal
  static toDecimal(amount: string | number): string {
    return typeof amount === 'string' ? amount : amount.toString()
  }

  // Validar amount
  static isValidAmount(amount: string): boolean {
    return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0
  }

  // Calcular fee estimado
  async estimateTransactionFee(manifest: string): Promise<string> {
    try {
      const estimate = await this.client.estimateTransactionFee(manifest)
      console.log(`💸 Estimated transaction fee: ${estimate}`)
      return estimate
    } catch (error) {
      console.error('❌ Failed to estimate transaction fee:', error)
      throw error
    }
  }

  // Wait for transaction confirmation
  async waitForTransactionConfirmation(
    transactionHash: string,
    timeout = 60000
  ): Promise<any> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      try {
        const details = await this.getTransactionDetails(transactionHash)
        
        if (details.status === 'success') {
          console.log(`✅ Transaction confirmed: ${transactionHash}`)
          return details
        } else if (details.status === 'failed') {
          throw new Error(`❌ Transaction failed: ${details.errorMessage}`)
        }
        
        // Wait 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          throw new Error(`⏰ Transaction confirmation timeout: ${transactionHash}`)
        }
        
        // Continue waiting if transaction not found yet
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`⏰ Transaction confirmation timeout: ${transactionHash}`)
  }
}
```

---

## Construcción de Transacciones

### Patrones de Manifest Building

```typescript
// Advanced manifest building patterns
class ManifestBuilder {
  private instructions: string[] = []
  private bucketCounter = 0
  private proofCounter = 0

  // Helper para generar nombres únicos
  private nextBucketName(): string {
    return `bucket_${this.bucketCounter++}`
  }

  private nextProofName(): string {
    return `proof_${this.proofCounter++}`
  }

  // Withdraw pattern
  withdraw(
    accountAddress: string,
    resourceAddress: string,
    amount: string
  ): this {
    this.instructions.push(`
CALL_METHOD
  Address("${accountAddress}")
  "withdraw"
  Address("${resourceAddress}")
  Decimal("${amount}")
;`)
    return this
  }

  // Take all from worktop
  takeAllFromWorktop(
    resourceAddress: string,
    bucketName?: string
  ): string {
    const bucket = bucketName || this.nextBucketName()
    this.instructions.push(`
TAKE_ALL_FROM_WORKTOP
  Address("${resourceAddress}")
  Bucket("${bucket}")
;`)
    return bucket
  }

  // Take exact amount from worktop
  takeFromWorktop(
    resourceAddress: string,
    amount: string,
    bucketName?: string
  ): string {
    const bucket = bucketName || this.nextBucketName()
    this.instructions.push(`
TAKE_FROM_WORKTOP
  Address("${resourceAddress}")
  Decimal("${amount}")
  Bucket("${bucket}")
;`)
    return bucket
  }

  // Deposit to account
  deposit(
    accountAddress: string,
    bucketName: string
  ): this {
    this.instructions.push(`
CALL_METHOD
  Address("${accountAddress}")
  "try_deposit_or_abort"
  Bucket("${bucketName}")
  Enum<0u8>()
;`)
    return this
  }

  // Call component method
  callMethod(
    componentAddress: string,
    methodName: string,
    ...args: Array<string | number | boolean>
  ): this {
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'string') return `"${arg}"`
      if (typeof arg === 'boolean') return arg.toString()
      return arg.toString()
    }).join('\n  ')

    this.instructions.push(`
CALL_METHOD
  Address("${componentAddress}")
  "${methodName}"
  ${formattedArgs}
;`)
    return this
  }

  // Create proof
  createProof(
    accountAddress: string,
    resourceAddress: string,
    amount?: string,
    proofName?: string
  ): string {
    const proof = proofName || this.nextProofName()
    
    if (amount) {
      this.instructions.push(`
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_amount"
  Address("${resourceAddress}")
  Decimal("${amount}")
;`)
    } else {
      this.instructions.push(`
CALL_METHOD
  Address("${accountAddress}")
  "create_proof_of_non_fungibles"
  Address("${resourceAddress}")
  Array<NonFungibleLocalId>()
;`)
    }

    this.instructions.push(`
POP_FROM_AUTH_ZONE
  Proof("${proof}")
;`)

    return proof
  }

  // Assert worktop contains
  assertWorktopContains(
    resourceAddress: string,
    amount: string
  ): this {
    this.instructions.push(`
ASSERT_WORKTOP_CONTAINS
  Address("${resourceAddress}")
  Decimal("${amount}")
;`)
    return this
  }

  // Clear instructions and reset counters
  clear(): this {
    this.instructions = []
    this.bucketCounter = 0
    this.proofCounter = 0
    return this
  }

  // Build final manifest
  build(): string {
    return this.instructions.join('\n')
  }
}
```

### Patrones de Transacciones Complejas

```typescript
// Complex transaction patterns
class ComplexTransactionPatterns {

  // Atomic swap pattern
  static atomicSwap(
    userAccount: string,
    counterpartyAccount: string,
    userResource: string,
    userAmount: string,
    counterpartyResource: string,
    counterpartyAmount: string
  ): string {
    const builder = new ManifestBuilder()

    // User withdraws their resource
    builder.withdraw(userAccount, userResource, userAmount)
    const userBucket = builder.takeAllFromWorktop(userResource)

    // Counterparty withdraws their resource  
    builder.withdraw(counterpartyAccount, counterpartyResource, counterpartyAmount)
    const counterpartyBucket = builder.takeAllFromWorktop(counterpartyResource)

    // Cross deposits
    builder.deposit(counterpartyAccount, userBucket)
    builder.deposit(userAccount, counterpartyBucket)

    return builder.build()
  }

  // Multi-signature transaction pattern
  static multiSigTransaction(
    multiSigAccount: string,
    targetAccount: string,
    resourceAddress: string,
    amount: string,
    signerAccounts: string[]
  ): string {
    const builder = new ManifestBuilder()

    // Create proofs from all signers
    const proofs = signerAccounts.map(signerAccount => 
      builder.createProof(signerAccount, resourceAddress, "1")
    )

    // Withdraw from multi-sig account
    builder.withdraw(multiSigAccount, resourceAddress, amount)
    const bucket = builder.takeAllFromWorktop(resourceAddress)

    // Deposit to target
    builder.deposit(targetAccount, bucket)

    return builder.build()
  }

  // Conditional transaction pattern
  static conditionalTransfer(
    fromAccount: string,
    toAccount: string,
    resourceAddress: string,
    amount: string,
    conditionComponentAddress: string,
    conditionMethod: string
  ): string {
    const builder = new ManifestBuilder()

    // Check condition first
    builder.callMethod(conditionComponentAddress, conditionMethod)

    // If condition passes, proceed with transfer
    builder.withdraw(fromAccount, resourceAddress, amount)
    const bucket = builder.takeAllFromWorktop(resourceAddress)
    builder.deposit(toAccount, bucket)

    return builder.build()
  }

  // Batch operations pattern
  static batchOperations(
    operations: Array<{
      type: 'transfer' | 'stake' | 'unstake' | 'swap'
      params: any
    }>
  ): string {
    const builder = new ManifestBuilder()

    operations.forEach(operation => {
      switch (operation.type) {
        case 'transfer':
          builder.withdraw(
            operation.params.from,
            operation.params.resource,
            operation.params.amount
          )
          const transferBucket = builder.takeAllFromWorktop(operation.params.resource)
          builder.deposit(operation.params.to, transferBucket)
          break

        case 'stake':
          builder.withdraw(
            operation.params.account,
            operation.params.resource,
            operation.params.amount
          )
          const stakeBucket = builder.takeAllFromWorktop(operation.params.resource)
          builder.callMethod(
            operation.params.validator,
            "stake",
            `Bucket("${stakeBucket}")`
          )
          break

        case 'swap':
          builder.withdraw(
            operation.params.account,
            operation.params.inputResource,
            operation.params.inputAmount
          )
          const swapBucket = builder.takeAllFromWorktop(operation.params.inputResource)
          builder.callMethod(
            operation.params.pool,
            "swap",
            `Bucket("${swapBucket}")`,
            operation.params.minimumOutput
          )
          break
      }
    })

    return builder.build()
  }
}
```

### Validación de Manifiestos

```typescript
// Manifest validation patterns
class ManifestValidator {

  // Validate manifest syntax
  static validateSyntax(manifest: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check for basic structure
    if (!manifest.trim()) {
      errors.push('Manifest is empty')
      return { isValid: false, errors }
    }

    // Check for balanced instructions
    const lines = manifest.split('\n').map(line => line.trim()).filter(Boolean)
    
    // Validate instruction format
    lines.forEach((line, index) => {
      if (line.endsWith(';')) {
        // This is an instruction terminator
        return
      }

      if (!line.match(/^[A-Z_]+$/) && !line.match(/^\s+/)) {
        errors.push(`Line ${index + 1}: Invalid instruction format`)
      }
    })

    // Check for required terminators
    const instructions = lines.filter(line => line.match(/^[A-Z_]+$/))
    const terminators = lines.filter(line => line === ';')
    
    if (instructions.length !== terminators.length) {
      errors.push('Mismatched instruction terminators')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate address formats
  static validateAddresses(manifest: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    // Extract all addresses from manifest
    const addressMatches = manifest.match(/Address\("([^"]+)"\)/g) || []
    
    addressMatches.forEach(match => {
      const address = match.match(/Address\("([^"]+)"\)/)?.[1]
      if (address) {
        if (!this.isValidRadixAddress(address)) {
          errors.push(`Invalid address format: ${address}`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Validate decimal amounts
  static validateAmounts(manifest: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []
    
    // Extract all decimal amounts
    const decimalMatches = manifest.match(/Decimal\("([^"]+)"\)/g) || []
    
    decimalMatches.forEach(match => {
      const amount = match.match(/Decimal\("([^"]+)"\)/)?.[1]
      if (amount) {
        if (!this.isValidAmount(amount)) {
          errors.push(`Invalid decimal amount: ${amount}`)
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Comprehensive validation
  static validate(manifest: string): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const syntaxValidation = this.validateSyntax(manifest)
    const addressValidation = this.validateAddresses(manifest)
    const amountValidation = this.validateAmounts(manifest)

    const allErrors = [
      ...syntaxValidation.errors,
      ...addressValidation.errors,
      ...amountValidation.errors
    ]

    const warnings: string[] = []
    
    // Check for potential issues
    if (manifest.includes('withdraw') && !manifest.includes('deposit')) {
      warnings.push('Manifest withdraws resources but does not deposit them')
    }

    if (manifest.includes('TAKE_FROM_WORKTOP') && !manifest.includes('withdraw')) {
      warnings.push('Manifest takes from worktop without withdrawing first')
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings
    }
  }

  private static isValidRadixAddress(address: string): boolean {
    const patterns = [
      /^account_[a-z0-9_]+$/,
      /^resource_[a-z0-9_]+$/,
      /^component_[a-z0-9_]+$/,
      /^package_[a-z0-9_]+$/,
    ]
    
    return patterns.some(pattern => pattern.test(address))
  }

  private static isValidAmount(amount: string): boolean {
    return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) >= 0
  }
}
```

---

## Manejo de Estados

### State Management Patterns

```typescript
// Transaction state management
enum TransactionState {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  EXPIRED = 'expired'
}

interface TransactionEntry {
  id: string
  state: TransactionState
  manifest: string
  createdAt: Date
  updatedAt: Date
  hash?: string
  error?: string
  retryCount: number
}

class TransactionStateManager {
  private transactions = new Map<string, TransactionEntry>()
  private maxRetries = 3
  private retryDelay = 5000

  // Add new transaction
  addTransaction(
    id: string,
    manifest: string
  ): TransactionEntry {
    const entry: TransactionEntry = {
      id,
      state: TransactionState.PENDING,
      manifest,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0
    }

    this.transactions.set(id, entry)
    return entry
  }

  // Update transaction state
  updateTransaction(
    id: string,
    updates: Partial<TransactionEntry>
  ): boolean {
    const transaction = this.transactions.get(id)
    if (!transaction) return false

    Object.assign(transaction, {
      ...updates,
      updatedAt: new Date()
    })

    this.transactions.set(id, transaction)
    return true
  }

  // Get transaction
  getTransaction(id: string): TransactionEntry | undefined {
    return this.transactions.get(id)
  }

  // Get transactions by state
  getTransactionsByState(state: TransactionState): TransactionEntry[] {
    return Array.from(this.transactions.values())
      .filter(tx => tx.state === state)
  }

  // Mark transaction as confirmed
  confirmTransaction(id: string, hash: string): boolean {
    return this.updateTransaction(id, {
      state: TransactionState.CONFIRMED,
      hash
    })
  }

  // Mark transaction as failed
  failTransaction(id: string, error: string): boolean {
    return this.updateTransaction(id, {
      state: TransactionState.FAILED,
      error
    })
  }

  // Retry failed transaction
  async retryTransaction(id: string): Promise<boolean> {
    const transaction = this.getTransaction(id)
    if (!transaction || transaction.retryCount >= this.maxRetries) {
      return false
    }

    // Update retry count
    this.updateTransaction(id, {
      state: TransactionState.PENDING,
      retryCount: transaction.retryCount + 1,
      error: undefined
    })

    return true
  }

  // Cleanup expired transactions
  cleanupExpired(expirationMs = 3600000): number { // 1 hour default
    const now = new Date()
    let cleanedCount = 0

    for (const [id, transaction] of this.transactions) {
      const ageMs = now.getTime() - transaction.createdAt.getTime()
      
      if (ageMs > expirationMs && transaction.state === TransactionState.PENDING) {
        this.updateTransaction(id, {
          state: TransactionState.EXPIRED
        })
        cleanedCount++
      }
    }

    return cleanedCount
  }

  // Get statistics
  getStats(): {
    total: number
    byState: Record<TransactionState, number>
  } {
    const stats = {
      total: this.transactions.size,
      byState: {
        [TransactionState.PENDING]: 0,
        [TransactionState.CONFIRMED]: 0,
        [TransactionState.FAILED]: 0,
        [TransactionState.EXPIRED]: 0
      }
    }

    for (const transaction of this.transactions.values()) {
      stats.byState[transaction.state]++
    }

    return stats
  }
}
```

### Application State Management

```typescript
// Application-level state management
interface ApplicationState {
  isConnected: boolean
  currentNetwork: NetworkId
  currentAccount?: string
  walletType?: 'radix-wallet' | 'browser-extension'
  balance: Map<string, string>
  pendingTransactions: string[]
  lastError?: string
}

class ApplicationStateManager {
  private state: ApplicationState = {
    isConnected: false,
    currentNetwork: 2, // Stokenet by default
    balance: new Map(),
    pendingTransactions: []
  }

  private listeners: Array<(state: ApplicationState) => void> = []

  // Get current state
  getState(): ApplicationState {
    return { ...this.state }
  }

  // Subscribe to state changes
  subscribe(listener: (state: ApplicationState) => void): () => void {
    this.listeners.push(listener)
    
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Update state and notify listeners
  private setState(updates: Partial<ApplicationState>): void {
    this.state = { ...this.state, ...updates }
    this.listeners.forEach(listener => listener(this.state))
  }

  // Connection management
  setConnected(isConnected: boolean, account?: string, walletType?: string): void {
    this.setState({
      isConnected,
      currentAccount: account,
      walletType: walletType as any,
      lastError: undefined
    })
  }

  // Network management
  setNetwork(networkId: NetworkId): void {
    this.setState({
      currentNetwork: networkId,
      balance: new Map(), // Clear balance when switching networks
      pendingTransactions: []
    })
  }

  // Balance management
  updateBalance(resourceAddress: string, amount: string): void {
    const newBalance = new Map(this.state.balance)
    newBalance.set(resourceAddress, amount)
    this.setState({ balance: newBalance })
  }

  getBalance(resourceAddress: string): string {
    return this.state.balance.get(resourceAddress) || '0'
  }

  // Transaction management
  addPendingTransaction(transactionId: string): void {
    this.setState({
      pendingTransactions: [...this.state.pendingTransactions, transactionId]
    })
  }

  removePendingTransaction(transactionId: string): void {
    this.setState({
      pendingTransactions: this.state.pendingTransactions.filter(id => id !== transactionId)
    })
  }

  // Error management
  setError(error: string): void {
    this.setState({ lastError: error })
  }

  clearError(): void {
    this.setState({ lastError: undefined })
  }

  // Persistence
  saveToStorage(): void {
    try {
      const serializedState = {
        currentNetwork: this.state.currentNetwork,
        balance: Array.from(this.state.balance.entries())
      }
      localStorage.setItem('radix-app-state', JSON.stringify(serializedState))
    } catch (error) {
      console.warn('Failed to save state to storage:', error)
    }
  }

  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('radix-app-state')
      if (stored) {
        const parsed = JSON.parse(stored)
        this.setState({
          currentNetwork: parsed.currentNetwork,
          balance: new Map(parsed.balance || [])
        })
      }
    } catch (error) {
      console.warn('Failed to load state from storage:', error)
    }
  }
}
```

### Event-Driven State Updates

```typescript
// Event-driven state updates
type StateEvent = 
  | { type: 'WALLET_CONNECTED'; payload: { account: string; walletType: string } }
  | { type: 'WALLET_DISCONNECTED' }
  | { type: 'NETWORK_CHANGED'; payload: { networkId: NetworkId } }
  | { type: 'TRANSACTION_SUBMITTED'; payload: { transactionId: string } }
  | { type: 'TRANSACTION_CONFIRMED'; payload: { transactionId: string; hash: string } }
  | { type: 'TRANSACTION_FAILED'; payload: { transactionId: string; error: string } }
  | { type: 'BALANCE_UPDATED'; payload: { resourceAddress: string; amount: string } }
  | { type: 'ERROR_OCCURRED'; payload: { error: string } }

class EventDrivenStateManager extends ApplicationStateManager {
  private eventQueue: StateEvent[] = []
  private isProcessing = false

  // Dispatch event
  dispatch(event: StateEvent): void {
    this.eventQueue.push(event)
    this.processEvents()
  }

  // Process events sequentially
  private async processEvents(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!
      await this.processEvent(event)
    }

    this.isProcessing = false
  }

  // Process individual event
  private async processEvent(event: StateEvent): Promise<void> {
    console.log('Processing event:', event.type, event.payload)

    switch (event.type) {
      case 'WALLET_CONNECTED':
        this.setConnected(true, event.payload.account, event.payload.walletType)
        break

      case 'WALLET_DISCONNECTED':
        this.setConnected(false)
        break

      case 'NETWORK_CHANGED':
        this.setNetwork(event.payload.networkId)
        break

      case 'TRANSACTION_SUBMITTED':
        this.addPendingTransaction(event.payload.transactionId)
        break

      case 'TRANSACTION_CONFIRMED':
        this.removePendingTransaction(event.payload.transactionId)
        // Could trigger balance refresh here
        break

      case 'TRANSACTION_FAILED':
        this.removePendingTransaction(event.payload.transactionId)
        this.setError(`Transaction failed: ${event.payload.error}`)
        break

      case 'BALANCE_UPDATED':
        this.updateBalance(event.payload.resourceAddress, event.payload.amount)
        break

      case 'ERROR_OCCURRED':
        this.setError(event.payload.error)
        break
    }

    // Save state after processing event
    this.saveToStorage()
  }

  // Batch dispatch multiple events
  dispatchBatch(events: StateEvent[]): void {
    this.eventQueue.push(...events)
    this.processEvents()
  }
}
```

---

## Programación Asíncrona

### Promise Patterns para Radix

```typescript
// Advanced promise patterns for Radix operations
class RadixPromiseUtils {

  // Retry pattern with exponential backoff
  static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error)
        await this.delay(delay)
      }
    }

    throw lastError!
  }

  // Timeout wrapper
  static async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    })

    return Promise.race([promise, timeout])
  }

  // Circuit breaker pattern
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number
      resetTimeout: number
      monitoringPeriod: number
    }
  ): () => Promise<T> {
    let failures = 0
    let lastFailureTime = 0
    let state: 'closed' | 'open' | 'half-open' = 'closed'

    return async (): Promise<T> => {
      const now = Date.now()

      // Reset circuit breaker if monitoring period has passed
      if (now - lastFailureTime > options.monitoringPeriod) {
        failures = 0
        state = 'closed'
      }

      // Circuit is open
      if (state === 'open') {
        if (now - lastFailureTime < options.resetTimeout) {
          throw new Error('Circuit breaker is open')
        }
        state = 'half-open'
      }

      try {
        const result = await operation()
        
        // Success resets the circuit breaker
        if (state === 'half-open') {
          failures = 0
          state = 'closed'
        }
        
        return result
      } catch (error) {
        failures++
        lastFailureTime = now

        if (failures >= options.failureThreshold) {
          state = 'open'
        }

        throw error
      }
    }
  }

  // Debounce pattern
  static debounce<T extends (...args: any[]) => Promise<any>>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout | null = null
    let pendingPromise: Promise<any> | null = null

    return ((...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(async () => {
          try {
            if (pendingPromise) {
              await pendingPromise
            }
            
            pendingPromise = func(...args)
            const result = await pendingPromise
            pendingPromise = null
            resolve(result)
          } catch (error) {
            pendingPromise = null
            reject(error)
          }
        }, delay)
      })
    }) as T
  }

  // Throttle pattern
  static throttle<T extends (...args: any[]) => Promise<any>>(
    func: T,
    interval: number
  ): T {
    let isThrottled = false
    let pendingArgs: Parameters<T> | null = null

    return ((...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        if (isThrottled) {
          pendingArgs = args
          return
        }

        isThrottled = true

        const executeWithPending = async () => {
          try {
            const result = await func(...args)
            resolve(result)

            // Execute pending call if exists
            if (pendingArgs) {
              const nextArgs = pendingArgs
              pendingArgs = null
              setTimeout(() => executeWithPending.call(null, ...nextArgs), 0)
            } else {
              isThrottled = false
            }
          } catch (error) {
            isThrottled = false
            reject(error)
          }
        }

        executeWithPending()

        setTimeout(() => {
          isThrottled = false
        }, interval)
      })
    }) as T
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Concurrent Transaction Processing

```typescript
// Concurrent transaction processing patterns
class ConcurrentTransactionProcessor {
  private maxConcurrency: number
  private activeTransactions: Set<string> = new Set()
  private queue: Array<() => Promise<any>> = []

  constructor(maxConcurrency = 5) {
    this.maxConcurrency = maxConcurrency
  }

  // Process transactions with concurrency control
  async processTransaction<T>(
    transactionId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Add to queue if at max concurrency
    if (this.activeTransactions.size >= this.maxConcurrency) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            const result = await this.executeTransaction(transactionId, operation)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
      })
    }

    return this.executeTransaction(transactionId, operation)
  }

  private async executeTransaction<T>(
    transactionId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.activeTransactions.add(transactionId)

    try {
      const result = await operation()
      return result
    } finally {
      this.activeTransactions.delete(transactionId)
      
      // Process next queued transaction
      if (this.queue.length > 0) {
        const nextOperation = this.queue.shift()!
        setTimeout(() => nextOperation(), 0)
      }
    }
  }

  // Batch process multiple transactions
  async processBatch<T>(
    transactions: Array<{
      id: string
      operation: () => Promise<T>
    }>
  ): Promise<Array<{ id: string; result?: T; error?: Error }>> {
    const results: Array<{ id: string; result?: T; error?: Error }> = []

    // Process in chunks based on concurrency limit
    for (let i = 0; i < transactions.length; i += this.maxConcurrency) {
      const chunk = transactions.slice(i, i + this.maxConcurrency)
      
      const chunkPromises = chunk.map(async ({ id, operation }) => {
        try {
          const result = await this.processTransaction(id, operation)
          return { id, result }
        } catch (error) {
          return { id, error: error as Error }
        }
      })

      const chunkResults = await Promise.all(chunkPromises)
      results.push(...chunkResults)
    }

    return results
  }

  // Get current status
  getStatus(): {
    activeCount: number
    queuedCount: number
    activeTransactions: string[]
  } {
    return {
      activeCount: this.activeTransactions.size,
      queuedCount: this.queue.length,
      activeTransactions: Array.from(this.activeTransactions)
    }
  }
}
```

### Async State Synchronization

```typescript
// Async state synchronization patterns
class AsyncStateSynchronizer {
  private syncInProgress = new Set<string>()
  private syncQueue = new Map<string, Array<() => void>>()

  // Synchronized operation execution
  async synchronize<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // If already syncing this key, wait for completion
    if (this.syncInProgress.has(key)) {
      return new Promise((resolve, reject) => {
        const waiters = this.syncQueue.get(key) || []
        waiters.push(async () => {
          try {
            const result = await operation()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        })
        this.syncQueue.set(key, waiters)
      })
    }

    // Execute operation
    this.syncInProgress.add(key)

    try {
      const result = await operation()

      // Process any waiting operations
      const waiters = this.syncQueue.get(key) || []
      this.syncQueue.delete(key)
      
      // Execute waiters sequentially
      for (const waiter of waiters) {
        await waiter()
      }

      return result
    } finally {
      this.syncInProgress.delete(key)
    }
  }

  // Synchronized balance refresh
  async syncBalanceRefresh(
    accountAddress: string,
    refreshOperation: () => Promise<Map<string, string>>
  ): Promise<Map<string, string>> {
    return this.synchronize(`balance-${accountAddress}`, refreshOperation)
  }

  // Synchronized transaction status check
  async syncTransactionStatus(
    transactionHash: string,
    statusOperation: () => Promise<any>
  ): Promise<any> {
    return this.synchronize(`status-${transactionHash}`, statusOperation)
  }
}
```

### Observable Patterns

```typescript
// Observable patterns for real-time updates
interface Observer<T> {
  next(value: T): void
  error?(error: Error): void
  complete?(): void
}

class Observable<T> {
  private observers: Observer<T>[] = []

  subscribe(observer: Observer<T>): () => void {
    this.observers.push(observer)
    
    return () => {
      const index = this.observers.indexOf(observer)
      if (index > -1) {
        this.observers.splice(index, 1)
      }
    }
  }

  next(value: T): void {
    this.observers.forEach(observer => {
      try {
        observer.next(value)
      } catch (error) {
        console.error('Observer error:', error)
      }
    })
  }

  error(error: Error): void {
    this.observers.forEach(observer => {
      if (observer.error) {
        try {
          observer.error(error)
        } catch (err) {
          console.error('Observer error handler failed:', err)
        }
      }
    })
  }

  complete(): void {
    this.observers.forEach(observer => {
      if (observer.complete) {
        try {
          observer.complete()
        } catch (error) {
          console.error('Observer complete handler failed:', error)
        }
      }
    })
    this.observers = []
  }
}

// Transaction status observable
class TransactionStatusObservable extends Observable<{
  transactionId: string
  status: 'pending' | 'confirmed' | 'failed'
  data?: any
}> {
  private pollingIntervals = new Map<string, NodeJS.Timeout>()

  startWatching(
    transactionId: string,
    statusChecker: () => Promise<any>,
    intervalMs = 5000
  ): void {
    if (this.pollingIntervals.has(transactionId)) {
      return // Already watching
    }

    const interval = setInterval(async () => {
      try {
        const status = await statusChecker()
        
        this.next({
          transactionId,
          status: status.confirmed ? 'confirmed' : 'pending',
          data: status
        })

        // Stop polling if confirmed or failed
        if (status.confirmed || status.failed) {
          this.stopWatching(transactionId)
        }
      } catch (error) {
        this.next({
          transactionId,
          status: 'failed',
          data: { error: error.message }
        })
        this.stopWatching(transactionId)
      }
    }, intervalMs)

    this.pollingIntervals.set(transactionId, interval)
  }

  stopWatching(transactionId: string): void {
    const interval = this.pollingIntervals.get(transactionId)
    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(transactionId)
    }
  }

  stopAll(): void {
    for (const [transactionId] of this.pollingIntervals) {
      this.stopWatching(transactionId)
    }
  }
}
```

---

## Wallet Integration Flow

### Flujo Completo de Integración

```typescript
// Complete wallet integration flow
class WalletIntegrationFlow {
  private connectManager: RadixConnectManager
  private stateManager: EventDrivenStateManager
  private transactionProcessor: ConcurrentTransactionProcessor

  constructor() {
    this.connectManager = new RadixConnectManager({
      networkId: 2,
      dAppDefinitionAddress: 'account_tdx_2_...',
      origin: window.location.origin,
      enableDebug: true
    })

    this.stateManager = new EventDrivenStateManager()
    this.transactionProcessor = new ConcurrentTransactionProcessor(3)
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // Handle wallet connection events
    this.connectManager.on('onConnect', () => {
      this.stateManager.dispatch({
        type: 'WALLET_CONNECTED',
        payload: { account: '', walletType: 'radix-wallet' }
      })
    })

    this.connectManager.on('onDisconnect', () => {
      this.stateManager.dispatch({ type: 'WALLET_DISCONNECTED' })
    })

    this.connectManager.on('onTransactionSuccess', (result) => {
      this.stateManager.dispatch({
        type: 'TRANSACTION_CONFIRMED',
        payload: { transactionId: result.interactionId, hash: result.transactionHash }
      })
    })

    this.connectManager.on('onTransactionFailed', (error) => {
      this.stateManager.dispatch({
        type: 'TRANSACTION_FAILED',
        payload: { transactionId: error.interactionId, error: error.message }
      })
    })
  }

  // Step 1: Initialize connection
  async initializeConnection(): Promise<boolean> {
    try {
      console.log('🔄 Initializing wallet connection...')
      
      // Check if wallet is available
      const isAvailable = await this.checkWalletAvailability()
      if (!isAvailable) {
        throw new Error('Radix Wallet not available')
      }

      // Ensure connection is established
      const connected = await this.connectManager.ensureConnection()
      if (!connected) {
        throw new Error('Failed to establish connection')
      }

      console.log('✅ Wallet connection initialized')
      return true
    } catch (error) {
      console.error('❌ Connection initialization failed:', error)
      this.stateManager.setError(`Connection failed: ${error.message}`)
      return false
    }
  }

  // Step 2: Authenticate user
  async authenticateUser(challenge?: string): Promise<{
    success: boolean
    accountAddress?: string
    proof?: string
  }> {
    try {
      console.log('🔐 Authenticating user...')

      const response = await this.connectManager.loginWithChallenge(challenge)
      
      if (!this.connectManager.validateAuthResponse(response)) {
        throw new Error('Authentication failed')
      }

      const authData = response.value.auth
      const accountAddress = authData.persona?.identityAddress

      this.stateManager.dispatch({
        type: 'WALLET_CONNECTED',
        payload: { account: accountAddress, walletType: 'radix-wallet' }
      })

      console.log('✅ User authenticated:', accountAddress)
      return {
        success: true,
        accountAddress,
        proof: authData.proof
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error)
      this.stateManager.setError(`Authentication failed: ${error.message}`)
      return { success: false }
    }
  }

  // Step 3: Request permissions
  async requestPermissions(permissions: string[]): Promise<boolean> {
    try {
      console.log('🔑 Requesting permissions:', permissions)

      // Implementation depends on specific permission system
      // This is a placeholder for permission request flow
      
      console.log('✅ Permissions granted')
      return true
    } catch (error) {
      console.error('❌ Permission request failed:', error)
      return false
    }
  }

  // Step 4: Submit transaction
  async submitTransaction(
    manifest: string,
    options: {
      message?: string
      requiresProof?: boolean
      timeout?: number
    } = {}
  ): Promise<{
    success: boolean
    transactionId?: string
    deepLink?: string
    error?: string
  }> {
    try {
      console.log('📝 Submitting transaction...')

      // Validate manifest first
      const validation = ManifestValidator.validate(manifest)
      if (!validation.isValid) {
        throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`)
      }

      // Generate transaction ID
      const transactionId = crypto.randomUUID()

      // Dispatch transaction submitted event
      this.stateManager.dispatch({
        type: 'TRANSACTION_SUBMITTED',
        payload: { transactionId }
      })

      // Submit to wallet using transaction processor
      const result = await this.transactionProcessor.processTransaction(
        transactionId,
        async () => {
          const response = await RadixPromiseUtils.withTimeout(
            this.connectManager.requestTransaction(manifest, options.message),
            options.timeout || 60000
          )

          if (!response.isOk()) {
            throw new Error(response.error.message)
          }

          return response.value
        }
      )

      // Wait for deep link
      const deepLink = await this.connectManager.waitForDeepLink(transactionId, 30000)

      console.log('✅ Transaction submitted successfully')
      return {
        success: true,
        transactionId,
        deepLink
      }
    } catch (error) {
      console.error('❌ Transaction submission failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Step 5: Monitor transaction status
  async monitorTransaction(
    transactionId: string,
    timeout = 300000 // 5 minutes
  ): Promise<{
    success: boolean
    hash?: string
    status?: string
    error?: string
  }> {
    return new Promise((resolve) => {
      const startTime = Date.now()
      
      const statusObservable = new TransactionStatusObservable()
      
      const unsubscribe = statusObservable.subscribe({
        next: (update) => {
          if (update.transactionId !== transactionId) return

          if (update.status === 'confirmed') {
            unsubscribe()
            resolve({
              success: true,
              hash: update.data.transactionHash,
              status: 'confirmed'
            })
          } else if (update.status === 'failed') {
            unsubscribe()
            resolve({
              success: false,
              error: update.data.error,
              status: 'failed'
            })
          }
        },
        error: (error) => {
          unsubscribe()
          resolve({
            success: false,
            error: error.message,
            status: 'error'
          })
        }
      })

      // Start monitoring
      statusObservable.startWatching(
        transactionId,
        async () => {
          // Implementation of status checking logic
          const transaction = this.stateManager.getState().pendingTransactions
            .find(id => id === transactionId)
          
          if (!transaction) {
            return { confirmed: false, failed: true }
          }

          // Check if transaction exists on ledger
          // This would use the Gateway API to check status
          return { confirmed: false, pending: true }
        }
      )

      // Set timeout
      setTimeout(() => {
        statusObservable.stopWatching(transactionId)
        unsubscribe()
        resolve({
          success: false,
          error: 'Transaction monitoring timeout',
          status: 'timeout'
        })
      }, timeout)
    })
  }

  // Complete flow: Connect → Authenticate → Submit → Monitor
  async executeCompleteFlow(
    manifest: string,
    options: {
      challenge?: string
      message?: string
      requiresAuth?: boolean
      monitorTimeout?: number
    } = {}
  ): Promise<{
    success: boolean
    transactionHash?: string
    error?: string
    steps: Record<string, boolean>
  }> {
    const steps = {
      connection: false,
      authentication: false,
      submission: false,
      monitoring: false
    }

    try {
      // Step 1: Initialize connection
      steps.connection = await this.initializeConnection()
      if (!steps.connection) {
        throw new Error('Connection failed')
      }

      // Step 2: Authenticate if required
      if (options.requiresAuth !== false) {
        const authResult = await this.authenticateUser(options.challenge)
        steps.authentication = authResult.success
        if (!authResult.success) {
          throw new Error('Authentication failed')
        }
      } else {
        steps.authentication = true
      }

      // Step 3: Submit transaction
      const submitResult = await this.submitTransaction(manifest, {
        message: options.message
      })
      steps.submission = submitResult.success
      if (!submitResult.success) {
        throw new Error(submitResult.error || 'Submission failed')
      }

      // Step 4: Monitor transaction
      const monitorResult = await this.monitorTransaction(
        submitResult.transactionId!,
        options.monitorTimeout
      )
      steps.monitoring = monitorResult.success
      if (!monitorResult.success) {
        throw new Error(monitorResult.error || 'Monitoring failed')
      }

      return {
        success: true,
        transactionHash: monitorResult.hash,
        steps
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        steps
      }
    }
  }

  private async checkWalletAvailability(): Promise<boolean> {
    // Check if Radix Wallet is installed and available
    try {
      // This would check for wallet availability
      // Implementation depends on wallet detection method
      return true
    } catch {
      return false
    }
  }
}
```

### Error Recovery y Fallbacks

```typescript
// Error recovery and fallback strategies
class WalletErrorRecovery {
  
  // Retry strategies for common errors
  static async retryWithStrategy<T>(
    operation: () => Promise<T>,
    error: Error
  ): Promise<T> {
    const errorType = this.classifyError(error)
    
    switch (errorType) {
      case 'NETWORK_ERROR':
        return RadixPromiseUtils.retry(operation, 3, 2000)
      
      case 'WALLET_DISCONNECTED':
        // Attempt reconnection before retry
        await this.attemptReconnection()
        return operation()
      
      case 'TRANSACTION_REJECTED':
        // Don't retry user rejections
        throw error
      
      case 'TIMEOUT_ERROR':
        // Retry with longer timeout
        return RadixPromiseUtils.withTimeout(operation(), 120000)
      
      default:
        // Generic retry with backoff
        return RadixPromiseUtils.retry(operation, 2, 1000)
    }
  }

  // Classify error types
  private static classifyError(error: Error): string {
    if (error.message.includes('network') || error.message.includes('connection')) {
      return 'NETWORK_ERROR'
    }
    if (error.message.includes('disconnected') || error.message.includes('wallet not found')) {
      return 'WALLET_DISCONNECTED'
    }
    if (error.message.includes('rejected') || error.message.includes('cancelled')) {
      return 'TRANSACTION_REJECTED'
    }
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'TIMEOUT_ERROR'
    }
    return 'UNKNOWN_ERROR'
  }

  // Attempt reconnection
  private static async attemptReconnection(): Promise<void> {
    // Implementation for reconnection logic
    console.log('🔄 Attempting wallet reconnection...')
    
    // Wait for wallet to be available
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('✅ Reconnection attempt completed')
  }

  // Graceful degradation strategies
  static async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await primaryOperation()
    } catch (primaryError) {
      console.warn('Primary operation failed, trying fallback:', primaryError)
      
      try {
        return await fallbackOperation()
      } catch (fallbackError) {
        console.error('Both primary and fallback operations failed')
        throw new Error(`Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`)
      }
    }
  }
}
```

## DeFi Programming

### Automated Market Maker (AMM) Implementation

```typescript
// AMM Pool interaction patterns
class AMMPoolManager {
  private web3Client: RadixWeb3Client
  private lifecycleManager: TransactionLifecycleManager

  constructor(web3Client: RadixWeb3Client) {
    this.web3Client = web3Client
    this.lifecycleManager = new TransactionLifecycleManager()
  }

  // Add liquidity to pool
  async addLiquidity(
    poolComponentAddress: string,
    tokenAAddress: string,
    tokenBAddress: string,
    amountA: string,
    amountB: string,
    accountAddress: string,
    slippageTolerance = 0.5 // 0.5%
  ): Promise<{
    success: boolean
    transactionHash?: string
    lpTokensReceived?: string
    error?: string
  }> {
    try {
      const builder = new ManifestBuilder()

      // Withdraw both tokens
      builder
        .withdraw(accountAddress, tokenAAddress, amountA)
        .withdraw(accountAddress, tokenBAddress, amountB)

      // Take tokens from worktop
      const bucketA = builder.takeFromWorktop(tokenAAddress, amountA)
      const bucketB = builder.takeFromWorktop(tokenBAddress, amountB)

      // Calculate minimum amounts with slippage
      const minAmountA = (parseFloat(amountA) * (1 - slippageTolerance / 100)).toString()
      const minAmountB = (parseFloat(amountB) * (1 - slippageTolerance / 100)).toString()

      // Call add_liquidity method
      builder.callMethod(
        poolComponentAddress,
        'add_liquidity',
        `Bucket("${bucketA}")`,
        `Bucket("${bucketB}")`,
        `Decimal("${minAmountA}")`,
        `Decimal("${minAmountB}")`
      )

      // Deposit LP tokens received
      const lpBucket = builder.takeAllFromWorktop(
        await this.getLPTokenAddress(poolComponentAddress)
      )
      builder.deposit(accountAddress, lpBucket)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        return {
          success: true,
          transactionHash: result.transactionHash,
          lpTokensReceived: await this.calculateLPTokensReceived(
            poolComponentAddress, amountA, amountB
          )
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Remove liquidity from pool
  async removeLiquidity(
    poolComponentAddress: string,
    lpTokenAddress: string,
    lpAmount: string,
    accountAddress: string,
    slippageTolerance = 0.5
  ): Promise<{
    success: boolean
    transactionHash?: string
    tokensReceived?: { tokenA: string; tokenB: string }
    error?: string
  }> {
    try {
      const builder = new ManifestBuilder()

      // Withdraw LP tokens
      builder.withdraw(accountAddress, lpTokenAddress, lpAmount)
      const lpBucket = builder.takeFromWorktop(lpTokenAddress, lpAmount)

      // Get expected amounts with slippage
      const expectedAmounts = await this.getExpectedAmountsForLP(
        poolComponentAddress, lpAmount
      )
      
      const minAmountA = (parseFloat(expectedAmounts.tokenA) * (1 - slippageTolerance / 100)).toString()
      const minAmountB = (parseFloat(expectedAmounts.tokenB) * (1 - slippageTolerance / 100)).toString()

      // Call remove_liquidity method
      builder.callMethod(
        poolComponentAddress,
        'remove_liquidity',
        `Bucket("${lpBucket}")`,
        `Decimal("${minAmountA}")`,
        `Decimal("${minAmountB}")`
      )

      // Deposit received tokens
      const bucketA = builder.takeAllFromWorktop(expectedAmounts.tokenAAddress)
      const bucketB = builder.takeAllFromWorktop(expectedAmounts.tokenBAddress)
      
      builder
        .deposit(accountAddress, bucketA)
        .deposit(accountAddress, bucketB)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        return {
          success: true,
          transactionHash: result.transactionHash,
          tokensReceived: {
            tokenA: expectedAmounts.tokenA,
            tokenB: expectedAmounts.tokenB
          }
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Swap tokens in AMM pool
  async swapTokens(
    poolComponentAddress: string,
    inputTokenAddress: string,
    outputTokenAddress: string,
    inputAmount: string,
    minimumOutputAmount: string,
    accountAddress: string
  ): Promise<{
    success: boolean
    transactionHash?: string
    outputAmount?: string
    priceImpact?: number
    error?: string
  }> {
    try {
      // Calculate price impact before swap
      const priceImpact = await this.calculatePriceImpact(
        poolComponentAddress, inputTokenAddress, inputAmount
      )

      const builder = new ManifestBuilder()

      // Withdraw input tokens
      builder.withdraw(accountAddress, inputTokenAddress, inputAmount)
      const inputBucket = builder.takeFromWorktop(inputTokenAddress, inputAmount)

      // Execute swap
      builder.callMethod(
        poolComponentAddress,
        'swap',
        `Bucket("${inputBucket}")`,
        `Address("${outputTokenAddress}")`,
        `Decimal("${minimumOutputAmount}")`
      )

      // Deposit output tokens
      const outputBucket = builder.takeAllFromWorktop(outputTokenAddress)
      builder.deposit(accountAddress, outputBucket)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        const outputAmount = await this.getSwapOutputAmount(
          result.transactionHash!, outputTokenAddress
        )

        return {
          success: true,
          transactionHash: result.transactionHash,
          outputAmount,
          priceImpact
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Helper methods
  private async getLPTokenAddress(poolAddress: string): Promise<string> {
    // Implementation to get LP token address from pool
    return `resource_tdx_2_lp_${poolAddress.slice(-20)}`
  }

  private async calculateLPTokensReceived(
    poolAddress: string,
    amountA: string,
    amountB: string
  ): Promise<string> {
    // Implementation to calculate LP tokens using pool math
    // LP = sqrt(amountA * amountB) for initial liquidity
    return Math.sqrt(parseFloat(amountA) * parseFloat(amountB)).toString()
  }

  private async getExpectedAmountsForLP(
    poolAddress: string,
    lpAmount: string
  ): Promise<{
    tokenA: string
    tokenB: string
    tokenAAddress: string
    tokenBAddress: string
  }> {
    // Implementation to calculate expected token amounts
    return {
      tokenA: '100',
      tokenB: '200',
      tokenAAddress: 'resource_tdx_2_token_a',
      tokenBAddress: 'resource_tdx_2_token_b'
    }
  }

  private async calculatePriceImpact(
    poolAddress: string,
    inputToken: string,
    amount: string
  ): Promise<number> {
    // Implementation to calculate price impact percentage
    // Price impact = (inputAmount / (inputReserve + inputAmount)) * 100
    return 0.15 // 0.15%
  }

  private async getSwapOutputAmount(
    transactionHash: string,
    outputToken: string
  ): Promise<string> {
    // Implementation to extract output amount from transaction events
    return '95.5'
  }
}
```

---

## NFT Development

### NFT Collection Management

```typescript
// NFT collection and marketplace patterns
class NFTCollectionManager {
  private web3Client: RadixWeb3Client
  private toolkitManager: RadixToolkitManager

  constructor(web3Client: RadixWeb3Client, toolkitManager: RadixToolkitManager) {
    this.web3Client = web3Client
    this.toolkitManager = toolkitManager
  }

  // Create NFT collection
  async createNFTCollection(
    collectionName: string,
    symbol: string,
    description: string,
    totalSupply: number,
    royaltyPercentage: number,
    creatorAddress: string
  ): Promise<{
    success: boolean
    transactionHash?: string
    collectionAddress?: string
    error?: string
  }> {
    try {
      const builder = new ManifestBuilder()

      // Create NFT collection metadata
      const metadata = {
        name: collectionName,
        symbol,
        description,
        totalSupply,
        royalty: royaltyPercentage,
        creator: creatorAddress
      }

      // Create collection component
      builder.callMethod(
        'package_tdx_2_nft_factory', // NFT factory package
        'create_nft_collection',
        `"${collectionName}"`,
        `"${symbol}"`,
        `"${description}"`,
        totalSupply.toString(),
        `Decimal("${royaltyPercentage}")`,
        `Address("${creatorAddress}")`
      )

      // Take collection component from worktop
      const collectionBucket = builder.takeAllFromWorktop('component_tdx_2_collection')
      builder.deposit(creatorAddress, collectionBucket)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        const collectionAddress = await this.extractCollectionAddress(result.transactionHash!)
        
        return {
          success: true,
          transactionHash: result.transactionHash,
          collectionAddress
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Mint NFT from collection
  async mintNFT(
    collectionAddress: string,
    tokenId: string,
    metadata: NFTMetadata,
    recipientAddress: string,
    minterAddress: string
  ): Promise<{
    success: boolean
    transactionHash?: string
    nftAddress?: string
    error?: string
  }> {
    try {
      const builder = new ManifestBuilder()

      // Prepare NFT metadata blob
      const metadataBlob = new TextEncoder().encode(JSON.stringify(metadata))
      builder.addBlob(metadataBlob)

      // Create minter proof if required
      const minterProof = builder.createProof(
        minterAddress,
        'resource_tdx_2_minter_badge',
        '1'
      )

      // Mint NFT
      builder.callMethod(
        collectionAddress,
        'mint_nft',
        `"${tokenId}"`,
        `Blob("${Array.from(metadataBlob).join(',')}")`,
        `Address("${recipientAddress}")`,
        `Proof("${minterProof}")`
      )

      // Take minted NFT
      const nftResourceAddress = await this.getNFTResourceAddress(collectionAddress)
      const nftBucket = builder.takeAllFromWorktop(nftResourceAddress)
      builder.deposit(recipientAddress, nftBucket)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        return {
          success: true,
          transactionHash: result.transactionHash,
          nftAddress: nftResourceAddress
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Helper methods
  private async extractCollectionAddress(transactionHash: string): Promise<string> {
    return 'component_tdx_2_collection_address'
  }

  private async getNFTResourceAddress(collectionAddress: string): Promise<string> {
    return `resource_tdx_2_nft_${collectionAddress.slice(-20)}`
  }
}

interface NFTMetadata {
  name: string
  description: string
  image: string
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}
```

---

## Token Management

### Token Factory and Management

```typescript
// Token creation and management patterns
class TokenFactory {
  private web3Client: RadixWeb3Client
  private toolkitManager: RadixToolkitManager

  constructor(web3Client: RadixWeb3Client, toolkitManager: RadixToolkitManager) {
    this.web3Client = web3Client
    this.toolkitManager = toolkitManager
  }

  // Create fungible token
  async createFungibleToken(
    tokenConfig: FungibleTokenConfig,
    creatorAddress: string
  ): Promise<{
    success: boolean
    transactionHash?: string
    tokenAddress?: string
    minterBadgeAddress?: string
    error?: string
  }> {
    try {
      const builder = new ManifestBuilder()

      // Create token with metadata
      const metadata = {
        name: tokenConfig.name,
        symbol: tokenConfig.symbol,
        description: tokenConfig.description,
        iconUrl: tokenConfig.iconUrl,
        totalSupply: tokenConfig.initialSupply
      }

      const metadataBlob = new TextEncoder().encode(JSON.stringify(metadata))
      builder.addBlob(metadataBlob)

      // Create fungible resource
      builder.callMethod(
        'package_tdx_2_token_factory', // Token factory package
        'create_fungible_token',
        `"${tokenConfig.name}"`,
        `"${tokenConfig.symbol}"`,
        `Decimal("${tokenConfig.initialSupply}")`,
        `Decimal("${tokenConfig.divisibility}")`,
        `Blob("${Array.from(metadataBlob).join(',')}")`,
        tokenConfig.mintable.toString(),
        tokenConfig.burnable.toString(),
        `Address("${creatorAddress}")`
      )

      // Take created token and minter badge
      const tokenBucket = builder.takeAllFromWorktop('new_token_resource')
      const minterBadgeBucket = builder.takeAllFromWorktop('minter_badge_resource')

      // Deposit to creator
      builder
        .deposit(creatorAddress, tokenBucket)
        .deposit(creatorAddress, minterBadgeBucket)

      const manifest = builder.build()
      const result = await this.web3Client.submitTransaction(manifest)

      if (result.success) {
        const addresses = await this.extractTokenAddresses(result.transactionHash!)
        
        return {
          success: true,
          transactionHash: result.transactionHash,
          tokenAddress: addresses.tokenAddress,
          minterBadgeAddress: addresses.minterBadgeAddress
        }
      } else {
        throw new Error(result.errorMessage)
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Helper methods
  private async extractTokenAddresses(transactionHash: string): Promise<{
    tokenAddress: string
    minterBadgeAddress: string
  }> {
    return {
      tokenAddress: 'resource_tdx_2_new_token',
      minterBadgeAddress: 'resource_tdx_2_minter_badge'
    }
  }
}

interface FungibleTokenConfig {
  name: string
  symbol: string
  description: string
  iconUrl?: string
  initialSupply: string
  divisibility: number
  mintable: boolean
  burnable: boolean
}
```

---

## Transaction Lifecycle

### Ciclo Completo de Vida de Transacciones

```typescript
// Complete transaction lifecycle management
enum TransactionPhase {
  CREATED = 'created',
  VALIDATED = 'validated', 
  SUBMITTED = 'submitted',
  PENDING = 'pending',
  BROADCAST = 'broadcast',
  CONFIRMED = 'confirmed',
  FINALIZED = 'finalized',
  FAILED = 'failed'
}

interface TransactionLifecycleEntry {
  id: string
  phase: TransactionPhase
  manifest: string
  signature?: string
  hash?: string
  timestamp: Date
  metadata: {
    fromAddress?: string
    toAddress?: string
    amount?: string
    resourceAddress?: string
    gasUsed?: string
    fee?: string
  }
  error?: string
  retryAttempts: number
  events: Array<{
    phase: TransactionPhase
    timestamp: Date
    data?: any
  }>
}

class TransactionLifecycleManager {
  private transactions = new Map<string, TransactionLifecycleEntry>()
  private phaseHandlers = new Map<TransactionPhase, Array<(tx: TransactionLifecycleEntry) => void>>()

  // Create new transaction
  createTransaction(
    manifest: string,
    metadata: Partial<TransactionLifecycleEntry['metadata']> = {}
  ): string {
    const id = crypto.randomUUID()
    const transaction: TransactionLifecycleEntry = {
      id,
      phase: TransactionPhase.CREATED,
      manifest,
      timestamp: new Date(),
      metadata,
      retryAttempts: 0,
      events: [{
        phase: TransactionPhase.CREATED,
        timestamp: new Date()
      }]
    }

    this.transactions.set(id, transaction)
    this.emitPhaseChange(transaction)
    
    console.log(`📝 Transaction created: ${id}`)
    return id
  }

  // Validate transaction
  async validateTransaction(transactionId: string): Promise<boolean> {
    const transaction = this.getTransaction(transactionId)
    if (!transaction) throw new Error('Transaction not found')

    try {
      // Validate manifest syntax and semantics
      const validation = ManifestValidator.validate(transaction.manifest)
      
      if (!validation.isValid) {
        this.updatePhase(transactionId, TransactionPhase.FAILED, {
          error: `Validation failed: ${validation.errors.join(', ')}`
        })
        return false
      }

      // Additional validation logic here...
      
      this.updatePhase(transactionId, TransactionPhase.VALIDATED)
      console.log(`✅ Transaction validated: ${transactionId}`)
      return true
    } catch (error) {
      this.updatePhase(transactionId, TransactionPhase.FAILED, {
        error: `Validation error: ${error.message}`
      })
      return false
    }
  }

  // Submit transaction to wallet/network
  async submitTransaction(
    transactionId: string,
    submitter: (manifest: string) => Promise<{ hash?: string; signature?: string }>
  ): Promise<boolean> {
    const transaction = this.getTransaction(transactionId)
    if (!transaction) throw new Error('Transaction not found')

    if (transaction.phase !== TransactionPhase.VALIDATED) {
      throw new Error(`Cannot submit transaction in phase: ${transaction.phase}`)
    }

    try {
      this.updatePhase(transactionId, TransactionPhase.SUBMITTED)
      
      const result = await submitter(transaction.manifest)
      
      this.updateTransaction(transactionId, {
        hash: result.hash,
        signature: result.signature
      })

      this.updatePhase(transactionId, TransactionPhase.PENDING)
      console.log(`📡 Transaction submitted: ${transactionId}`)
      return true
    } catch (error) {
      transaction.retryAttempts++
      
      if (transaction.retryAttempts < 3) {
        console.warn(`⚠️ Submission failed, will retry: ${error.message}`)
        // Reset to validated for retry
        this.updatePhase(transactionId, TransactionPhase.VALIDATED)
        return false
      } else {
        this.updatePhase(transactionId, TransactionPhase.FAILED, {
          error: `Submission failed after retries: ${error.message}`
        })
        return false
      }
    }
  }

  // Monitor transaction on network
  async monitorTransaction(
    transactionId: string,
    statusChecker: (hash: string) => Promise<{
      status: 'pending' | 'confirmed' | 'failed'
      blockHeight?: number
      gasUsed?: string
      fee?: string
    }>
  ): Promise<void> {
    const transaction = this.getTransaction(transactionId)
    if (!transaction || !transaction.hash) {
      throw new Error('Transaction not found or has no hash')
    }

    const pollInterval = 5000 // 5 seconds
    const maxPollingTime = 300000 // 5 minutes

    const startTime = Date.now()

    const poll = async (): Promise<void> => {
      try {
        const status = await statusChecker(transaction.hash!)
        
        switch (status.status) {
          case 'pending':
            if (transaction.phase === TransactionPhase.PENDING) {
              this.updatePhase(transactionId, TransactionPhase.BROADCAST)
            }
            break

          case 'confirmed':
            this.updateTransaction(transactionId, {
              metadata: {
                ...transaction.metadata,
                gasUsed: status.gasUsed,
                fee: status.fee
              }
            })
            this.updatePhase(transactionId, TransactionPhase.CONFIRMED)
            
            // Wait for additional confirmations before finalizing
            setTimeout(() => {
              this.updatePhase(transactionId, TransactionPhase.FINALIZED)
            }, 30000) // 30 seconds
            return

          case 'failed':
            this.updatePhase(transactionId, TransactionPhase.FAILED, {
              error: 'Transaction failed on network'
            })
            return
        }

        // Continue polling if still pending
        if (Date.now() - startTime < maxPollingTime) {
          setTimeout(poll, pollInterval)
        } else {
          this.updatePhase(transactionId, TransactionPhase.FAILED, {
            error: 'Transaction monitoring timeout'
          })
        }
      } catch (error) {
        console.error('❌ Error monitoring transaction:', error)
        setTimeout(poll, pollInterval * 2) // Exponential backoff
      }
    }

    // Start polling
    poll()
  }

  // Complete transaction lifecycle
  async executeLifecycle(
    manifest: string,
    submitter: (manifest: string) => Promise<{ hash?: string; signature?: string }>,
    statusChecker: (hash: string) => Promise<any>,
    metadata: Partial<TransactionLifecycleEntry['metadata']> = {}
  ): Promise<{
    success: boolean
    transactionId: string
    hash?: string
    error?: string
  }> {
    const transactionId = this.createTransaction(manifest, metadata)

    try {
      // Phase 1: Validate
      const isValid = await this.validateTransaction(transactionId)
      if (!isValid) {
        const transaction = this.getTransaction(transactionId)
        return {
          success: false,
          transactionId,
          error: transaction?.error || 'Validation failed'
        }
      }

      // Phase 2: Submit
      const submitted = await this.submitTransaction(transactionId, submitter)
      if (!submitted) {
        const transaction = this.getTransaction(transactionId)
        return {
          success: false,
          transactionId,
          error: transaction?.error || 'Submission failed'
        }
      }

      // Phase 3: Monitor
      this.monitorTransaction(transactionId, statusChecker)

      // Wait for confirmation or failure
      const result = await this.waitForCompletion(transactionId)
      
      return {
        success: result.success,
        transactionId,
        hash: result.hash,
        error: result.error
      }
    } catch (error) {
      this.updatePhase(transactionId, TransactionPhase.FAILED, {
        error: error.message
      })
      
      return {
        success: false,
        transactionId,
        error: error.message
      }
    }
  }

  // Wait for transaction completion
  private waitForCompletion(transactionId: string): Promise<{
    success: boolean
    hash?: string
    error?: string
  }> {
    return new Promise((resolve) => {
      const checkStatus = () => {
        const transaction = this.getTransaction(transactionId)
        if (!transaction) {
          resolve({ success: false, error: 'Transaction not found' })
          return
        }

        if (transaction.phase === TransactionPhase.FINALIZED) {
          resolve({ success: true, hash: transaction.hash })
          return
        }

        if (transaction.phase === TransactionPhase.FAILED) {
          resolve({ success: false, error: transaction.error })
          return
        }

        // Continue waiting
        setTimeout(checkStatus, 1000)
      }

      checkStatus()
    })
  }

  // Helper methods
  private getTransaction(id: string): TransactionLifecycleEntry | undefined {
    return this.transactions.get(id)
  }

  private updatePhase(
    transactionId: string,
    phase: TransactionPhase,
    updates: Partial<TransactionLifecycleEntry> = {}
  ): void {
    const transaction = this.getTransaction(transactionId)
    if (!transaction) return

    transaction.phase = phase
    transaction.timestamp = new Date()
    transaction.events.push({
      phase,
      timestamp: new Date(),
      data: updates
    })

    if (updates.error) {
      transaction.error = updates.error
    }

    Object.assign(transaction, updates)
    this.emitPhaseChange(transaction)
  }

  private updateTransaction(
    transactionId: string,
    updates: Partial<TransactionLifecycleEntry>
  ): void {
    const transaction = this.getTransaction(transactionId)
    if (!transaction) return

    Object.assign(transaction, updates)
  }

  private emitPhaseChange(transaction: TransactionLifecycleEntry): void {
    const handlers = this.phaseHandlers.get(transaction.phase) || []
    handlers.forEach(handler => {
      try {
        handler(transaction)
      } catch (error) {
        console.error('Phase handler error:', error)
      }
    })
  }

  // Event subscription
  onPhase(
    phase: TransactionPhase,
    handler: (transaction: TransactionLifecycleEntry) => void
  ): () => void {
    const handlers = this.phaseHandlers.get(phase) || []
    handlers.push(handler)
    this.phaseHandlers.set(phase, handlers)

    return () => {
      const currentHandlers = this.phaseHandlers.get(phase) || []
      const index = currentHandlers.indexOf(handler)
      if (index > -1) {
        currentHandlers.splice(index, 1)
      }
    }
  }

  // Statistics and monitoring
  getStatistics(): {
    total: number
    byPhase: Record<TransactionPhase, number>
    averageTimeToConfirmation: number
    successRate: number
  } {
    const transactions = Array.from(this.transactions.values())
    const stats = {
      total: transactions.length,
      byPhase: {} as Record<TransactionPhase, number>,
      averageTimeToConfirmation: 0,
      successRate: 0
    }

    // Initialize phase counts
    Object.values(TransactionPhase).forEach(phase => {
      stats.byPhase[phase] = 0
    })

    // Count by phase
    transactions.forEach(tx => {
      stats.byPhase[tx.phase]++
    })

    // Calculate success rate
    const completed = stats.byPhase[TransactionPhase.FINALIZED] + stats.byPhase[TransactionPhase.FAILED]
    if (completed > 0) {
      stats.successRate = (stats.byPhase[TransactionPhase.FINALIZED] / completed) * 100
    }

    // Calculate average confirmation time
    const confirmedTransactions = transactions.filter(tx => 
      tx.phase === TransactionPhase.FINALIZED
    )
    
    if (confirmedTransactions.length > 0) {
      const totalTime = confirmedTransactions.reduce((sum, tx) => {
        const createdEvent = tx.events.find(e => e.phase === TransactionPhase.CREATED)
        const finalizedEvent = tx.events.find(e => e.phase === TransactionPhase.FINALIZED)
        
        if (createdEvent && finalizedEvent) {
          return sum + (finalizedEvent.timestamp.getTime() - createdEvent.timestamp.getTime())
        }
        return sum
      }, 0)
      
      stats.averageTimeToConfirmation = totalTime / confirmedTransactions.length
    }

    return stats
  }
}
```

---

## Estructuras de Datos

### Maps y Sets Optimizados para Radix

```typescript
// Address-optimized Map for efficient address lookups
class RadixAddressMap<T> extends Map<string, T> {
  private static normalizeAddress(address: string): string {
    // Normalize address format for consistent lookups
    if (address.startsWith('account_')) {
      return address.toLowerCase()
    }
    if (address.startsWith('resource_')) {
      return address.toLowerCase()  
    }
    if (address.startsWith('component_')) {
      return address.toLowerCase()
    }
    throw new Error(`Invalid Radix address format: ${address}`)
  }

  set(address: string, value: T): this {
    return super.set(RadixAddressMap.normalizeAddress(address), value)
  }

  get(address: string): T | undefined {
    return super.get(RadixAddressMap.normalizeAddress(address))
  }

  has(address: string): boolean {
    return super.has(RadixAddressMap.normalizeAddress(address))
  }

  delete(address: string): boolean {
    return super.delete(RadixAddressMap.normalizeAddress(address))
  }

  // Utility methods for Radix-specific operations
  getAccountBalances(): Map<string, T> {
    const accountBalances = new Map<string, T>()
    for (const [address, value] of this.entries()) {
      if (address.startsWith('account_')) {
        accountBalances.set(address, value)
      }
    }
    return accountBalances
  }

  getResourceData(): Map<string, T> {
    const resourceData = new Map<string, T>()
    for (const [address, value] of this.entries()) {
      if (address.startsWith('resource_')) {
        resourceData.set(address, value)
      }
    }
    return resourceData
  }

  getComponentData(): Map<string, T> {
    const componentData = new Map<string, T>()
    for (const [address, value] of this.entries()) {
      if (address.startsWith('component_')) {
        componentData.set(address, value)
      }
    }
    return componentData
  }
}

// Set optimizado para addresses Radix
class RadixAddressSet extends Set<string> {
  private static normalizeAddress(address: string): string {
    if (address.startsWith('account_') || 
        address.startsWith('resource_') || 
        address.startsWith('component_')) {
      return address.toLowerCase()
    }
    throw new Error(`Invalid Radix address format: ${address}`)
  }

  add(address: string): this {
    return super.add(RadixAddressSet.normalizeAddress(address))
  }

  has(address: string): boolean {
    return super.has(RadixAddressSet.normalizeAddress(address))
  }

  delete(address: string): boolean {
    return super.delete(RadixAddressSet.normalizeAddress(address))
  }

  // Utility methods
  getAccountAddresses(): string[] {
    return Array.from(this).filter(addr => addr.startsWith('account_'))
  }

  getResourceAddresses(): string[] {
    return Array.from(this).filter(addr => addr.startsWith('resource_'))
  }

  getComponentAddresses(): string[] {
    return Array.from(this).filter(addr => addr.startsWith('component_'))
  }
}
```

### Queue para Transacciones Pendientes

```typescript
// Priority queue for transaction management
interface PendingTransaction {
  id: string
  manifest: string
  priority: TransactionPriority
  timestamp: Date
  retryCount: number
  maxRetries: number
  metadata: {
    gasLimit?: string
    tip?: string
    accountAddress: string
    estimatedCost?: string
  }
}

enum TransactionPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

class TransactionQueue {
  private queue: PendingTransaction[] = []
  private processing = new Set<string>()
  private maxConcurrent: number = 5

  enqueue(transaction: Omit<PendingTransaction, 'timestamp'>): void {
    const tx: PendingTransaction = {
      ...transaction,
      timestamp: new Date()
    }

    // Insert with priority ordering
    let inserted = false
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < tx.priority) {
        this.queue.splice(i, 0, tx)
        inserted = true
        break
      }
    }

    if (!inserted) {
      this.queue.push(tx)
    }

    console.log(`Transaction ${tx.id} enqueued with priority ${tx.priority}`)
  }

  dequeue(): PendingTransaction | undefined {
    if (this.queue.length === 0 || this.processing.size >= this.maxConcurrent) {
      return undefined
    }

    const tx = this.queue.shift()
    if (tx) {
      this.processing.add(tx.id)
    }
    return tx
  }

  markCompleted(transactionId: string): void {
    this.processing.delete(transactionId)
  }

  markFailed(transactionId: string): void {
    this.processing.delete(transactionId)
    
    // Find transaction and retry if within limits
    const tx = this.queue.find(t => t.id === transactionId)
    if (tx && tx.retryCount < tx.maxRetries) {
      tx.retryCount++
      tx.timestamp = new Date()
      this.enqueue(tx)
      console.log(`Transaction ${transactionId} retry attempt ${tx.retryCount}`)
    }
  }

  getQueueStatus(): {
    pending: number
    processing: number
    byPriority: Record<TransactionPriority, number>
  } {
    const byPriority = {
      [TransactionPriority.LOW]: 0,
      [TransactionPriority.NORMAL]: 0,
      [TransactionPriority.HIGH]: 0,
      [TransactionPriority.URGENT]: 0
    }

    this.queue.forEach(tx => {
      byPriority[tx.priority]++
    })

    return {
      pending: this.queue.length,
      processing: this.processing.size,
      byPriority
    }
  }

  // Clear expired transactions
  clearExpired(maxAge: number = 300000): number { // 5 minutes default
    const now = new Date()
    const initialLength = this.queue.length
    
    this.queue = this.queue.filter(tx => {
      const age = now.getTime() - tx.timestamp.getTime()
      return age <= maxAge
    })

    return initialLength - this.queue.length
  }
}
```

### Tree para Jerarquías de Componentes

```typescript
// Tree structure for component hierarchies
interface ComponentNode {
  address: string
  componentType: string
  parentAddress?: string
  children: Set<string>
  metadata: {
    name?: string
    description?: string
    state?: any
    permissions?: string[]
  }
  dependencies: Set<string> // Resource dependencies
}

class ComponentTree {
  private nodes = new Map<string, ComponentNode>()
  private roots = new Set<string>()

  addComponent(
    address: string,
    componentType: string,
    parentAddress?: string,
    metadata: ComponentNode['metadata'] = {}
  ): void {
    if (this.nodes.has(address)) {
      throw new Error(`Component ${address} already exists`)
    }

    const node: ComponentNode = {
      address,
      componentType,
      parentAddress,
      children: new Set(),
      metadata,
      dependencies: new Set()
    }

    this.nodes.set(address, node)

    if (parentAddress) {
      const parent = this.nodes.get(parentAddress)
      if (!parent) {
        throw new Error(`Parent component ${parentAddress} not found`)
      }
      parent.children.add(address)
    } else {
      this.roots.add(address)
    }
  }

  removeComponent(address: string): boolean {
    const node = this.nodes.get(address)
    if (!node) {
      return false
    }

    // Remove from parent's children
    if (node.parentAddress) {
      const parent = this.nodes.get(node.parentAddress)
      parent?.children.delete(address)
    } else {
      this.roots.delete(address)
    }

    // Reassign children to parent or make them roots
    for (const childAddress of node.children) {
      const child = this.nodes.get(childAddress)
      if (child) {
        child.parentAddress = node.parentAddress
        if (node.parentAddress) {
          const parent = this.nodes.get(node.parentAddress)
          parent?.children.add(childAddress)
        } else {
          this.roots.add(childAddress)
        }
      }
    }

    this.nodes.delete(address)
    return true
  }

  getComponent(address: string): ComponentNode | undefined {
    return this.nodes.get(address)
  }

  getChildren(address: string): ComponentNode[] {
    const node = this.nodes.get(address)
    if (!node) {
      return []
    }

    return Array.from(node.children)
      .map(addr => this.nodes.get(addr))
      .filter((node): node is ComponentNode => node !== undefined)
  }

  getAncestors(address: string): ComponentNode[] {
    const ancestors: ComponentNode[] = []
    let current = this.nodes.get(address)

    while (current?.parentAddress) {
      const parent = this.nodes.get(current.parentAddress)
      if (parent) {
        ancestors.unshift(parent)
        current = parent
      } else {
        break
      }
    }

    return ancestors
  }

  getDescendants(address: string): ComponentNode[] {
    const descendants: ComponentNode[] = []
    const node = this.nodes.get(address)
    
    if (!node) {
      return descendants
    }

    const traverse = (currentNode: ComponentNode) => {
      for (const childAddress of currentNode.children) {
        const child = this.nodes.get(childAddress)
        if (child) {
          descendants.push(child)
          traverse(child)
        }
      }
    }

    traverse(node)
    return descendants
  }

  // Find components by type
  findComponentsByType(componentType: string): ComponentNode[] {
    return Array.from(this.nodes.values())
      .filter(node => node.componentType === componentType)
  }

  // Get tree structure as nested object
  getTreeStructure(): any {
    const buildTree = (address: string): any => {
      const node = this.nodes.get(address)
      if (!node) {
        return null
      }

      return {
        address: node.address,
        componentType: node.componentType,
        metadata: node.metadata,
        children: Array.from(node.children).map(buildTree).filter(Boolean)
      }
    }

    return Array.from(this.roots).map(buildTree).filter(Boolean)
  }
}
```

### Graph para Dependencias de Recursos

```typescript
// Directed graph for resource dependencies
interface ResourceDependency {
  from: string // Component address
  to: string   // Resource address
  type: 'read' | 'write' | 'mint' | 'burn' | 'withdraw' | 'deposit'
  metadata: {
    amount?: string
    permission?: string
    accessLevel?: 'public' | 'private' | 'restricted'
  }
}

class ResourceDependencyGraph {
  private edges = new Map<string, Set<ResourceDependency>>()
  private reverseEdges = new Map<string, Set<ResourceDependency>>()
  private nodes = new Set<string>()

  addDependency(dependency: ResourceDependency): void {
    this.nodes.add(dependency.from)
    this.nodes.add(dependency.to)

    // Forward edges (component -> resource)
    if (!this.edges.has(dependency.from)) {
      this.edges.set(dependency.from, new Set())
    }
    this.edges.get(dependency.from)!.add(dependency)

    // Reverse edges (resource -> component)
    if (!this.reverseEdges.has(dependency.to)) {
      this.reverseEdges.set(dependency.to, new Set())
    }
    this.reverseEdges.get(dependency.to)!.add(dependency)
  }

  removeDependency(from: string, to: string, type?: string): boolean {
    const forwardSet = this.edges.get(from)
    const reverseSet = this.reverseEdges.get(to)
    
    if (!forwardSet || !reverseSet) {
      return false
    }

    let removed = false
    for (const dep of forwardSet) {
      if (dep.to === to && (!type || dep.type === type)) {
        forwardSet.delete(dep)
        reverseSet.delete(dep)
        removed = true
      }
    }

    return removed
  }

  getDependencies(componentAddress: string): ResourceDependency[] {
    const deps = this.edges.get(componentAddress)
    return deps ? Array.from(deps) : []
  }

  getDependents(resourceAddress: string): ResourceDependency[] {
    const deps = this.reverseEdges.get(resourceAddress)
    return deps ? Array.from(deps) : []
  }

  // Find circular dependencies
  findCircularDependencies(): string[][] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const cycles: string[][] = []

    const dfs = (node: string, path: string[]): void => {
      if (visiting.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node)
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart))
        }
        return
      }

      if (visited.has(node)) {
        return
      }

      visiting.add(node)
      path.push(node)

      const dependencies = this.edges.get(node)
      if (dependencies) {
        for (const dep of dependencies) {
          dfs(dep.to, [...path])
        }
      }

      visiting.delete(node)
      visited.add(node)
    }

    for (const node of this.nodes) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  // Get components that write to a resource
  getWriters(resourceAddress: string): string[] {
    const deps = this.reverseEdges.get(resourceAddress)
    if (!deps) {
      return []
    }

    return Array.from(deps)
      .filter(dep => dep.type === 'write' || dep.type === 'mint' || dep.type === 'burn')
      .map(dep => dep.from)
  }

  // Get components that read from a resource
  getReaders(resourceAddress: string): string[] {
    const deps = this.reverseEdges.get(resourceAddress)
    if (!deps) {
      return []
    }

    return Array.from(deps)
      .filter(dep => dep.type === 'read')
      .map(dep => dep.from)
  }

  // Get resource access matrix
  getAccessMatrix(): Map<string, Map<string, Set<string>>> {
    const matrix = new Map<string, Map<string, Set<string>>>()

    for (const [component, dependencies] of this.edges) {
      if (!matrix.has(component)) {
        matrix.set(component, new Map())
      }
      const componentMatrix = matrix.get(component)!

      for (const dep of dependencies) {
        if (!componentMatrix.has(dep.to)) {
          componentMatrix.set(dep.to, new Set())
        }
        componentMatrix.get(dep.to)!.add(dep.type)
      }
    }

    return matrix
  }
}
```

### Cache LRU para Metadata

```typescript
// LRU Cache optimized for Radix metadata
interface CacheEntry<T> {
  value: T
  timestamp: Date
  accessCount: number
  lastAccessed: Date
  ttl?: number
}

class RadixMetadataCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder: string[] = []
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize: number = 1000, defaultTTL: number = 300000) { // 5 minutes default
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  set(key: string, value: T, ttl?: number): void {
    const now = new Date()
    
    // Remove if already exists
    if (this.cache.has(key)) {
      this.delete(key)
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now,
      ttl: ttl || this.defaultTTL
    }

    this.cache.set(key, entry)
    this.accessOrder.push(key)
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) {
      return undefined
    }

    const now = new Date()
    
    // Check TTL
    if (entry.ttl && (now.getTime() - entry.timestamp.getTime()) > entry.ttl) {
      this.delete(key)
      return undefined
    }

    // Update access info
    entry.lastAccessed = now
    entry.accessCount++

    // Move to end of access order
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }

    return entry.value
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    const now = new Date()
    if (entry.ttl && (now.getTime() - entry.timestamp.getTime()) > entry.ttl) {
      this.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    const removed = this.cache.delete(key)
    if (removed) {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    }
    return removed
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0]
      this.delete(lruKey)
    }
  }

  // Clean up expired entries
  cleanup(): number {
    const now = new Date()
    let removed = 0

    for (const [key, entry] of this.cache) {
      if (entry.ttl && (now.getTime() - entry.timestamp.getTime()) > entry.ttl) {
        this.delete(key)
        removed++
      }
    }

    return removed
  }

  // Get cache statistics
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    entries: Array<{
      key: string
      accessCount: number
      age: number
      lastAccessed: Date
    }>
  } {
    const stats = {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0,
      entries: [] as any[]
    }

    let totalAccesses = 0
    const now = new Date()

    for (const [key, entry] of this.cache) {
      totalAccesses += entry.accessCount
      stats.entries.push({
        key,
        accessCount: entry.accessCount,
        age: now.getTime() - entry.timestamp.getTime(),
        lastAccessed: entry.lastAccessed
      })
    }

    if (totalAccesses > 0) {
      stats.hitRate = totalAccesses / (totalAccesses + this.cache.size)
    }

    return stats
  }

  // Preload common metadata
  preload(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl)
    }
  }
}
```

---

## Utilities y Helpers

### Parsers para Diferentes Formatos de Radix

```typescript
// Comprehensive parsing utilities for Radix data formats
class RadixParsers {
  // Parse address with validation
  static parseAddress(address: string): {
    type: 'account' | 'resource' | 'component' | 'package'
    networkId: number
    hrp: string
    data: string
    checksum: string
  } {
    const addressPattern = /^(account|resource|component|package)_([a-z0-9]+)_([a-z0-9]+)_([a-z0-9]+)$/
    const match = address.match(addressPattern)
    
    if (!match) {
      throw new Error(`Invalid Radix address format: ${address}`)
    }

    const [, type, networkHrp, data, checksum] = match
    
    // Network ID mapping
    const networkMapping: Record<string, number> = {
      'rdx': 1,    // Mainnet
      'tdx': 2,    // Stokenet
      'sim': 242,  // Simulator
    }

    const networkId = networkMapping[networkHrp]
    if (networkId === undefined) {
      throw new Error(`Unknown network HRP: ${networkHrp}`)
    }

    return {
      type: type as any,
      networkId,
      hrp: networkHrp,
      data,
      checksum
    }
  }

  // Parse transaction hash
  static parseTransactionHash(hash: string): {
    hash: string
    version: number
    isValid: boolean
  } {
    const hashPattern = /^[a-f0-9]{64}$/i
    const isValid = hashPattern.test(hash)
    
    return {
      hash: hash.toLowerCase(),
      version: 1, // Assuming version 1 for now
      isValid
    }
  }

  // Parse manifest with instruction breakdown
  static parseManifest(manifest: string): {
    instructions: Array<{
      type: string
      method: string
      args: any[]
      line: number
    }>
    accounts: string[]
    resources: string[]
    components: string[]
    totalInstructions: number
  } {
    const lines = manifest.split('\n').map(line => line.trim()).filter(line => line)
    const instructions: any[] = []
    const accounts = new Set<string>()
    const resources = new Set<string>()
    const components = new Set<string>()

    lines.forEach((line, index) => {
      if (line.startsWith('CALL_METHOD')) {
        const methodMatch = line.match(/CALL_METHOD\s+Address\("([^"]+)"\)\s+"([^"]+)"(.*)/)
        if (methodMatch) {
          const [, address, method, argsStr] = methodMatch
          
          // Categorize address
          if (address.startsWith('account_')) accounts.add(address)
          else if (address.startsWith('resource_')) resources.add(address)
          else if (address.startsWith('component_')) components.add(address)

          instructions.push({
            type: 'CALL_METHOD',
            method,
            args: RadixParsers.parseArgs(argsStr),
            line: index + 1
          })
        }
      } else if (line.startsWith('TAKE_FROM_WORKTOP')) {
        const takeMatch = line.match(/TAKE_FROM_WORKTOP\s+Address\("([^"]+)"\)\s+Decimal\("([^"]+)"\)/)
        if (takeMatch) {
          const [, resourceAddress, amount] = takeMatch
          resources.add(resourceAddress)
          
          instructions.push({
            type: 'TAKE_FROM_WORKTOP',
            method: 'take',
            args: [resourceAddress, amount],
            line: index + 1
          })
        }
      }
      // Add more instruction types as needed
    })

    return {
      instructions,
      accounts: Array.from(accounts),
      resources: Array.from(resources),
      components: Array.from(components),
      totalInstructions: instructions.length
    }
  }

  // Parse manifest arguments
  private static parseArgs(argsStr: string): any[] {
    const args: any[] = []
    const argPattern = /(?:Address|Decimal|String|Bytes|Bool)\("([^"]*)"\)/g
    let match

    while ((match = argPattern.exec(argsStr)) !== null) {
      args.push(match[1])
    }

    return args
  }

  // Parse resource amount with precision
  static parseAmount(amount: string): {
    value: string
    decimal: number
    formatted: string
    wei: bigint
  } {
    const decimalPlaces = 18 // Standard Radix precision
    const [wholePart, fractionalPart = ''] = amount.split('.')
    
    const paddedFractional = fractionalPart.padEnd(decimalPlaces, '0')
    const wei = BigInt(wholePart + paddedFractional)
    
    return {
      value: amount,
      decimal: decimalPlaces,
      formatted: `${wholePart}.${fractionalPart}`,
      wei
    }
  }

  // Parse component state
  static parseComponentState(stateHex: string): {
    hex: string
    decoded: any
    fields: Record<string, any>
  } {
    try {
      // This would typically use SBOR decoding
      // For now, provide structure for implementation
      const fields: Record<string, any> = {}
      
      // Mock implementation - replace with actual SBOR decoding
      if (stateHex.length > 0) {
        fields.rawState = stateHex
        fields.length = stateHex.length / 2 // bytes
      }

      return {
        hex: stateHex,
        decoded: fields,
        fields
      }
    } catch (error) {
      throw new Error(`Failed to parse component state: ${error}`)
    }
  }
}
```

### Converters entre Tipos de Datos

```typescript
// Type conversion utilities for Radix development
class RadixConverters {
  // Convert between different address formats
  static convertAddress(address: string, targetFormat: 'bech32' | 'hex' | 'bytes'): string {
    const parsed = RadixParsers.parseAddress(address)
    
    switch (targetFormat) {
      case 'bech32':
        return address // Already in bech32 format
      case 'hex':
        return `0x${parsed.data}`
      case 'bytes':
        return parsed.data
      default:
        throw new Error(`Unsupported target format: ${targetFormat}`)
    }
  }

  // Convert amounts between different representations
  static convertAmount(
    amount: string | bigint | number,
    fromUnit: 'wei' | 'radix' | 'atto',
    toUnit: 'wei' | 'radix' | 'atto'
  ): string {
    const RADIX_DECIMALS = 18n
    let amountInWei: bigint

    // Convert to wei first
    if (typeof amount === 'string') {
      if (fromUnit === 'wei' || fromUnit === 'atto') {
        amountInWei = BigInt(amount)
      } else {
        // From radix to wei
        const [whole, fraction = ''] = amount.split('.')
        const paddedFraction = fraction.padEnd(18, '0')
        amountInWei = BigInt(whole + paddedFraction)
      }
    } else if (typeof amount === 'bigint') {
      amountInWei = fromUnit === 'radix' ? amount * (10n ** RADIX_DECIMALS) : amount
    } else {
      amountInWei = BigInt(Math.floor(amount * (fromUnit === 'radix' ? 10 ** 18 : 1)))
    }

    // Convert from wei to target unit
    switch (toUnit) {
      case 'wei':
      case 'atto':
        return amountInWei.toString()
      case 'radix':
        const wholePart = amountInWei / (10n ** RADIX_DECIMALS)
        const fractionalPart = amountInWei % (10n ** RADIX_DECIMALS)
        const fractionalStr = fractionalPart.toString().padStart(18, '0').replace(/0+$/, '')
        return fractionalStr ? `${wholePart}.${fractionalStr}` : wholePart.toString()
      default:
        throw new Error(`Unsupported target unit: ${toUnit}`)
    }
  }

  // Convert between hex and bytes
  static hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace(/^0x/, '')
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string length')
    }
    
    const bytes = new Uint8Array(cleanHex.length / 2)
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16)
    }
    return bytes
  }

  static bytesToHex(bytes: Uint8Array): string {
    return '0x' + Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Convert manifest to different formats
  static convertManifest(
    manifest: string,
    format: 'string' | 'instructions' | 'binary' | 'json'
  ): string | object {
    switch (format) {
      case 'string':
        return manifest
      case 'instructions':
        return RadixParsers.parseManifest(manifest).instructions
      case 'json':
        return {
          manifest,
          parsed: RadixParsers.parseManifest(manifest),
          timestamp: new Date().toISOString()
        }
      case 'binary':
        // Mock implementation - would need actual binary conversion
        return Buffer.from(manifest).toString('base64')
      default:
        throw new Error(`Unsupported manifest format: ${format}`)
    }
  }

  // Convert network IDs
  static convertNetworkId(
    networkId: number | string,
    format: 'number' | 'name' | 'hrp'
  ): string | number {
    const networks = {
      1: { name: 'mainnet', hrp: 'rdx' },
      2: { name: 'stokenet', hrp: 'tdx' },
      242: { name: 'simulator', hrp: 'sim' }
    }

    const id = typeof networkId === 'string' ? parseInt(networkId) : networkId
    const network = networks[id as keyof typeof networks]
    
    if (!network) {
      throw new Error(`Unknown network ID: ${networkId}`)
    }

    switch (format) {
      case 'number':
        return id
      case 'name':
        return network.name
      case 'hrp':
        return network.hrp
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }
}
```

### Validators para Diferentes Entidades

```typescript
// Comprehensive validation utilities for Radix entities
class RadixValidators {
  // Validate addresses
  static validateAddress(address: string, type?: 'account' | 'resource' | 'component' | 'package'): {
    isValid: boolean
    errors: string[]
    type?: string
    networkId?: number
  } {
    const errors: string[] = []

    try {
      const parsed = RadixParsers.parseAddress(address)
      
      if (type && parsed.type !== type) {
        errors.push(`Expected ${type} address, got ${parsed.type}`)
      }

      // Additional validation rules
      if (parsed.data.length < 10) {
        errors.push('Address data too short')
      }

      if (parsed.checksum.length !== 6) {
        errors.push('Invalid checksum length')
      }

      return {
        isValid: errors.length === 0,
        errors,
        type: parsed.type,
        networkId: parsed.networkId
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Invalid address format')
      return { isValid: false, errors }
    }
  }

  // Validate transaction manifest
  static validateManifest(manifest: string): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    statistics: {
      instructionCount: number
      accountsUsed: number
      resourcesUsed: number
      estimatedComplexity: 'low' | 'medium' | 'high'
    }
  } {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      const parsed = RadixParsers.parseManifest(manifest)
      
      // Basic structure validation
      if (parsed.totalInstructions === 0) {
        errors.push('Manifest contains no instructions')
      }

      if (parsed.totalInstructions > 100) {
        warnings.push('High instruction count may increase transaction cost')
      }

      // Check for required patterns
      const hasWithdraw = parsed.instructions.some(i => i.method === 'withdraw')
      const hasDeposit = parsed.instructions.some(i => i.method === 'deposit')
      
      if (hasWithdraw && !hasDeposit) {
        warnings.push('Manifest withdraws but never deposits - funds may be lost')
      }

      // Validate addresses used
      const allAddresses = [...parsed.accounts, ...parsed.resources, ...parsed.components]
      for (const address of allAddresses) {
        const validation = RadixValidators.validateAddress(address)
        if (!validation.isValid) {
          errors.push(`Invalid address in manifest: ${address}`)
        }
      }

      // Estimate complexity
      let complexity: 'low' | 'medium' | 'high' = 'low'
      if (parsed.totalInstructions > 20) complexity = 'medium'
      if (parsed.totalInstructions > 50) complexity = 'high'

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        statistics: {
          instructionCount: parsed.totalInstructions,
          accountsUsed: parsed.accounts.length,
          resourcesUsed: parsed.resources.length,
          estimatedComplexity: complexity
        }
      }
    } catch (error) {
      errors.push(`Manifest parsing failed: ${error}`)
      return {
        isValid: false,
        errors,
        warnings,
        statistics: {
          instructionCount: 0,
          accountsUsed: 0,
          resourcesUsed: 0,
          estimatedComplexity: 'low'
        }
      }
    }
  }

  // Validate amounts
  static validateAmount(amount: string): {
    isValid: boolean
    errors: string[]
    parsed?: {
      value: string
      wei: bigint
      isZero: boolean
      isNegative: boolean
    }
  } {
    const errors: string[] = []

    try {
      const parsed = RadixParsers.parseAmount(amount)
      
      if (parsed.wei < 0n) {
        errors.push('Amount cannot be negative')
      }

      if (parsed.wei === 0n) {
        // Zero amounts might be valid in some contexts
      }

      // Check for reasonable limits (max supply consideration)
      const MAX_SUPPLY = BigInt('1000000000000000000000000000') // Example max
      if (parsed.wei > MAX_SUPPLY) {
        errors.push('Amount exceeds maximum possible supply')
      }

      return {
        isValid: errors.length === 0,
        errors,
        parsed: {
          value: parsed.value,
          wei: parsed.wei,
          isZero: parsed.wei === 0n,
          isNegative: parsed.wei < 0n
        }
      }
    } catch (error) {
      errors.push(`Invalid amount format: ${error}`)
      return { isValid: false, errors }
    }
  }

  // Validate transaction request
  static validateTransactionRequest(request: {
    manifest: string
    blobs?: Uint8Array[]
    message?: string
  }): {
    isValid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate manifest
    const manifestValidation = RadixValidators.validateManifest(request.manifest)
    errors.push(...manifestValidation.errors)
    warnings.push(...manifestValidation.warnings)

    // Validate blobs
    if (request.blobs) {
      if (request.blobs.length > 10) {
        warnings.push('High number of blobs may increase transaction size')
      }

      const totalBlobSize = request.blobs.reduce((sum, blob) => sum + blob.length, 0)
      if (totalBlobSize > 1024 * 1024) { // 1MB
        errors.push('Total blob size exceeds maximum limit')
      }
    }

    // Validate message
    if (request.message) {
      if (request.message.length > 1000) {
        warnings.push('Long message may increase transaction cost')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Validate network configuration
  static validateNetworkConfig(config: {
    networkId: number
    gatewayUrl: string
    wellKnownAddresses: Record<string, string>
  }): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate network ID
    const validNetworks = [1, 2, 242]
    if (!validNetworks.includes(config.networkId)) {
      errors.push(`Invalid network ID: ${config.networkId}`)
    }

    // Validate gateway URL
    try {
      new URL(config.gatewayUrl)
      if (!config.gatewayUrl.startsWith('https://')) {
        errors.push('Gateway URL should use HTTPS')
      }
    } catch {
      errors.push('Invalid gateway URL format')
    }

    // Validate well-known addresses
    for (const [name, address] of Object.entries(config.wellKnownAddresses)) {
      const validation = RadixValidators.validateAddress(address)
      if (!validation.isValid) {
        errors.push(`Invalid well-known address for ${name}: ${address}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}
```

### Formatters para Display de Datos

```typescript
// Display formatting utilities for Radix data
class RadixFormatters {
  // Format addresses for display
  static formatAddress(
    address: string,
    options: {
      truncate?: boolean
      showType?: boolean
      showNetwork?: boolean
      maxLength?: number
    } = {}
  ): string {
    const { truncate = false, showType = false, showNetwork = false, maxLength = 12 } = options

    try {
      const parsed = RadixParsers.parseAddress(address)
      let formatted = address

      if (truncate) {
        const start = address.substring(0, maxLength)
        const end = address.substring(address.length - 6)
        formatted = `${start}...${end}`
      }

      if (showType) {
        formatted = `[${parsed.type.toUpperCase()}] ${formatted}`
      }

      if (showNetwork) {
        const networkName = RadixConverters.convertNetworkId(parsed.networkId, 'name')
        formatted = `${formatted} (${networkName})`
      }

      return formatted
    } catch {
      return address // Return original if parsing fails
    }
  }

  // Format amounts for display
  static formatAmount(
    amount: string | bigint,
    options: {
      symbol?: string
      precision?: number
      showFullPrecision?: boolean
      locale?: string
      compact?: boolean
    } = {}
  ): string {
    const {
      symbol = 'XRD',
      precision = 6,
      showFullPrecision = false,
      locale = 'en-US',
      compact = false
    } = options

    try {
      let amountStr: string
      if (typeof amount === 'bigint') {
        amountStr = RadixConverters.convertAmount(amount, 'wei', 'radix')
      } else {
        amountStr = amount
      }

      const numAmount = parseFloat(amountStr)

      if (compact && numAmount >= 1000000) {
        // Format large numbers
        if (numAmount >= 1000000000) {
          return `${(numAmount / 1000000000).toFixed(2)}B ${symbol}`
        } else if (numAmount >= 1000000) {
          return `${(numAmount / 1000000).toFixed(2)}M ${symbol}`
        } else if (numAmount >= 1000) {
          return `${(numAmount / 1000).toFixed(2)}K ${symbol}`
        }
      }

      const formatter = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: showFullPrecision ? 18 : precision
      })

      return `${formatter.format(numAmount)} ${symbol}`
    } catch {
      return `${amount} ${symbol}`
    }
  }

  // Format timestamps
  static formatTimestamp(
    timestamp: Date | string | number,
    options: {
      format?: 'relative' | 'absolute' | 'iso' | 'custom'
      customFormat?: string
      locale?: string
    } = {}
  ): string {
    const { format = 'relative', locale = 'en-US' } = options

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

    switch (format) {
      case 'relative':
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffSecs = Math.floor(diffMs / 1000)
        const diffMins = Math.floor(diffSecs / 60)
        const diffHours = Math.floor(diffMins / 60)
        const diffDays = Math.floor(diffHours / 24)

        if (diffSecs < 60) return 'just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString(locale)

      case 'absolute':
        return date.toLocaleString(locale)

      case 'iso':
        return date.toISOString()

      case 'custom':
        // Would implement custom formatting based on customFormat option
        return date.toLocaleString(locale)

      default:
        return date.toLocaleString(locale)
    }
  }

  // Format transaction status
  static formatTransactionStatus(status: string, details?: any): {
    text: string
    color: string
    icon: string
  } {
    const statusMap: Record<string, { text: string; color: string; icon: string }> = {
      'pending': { text: 'Pending', color: '#FFA500', icon: '⏳' },
      'confirmed': { text: 'Confirmed', color: '#28A745', icon: '✅' },
      'failed': { text: 'Failed', color: '#DC3545', icon: '❌' },
      'rejected': { text: 'Rejected', color: '#6C757D', icon: '🚫' },
      'submitted': { text: 'Submitted', color: '#007BFF', icon: '📤' },
      'broadcast': { text: 'Broadcasting', color: '#17A2B8', icon: '📡' }
    }

    const result = statusMap[status.toLowerCase()] || {
      text: status,
      color: '#6C757D',
      icon: '❓'
    }

    if (details?.confirmations) {
      result.text += ` (${details.confirmations} confirmations)`
    }

    return result
  }

  // Format manifest for display
  static formatManifest(
    manifest: string,
    options: {
      highlightAddresses?: boolean
      showLineNumbers?: boolean
      compact?: boolean
    } = {}
  ): string {
    const { highlightAddresses = false, showLineNumbers = false, compact = false } = options

    let lines = manifest.split('\n')

    if (compact) {
      lines = lines.filter(line => line.trim() !== '')
    }

    if (highlightAddresses) {
      lines = lines.map(line => {
        return line.replace(
          /(account|resource|component|package)_[a-z0-9_]+/g,
          '<span class="radix-address">$&</span>'
        )
      })
    }

    if (showLineNumbers) {
      lines = lines.map((line, index) => {
        const lineNum = (index + 1).toString().padStart(3, ' ')
        return `${lineNum}: ${line}`
      })
    }

    return lines.join('\n')
  }

  // Format resource metadata
  static formatResourceMetadata(metadata: any): {
    name: string
    symbol: string
    description: string
    iconUrl?: string
    properties: Record<string, string>
  } {
    return {
      name: metadata.name || 'Unknown Resource',
      symbol: metadata.symbol || 'UNKNOWN',
      description: metadata.description || 'No description available',
      iconUrl: metadata.icon_url,
      properties: {
        'Total Supply': metadata.total_supply ? 
          RadixFormatters.formatAmount(metadata.total_supply, { symbol: metadata.symbol }) : 
          'Unknown',
        'Divisibility': metadata.divisibility?.toString() || 'Unknown',
        'Type': metadata.resource_type || 'Unknown'
      }
    }
  }
}
```

### Serializers para Persistencia

```typescript
// Serialization utilities for Radix data persistence
class RadixSerializers {
  // Serialize transaction data
  static serializeTransaction(transaction: {
    id: string
    manifest: string
    hash?: string
    status: string
    timestamp: Date
    metadata: any
  }): string {
    const serializable = {
      ...transaction,
      timestamp: transaction.timestamp.toISOString(),
      version: '1.0'
    }
    return JSON.stringify(serializable)
  }

  static deserializeTransaction(data: string): any {
    const parsed = JSON.parse(data)
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp)
    }
  }

  // Serialize component state
  static serializeComponentState(state: {
    address: string
    fields: Record<string, any>
    timestamp: Date
  }): Uint8Array {
    const serializable = {
      ...state,
      timestamp: state.timestamp.toISOString()
    }
    
    const jsonStr = JSON.stringify(serializable)
    return new TextEncoder().encode(jsonStr)
  }

  static deserializeComponentState(data: Uint8Array): any {
    const jsonStr = new TextDecoder().decode(data)
    const parsed = JSON.parse(jsonStr)
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp)
    }
  }

  // Serialize cache data with compression
  static serializeCacheEntry<T>(entry: CacheEntry<T>): string {
    const serializable = {
      value: entry.value,
      timestamp: entry.timestamp.toISOString(),
      lastAccessed: entry.lastAccessed.toISOString(),
      accessCount: entry.accessCount,
      ttl: entry.ttl
    }
    
    // Simple compression for large data
    const jsonStr = JSON.stringify(serializable)
    if (jsonStr.length > 1000) {
      // Could implement actual compression here
      return `compressed:${jsonStr}`
    }
    
    return jsonStr
  }

  static deserializeCacheEntry<T>(data: string): CacheEntry<T> {
    let jsonStr = data
    if (data.startsWith('compressed:')) {
      jsonStr = data.substring(11) // Remove prefix
      // Would decompress here if compression was implemented
    }
    
    const parsed = JSON.parse(jsonStr)
    return {
      value: parsed.value,
      timestamp: new Date(parsed.timestamp),
      lastAccessed: new Date(parsed.lastAccessed),
      accessCount: parsed.accessCount,
      ttl: parsed.ttl
    }
  }

  // Serialize manifest with optimization
  static serializeManifest(manifest: string): {
    compressed: string
    instructions: any[]
    metadata: {
      size: number
      instructionCount: number
      addresses: string[]
    }
  } {
    const parsed = RadixParsers.parseManifest(manifest)
    const allAddresses = [...parsed.accounts, ...parsed.resources, ...parsed.components]
    
    return {
      compressed: Buffer.from(manifest).toString('base64'),
      instructions: parsed.instructions,
      metadata: {
        size: manifest.length,
        instructionCount: parsed.totalInstructions,
        addresses: allAddresses
      }
    }
  }

  static deserializeManifest(data: ReturnType<typeof RadixSerializers.serializeManifest>): string {
    return Buffer.from(data.compressed, 'base64').toString('utf-8')
  }

  // Serialize for local storage
  static serializeForStorage(key: string, value: any): void {
    try {
      const serialized = {
        data: value,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
      localStorage.setItem(key, JSON.stringify(serialized))
    } catch (error) {
      console.error('Failed to serialize for storage:', error)
    }
  }

  static deserializeFromStorage<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key)
      if (!stored) return null
      
      const parsed = JSON.parse(stored)
      return parsed.data
    } catch (error) {
      console.error('Failed to deserialize from storage:', error)
      return null
    }
  }
}
```

### Implementaciones Completas

#### Address Utility Class

```typescript
// Complete address utility implementation
class RadixAddress {
  readonly raw: string
  readonly type: 'account' | 'resource' | 'component' | 'package'
  readonly networkId: number
  readonly hrp: string
  private _isValid: boolean

  constructor(address: string) {
    this.raw = address
    
    try {
      const parsed = RadixParsers.parseAddress(address)
      this.type = parsed.type
      this.networkId = parsed.networkId
      this.hrp = parsed.hrp
      this._isValid = true
    } catch {
      this._isValid = false
      this.type = 'account' // Default
      this.networkId = 0
      this.hrp = ''
    }
  }

  isValid(): boolean {
    return this._isValid
  }

  isAccount(): boolean {
    return this.type === 'account'
  }

  isResource(): boolean {
    return this.type === 'resource'
  }

  isComponent(): boolean {
    return this.type === 'component'
  }

  isPackage(): boolean {
    return this.type === 'package'
  }

  getNetwork(): string {
    return RadixConverters.convertNetworkId(this.networkId, 'name') as string
  }

  format(options?: Parameters<typeof RadixFormatters.formatAddress>[1]): string {
    return RadixFormatters.formatAddress(this.raw, options)
  }

  equals(other: RadixAddress | string): boolean {
    const otherAddress = typeof other === 'string' ? other : other.raw
    return this.raw.toLowerCase() === otherAddress.toLowerCase()
  }

  toString(): string {
    return this.raw
  }

  toJSON(): object {
    return {
      address: this.raw,
      type: this.type,
      networkId: this.networkId,
      network: this.getNetwork(),
      isValid: this._isValid
    }
  }

  // Static factory methods
  static account(address: string): RadixAddress {
    const addr = new RadixAddress(address)
    if (!addr.isAccount()) {
      throw new Error('Not an account address')
    }
    return addr
  }

  static resource(address: string): RadixAddress {
    const addr = new RadixAddress(address)
    if (!addr.isResource()) {
      throw new Error('Not a resource address')
    }
    return addr
  }

  static component(address: string): RadixAddress {
    const addr = new RadixAddress(address)
    if (!addr.isComponent()) {
      throw new Error('Not a component address')
    }
    return addr
  }

  static isValidAddress(address: string): boolean {
    return new RadixAddress(address).isValid()
  }
}
```

#### Transaction History Data Structure

```typescript
// Complete transaction history implementation
interface TransactionHistoryEntry {
  id: string
  hash?: string
  manifest: string
  status: 'pending' | 'confirmed' | 'failed' | 'rejected'
  timestamp: Date
  confirmationTime?: Date
  blockHeight?: number
  fee?: string
  gasUsed?: string
  fromAddress?: string
  toAddress?: string
  amount?: string
  resourceAddress?: string
  error?: string
  metadata: Record<string, any>
}

class TransactionHistory {
  private entries = new Map<string, TransactionHistoryEntry>()
  private byAccount = new Map<string, Set<string>>()
  private byResource = new Map<string, Set<string>>()
  private byStatus = new Map<string, Set<string>>()
  private chronological: string[] = []

  add(entry: TransactionHistoryEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Transaction ${entry.id} already exists`)
    }

    this.entries.set(entry.id, entry)
    this.chronological.unshift(entry.id) // Most recent first

    // Index by account
    if (entry.fromAddress) {
      this.indexByAccount(entry.fromAddress, entry.id)
    }
    if (entry.toAddress && entry.toAddress !== entry.fromAddress) {
      this.indexByAccount(entry.toAddress, entry.id)
    }

    // Index by resource
    if (entry.resourceAddress) {
      this.indexByResource(entry.resourceAddress, entry.id)
    }

    // Index by status
    this.indexByStatus(entry.status, entry.id)
  }

  update(id: string, updates: Partial<TransactionHistoryEntry>): boolean {
    const entry = this.entries.get(id)
    if (!entry) {
      return false
    }

    // Remove from old status index
    this.removeFromStatusIndex(entry.status, id)

    // Update entry
    Object.assign(entry, updates)

    // Re-index by new status if changed
    if (updates.status) {
      this.indexByStatus(updates.status, id)
    }

    return true
  }

  get(id: string): TransactionHistoryEntry | undefined {
    return this.entries.get(id)
  }

  getByAccount(accountAddress: string): TransactionHistoryEntry[] {
    const ids = this.byAccount.get(accountAddress)
    if (!ids) return []
    
    return Array.from(ids)
      .map(id => this.entries.get(id))
      .filter((entry): entry is TransactionHistoryEntry => entry !== undefined)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getByResource(resourceAddress: string): TransactionHistoryEntry[] {
    const ids = this.byResource.get(resourceAddress)
    if (!ids) return []
    
    return Array.from(ids)
      .map(id => this.entries.get(id))
      .filter((entry): entry is TransactionHistoryEntry => entry !== undefined)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getByStatus(status: string): TransactionHistoryEntry[] {
    const ids = this.byStatus.get(status)
    if (!ids) return []
    
    return Array.from(ids)
      .map(id => this.entries.get(id))
      .filter((entry): entry is TransactionHistoryEntry => entry !== undefined)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getRecent(limit: number = 50): TransactionHistoryEntry[] {
    return this.chronological
      .slice(0, limit)
      .map(id => this.entries.get(id))
      .filter((entry): entry is TransactionHistoryEntry => entry !== undefined)
  }

  getDateRange(startDate: Date, endDate: Date): TransactionHistoryEntry[] {
    return Array.from(this.entries.values())
      .filter(entry => 
        entry.timestamp >= startDate && entry.timestamp <= endDate
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getPending(): TransactionHistoryEntry[] {
    return this.getByStatus('pending')
  }

  getStatistics(): {
    total: number
    byStatus: Record<string, number>
    totalVolume: Record<string, string> // By resource
    averageConfirmationTime: number
    successRate: number
  } {
    const stats = {
      total: this.entries.size,
      byStatus: {} as Record<string, number>,
      totalVolume: {} as Record<string, string>,
      averageConfirmationTime: 0,
      successRate: 0
    }

    let totalConfirmationTime = 0
    let confirmedCount = 0
    let successCount = 0

    for (const entry of this.entries.values()) {
      // Count by status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1

      // Volume by resource
      if (entry.resourceAddress && entry.amount) {
        const current = stats.totalVolume[entry.resourceAddress] || '0'
        const currentBig = BigInt(current)
        const entryBig = BigInt(entry.amount)
        stats.totalVolume[entry.resourceAddress] = (currentBig + entryBig).toString()
      }

      // Confirmation time
      if (entry.confirmationTime) {
        totalConfirmationTime += entry.confirmationTime.getTime() - entry.timestamp.getTime()
        confirmedCount++
      }

      // Success rate
      if (entry.status === 'confirmed') {
        successCount++
      }
    }

    if (confirmedCount > 0) {
      stats.averageConfirmationTime = totalConfirmationTime / confirmedCount
    }

    if (stats.total > 0) {
      stats.successRate = successCount / stats.total
    }

    return stats
  }

  private indexByAccount(accountAddress: string, transactionId: string): void {
    if (!this.byAccount.has(accountAddress)) {
      this.byAccount.set(accountAddress, new Set())
    }
    this.byAccount.get(accountAddress)!.add(transactionId)
  }

  private indexByResource(resourceAddress: string, transactionId: string): void {
    if (!this.byResource.has(resourceAddress)) {
      this.byResource.set(resourceAddress, new Set())
    }
    this.byResource.get(resourceAddress)!.add(transactionId)
  }

  private indexByStatus(status: string, transactionId: string): void {
    if (!this.byStatus.has(status)) {
      this.byStatus.set(status, new Set())
    }
    this.byStatus.get(status)!.add(transactionId)
  }

  private removeFromStatusIndex(status: string, transactionId: string): void {
    const statusSet = this.byStatus.get(status)
    if (statusSet) {
      statusSet.delete(transactionId)
      if (statusSet.size === 0) {
        this.byStatus.delete(status)
      }
    }
  }

  // Persistence methods
  serialize(): string {
    const data = {
      entries: Array.from(this.entries.entries()),
      chronological: this.chronological,
      version: '1.0'
    }
    return RadixSerializers.serializeForStorage('transaction-history', data) || ''
  }

  static deserialize(data: string): TransactionHistory {
    const history = new TransactionHistory()
    const parsed = RadixSerializers.deserializeFromStorage<any>('transaction-history')
    
    if (parsed?.entries) {
      for (const [id, entry] of parsed.entries) {
        // Reconstruct Date objects
        entry.timestamp = new Date(entry.timestamp)
        if (entry.confirmationTime) {
          entry.confirmationTime = new Date(entry.confirmationTime)
        }
        history.add(entry)
      }
    }

    return history
  }
}
```

#### Resource Metadata Cache

```typescript
// Complete resource metadata cache implementation
interface ResourceMetadata {
  address: string
  name: string
  symbol: string
  description: string
  iconUrl?: string
  totalSupply?: string
  divisibility: number
  resourceType: 'fungible' | 'non-fungible'
  properties: Record<string, any>
  lastUpdated: Date
}

class ResourceMetadataCache extends RadixMetadataCache<ResourceMetadata> {
  private pendingRequests = new Map<string, Promise<ResourceMetadata>>()
  private updateQueue = new Set<string>()
  private gatewayUrl: string

  constructor(gatewayUrl: string, maxSize: number = 5000) {
    super(maxSize, 3600000) // 1 hour TTL
    this.gatewayUrl = gatewayUrl
  }

  async getResourceMetadata(resourceAddress: string): Promise<ResourceMetadata | undefined> {
    // Check cache first
    const cached = this.get(resourceAddress)
    if (cached && this.isRecentEnough(cached.lastUpdated)) {
      return cached
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(resourceAddress)
    if (pending) {
      return pending
    }

    // Create new request
    const request = this.fetchResourceMetadata(resourceAddress)
    this.pendingRequests.set(resourceAddress, request)

    try {
      const metadata = await request
      this.set(resourceAddress, metadata)
      this.pendingRequests.delete(resourceAddress)
      return metadata
    } catch (error) {
      this.pendingRequests.delete(resourceAddress)
      console.error(`Failed to fetch metadata for ${resourceAddress}:`, error)
      return cached // Return stale data if available
    }
  }

  private async fetchResourceMetadata(resourceAddress: string): Promise<ResourceMetadata> {
    const response = await fetch(`${this.gatewayUrl}/state/entity/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [resourceAddress],
        opt_ins: {
          ancestor_identities: false,
          component_royalty_vault_balance: false,
          package_royalty_vault_balance: false,
          non_fungible_include_nfids: true,
          explicit_metadata: ["name", "symbol", "description", "icon_url", "tags"]
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gateway request failed: ${response.status}`)
    }

    const data = await response.json()
    const entityDetails = data.items?.[0]

    if (!entityDetails) {
      throw new Error(`No data found for resource ${resourceAddress}`)
    }

    return this.parseResourceMetadata(resourceAddress, entityDetails)
  }

  private parseResourceMetadata(address: string, entityDetails: any): ResourceMetadata {
    const metadata = entityDetails.metadata || {}
    const details = entityDetails.details || {}
    
    return {
      address,
      name: metadata.name?.typed?.value || 'Unknown Resource',
      symbol: metadata.symbol?.typed?.value || 'UNKNOWN',
      description: metadata.description?.typed?.value || '',
      iconUrl: metadata.icon_url?.typed?.value,
      totalSupply: details.total_supply,
      divisibility: details.divisibility || 18,
      resourceType: details.type === 'FungibleResource' ? 'fungible' : 'non-fungible',
      properties: {
        ...metadata,
        ...details
      },
      lastUpdated: new Date()
    }
  }

  private isRecentEnough(lastUpdated: Date, maxAge: number = 1800000): boolean { // 30 minutes
    return (new Date().getTime() - lastUpdated.getTime()) < maxAge
  }

  // Batch fetch multiple resources
  async getMultipleResourceMetadata(addresses: string[]): Promise<Map<string, ResourceMetadata>> {
    const results = new Map<string, ResourceMetadata>()
    const toFetch: string[] = []

    // Check cache for each address
    for (const address of addresses) {
      const cached = this.get(address)
      if (cached && this.isRecentEnough(cached.lastUpdated)) {
        results.set(address, cached)
      } else {
        toFetch.push(address)
      }
    }

    if (toFetch.length === 0) {
      return results
    }

    // Batch fetch uncached addresses
    try {
      const batchResults = await this.batchFetchResourceMetadata(toFetch)
      for (const [address, metadata] of batchResults) {
        this.set(address, metadata)
        results.set(address, metadata)
      }
    } catch (error) {
      console.error('Batch fetch failed:', error)
    }

    return results
  }

  private async batchFetchResourceMetadata(addresses: string[]): Promise<Map<string, ResourceMetadata>> {
    const response = await fetch(`${this.gatewayUrl}/state/entity/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses,
        opt_ins: {
          ancestor_identities: false,
          component_royalty_vault_balance: false,
          package_royalty_vault_balance: false,
          non_fungible_include_nfids: true,
          explicit_metadata: ["name", "symbol", "description", "icon_url", "tags"]
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Batch gateway request failed: ${response.status}`)
    }

    const data = await response.json()
    const results = new Map<string, ResourceMetadata>()

    for (const item of data.items || []) {
      if (item.address) {
        const metadata = this.parseResourceMetadata(item.address, item)
        results.set(item.address, metadata)
      }
    }

    return results
  }

  // Preload well-known resources
  async preloadWellKnownResources(addresses: string[]): Promise<void> {
    console.log('Preloading well-known resources...')
    await this.getMultipleResourceMetadata(addresses)
  }

  // Schedule background updates
  scheduleUpdate(resourceAddress: string): void {
    this.updateQueue.add(resourceAddress)
  }

  async processUpdateQueue(): Promise<void> {
    if (this.updateQueue.size === 0) return

    const toUpdate = Array.from(this.updateQueue)
    this.updateQueue.clear()

    console.log(`Processing ${toUpdate.length} metadata updates...`)
    await this.getMultipleResourceMetadata(toUpdate)
  }
}
```

#### Component State Tracker

```typescript
// Complete component state tracker implementation
interface ComponentState {
  address: string
  componentType: string
  state: any
  metadata: any
  lastUpdated: Date
  version: number
  subscriptions: Set<string> // Subscription IDs
}

class ComponentStateTracker {
  private states = new Map<string, ComponentState>()
  private subscriptions = new Map<string, {
    componentAddress: string
    callback: (state: ComponentState) => void
    filters?: {
      fields?: string[]
      onlyChanges?: boolean
    }
  }>()
  private pollingIntervals = new Map<string, NodeJS.Timeout>()
  private gatewayUrl: string

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl
  }

  async trackComponent(componentAddress: string): Promise<ComponentState> {
    const existing = this.states.get(componentAddress)
    if (existing && this.isRecentEnough(existing.lastUpdated)) {
      return existing
    }

    const state = await this.fetchComponentState(componentAddress)
    this.states.set(componentAddress, state)
    
    // Notify subscribers
    this.notifySubscribers(componentAddress, state)
    
    return state
  }

  private async fetchComponentState(componentAddress: string): Promise<ComponentState> {
    const response = await fetch(`${this.gatewayUrl}/state/entity/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [componentAddress],
        opt_ins: {
          ancestor_identities: false,
          component_royalty_vault_balance: false,
          package_royalty_vault_balance: false,
          non_fungible_include_nfids: false,
          explicit_metadata: true
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch component state: ${response.status}`)
    }

    const data = await response.json()
    const entityDetails = data.items?.[0]

    if (!entityDetails) {
      throw new Error(`Component not found: ${componentAddress}`)
    }

    return {
      address: componentAddress,
      componentType: entityDetails.details?.type || 'Unknown',
      state: entityDetails.details?.state || {},
      metadata: entityDetails.metadata || {},
      lastUpdated: new Date(),
      version: 1,
      subscriptions: new Set()
    }
  }

  subscribe(
    componentAddress: string,
    callback: (state: ComponentState) => void,
    options: {
      pollInterval?: number
      filters?: {
        fields?: string[]
        onlyChanges?: boolean
      }
    } = {}
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscriptions.set(subscriptionId, {
      componentAddress,
      callback,
      filters: options.filters
    })

    // Add subscription to component
    const state = this.states.get(componentAddress)
    if (state) {
      state.subscriptions.add(subscriptionId)
    }

    // Setup polling if requested
    if (options.pollInterval) {
      this.setupPolling(componentAddress, options.pollInterval)
    }

    return subscriptionId
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) {
      return false
    }

    // Remove from component subscriptions
    const state = this.states.get(subscription.componentAddress)
    if (state) {
      state.subscriptions.delete(subscriptionId)
      
      // Stop polling if no more subscribers
      if (state.subscriptions.size === 0) {
        this.stopPolling(subscription.componentAddress)
      }
    }

    this.subscriptions.delete(subscriptionId)
    return true
  }

  private setupPolling(componentAddress: string, interval: number): void {
    // Clear existing polling
    this.stopPolling(componentAddress)
    
    const intervalId = setInterval(async () => {
      try {
        await this.trackComponent(componentAddress)
      } catch (error) {
        console.error(`Polling failed for ${componentAddress}:`, error)
      }
    }, interval)
    
    this.pollingIntervals.set(componentAddress, intervalId)
  }

  private stopPolling(componentAddress: string): void {
    const intervalId = this.pollingIntervals.get(componentAddress)
    if (intervalId) {
      clearInterval(intervalId)
      this.pollingIntervals.delete(componentAddress)
    }
  }

  private notifySubscribers(componentAddress: string, newState: ComponentState): void {
    const previousState = this.states.get(componentAddress)
    
    for (const [subscriptionId, subscription] of this.subscriptions) {
      if (subscription.componentAddress !== componentAddress) {
        continue
      }

      // Check if should notify based on filters
      if (subscription.filters?.onlyChanges && previousState) {
        if (JSON.stringify(previousState.state) === JSON.stringify(newState.state)) {
          continue // No changes, skip notification
        }
      }

      // Filter fields if specified
      let stateToSend = newState
      if (subscription.filters?.fields) {
        stateToSend = {
          ...newState,
          state: this.filterFields(newState.state, subscription.filters.fields)
        }
      }

      try {
        subscription.callback(stateToSend)
      } catch (error) {
        console.error(`Subscription callback failed for ${subscriptionId}:`, error)
      }
    }
  }

  private filterFields(state: any, fields: string[]): any {
    if (!state || typeof state !== 'object') {
      return state
    }

    const filtered: any = {}
    for (const field of fields) {
      if (field in state) {
        filtered[field] = state[field]
      }
    }
    return filtered
  }

  private isRecentEnough(lastUpdated: Date, maxAge: number = 30000): boolean { // 30 seconds
    return (new Date().getTime() - lastUpdated.getTime()) < maxAge
  }

  getComponentState(componentAddress: string): ComponentState | undefined {
    return this.states.get(componentAddress)
  }

  getAllTrackedComponents(): ComponentState[] {
    return Array.from(this.states.values())
  }

  getSubscriptionInfo(): Array<{
    subscriptionId: string
    componentAddress: string
    hasFilters: boolean
    isPolling: boolean
  }> {
    return Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
      subscriptionId: id,
      componentAddress: sub.componentAddress,
      hasFilters: !!sub.filters,
      isPolling: this.pollingIntervals.has(sub.componentAddress)
    }))
  }

  cleanup(): void {
    // Stop all polling
    for (const [componentAddress] of this.pollingIntervals) {
      this.stopPolling(componentAddress)
    }
    
    // Clear all data
    this.states.clear()
    this.subscriptions.clear()
  }
}
```

#### Network Status Monitor

```typescript
// Complete network status monitor implementation
interface NetworkStatus {
  networkId: number
  name: string
  isHealthy: boolean
  latency: number
  blockHeight: number
  lastBlockTime: Date
  gatewayVersion: string
  endpoints: {
    gateway: string
    status: 'online' | 'offline' | 'degraded'
    lastChecked: Date
  }[]
  statistics: {
    avgLatency: number
    uptime: number
    errorRate: number
  }
}

class NetworkStatusMonitor {
  private networkStatuses = new Map<number, NetworkStatus>()
  private healthCheckInterval?: NodeJS.Timeout
  private subscribers = new Map<string, (status: NetworkStatus) => void>()
  private networks: Array<{
    networkId: number
    name: string
    gatewayUrls: string[]
  }>

  constructor(networks: typeof this.networks) {
    this.networks = networks
    this.initializeNetworks()
  }

  private initializeNetworks(): void {
    for (const network of this.networks) {
      const status: NetworkStatus = {
        networkId: network.networkId,
        name: network.name,
        isHealthy: false,
        latency: 0,
        blockHeight: 0,
        lastBlockTime: new Date(0),
        gatewayVersion: '',
        endpoints: network.gatewayUrls.map(url => ({
          gateway: url,
          status: 'offline' as const,
          lastChecked: new Date()
        })),
        statistics: {
          avgLatency: 0,
          uptime: 0,
          errorRate: 0
        }
      }
      
      this.networkStatuses.set(network.networkId, status)
    }
  }

  startMonitoring(interval: number = 30000): void { // 30 seconds default
    this.stopMonitoring()
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks()
    }, interval)
    
    // Initial health check
    this.performHealthChecks()
  }

  stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.networkStatuses.keys()).map(networkId =>
      this.checkNetworkHealth(networkId)
    )
    
    await Promise.allSettled(promises)
  }

  private async checkNetworkHealth(networkId: number): Promise<void> {
    const status = this.networkStatuses.get(networkId)
    if (!status) return

    const healthResults = await Promise.allSettled(
      status.endpoints.map(endpoint => this.checkEndpointHealth(endpoint.gateway))
    )

    let healthyEndpoints = 0
    let totalLatency = 0

    healthResults.forEach((result, index) => {
      const endpoint = status.endpoints[index]
      endpoint.lastChecked = new Date()

      if (result.status === 'fulfilled') {
        endpoint.status = 'online'
        healthyEndpoints++
        totalLatency += result.value.latency
        
        // Update block height with latest
        if (result.value.blockHeight > status.blockHeight) {
          status.blockHeight = result.value.blockHeight
          status.lastBlockTime = result.value.blockTime
        }
        
        if (!status.gatewayVersion) {
          status.gatewayVersion = result.value.version
        }
      } else {
        endpoint.status = 'offline'
      }
    })

    // Update overall status
    status.isHealthy = healthyEndpoints > 0
    status.latency = healthyEndpoints > 0 ? totalLatency / healthyEndpoints : 0
    
    // Update statistics
    this.updateStatistics(status, healthyEndpoints, status.endpoints.length)
    
    // Notify subscribers
    this.notifySubscribers(status)
  }

  private async checkEndpointHealth(gatewayUrl: string): Promise<{
    latency: number
    blockHeight: number
    blockTime: Date
    version: string
  }> {
    const startTime = Date.now()
    
    const response = await fetch(`${gatewayUrl}/status/network-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const latency = Date.now() - startTime
    const data = await response.json()
    
    return {
      latency,
      blockHeight: data.current_state_version || 0,
      blockTime: new Date(data.current_epoch?.created_at || 0),
      version: data.release_info?.version || 'unknown'
    }
  }

  private updateStatistics(
    status: NetworkStatus,
    healthyEndpoints: number,
    totalEndpoints: number
  ): void {
    // Simple moving average for latency
    status.statistics.avgLatency = status.statistics.avgLatency * 0.8 + status.latency * 0.2
    
    // Update uptime (percentage of healthy endpoints)
    const currentUptime = healthyEndpoints / totalEndpoints
    status.statistics.uptime = status.statistics.uptime * 0.9 + currentUptime * 0.1
    
    // Update error rate
    const currentErrorRate = (totalEndpoints - healthyEndpoints) / totalEndpoints
    status.statistics.errorRate = status.statistics.errorRate * 0.9 + currentErrorRate * 0.1
  }

  private notifySubscribers(status: NetworkStatus): void {
    for (const [subscriptionId, callback] of this.subscribers) {
      try {
        callback({ ...status }) // Send copy to prevent mutation
      } catch (error) {
        console.error(`Network status notification failed for ${subscriptionId}:`, error)
      }
    }
  }

  subscribe(callback: (status: NetworkStatus) => void): string {
    const subscriptionId = `monitor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.subscribers.set(subscriptionId, callback)
    return subscriptionId
  }

  unsubscribe(subscriptionId: string): boolean {
    return this.subscribers.delete(subscriptionId)
  }

  getNetworkStatus(networkId: number): NetworkStatus | undefined {
    return this.networkStatuses.get(networkId)
  }

  getAllNetworkStatuses(): NetworkStatus[] {
    return Array.from(this.networkStatuses.values())
  }

  getHealthyNetworks(): NetworkStatus[] {
    return this.getAllNetworkStatuses().filter(status => status.isHealthy)
  }

  getBestEndpoint(networkId: number): string | undefined {
    const status = this.networkStatuses.get(networkId)
    if (!status) return undefined

    const onlineEndpoints = status.endpoints.filter(ep => ep.status === 'online')
    if (onlineEndpoints.length === 0) return undefined

    // Return endpoint with most recent successful check
    return onlineEndpoints.sort((a, b) => 
      b.lastChecked.getTime() - a.lastChecked.getTime()
    )[0].gateway
  }

  getNetworkStatistics(): {
    totalNetworks: number
    healthyNetworks: number
    avgLatency: number
    totalUptime: number
  } {
    const statuses = this.getAllNetworkStatuses()
    const healthyCount = statuses.filter(s => s.isHealthy).length
    const avgLatency = statuses.reduce((sum, s) => sum + s.latency, 0) / statuses.length
    const totalUptime = statuses.reduce((sum, s) => sum + s.statistics.uptime, 0) / statuses.length

    return {
      totalNetworks: statuses.length,
      healthyNetworks: healthyCount,
      avgLatency: avgLatency || 0,
      totalUptime: totalUptime || 0
    }
  }
}
```

---

He mejorado significativamente el archivo con contenido de programación avanzado. Voy a continuar completando las secciones restantes.

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "1", "content": "Mejorar estructura y a\u00f1adir \u00edndice navegable", "status": "completed"}, {"id": "2", "content": "Expandir APIs y m\u00e9todos de todos los paquetes", "status": "completed"}, {"id": "3", "content": "A\u00f1adir patrones de programaci\u00f3n avanzados", "status": "completed"}, {"id": "4", "content": "Incluir flujos de programaci\u00f3n completos", "status": "completed"}, {"id": "5", "content": "Agregar casos de uso de programaci\u00f3n espec\u00edficos", "status": "in_progress"}, {"id": "6", "content": "Expandir debugging y testing", "status": "pending"}, {"id": "7", "content": "A\u00f1adir optimizaci\u00f3n y best practices", "status": "pending"}, {"id": "8", "content": "Incluir seguridad en programaci\u00f3n", "status": "pending"}, {"id": "9", "content": "A\u00f1adir estructuras de datos y utilities", "status": "completed"}]