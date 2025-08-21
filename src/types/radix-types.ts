/**
 * Tipos TypeScript para integración con Radix Gateway API
 * Basado en investigaciones/radix-gateway-api.md y balance-verification-methods.md
 */

import { Decimal } from 'decimal.js';

// Constantes de red
export const XRD_RESOURCE_ADDRESS = 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
export const STOKENET_NETWORK_ID = 'stokenet';

// Tipos de respuesta de Gateway API
export interface RadixGatewayResponse<T> {
  ledger_state: {
    network: string;
    state_version: number;
    proposer_round_timestamp: string;
  };
  items: T[];
}

export interface FungibleResource {
  resource_address: string;
  amount: string;
  last_updated_at_state_version: number;
}

export interface Token {
  resource_address: string;
  amount: string;
  symbol?: string;
  name?: string;
}

export interface AccountBalance {
  address: string;
  xrdBalance: string;
  otherTokens: Token[];
}

export interface AccountDetails {
  address: string;
  fungible_resources?: {
    total_count: number;
    items: FungibleResource[];
  };
}

// Tipos para validación
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export interface BalanceCheckResult extends ValidationResult {
  currentBalance?: string;
  requiredAmount?: string;
  hasEnoughBalance?: boolean;
}

export interface AddressValidationResult extends ValidationResult {
  addressType?: 'account' | 'resource' | 'component' | 'package';
  networkId?: string;
  isStokenet?: boolean;
}

// Tipos para manejo de errores
export enum ErrorType {
  NETWORK_ERROR = 'network',
  RATE_LIMIT = 'rate_limit',
  ENTITY_NOT_FOUND = 'not_found',
  INVALID_ADDRESS = 'invalid_address',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  INVALID_AMOUNT = 'invalid_amount',
  GATEWAY_ERROR = 'gateway_error',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown'
}

export interface RadixError {
  type: ErrorType;
  message: string;
  originalError?: any;
  retryable?: boolean;
}

// Tipos para cache
export interface CacheEntry {
  balance: string;
  timestamp: number;
  stateVersion: number;
  lastValidated: number;
}

export interface CacheConfig {
  ttl: number; // Time to live en segundos
  maxEntries: number;
  checkInterval: number; // Intervalo para limpiar cache en segundos
}

// Tipos para configuración de API
export interface RadixAPIConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
  cacheConfig: CacheConfig;
}

// Tipos para respuesta de Gateway API usando SDK oficial
export interface GatewayApiResponse<T> {
  isErr(): boolean;
  value: T;
  error?: string;
}

// Utilitarios para trabajo con decimales
export class DecimalUtils {
  static fromString(value: string): Decimal {
    return new Decimal(value);
  }

  static compare(a: string, b: string): number {
    return new Decimal(a).comparedTo(new Decimal(b));
  }

  static hasEnoughBalance(current: string, required: string): boolean {
    return DecimalUtils.compare(current, required) >= 0;
  }

  static formatXRD(amount: string): string {
    return new Decimal(amount).toFixed(2) + ' XRD';
  }

  static isValidAmount(amount: string): boolean {
    try {
      const decimal = new Decimal(amount);
      return decimal.isPositive() && decimal.isFinite();
    } catch {
      return false;
    }
  }
}

// Tipos para patrones de retry y backoff
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: RadixError;
  attempts: number;
}