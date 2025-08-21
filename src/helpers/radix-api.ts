/**
 * RadixAPIHelper - Cliente API para Radix Gateway usando SDK oficial
 * Implementación basada en investigaciones/radix-gateway-api.md
 * Usa @radixdlt/babylon-gateway-api-sdk para máxima confiabilidad
 */

// Importar solo tipos necesarios, usar HTTP directo como se recomienda en investigación
import axios, { AxiosInstance } from 'axios';
import {
  XRD_RESOURCE_ADDRESS,
  STOKENET_NETWORK_ID,
  ErrorType,
  RadixError,
  RetryConfig,
  RetryResult,
  CacheEntry,
  CacheConfig,
  AccountBalance,
  FungibleResource,
  ValidationResult,
  DecimalUtils
} from '../types/radix-types.js';

/**
 * Cliente API para interactuar con Radix Gateway usando el SDK oficial
 * Implementa manejo de errores, retry logic y caching inteligente
 */
export class RadixAPIHelper {
  private httpClient: AxiosInstance;
  private cache: Map<string, CacheEntry>;
  private lastStateVersion: number = 0;

  // Configuración por defecto basada en investigación
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1 segundo
    maxDelay: 8000,  // 8 segundos máximo
    exponentialBackoff: true
  };

  private readonly defaultCacheConfig: CacheConfig = {
    ttl: 15, // 15 segundos según recomendación de investigación
    maxEntries: 100,
    checkInterval: 60 // Limpiar cache cada minuto
  };

  constructor(config?: Partial<CacheConfig>) {
    // Usar HTTP directo como se recomienda en investigación para MCP servers
    this.httpClient = axios.create({
      baseURL: 'https://stokenet.radixdlt.com/',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: (status: number) => status < 500 // Manejar 4xx como respuestas válidas
    });

    // Configurar cache
    this.cache = new Map();
    if (config) {
      Object.assign(this.defaultCacheConfig, config);
    }

    // Configurar limpieza automática de cache
    this.startCacheCleanup();
  }

  /**
   * Obtiene el balance de XRD para una dirección específica
   * Implementa caching y retry logic según patrones de investigación
   */
  async getXRDBalance(address: string): Promise<string> {
    // Verificar cache primero
    const cachedBalance = this.getCachedBalance(address);
    if (cachedBalance) {
      return cachedBalance;
    }

    const result = await this.retryOperation(async () => {
      const requestBody = {
        addresses: [address],
        opt_ins: {
          fungibles: true,
          explicit_metadata: ["name", "symbol"]
        }
      };

      const response = await this.httpClient.post('/state/entity/details', requestBody);

      if (response.status !== 200) {
        throw this.createRadixError(
          ErrorType.GATEWAY_ERROR,
          `Error HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = response.data;
      const account = data.items?.[0];
      
      if (!account) {
        throw this.createRadixError(
          ErrorType.ENTITY_NOT_FOUND,
          `Cuenta no encontrada: ${address}`
        );
      }

      // Buscar el recurso XRD específicamente
      const xrdResource = account.fungible_resources?.items?.find(
        (resource: FungibleResource) => resource.resource_address === XRD_RESOURCE_ADDRESS
      );

      const balance = xrdResource?.amount || "0";

      // Guardar en cache usando state version para invalidación
      this.setCachedBalance(address, balance, data.ledger_state.state_version);

      return balance;
    });

    if (!result.success || !result.result) {
      throw result.error || this.createRadixError(
        ErrorType.NETWORK_ERROR,
        'Error obteniendo balance después de reintentos'
      );
    }

    return result.result;
  }

  /**
   * Valida si una dirección es válida para Stokenet
   * Usa el SDK oficial para validación nativa
   */
  async validateAddress(address: string): Promise<boolean> {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Validación básica de formato
    if (!address.startsWith('account_tdx_2_') || address.length < 60) {
      return false;
    }

    try {
      const requestBody = {
        addresses: [address],
        opt_ins: {
          fungibles: true
        }
      };

      const response = await this.httpClient.post('/state/entity/details', requestBody);
      
      // Si la respuesta es 200, la dirección es válida
      if (response.status === 200) {
        return true;
      }
      
      // Si es 404, la dirección está bien formada pero no existe
      if (response.status === 404) {
        return true;
      }
      
      return false;
    } catch (error: any) {
      // Si es error 404, la dirección es válida pero no existe
      if (error?.response?.status === 404) {
        return true;
      }
      return false;
    }
  }

  /**
   * Obtiene información completa de balance de una cuenta
   * Incluye XRD y otros tokens
   */
  async getAccountBalance(address: string): Promise<AccountBalance> {
    const result = await this.retryOperation(async () => {
      const requestBody = {
        addresses: [address],
        opt_ins: {
          fungibles: true,
          explicit_metadata: ["name", "symbol"]
        }
      };

      const response = await this.httpClient.post('/state/entity/details', requestBody);

      if (response.status !== 200) {
        throw this.createRadixError(
          ErrorType.GATEWAY_ERROR,
          `Error HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = response.data;
      const account = data.items?.[0];
      
      if (!account || !account.fungible_resources) {
        throw this.createRadixError(
          ErrorType.ENTITY_NOT_FOUND,
          `Cuenta no encontrada o sin recursos: ${address}`
        );
      }

      // Separar XRD de otros tokens
      let xrdBalance = "0";
      const otherTokens: FungibleResource[] = [];

      account.fungible_resources.items.forEach((resource: FungibleResource) => {
        if (resource.resource_address === XRD_RESOURCE_ADDRESS) {
          xrdBalance = resource.amount;
        } else {
          otherTokens.push(resource);
        }
      });

      return {
        address,
        xrdBalance,
        otherTokens: otherTokens.map(token => ({
          resource_address: token.resource_address,
          amount: token.amount,
          symbol: undefined, // Podrían obtenerse con metadata adicional
          name: undefined
        }))
      };
    });

    if (!result.success || !result.result) {
      throw result.error || this.createRadixError(
        ErrorType.NETWORK_ERROR,
        'Error obteniendo balance de cuenta después de reintentos'
      );
    }

    return result.result;
  }

  /**
   * Verifica si una cuenta tiene suficiente balance XRD para una transacción
   */
  async hasEnoughXRD(address: string, requiredAmount: string): Promise<ValidationResult> {
    try {
      // Validar que el amount sea un número válido
      if (!DecimalUtils.isValidAmount(requiredAmount)) {
        return {
          isValid: false,
          errorMessage: `Cantidad inválida: ${requiredAmount}`,
          errorCode: ErrorType.INVALID_AMOUNT
        };
      }

      const currentBalance = await this.getXRDBalance(address);
      const hasEnough = DecimalUtils.hasEnoughBalance(currentBalance, requiredAmount);

      return {
        isValid: hasEnough,
        errorMessage: hasEnough ? undefined : 
          `Balance insuficiente. Actual: ${DecimalUtils.formatXRD(currentBalance)}, Requerido: ${DecimalUtils.formatXRD(requiredAmount)}`,
        errorCode: hasEnough ? undefined : ErrorType.INSUFFICIENT_BALANCE
      };
    } catch (error) {
      return {
        isValid: false,
        errorMessage: `Error verificando balance: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        errorCode: ErrorType.GATEWAY_ERROR
      };
    }
  }

  /**
   * Obtiene el state version actual del ledger
   * Útil para invalidación de cache
   */
  async getCurrentStateVersion(): Promise<number> {
    try {
      const response = await this.httpClient.get('/status/current');
      
      if (response.status !== 200) {
        throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data.ledger_state.state_version;
    } catch (error) {
      throw this.createRadixError(
        ErrorType.NETWORK_ERROR,
        `Error obteniendo state version: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        error
      );
    }
  }

  /**
   * Implementa retry logic con backoff exponencial
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = this.defaultRetryConfig
  ): Promise<RetryResult<T>> {
    let lastError: RadixError | undefined;
    let attempts = 0;

    while (attempts < retryConfig.maxAttempts) {
      attempts++;
      
      try {
        const result = await operation();
        return {
          success: true,
          result,
          attempts
        };
      } catch (error) {
        lastError = error instanceof Error ? 
          this.createRadixError(ErrorType.UNKNOWN, error.message, error) :
          error as RadixError;

        // No reintentar para errores de dirección inválida
        if (lastError.type === ErrorType.INVALID_ADDRESS || 
            lastError.type === ErrorType.ENTITY_NOT_FOUND) {
          break;
        }

        // Calcular delay para el siguiente intento
        if (attempts < retryConfig.maxAttempts) {
          const delay = retryConfig.exponentialBackoff ?
            Math.min(retryConfig.baseDelay * Math.pow(2, attempts - 1), retryConfig.maxDelay) :
            retryConfig.baseDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts
    };
  }

  /**
   * Manejo de cache con invalidación por state version
   */
  private getCachedBalance(address: string): string | undefined {
    const entry = this.cache.get(address);
    if (!entry) {
      return undefined;
    }

    // Verificar si ha expirado por tiempo
    const now = Date.now();
    if (now - entry.timestamp > this.defaultCacheConfig.ttl * 1000) {
      this.cache.delete(address);
      return undefined;
    }

    return entry.balance;
  }

  private setCachedBalance(address: string, balance: string, stateVersion: number): void {
    // Actualizar el último state version conocido
    this.lastStateVersion = Math.max(this.lastStateVersion, stateVersion);

    this.cache.set(address, {
      balance,
      timestamp: Date.now(),
      stateVersion,
      lastValidated: Date.now()
    });

    // Limpiar cache si excede el máximo
    if (this.cache.size > this.defaultCacheConfig.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Invalida cache cuando detecta cambios en state version
   */
  private async invalidateCacheIfNeeded(): Promise<void> {
    try {
      const currentStateVersion = await this.getCurrentStateVersion();
      
      if (currentStateVersion > this.lastStateVersion) {
        this.cache.clear();
        this.lastStateVersion = currentStateVersion;
      }
    } catch (error) {
      // Error silencioso para no afectar operaciones principales
      console.warn('Error checking state version for cache invalidation:', error);
    }
  }

  /**
   * Inicia limpieza automática de cache
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const ttlMs = this.defaultCacheConfig.ttl * 1000;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > ttlMs) {
          this.cache.delete(key);
        }
      }

      // También verificar cambios en state version
      this.invalidateCacheIfNeeded().catch(() => {
        // Error silencioso
      });
    }, this.defaultCacheConfig.checkInterval * 1000);
  }

  /**
   * Helper para crear errores estructurados
   */
  private createRadixError(
    type: ErrorType,
    message: string,
    originalError?: any
  ): RadixError {
    return {
      type,
      message,
      originalError,
      retryable: [
        ErrorType.NETWORK_ERROR,
        ErrorType.RATE_LIMIT,
        ErrorType.TIMEOUT,
        ErrorType.GATEWAY_ERROR
      ].includes(type)
    };
  }

  /**
   * Limpia el cache manualmente
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtiene estadísticas del cache para debugging
   */
  public getCacheStats(): { size: number; lastStateVersion: number; keys: string[] } {
    return {
      size: this.cache.size,
      lastStateVersion: this.lastStateVersion,
      keys: Array.from(this.cache.keys())
    };
  }


}

// Instancia singleton para uso global
export const radixAPI = new RadixAPIHelper();