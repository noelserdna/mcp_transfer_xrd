# 🟢 Fundamentos de RadixDLT

> Conceptos básicos, instalación y setup para comenzar con el desarrollo en RadixDLT.

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

## 📖 Navegación

- **Siguiente:** [02-radix-engine-toolkit.md](./02-radix-engine-toolkit.md) - APIs del motor fundamental
- **Índice:** [README.md](./README.md) - Volver al índice principal