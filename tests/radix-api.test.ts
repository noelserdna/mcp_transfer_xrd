/**
 * Tests unitarios para RadixAPIHelper
 * Basado en patrones de investigación y ejemplos de repositorios oficiales
 */

import { describe, it, expect, beforeAll, afterEach, vi, Mock } from 'vitest';
import axios from 'axios';
import { RadixAPIHelper } from '../src/helpers/radix-api.js';
import { XRD_RESOURCE_ADDRESS, ErrorType } from '../src/types/radix-types.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('RadixAPIHelper', () => {
  let radixAPI: RadixAPIHelper;
  
  // Direcciones de prueba basadas en ejemplos de investigación
  const VALID_STOKENET_ADDRESS = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql';
  const INVALID_ADDRESS = 'invalid_address';
  const NONEXISTENT_ADDRESS = 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxcNOT';

  beforeAll(() => {
    // Mock axios.create para devolver un objeto con métodos post y get
    const mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn()
    };
    
    (mockedAxios.create as Mock).mockReturnValue(mockAxiosInstance);
    
    radixAPI = new RadixAPIHelper();
  });

  afterEach(() => {
    vi.clearAllMocks();
    radixAPI.clearCache();
  });

  describe('getXRDBalance', () => {
    it('debería devolver balance XRD para cuenta válida', async () => {
      const mockResponse = {
        status: 200,
        data: {
          ledger_state: {
            network: "stokenet",
            state_version: 12345678,
            proposer_round_timestamp: "2025-08-21T10:30:00.000Z"
          },
          items: [
            {
              address: VALID_STOKENET_ADDRESS,
              fungible_resources: {
                total_count: 1,
                items: [
                  {
                    resource_address: XRD_RESOURCE_ADDRESS,
                    amount: "1000.5",
                    last_updated_at_state_version: 12345677
                  }
                ]
              }
            }
          ]
        }
      };

      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue(mockResponse);

      const balance = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      expect(balance).toBe("1000.5");
      expect(mockPost).toHaveBeenCalledWith('/state/entity/details', {
        network_identifier: { network: "stokenet" },
        entity_identifier: { address: VALID_STOKENET_ADDRESS },
        opt_ins: {
          fungible_resources: true,
          explicit_metadata: ["name", "symbol"]
        }
      });
    });

    it('debería devolver "0" para cuenta sin XRD', async () => {
      const mockResponse = {
        status: 200,
        data: {
          ledger_state: {
            network: "stokenet",
            state_version: 12345678,
            proposer_round_timestamp: "2025-08-21T10:30:00.000Z"
          },
          items: [
            {
              address: VALID_STOKENET_ADDRESS,
              fungible_resources: {
                total_count: 0,
                items: []
              }
            }
          ]
        }
      };

      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue(mockResponse);

      const balance = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      expect(balance).toBe("0");
    });

    it('debería usar cache para llamadas repetidas', async () => {
      const mockResponse = {
        status: 200,
        data: {
          ledger_state: {
            network: "stokenet",
            state_version: 12345678,
            proposer_round_timestamp: "2025-08-21T10:30:00.000Z"
          },
          items: [
            {
              address: VALID_STOKENET_ADDRESS,
              fungible_resources: {
                total_count: 1,
                items: [
                  {
                    resource_address: XRD_RESOURCE_ADDRESS,
                    amount: "500.25",
                    last_updated_at_state_version: 12345677
                  }
                ]
              }
            }
          ]
        }
      };

      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue(mockResponse);

      // Primera llamada
      const balance1 = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      // Segunda llamada inmediata (debería usar cache)
      const balance2 = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      expect(balance1).toBe("500.25");
      expect(balance2).toBe("500.25");
      expect(mockPost).toHaveBeenCalledTimes(1); // Solo una llamada HTTP
    });

    it('debería lanzar error para cuenta no encontrada', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockRejectedValue({
        response: { status: 404, statusText: 'Not Found' }
      });

      await expect(radixAPI.getXRDBalance(NONEXISTENT_ADDRESS))
        .rejects.toThrow();
    });

    it('debería reintentar para errores de red temporales', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      
      // Primera llamada falla, segunda es exitosa
      mockPost
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          status: 200,
          data: {
            ledger_state: { network: "stokenet", state_version: 12345678 },
            items: [{
              address: VALID_STOKENET_ADDRESS,
              fungible_resources: {
                items: [{ resource_address: XRD_RESOURCE_ADDRESS, amount: "100.0" }]
              }
            }]
          }
        });

      const balance = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      expect(balance).toBe("100.0");
      expect(mockPost).toHaveBeenCalledTimes(2); // Reintentos funcionando
    });
  });

  describe('validateAddress', () => {
    it('debería validar direcciones con formato correcto', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({ status: 200, data: {} });

      const isValid = await radixAPI.validateAddress(VALID_STOKENET_ADDRESS);
      
      expect(isValid).toBe(true);
    });

    it('debería rechazar direcciones con formato incorrecto', async () => {
      const isValid = await radixAPI.validateAddress(INVALID_ADDRESS);
      
      expect(isValid).toBe(false);
    });

    it('debería aceptar direcciones válidas pero no existentes (404)', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockRejectedValue({
        response: { status: 404, statusText: 'Not Found' }
      });

      const isValid = await radixAPI.validateAddress(NONEXISTENT_ADDRESS);
      
      expect(isValid).toBe(true); // Formato válido aunque no exista
    });

    it('debería rechazar direcciones vacías o nulas', async () => {
      expect(await radixAPI.validateAddress('')).toBe(false);
      expect(await radixAPI.validateAddress(' ')).toBe(false);
    });
  });

  describe('hasEnoughXRD', () => {
    it('debería validar balance suficiente', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({
        status: 200,
        data: {
          ledger_state: { network: "stokenet", state_version: 12345678 },
          items: [{
            address: VALID_STOKENET_ADDRESS,
            fungible_resources: {
              items: [{ resource_address: XRD_RESOURCE_ADDRESS, amount: "1000.0" }]
            }
          }]
        }
      });

      const result = await radixAPI.hasEnoughXRD(VALID_STOKENET_ADDRESS, "500.0");
      
      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('debería detectar balance insuficiente', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({
        status: 200,
        data: {
          ledger_state: { network: "stokenet", state_version: 12345678 },
          items: [{
            address: VALID_STOKENET_ADDRESS,
            fungible_resources: {
              items: [{ resource_address: XRD_RESOURCE_ADDRESS, amount: "100.0" }]
            }
          }]
        }
      });

      const result = await radixAPI.hasEnoughXRD(VALID_STOKENET_ADDRESS, "500.0");
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Balance insuficiente');
      expect(result.errorCode).toBe(ErrorType.INSUFFICIENT_BALANCE);
    });

    it('debería validar formato de cantidad', async () => {
      const result = await radixAPI.hasEnoughXRD(VALID_STOKENET_ADDRESS, "invalid_amount");
      
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(ErrorType.INVALID_AMOUNT);
    });
  });

  describe('getCurrentStateVersion', () => {
    it('debería obtener state version actual', async () => {
      const mockGet = radixAPI['httpClient'].get as Mock;
      mockGet.mockResolvedValue({
        status: 200,
        data: {
          ledger_state: {
            network: "stokenet",
            state_version: 12345678,
            proposer_round_timestamp: "2025-08-21T10:30:00.000Z"
          }
        }
      });

      const stateVersion = await radixAPI.getCurrentStateVersion();
      
      expect(stateVersion).toBe(12345678);
      expect(mockGet).toHaveBeenCalledWith('/status/current');
    });

    it('debería manejar errores de red', async () => {
      const mockGet = radixAPI['httpClient'].get as Mock;
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(radixAPI.getCurrentStateVersion())
        .rejects.toThrow();
    });
  });

  describe('Cache Management', () => {
    it('debería proporcionar estadísticas de cache', () => {
      const stats = radixAPI.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('lastStateVersion');
      expect(stats).toHaveProperty('keys');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('debería limpiar cache correctamente', () => {
      radixAPI.clearCache();
      const stats = radixAPI.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('debería manejar errores HTTP específicos', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS))
        .rejects.toThrow();
    });

    it('debería manejar timeouts de red', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      });

      await expect(radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS))
        .rejects.toThrow();
    });
  });

  describe('Integration with Real Data Patterns', () => {
    it('debería manejar respuestas vacías correctamente', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({
        status: 200,
        data: {
          ledger_state: { network: "stokenet", state_version: 12345678 },
          items: []
        }
      });

      await expect(radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS))
        .rejects.toThrow();
    });

    it('debería manejar múltiples recursos fungibles', async () => {
      const mockPost = radixAPI['httpClient'].post as Mock;
      mockPost.mockResolvedValue({
        status: 200,
        data: {
          ledger_state: { network: "stokenet", state_version: 12345678 },
          items: [{
            address: VALID_STOKENET_ADDRESS,
            fungible_resources: {
              items: [
                { resource_address: XRD_RESOURCE_ADDRESS, amount: "250.75" },
                { resource_address: "resource_tdx_2_other_token", amount: "100.0" }
              ]
            }
          }]
        }
      });

      const balance = await radixAPI.getXRDBalance(VALID_STOKENET_ADDRESS);
      
      expect(balance).toBe("250.75");
    });
  });
});