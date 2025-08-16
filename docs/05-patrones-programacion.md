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