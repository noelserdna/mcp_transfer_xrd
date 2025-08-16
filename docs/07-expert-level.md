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
<parameter name="todos">[{"id": "1", "content": "Mejorar estructura y añadir índice navegable", "status": "completed"}, {"id": "2", "content": "Expandir APIs y métodos de todos los paquetes", "status": "completed"}, {"id": "3", "content": "Añadir patrones de programación avanzados", "status": "completed"}, {"id": "4", "content": "Incluir flujos de programación completos", "status": "completed"}, {"id": "5", "content": "Agregar casos de uso de programación específicos", "status": "in_progress"}, {"id": "6", "content": "Expandir debugging y testing", "status": "pending"}, {"id": "7", "content": "Añadir optimización y best practices", "status": "pending"}, {"id": "8", "content": "Incluir seguridad en programación", "status": "pending"}, {"id": "9", "content": "Añadir estructuras de datos y utilities", "status": "completed"}]