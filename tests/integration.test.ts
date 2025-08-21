/**
 * Integration tests for Verification Helpers (Fase 4: Integration)
 * Pruebas end-to-end para validar la integración completa de los helpers
 * con la herramienta xrd_transaccion y el prompt transferir_xrd
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

describe('Integration Tests - Verification Helpers in xrd_transaccion', () => {
  let serverProcess: ChildProcess;
  let isServerReady = false;

  // Direcciones de prueba para Stokenet (direcciones reales de 69 caracteres)
  const TEST_ADDRESSES = {
    VALID_FROM: 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
    VALID_TO: 'account_tdx_2_12xvlee7xtg7dx599yv69tzkpeqztyznpej823f2txpqcfhm49gyvl',
    INVALID_FORMAT: 'account_rdx_invalid_format',
    INVALID_STOKENET: 'account_tdx_2_invalid',
    EMPTY: '',
    WITH_SPACES: 'account_tdx_2_ 1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxce'
  };

  const TEST_AMOUNTS = {
    VALID_SMALL: '0.1',
    VALID_NORMAL: '10',
    VALID_LARGE: '100',
    INVALID_ZERO: '0',
    INVALID_NEGATIVE: '-5',
    INVALID_TEXT: 'not_a_number',
    INVALID_EMPTY: ''
  };

  beforeAll(async () => {
    // Compilar el proyecto antes de ejecutar los tests
    await new Promise<void>((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        stdio: 'pipe',
        shell: true
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });

    // Iniciar el servidor
    serverProcess = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    // Esperar a que el servidor esté listo
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server startup timeout'));
      }, 10000);

      serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Simple MCP Server running on stdio')) {
          clearTimeout(timeout);
          isServerReady = true;
          resolve();
        }
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }, 15000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  /**
   * Helper para enviar mensajes JSON-RPC al servidor
   */
  const sendToolRequest = (toolName: string, arguments_obj: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!serverProcess || !isServerReady) {
        reject(new Error('Server not ready'));
        return;
      }

      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: arguments_obj
        }
      };

      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000); // 30 segundos para validaciones con API

      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        try {
          const response = JSON.parse(responseData.trim());
          clearTimeout(timeout);
          serverProcess.stdout?.removeListener('data', onData);
          resolve(response);
        } catch (e) {
          // Continuar acumulando datos si no es JSON válido aún
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
  };

  describe('xrd_transaccion tool with integrated validation', () => {
    it('should successfully validate correct addresses and sufficient balance', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL,
        message: 'Integration test transaction'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0]).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // Verificar que incluye validaciones exitosas
      expect(content).toContain('Validaciones completadas exitosamente');
      expect(content).toContain('Dirección de origen válida');
      expect(content).toContain('Dirección de destino válida');
      expect(content).toContain('Balance suficiente');
      
      // Verificar que incluye deep link (radix://...)
      expect(content).toMatch(/radix:\/\//);
    }, 35000);

    it('should reject invalid from address format', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.INVALID_FORMAT,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL,
        message: 'Test invalid from address'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain('Error en dirección de origen');
      expect(response.result.content[0].text).toContain('Mainnet');
      expect(response.result.content[0].text).toContain('account_tdx_2_');
    }, 15000);

    it('should reject invalid to address format', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.INVALID_STOKENET,
        amount: TEST_AMOUNTS.VALID_SMALL,
        message: 'Test invalid to address'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain('Error en dirección de destino');
      expect(response.result.content[0].text).toContain('caracteres');
    }, 15000);

    it('should handle addresses with spaces gracefully', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.WITH_SPACES,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL,
        message: 'Test spaces handling'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain('Error en dirección de origen');
      expect(response.result.content[0].text).toContain('espacios');
    }, 15000);

    it('should handle insufficient balance scenario', async () => {
      // Usar una cantidad muy grande para triggear balance insuficiente
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: '999999999', // Cantidad extremadamente grande
        message: 'Test insufficient balance'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // Verificar mensaje de balance insuficiente o error de validación
      expect(
        content.includes('Balance insuficiente') || 
        content.includes('Error verificando balance') ||
        content.includes('Error de validación')
      ).toBe(true);
    }, 35000);

    it('should handle invalid amount formats', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.INVALID_TEXT,
        message: 'Test invalid amount'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // Verificar que detecta cantidad inválida
      expect(
        content.includes('cantidad') || 
        content.includes('número') ||
        content.includes('Error de validación')
      ).toBe(true);
    }, 15000);

    it('should handle network errors gracefully', async () => {
      // Este test verifica que el sistema maneja errores de red sin romper la funcionalidad
      // Usar direcciones válidas pero en un escenario donde podría haber timeout
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_NORMAL,
        message: 'Test network resilience'
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // El sistema debe responder con algo, ya sea éxito o error graceful
      expect(content.length).toBeGreaterThan(0);
      
      // Si hay error de red, debe ser manejado gracefulmente
      if (content.includes('Error') || content.includes('Advertencia')) {
        expect(content).toContain('Recomendación');
        expect(content).not.toContain('undefined');
        expect(content).not.toContain('Error desconocido');
      }
    }, 35000);
  });

  describe('Backward compatibility', () => {
    it('should maintain original functionality when validations pass', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL
        // Sin mensaje opcional
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // Verificar que mantiene la funcionalidad original
      expect(content).toMatch(/radix:\/\//); // Deep link presente
      expect(content).toContain('Radix Wallet'); // Instrucciones de uso
    }, 35000);

    it('should handle optional message parameter correctly', async () => {
      const testMessage = 'Test message for integration';
      
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL,
        message: testMessage
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      // La funcionalidad original del mensaje debe mantenerse
      const content = response.result.content[0].text;
      expect(content.length).toBeGreaterThan(0);
    }, 35000);
  });

  describe('Error handling and user experience', () => {
    it('should provide helpful error messages in Spanish', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.INVALID_FORMAT,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      // Verificar mensajes en español
      expect(content).toMatch(/dirección|cantidad|balance|error/i);
      expect(content).toContain('💡'); // Icono de sugerencia
      expect(content).toContain('account_tdx_2_'); // Ayuda específica
    }, 15000);

    it('should include validation status in successful responses', async () => {
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL
      });

      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      
      const content = response.result.content[0].text;
      
      if (!content.includes('Error') && !content.includes('Advertencia')) {
        // En respuestas exitosas, debe incluir información de validación
        expect(content).toContain('Validaciones completadas');
        expect(content).toContain('Balance suficiente');
        expect(content).toContain('XRD');
      }
    }, 35000);
  });

  describe('Performance and responsiveness', () => {
    it('should respond within reasonable time even with API calls', async () => {
      const startTime = Date.now();
      
      const response = await sendToolRequest('xrd_transaccion', {
        fromAddress: TEST_ADDRESSES.VALID_FROM,
        toAddress: TEST_ADDRESSES.VALID_TO,
        amount: TEST_AMOUNTS.VALID_SMALL
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(30000); // Máximo 30 segundos
    }, 35000);

    it('should handle multiple validation requests efficiently', async () => {
      const requests = [
        sendToolRequest('xrd_transaccion', {
          fromAddress: TEST_ADDRESSES.VALID_FROM,
          toAddress: TEST_ADDRESSES.VALID_TO,
          amount: '1'
        }),
        sendToolRequest('xrd_transaccion', {
          fromAddress: TEST_ADDRESSES.INVALID_FORMAT,
          toAddress: TEST_ADDRESSES.VALID_TO,
          amount: '2'
        })
      ];

      const responses = await Promise.allSettled(requests);
      
      // Ambas requests deben completarse (exitosamente o con error manejado)
      expect(responses).toHaveLength(2);
      responses.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    }, 45000);
  });
});

