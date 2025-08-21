/**
 * Tests comprehensivos para AddressValidator y BalanceChecker
 * Basado en casos de las investigaciones y direcciones reales de Stokenet
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { AddressValidator } from '../src/helpers/address-validator.js';
import { BalanceChecker } from '../src/helpers/balance-checker.js';
import { RadixAPIHelper } from '../src/helpers/radix-api.js';
import { ErrorType } from '../src/types/radix-types.js';

describe('AddressValidator', () => {
  describe('validateRadixAddress', () => {
    test('debe validar direcciones de cuenta Stokenet válidas', () => {
      // Direcciones de ejemplo de Stokenet (formato correcto)
      const validAddresses = [
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        'account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpvh4jxjzckmgmhvaq'
      ];

      validAddresses.forEach(address => {
        const result = AddressValidator.validateRadixAddress(address);
        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
      });
    });

    test('debe rechazar direcciones de mainnet', () => {
      const mainnetAddress = 'account_rdx128y6j78mt0aqv6372evz28hrxp249mu6e3cfwm4vcgcv27t00qvj5hd';
      const result = AddressValidator.validateRadixAddress(mainnetAddress);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Mainnet');
      expect(result.errorMessage).toContain('account_tdx_2_');
      expect(result.errorCode).toBe(ErrorType.INVALID_ADDRESS);
    });

    test('debe rechazar direcciones con longitud incorrecta', () => {
      // Dirección con prefijo correcto pero muy corta (debería tener 69 caracteres total)
      const shortAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxce';
      const result = AddressValidator.validateRadixAddress(shortAddress);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('69 caracteres');
      expect(result.errorCode).toBe(ErrorType.INVALID_ADDRESS);
    });

    test('debe rechazar direcciones con caracteres inválidos', () => {
      // Dirección con caracteres que no están en el charset (ej: símbolos)
      const invalidCharsAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxce@!';
      const result = AddressValidator.validateRadixAddress(invalidCharsAddress);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('inválido');
      expect(result.errorCode).toBe(ErrorType.INVALID_ADDRESS);
    });

    test('debe manejar input vacío o null', () => {
      expect(AddressValidator.validateRadixAddress('').isValid).toBe(false);
      expect(AddressValidator.validateRadixAddress(null as any).isValid).toBe(false);
      expect(AddressValidator.validateRadixAddress(undefined as any).isValid).toBe(false);
    });

    test('debe normalizar direcciones con espacios', () => {
      const addressWithSpaces = ' account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql ';
      const result = AddressValidator.validateRadixAddress(addressWithSpaces);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateAccountAddress', () => {
    test('debe validar específicamente direcciones de cuenta', () => {
      const accountAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
      const result = AddressValidator.validateAccountAddress(accountAddress);
      
      expect(result.isValid).toBe(true);
      expect(result.addressType).toBe('account');
      expect(result.networkId).toBe('stokenet');
      expect(result.isStokenet).toBe(true);
    });

    test('debe rechazar direcciones de recurso', () => {
      const resourceAddress = 'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      const result = AddressValidator.validateAccountAddress(resourceAddress);
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('cuenta de Stokenet');
    });
  });

  describe('detectAddressType', () => {
    test('debe detectar tipos de dirección correctamente', () => {
      expect(AddressValidator.detectAddressType(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      )).toBe('account');

      expect(AddressValidator.detectAddressType(
        'resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc'
      )).toBe('resource');

      expect(AddressValidator.detectAddressType(
        'component_tdx_2_1cptxxxxxxxxxfeeflxxxxxxxxx02qqxvj7waxz0xxxxxxxxxzz8v2k'
      )).toBe('component');

      expect(AddressValidator.detectAddressType('invalid_address')).toBe('unknown');
    });
  });

  describe('detectNetwork', () => {
    test('debe detectar redes correctamente', () => {
      expect(AddressValidator.detectNetwork(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      )).toBe('stokenet');

      expect(AddressValidator.detectNetwork(
        'account_rdx128y6j78mt0aqv6372evz28hrxp249mu6e3cfwm4vcgcv27t00qvj5hd'
      )).toBe('mainnet');

      expect(AddressValidator.detectNetwork('invalid_address')).toBe('unknown');
    });
  });

  describe('suggestCorrection', () => {
    test('debe sugerir corrección para direcciones de mainnet', () => {
      const mainnetAddress = 'account_rdx128y6j78mt0aqv6372evz28hrxp249mu6e3cfwm4vcgcv27t00qvj5hd';
      const suggestion = AddressValidator.suggestCorrection(mainnetAddress);
      
      expect(suggestion).not.toBeNull();
      expect(suggestion).toContain('account_tdx_2_');
    });

    test('debe devolver null para direcciones que no necesitan corrección', () => {
      const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
      const suggestion = AddressValidator.suggestCorrection(validAddress);
      
      expect(suggestion).toBeNull();
    });
  });

  describe('validateQuickFormat', () => {
    test('debe realizar validación rápida para UX en tiempo real', () => {
      const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
      expect(AddressValidator.validateQuickFormat(validAddress)).toBe(true);

      const invalidAddress = 'account_rdx128y6j78mt0aqv6372evz28hrxp249mu6e3cfwm4vcgcv27t00qvj5hd';
      expect(AddressValidator.validateQuickFormat(invalidAddress)).toBe(false);
    });
  });
});

describe('BalanceChecker', () => {
  let balanceChecker: BalanceChecker;
  let mockApiHelper: vi.Mocked<RadixAPIHelper>;

  beforeEach(() => {
    // Mock del RadixAPIHelper
    mockApiHelper = {
      getXRDBalance: vi.fn(),
      validateAddress: vi.fn(),
      hasEnoughXRD: vi.fn(),
      clearCache: vi.fn(),
      getCacheStats: vi.fn()
    } as any;

    balanceChecker = new BalanceChecker(mockApiHelper);
  });

  describe('checkXRDBalance', () => {
    const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
    
    test('debe verificar balance suficiente con buffer de fees', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.50');
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '100.00');
      
      expect(result.isValid).toBe(true);
      expect(result.currentBalance).toBe('100.50');
      expect(result.requiredAmount).toBe('100.00');
      expect(result.hasEnoughBalance).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    test('debe detectar balance insuficiente', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('50.00');
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '100.00');
      
      expect(result.isValid).toBe(false);
      expect(result.hasEnoughBalance).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INSUFFICIENT_BALANCE);
      expect(result.errorMessage).toContain('Balance insuficiente');
      expect(result.errorMessage).toContain('50.00 XRD');
      expect(result.errorMessage).toContain('100.00 XRD');
    });

    test('debe manejar direcciones inválidas', async () => {
      const invalidAddress = 'invalid_address';
      
      const result = await balanceChecker.checkXRDBalance(invalidAddress, '10.00');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_ADDRESS);
      expect(result.errorMessage).toContain('Dirección inválida');
    });

    test('debe manejar cantidades inválidas', async () => {
      const result = await balanceChecker.checkXRDBalance(validAddress, 'invalid_amount');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_AMOUNT);
      expect(result.errorMessage).toContain('número positivo válido');
    });

    test('debe rechazar cantidades negativas', async () => {
      const result = await balanceChecker.checkXRDBalance(validAddress, '-10.00');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_AMOUNT);
      expect(result.errorMessage).toContain('número positivo válido');
    });

    test('debe rechazar cantidades cero', async () => {
      const result = await balanceChecker.checkXRDBalance(validAddress, '0');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_AMOUNT);
    });

    test('debe manejar errores de red del API', async () => {
      mockApiHelper.getXRDBalance.mockRejectedValue({
        type: ErrorType.NETWORK_ERROR,
        message: 'Error de conexión',
        retryable: true
      });
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '10.00');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.NETWORK_ERROR);
      expect(result.errorMessage).toContain('Error de conexión');
    });

    test('debe manejar timeouts', async () => {
      mockApiHelper.getXRDBalance.mockRejectedValue(new Error('Request timeout occurred'));
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '10.00');
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.TIMEOUT);
      expect(result.errorMessage).toContain('timeout');
    });

    test('debe funcionar sin buffer de fees cuando se especifica', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.00');
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '100.00', {
        includeFeeBuffer: false
      });
      
      expect(result.isValid).toBe(true);
      expect(result.hasEnoughBalance).toBe(true);
    });

    test('debe usar buffer personalizado cuando se especifica', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.05');
      
      const result = await balanceChecker.checkXRDBalance(validAddress, '100.00', {
        includeFeeBuffer: true,
        customBuffer: '0.10'  // Buffer más alto
      });
      
      expect(result.isValid).toBe(false); // 100.05 < 100.00 + 0.10
      expect(result.hasEnoughBalance).toBe(false);
    });
  });

  describe('hasEnoughXRD', () => {
    test('debe devolver true para balance suficiente', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.00');
      
      const result = await balanceChecker.hasEnoughXRD(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '50.00'
      );
      
      expect(result).toBe(true);
    });

    test('debe devolver false para errores', async () => {
      mockApiHelper.getXRDBalance.mockRejectedValue(new Error('Network error'));
      
      const result = await balanceChecker.hasEnoughXRD(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '50.00'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('checkXRDBalanceRealTime', () => {
    test('debe realizar verificación sin cache', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.00');
      
      const result = await balanceChecker.checkXRDBalanceRealTime(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '50.00'
      );
      
      expect(result.isValid).toBe(true);
      expect(mockApiHelper.getXRDBalance).toHaveBeenCalled();
    });
  });

  describe('getMaxTransferableAmount', () => {
    test('debe calcular cantidad máxima transferible', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.00');
      
      const maxAmount = await balanceChecker.getMaxTransferableAmount(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      );
      
      expect(maxAmount).toBe('99.99'); // 100.00 - 0.01 (default buffer)
    });

    test('debe devolver cero si el balance es menor que el buffer', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('0.005');
      
      const maxAmount = await balanceChecker.getMaxTransferableAmount(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      );
      
      expect(maxAmount).toBe('0');
    });

    test('debe manejar errores devolviendo cero', async () => {
      mockApiHelper.getXRDBalance.mockRejectedValue(new Error('Network error'));
      
      const maxAmount = await balanceChecker.getMaxTransferableAmount(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      );
      
      expect(maxAmount).toBe('0');
    });
  });

  describe('getFormattedBalance', () => {
    test('debe devolver balance formateado', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.123456');
      
      const formatted = await balanceChecker.getFormattedBalance(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      );
      
      expect(formatted).toBe('100.12 XRD');
    });

    test('debe manejar errores', async () => {
      mockApiHelper.getXRDBalance.mockRejectedValue(new Error('Network error'));
      
      const formatted = await balanceChecker.getFormattedBalance(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'
      );
      
      expect(formatted).toBe('Error obteniendo balance');
    });
  });

  describe('checkMultipleBalances', () => {
    test('debe verificar múltiples balances', async () => {
      mockApiHelper.getXRDBalance
        .mockResolvedValueOnce('100.00')
        .mockResolvedValueOnce('50.00');
      
      const addresses = [
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        'account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqzn4wr2nlcqcpvh4jxjzckmgmhvaq'
      ];
      const amounts = ['50.00', '60.00'];
      
      const results = await balanceChecker.checkMultipleBalances(addresses, amounts);
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);  // 100.00 >= 50.00 + 0.01
      expect(results[1].isValid).toBe(false); // 50.00 < 60.00 + 0.01
    });

    test('debe manejar listas de diferente longitud', async () => {
      const addresses = ['account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql'];
      const amounts = ['50.00', '60.00'];
      
      await expect(balanceChecker.checkMultipleBalances(addresses, amounts))
        .rejects
        .toThrow('misma longitud');
    });
  });

  describe('casos edge', () => {
    test('debe manejar balance exactamente igual al monto requerido sin buffer', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('100.00');
      
      const result = await balanceChecker.checkXRDBalance(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '100.00',
        { includeFeeBuffer: false }
      );
      
      expect(result.isValid).toBe(true);
    });

    test('debe manejar balance cero', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('0');
      
      const result = await balanceChecker.checkXRDBalance(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '1.00'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.currentBalance).toBe('0');
    });

    test('debe manejar cantidades decimales muy pequeñas', async () => {
      mockApiHelper.getXRDBalance.mockResolvedValue('0.001');
      
      const result = await balanceChecker.checkXRDBalance(
        'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
        '0.0001',
        { includeFeeBuffer: false }
      );
      
      expect(result.isValid).toBe(true);
    });
  });
});