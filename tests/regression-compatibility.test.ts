/**
 * Regression and Compatibility Tests
 * Verifica que las nuevas funcionalidades no rompan características existentes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('Regression and Compatibility Tests', () => {
  let serverProcess: ChildProcess;
  const testTempDir = path.join(os.tmpdir(), 'test-regression');

  beforeEach(async () => {
    // Limpiar variables de entorno
    delete process.env.RADIX_QR_DIR;
    
    // Crear directorio temporal de prueba
    try {
      await fs.mkdir(testTempDir, { recursive: true });
    } catch (e) {
      // Directorio ya existe
    }
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => resolve());
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
    }
    
    // Limpiar directorio temporal
    try {
      await fs.rmdir(testTempDir, { recursive: true });
    } catch (e) {
      // Ignorar errores de limpieza
    }
  });

  async function startServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Construir primero
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: process.cwd(),
        shell: true,
        stdio: 'pipe'
      });

      buildProcess.on('close', (buildCode) => {
        if (buildCode !== 0) {
          reject(new Error(`Build failed with code ${buildCode}`));
          return;
        }

        // Iniciar servidor
        serverProcess = spawn('node', ['build/index.js'], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        const timeout = setTimeout(() => {
          reject(new Error('Server startup timeout'));
        }, 10000);

        serverProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          if (output.includes('Simple MCP Server running on stdio')) {
            clearTimeout(timeout);
            resolve();
          }
        });

        serverProcess.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    });
  }

  async function sendRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!serverProcess?.stdin) {
        reject(new Error('Server not ready'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const onData = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === request.id) {
            clearTimeout(timeout);
            serverProcess.stdout?.off('data', onData);
            resolve(response);
          }
        } catch (e) {
          // Ignorar líneas no JSON
        }
      };

      serverProcess.stdout?.on('data', onData);
      
      const requestStr = JSON.stringify(request) + '\n';
      serverProcess.stdin.write(requestStr);
    });
  }

  describe('Existing Tool Compatibility', () => {
    beforeEach(async () => {
      await startServer();
      
      // Inicializar servidor
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });
    });

    it('debería mantener funcionalidad de xrd_transaccion', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'xrd_transaccion',
          arguments: {
            fromAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            toAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            amount: '10',
            message: 'Test regression'
          }
        }
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('radixwallet://');
    });

    it('debería mantener funcionalidad de deeplink_to_qr', async () => {
      const deeplink = 'radixwallet://transaction?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=5&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      
      const request = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr',
          arguments: {
            deeplink: deeplink,
            formato: 'svg'
          }
        }
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('QR generado exitosamente');
    });

    it('debería mantener funcionalidad de deeplink_to_qr_local', async () => {
      const deeplink = 'radixwallet://transaction?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=5&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      
      const request = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr_local',
          arguments: {
            deeplink: deeplink,
            tamaño: 256,
            directorio: testTempDir
          }
        }
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('Archivo generado:');
    });

    it('debería listar todas las herramientas sin errores', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/list',
        params: {}
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBeGreaterThanOrEqual(6); // Al menos 6 herramientas
      
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      
      // Herramientas originales
      expect(toolNames).toContain('xrd_transaccion');
      expect(toolNames).toContain('deeplink_to_qr');
      expect(toolNames).toContain('deeplink_to_qr_local');
      
      // Nuevas herramientas roots
      expect(toolNames).toContain('list_allowed_directories');
      expect(toolNames).toContain('get_qr_directory_info');
      expect(toolNames).toContain('set_qr_directory');
    });
  });

  describe('Prompt Compatibility', () => {
    beforeEach(async () => {
      await startServer();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { prompts: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });
    });

    it('debería listar prompts existentes', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 20,
        method: 'prompts/list',
        params: {}
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.prompts).toBeInstanceOf(Array);
      
      const promptNames = response.result.prompts.map((prompt: any) => prompt.name);
      expect(promptNames).toContain('transferir_xrd');
    });

    it('debería ejecutar prompt transferir_xrd correctamente', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 21,
        method: 'prompts/get',
        params: {
          name: 'transferir_xrd',
          arguments: {}
        }
      };

      const response = await sendRequest(request);
      
      expect(response.result).toBeDefined();
      expect(response.result.messages).toBeInstanceOf(Array);
      expect(response.result.messages.length).toBeGreaterThan(0);
      
      const message = response.result.messages[0];
      expect(message.content).toBeDefined();
      expect(message.content.type).toBe('text');
      expect(message.content.text).toContain('transferencia XRD');
    });
  });

  describe('Configuration Backward Compatibility', () => {
    it('debería funcionar sin variables de entorno configuradas', async () => {
      // Asegurar que no hay variables de entorno
      delete process.env.RADIX_QR_DIR;
      
      await startServer();
      
      const initResponse = await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });

      expect(initResponse.result).toBeDefined();
      expect(initResponse.result.serverInfo.name).toBe('radix-stdio-server');
    });

    it('debería respetar variable de entorno RADIX_QR_DIR', async () => {
      // Configurar variable de entorno
      process.env.RADIX_QR_DIR = testTempDir;
      
      await startServer();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });

      const infoResponse = await sendRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'get_qr_directory_info',
          arguments: {}
        }
      });

      expect(infoResponse.result).toBeDefined();
      const content = infoResponse.result.content[0];
      expect(content.text).toContain(path.basename(testTempDir));
    });
  });

  describe('Error Handling Regression', () => {
    beforeEach(async () => {
      await startServer();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });
    });

    it('debería manejar argumentos inválidos en herramientas existentes', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 30,
        method: 'tools/call',
        params: {
          name: 'xrd_transaccion',
          arguments: {
            fromAddress: 'invalid_address',
            toAddress: 'invalid_address',
            amount: 'not_a_number'
          }
        }
      };

      const response = await sendRequest(request);
      
      // Debe responder sin crash, puede ser error o resultado con mensaje de error
      expect(response).toBeDefined();
      expect(response.error || response.result).toBeDefined();
    });

    it('debería manejar deeplink inválido en herramientas QR', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr',
          arguments: {
            deeplink: 'invalid://not-a-radix-deeplink'
          }
        }
      };

      const response = await sendRequest(request);
      
      expect(response).toBeDefined();
      // Debe manejar gracefully sin crash
      if (response.result) {
        const content = response.result.content[0];
        expect(content.text).toContain('Error') || expect(content.text).toContain('inválido');
      }
    });
  });

  describe('Performance Regression', () => {
    beforeEach(async () => {
      await startServer();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });
    });

    it('debería responder a tools/list rápidamente', async () => {
      const startTime = Date.now();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 40,
        method: 'tools/list',
        params: {}
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('debería generar QR local rápidamente', async () => {
      const deeplink = 'radixwallet://transaction?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=1&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      
      const startTime = Date.now();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 41,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr_local',
          arguments: {
            deeplink: deeplink,
            directorio: testTempDir
          }
        }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Máximo 3 segundos
    });

    it('debería manejar múltiples requests concurrentes', async () => {
      const requests = [];
      
      for (let i = 0; i < 3; i++) {
        requests.push(sendRequest({
          jsonrpc: '2.0',
          id: 50 + i,
          method: 'tools/call',
          params: {
            name: 'get_qr_directory_info',
            arguments: {}
          }
        }));
      }

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(responses.length).toBe(3);
      expect(duration).toBeLessThan(2000);
      
      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.id).toBe(50 + index);
      });
    });
  });

  describe('Data Format Consistency', () => {
    beforeEach(async () => {
      await startServer();
      
      await sendRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });
    });

    it('debería mantener formato de respuesta consistente para herramientas existentes', async () => {
      const xrdResponse = await sendRequest({
        jsonrpc: '2.0',
        id: 60,
        method: 'tools/call',
        params: {
          name: 'xrd_transaccion',
          arguments: {
            fromAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            toAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            amount: '1'
          }
        }
      });

      expect(xrdResponse.result.content).toBeInstanceOf(Array);
      expect(xrdResponse.result.content[0].type).toBe('text');
      expect(typeof xrdResponse.result.content[0].text).toBe('string');
    });

    it('debería usar formato consistente para nuevas herramientas roots', async () => {
      const rootsResponse = await sendRequest({
        jsonrpc: '2.0',
        id: 61,
        method: 'tools/call',
        params: {
          name: 'list_allowed_directories',
          arguments: {}
        }
      });

      expect(rootsResponse.result.content).toBeInstanceOf(Array);
      expect(rootsResponse.result.content[0].type).toBe('text');
      expect(typeof rootsResponse.result.content[0].text).toBe('string');
    });
  });
});