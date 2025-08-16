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