/**
 * Integration tests for transferir_xrd prompt updates
 */
describe('Integration Tests - transferir_xrd prompt with validation info', () => {
  let serverProcess: ChildProcess;
  let isServerReady = false;

  beforeAll(async () => {
    // Reutilizar servidor si ya está corriendo, o iniciar nuevo
    if (!isServerReady) {
      serverProcess = spawn('node', ['build/index.js'], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Simple MCP Server running on stdio')) {
            clearTimeout(timeout);
            isServerReady = true;
            resolve();
          }
        });
      });
    }
  }, 15000);

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  it('should include validation information in prompt response', async () => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'prompts/get',
      params: {
        name: 'transferir_xrd',
        arguments: {
          fromAddress: 'account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql',
          toAddress: 'account_tdx_2_128evrrwfp8gj9240qq0m06ukhwaj2cmejluxxreanzjwq62hdkqlq',
          amount: '10',
          message: 'Test prompt'
        }
      }
    };

    const response = await new Promise((resolve, reject) => {
      let responseData = '';
      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

      const onData = (data: Buffer) => {
        responseData += data.toString();
        try {
          const parsed = JSON.parse(responseData.trim());
          clearTimeout(timeout);
          serverProcess.stdout?.removeListener('data', onData);
          resolve(parsed);
        } catch (e) {
          // Continuar acumulando
        }
      };

      serverProcess.stdout?.on('data', onData);
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    }) as any;

    expect(response).toBeDefined();
    expect(response.result).toBeDefined();
    expect(response.result.messages).toBeDefined();
    
    const content = response.result.messages[0].content.text;
    
    // Verificar que incluye información sobre validaciones automáticas
    expect(content).toContain('Validaciones Automáticas');
    expect(content).toContain('Validación de Direcciones');
    expect(content).toContain('Verificación de Balance');
    expect(content).toContain('Detección Temprana de Errores');
    expect(content).toContain('Beneficios de las Validaciones');
  }, 15000);
});