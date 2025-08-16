# 🌐 radix-web3.js

> Cliente Web3 de alto nivel para interacciones simplificadas con RadixDLT.

## Configuración del Cliente Web3

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

## Operaciones de Transacciones

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

## Consultas y Balance Management

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

## Utilidades y Helpers

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

## 📖 Navegación

- **Anterior:** [03-radix-connect.md](./03-radix-connect.md) - Conectividad con wallets
- **Siguiente:** [05-patrones-programacion.md](./05-patrones-programacion.md) - Patrones de programación
- **Índice:** [README.md](./README.md) - Volver al índice principal