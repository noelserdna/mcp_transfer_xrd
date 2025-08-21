/**
 * BalanceChecker - Verificación de balances XRD usando RadixAPIHelper
 * Implementación basada en investigaciones/balance-verification-methods.md
 * Incluye estrategias de cache, manejo de errores y comparación decimal segura
 */

import { RadixAPIHelper } from './radix-api.js';
import { AddressValidator } from './address-validator.js';
import {
  BalanceCheckResult,
  ValidationResult,
  ErrorType,
  DecimalUtils,
  RadixError
} from '../types/radix-types.js';

/**
 * Checker de balances XRD con integración completa a RadixAPIHelper
 * Implementa cache strategy, validaciones previas y manejo robusto de errores
 */
export class BalanceChecker {
  private apiHelper: RadixAPIHelper;
  
  // Buffer mínimo para fees según investigación
  private static readonly DEFAULT_FEE_BUFFER = "0.01";
  
  // Configuración de timeouts según balance-verification-methods.md
  private static readonly VERIFICATION_TIMEOUT = 10000; // 10 segundos

  constructor(apiHelper?: RadixAPIHelper) {
    // Usar instancia proporcionada o crear nueva
    this.apiHelper = apiHelper || new RadixAPIHelper();
  }

  /**
   * Verifica si una dirección tiene suficiente balance XRD para una transacción
   * Método principal con validaciones completas y manejo de errores
   */
  async checkXRDBalance(
    address: string, 
    requiredAmount: string,
    options?: {
      includeFeeBuffer?: boolean;
      customBuffer?: string;
      useCache?: boolean;
      strict?: boolean;
    }
  ): Promise<BalanceCheckResult> {
    const config = {
      includeFeeBuffer: true,
      customBuffer: BalanceChecker.DEFAULT_FEE_BUFFER,
      useCache: true,
      strict: false,
      ...options
    };

    try {
      // Validación previa de dirección
      const addressValidation = AddressValidator.validateAccountAddress(address);
      if (!addressValidation.isValid) {
        return {
          isValid: false,
          errorMessage: `Dirección inválida: ${addressValidation.errorMessage}`,
          errorCode: ErrorType.INVALID_ADDRESS,
          currentBalance: undefined,
          requiredAmount,
          hasEnoughBalance: false
        };
      }

      // Validación de cantidad requerida
      const amountValidation = this.validateAmount(requiredAmount);
      if (!amountValidation.isValid) {
        return {
          isValid: false,
          errorMessage: amountValidation.errorMessage || 'Cantidad inválida',
          errorCode: ErrorType.INVALID_AMOUNT,
          currentBalance: undefined,
          requiredAmount,
          hasEnoughBalance: false
        };
      }

      // Obtener balance actual usando RadixAPIHelper
      const currentBalance = await this.getCurrentBalance(address);
      
      // Calcular cantidad total requerida (incluyendo buffer para fees)
      const totalRequired = config.includeFeeBuffer ? 
        DecimalUtils.fromString(requiredAmount).plus(DecimalUtils.fromString(config.customBuffer)).toString() :
        requiredAmount;

      // Comparación decimal segura
      const hasEnough = DecimalUtils.hasEnoughBalance(currentBalance, totalRequired);
      
      const result: BalanceCheckResult = {
        isValid: hasEnough,
        currentBalance,
        requiredAmount,
        hasEnoughBalance: hasEnough
      };

      // Generar mensaje de error específico si no hay suficiente balance
      if (!hasEnough) {
        const shortfall = DecimalUtils.fromString(totalRequired)
          .minus(DecimalUtils.fromString(currentBalance))
          .toString();

        result.errorMessage = this.generateInsufficientBalanceMessage(
          currentBalance, 
          requiredAmount, 
          totalRequired,
          shortfall,
          config.includeFeeBuffer
        );
        result.errorCode = ErrorType.INSUFFICIENT_BALANCE;
      }

      return result;

    } catch (error) {
      return this.handleBalanceCheckError(error, address, requiredAmount);
    }
  }

