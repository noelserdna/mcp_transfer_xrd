/**
 * Simple integration test to verify that validation integration is working
 */

import { describe, it, expect } from 'vitest';
import { AddressValidator } from '../src/helpers/address-validator.js';
import { BalanceChecker } from '../src/helpers/balance-checker.js';
import { RadixAPIHelper } from '../src/helpers/radix-api.js';

describe('Simple Integration Test - Verification Helpers', () => {
  it('should validate a correct Stokenet address', () => {
    const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
    
    const result = AddressValidator.validateAccountAddress(validAddress);
    
    expect(result.isValid).toBe(true);
    expect(result.isStokenet).toBe(true);
    expect(result.addressType).toBe('account');
  });

  it('should reject an invalid address format', () => {
    const invalidAddress = 'account_rdx_128xj7648c4thnt57c7fespy35cpq7c9x4r5p5g5xc44pkac';
    
    const result = AddressValidator.validateAccountAddress(invalidAddress);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Mainnet');
  });

  it('should detect address too short', () => {
    const shortAddress = 'account_tdx_2_short';
    
    const result = AddressValidator.validateAccountAddress(shortAddress);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('demasiado corta');
  });

  it('should initialize RadixAPIHelper correctly', () => {
    const apiHelper = new RadixAPIHelper();
    expect(apiHelper).toBeDefined();
    
    const stats = apiHelper.getCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.keys).toEqual([]);
  });

  it('should initialize BalanceChecker with RadixAPIHelper', () => {
    const apiHelper = new RadixAPIHelper();
    const balanceChecker = new BalanceChecker(apiHelper);
    
    expect(balanceChecker).toBeDefined();
  });

  it('should detect invalid amount format in BalanceChecker', async () => {
    const balanceChecker = new BalanceChecker();
    
    // Usar dirección válida con cantidad inválida
    const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
    const invalidAmount = 'not_a_number';
    
    const result = await balanceChecker.checkXRDBalance(validAddress, invalidAmount);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('número positivo válido');
  });

  it('should detect zero amount in BalanceChecker', async () => {
    const balanceChecker = new BalanceChecker();
    
    const validAddress = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
    const zeroAmount = '0';
    
    const result = await balanceChecker.checkXRDBalance(validAddress, zeroAmount);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('mayor que cero');
  });

  it('should handle invalid address in BalanceChecker', async () => {
    const balanceChecker = new BalanceChecker();
    
    const invalidAddress = 'invalid_address';
    const validAmount = '10';
    
    const result = await balanceChecker.checkXRDBalance(invalidAddress, validAmount);
    
    expect(result.isValid).toBe(false);
    expect(result.errorMessage).toContain('Dirección inválida');
  });
});