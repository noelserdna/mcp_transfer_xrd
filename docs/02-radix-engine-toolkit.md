# 🔧 @radixdlt/radix-engine-toolkit

> Motor fundamental de RadixDLT para operaciones de bajo nivel, criptografía y construcción de transacciones.

## Inicialización y Configuración

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

## Gestión de Claves Criptográficas

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

## Construcción de Transacciones

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

## Manejo de Transacciones Complejas

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

## Utilidades de Conversión

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

## 📖 Navegación

- **Anterior:** [01-fundamentos.md](./01-fundamentos.md) - Fundamentos de RadixDLT
- **Siguiente:** [03-radix-connect.md](./03-radix-connect.md) - Conectividad con wallets
- **Índice:** [README.md](./README.md) - Volver al índice principal