  /**
   * Verificación simple de balance (sin buffer de fees)
   * Para casos donde no se requiere la lógica completa
   */
  async hasEnoughXRD(address: string, requiredAmount: string): Promise<boolean> {
    try {
      const result = await this.checkXRDBalance(address, requiredAmount, {
        includeFeeBuffer: false,
        useCache: true,
        strict: false
      });
      
      return result.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verificación en tiempo real sin cache
   * Para validaciones finales críticas
   */
  async checkXRDBalanceRealTime(address: string, requiredAmount: string): Promise<BalanceCheckResult> {
    return this.checkXRDBalance(address, requiredAmount, {
      includeFeeBuffer: true,
      useCache: false,  // Forzar consulta fresca
      strict: true      // Validaciones más estrictas
    });
  }

  /**
   * Obtiene el balance actual usando RadixAPIHelper con manejo de errores
   */
  private async getCurrentBalance(address: string): Promise<string> {
    try {
      return await this.apiHelper.getXRDBalance(address);
    } catch (error) {
      // Si RadixAPIHelper lanza error estructurado, lo re-lanzamos
      if (error && typeof error === 'object' && 'type' in error) {
        throw error as RadixError;
      }
      
      // Detectar timeout en el mensaje de error
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      const isTimeout = errorMessage.toLowerCase().includes('timeout');
      
      // Error genérico, crear error estructurado
      throw {
        type: isTimeout ? ErrorType.TIMEOUT : ErrorType.NETWORK_ERROR,
        message: `Error obteniendo balance: ${errorMessage}`,
        originalError: error,
        retryable: true
      } as RadixError;
    }
  }

  /**
   * Validación de cantidad según patrones de DecimalUtils
   */
  private validateAmount(amount: string): ValidationResult {
    if (!amount || typeof amount !== 'string') {
      return {
        isValid: false,
        errorMessage: 'La cantidad no puede estar vacía',
        errorCode: ErrorType.INVALID_AMOUNT
      };
    }

    // Usar utilidad de DecimalUtils
    if (!DecimalUtils.isValidAmount(amount)) {
      return {
        isValid: false,
        errorMessage: 'La cantidad debe ser un número positivo válido',
        errorCode: ErrorType.INVALID_AMOUNT
      };
    }

    // Verificar que no sea cero
    if (DecimalUtils.compare(amount, "0") <= 0) {
      return {
        isValid: false,
        errorMessage: 'La cantidad debe ser mayor que cero',
        errorCode: ErrorType.INVALID_AMOUNT
      };
    }

    // Verificar límites razonables (máximo 1 billón XRD)
    if (DecimalUtils.compare(amount, "1000000000000") > 0) {
      return {
        isValid: false,
        errorMessage: 'La cantidad excede el límite máximo permitido',
        errorCode: ErrorType.INVALID_AMOUNT
      };
    }

    return { isValid: true };
  }

  /**
   * Genera mensaje de error específico para balance insuficiente
   */
  private generateInsufficientBalanceMessage(
    currentBalance: string,
    requestedAmount: string,
    totalRequired: string,
    shortfall: string,
    includesFeeBuffer: boolean
  ): string {
    const messages = [
      `❌ Balance insuficiente para completar la transacción`,
      ``,
      `💰 Balance actual: ${DecimalUtils.formatXRD(currentBalance)}`,
      `📤 Cantidad a transferir: ${DecimalUtils.formatXRD(requestedAmount)}`
    ];

    if (includesFeeBuffer) {
      messages.push(`⛽ Cantidad total (incluye fees): ${DecimalUtils.formatXRD(totalRequired)}`);
    }

    messages.push(
      `❌ Faltante: ${DecimalUtils.formatXRD(shortfall)}`,
      ``,
      `💡 Para completar esta transacción necesitas al menos ${DecimalUtils.formatXRD(totalRequired)}`
    );

    return messages.join('\n');
  }

  /**
   * Manejo centralizado de errores en verificación de balance
   */
  private handleBalanceCheckError(
    error: any, 
    address: string, 
    requiredAmount: string
  ): BalanceCheckResult {
    // Si es un RadixError estructurado, mantener información
    if (error && typeof error === 'object' && 'type' in error) {
      const radixError = error as RadixError;
      
      return {
        isValid: false,
        errorMessage: radixError.message,
        errorCode: radixError.type,
        currentBalance: undefined,
        requiredAmount,
        hasEnoughBalance: false
      };
    }

    // Error de red o timeout
    if (error instanceof Error) {
      const isTimeout = error.message.toLowerCase().includes('timeout');
      const isNetwork = error.message.toLowerCase().includes('network') || 
                       error.message.toLowerCase().includes('connect');

      return {
        isValid: false,
        errorMessage: isTimeout ? 
          'Timeout verificando balance. Intenta nuevamente en unos segundos.' :
          `Error de conexión: ${error.message}`,
        errorCode: isTimeout ? ErrorType.TIMEOUT : ErrorType.NETWORK_ERROR,
        currentBalance: undefined,
        requiredAmount,
        hasEnoughBalance: false
      };
    }

    // Error desconocido
    return {
      isValid: false,
      errorMessage: 'Error inesperado verificando el balance. Intenta nuevamente.',
      errorCode: ErrorType.UNKNOWN,
      currentBalance: undefined,
      requiredAmount,
      hasEnoughBalance: false
    };
  }

  /**
   * Verifica múltiples balances de forma eficiente
   * Útil para validaciones batch
   */
  async checkMultipleBalances(
    addresses: string[], 
    amounts: string[]
  ): Promise<BalanceCheckResult[]> {
    if (addresses.length !== amounts.length) {
      throw new Error('Las listas de direcciones y cantidades deben tener la misma longitud');
    }

    const results: Promise<BalanceCheckResult>[] = addresses.map((address, index) =>
      this.checkXRDBalance(address, amounts[index])
    );

    return Promise.all(results);
  }

  /**
   * Obtiene balance con formato amigable para mostrar al usuario
   */
  async getFormattedBalance(address: string): Promise<string> {
    try {
      const balance = await this.apiHelper.getXRDBalance(address);
      return DecimalUtils.formatXRD(balance);
    } catch (error) {
      return 'Error obteniendo balance';
    }
  }

  /**
   * Verifica si una dirección existe (tiene algún balance o actividad)
   */
  async addressExists(address: string): Promise<boolean> {
    try {
      // Si podemos obtener el balance, la dirección existe
      await this.apiHelper.getXRDBalance(address);
      return true;
    } catch (error) {
      // Si el error es ENTITY_NOT_FOUND, la dirección no existe
      if (error && typeof error === 'object' && 'type' in error) {
        const radixError = error as RadixError;
        return radixError.type !== ErrorType.ENTITY_NOT_FOUND;
      }
      return false;
    }
  }

  /**
   * Calcula la cantidad máxima transferible considerando fees
   */
  async getMaxTransferableAmount(address: string, feeBuffer?: string): Promise<string> {
    try {
      const currentBalance = await this.apiHelper.getXRDBalance(address);
      const buffer = feeBuffer || BalanceChecker.DEFAULT_FEE_BUFFER;
      
      const maxAmount = DecimalUtils.fromString(currentBalance)
        .minus(DecimalUtils.fromString(buffer));

      // Si el resultado es negativo, no hay cantidad transferible
      if (maxAmount.isNegative()) {
        return "0";
      }

      return maxAmount.toString();
    } catch (error) {
      return "0";
    }
  }

  /**
   * Limpia el cache del helper subyacente
   */
  clearCache(): void {
    this.apiHelper.clearCache();
  }

  /**
   * Obtiene estadísticas del cache para debugging
   */
  getCacheStats() {
    return this.apiHelper.getCacheStats();
  }
}