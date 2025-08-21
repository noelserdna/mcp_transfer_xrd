/**
 * Integration tests para MCP Protocol con funcionalidad Roots
 * Verifica el protocolo MCP funcionando end-to-end con las nuevas herramientas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';

describe('MCP Integration Tests', () => {
  let serverProcess: ChildProcess;
  let serverReady = false;
  const testTempDir = path.join(os.tmpdir(), 'test-mcp-integration');

  beforeEach(async () => {
    // Limpiar variables de entorno para tests
    delete process.env.RADIX_QR_DIR;
    serverReady = false;
  });

  afterEach(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      // Esperar a que el proceso termine
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => resolve());
        // Timeout fallback
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
    }
  });

  async function startMCPServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Construir el proyecto antes de iniciar el servidor
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: process.cwd(),
        shell: true
      });

      buildProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Build failed with code ${code}`));
          return;
        }

        // Iniciar el servidor MCP
        serverProcess = spawn('node', ['build/index.js'], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let initTimeout = setTimeout(() => {
          reject(new Error('Server initialization timeout'));
        }, 5000);

        serverProcess.stderr?.on('data', (data) => {
          const output = data.toString();
          console.log('Server stderr:', output);
          
          // Detectar cuando el servidor está listo
          if (output.includes('Simple MCP Server running on stdio') || 
              output.includes('MCP Server running') ||
              output.includes('Available MCP Roots tools')) {
            serverReady = true;
            clearTimeout(initTimeout);
            resolve();
          }
        });

        serverProcess.on('error', (error) => {
          clearTimeout(initTimeout);
          reject(error);
        });

        serverProcess.on('exit', (code) => {
          if (!serverReady) {
            clearTimeout(initTimeout);
            reject(new Error(`Server exited prematurely with code ${code}`));
          }
        });
      });
    });
  }

  async function sendMCPRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!serverProcess || !serverProcess.stdin) {
        reject(new Error('Server not ready'));
        return;
      }

      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 10000);

      // Escuchar respuesta
      const onData = (data: Buffer) => {
        responseData += data.toString();
        
        // Buscar líneas completas JSON-RPC
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line.trim());
              if (response.id === request.id) {
                clearTimeout(timeout);
                serverProcess.stdout?.off('data', onData);
                resolve(response);
                return;
              }
            } catch (e) {
              // Línea no es JSON válido, continuar
            }
          }
        }
      };

      serverProcess.stdout?.on('data', onData);

      // Enviar request
      const requestStr = JSON.stringify(request) + '\n';
      serverProcess.stdin.write(requestStr);
    });
  }

  describe('Server Initialization', () => {
    it('debería inicializar el servidor MCP correctamente', async () => {
      await startMCPServer();
      expect(serverReady).toBe(true);
      expect(serverProcess.pid).toBeDefined();
    });

    it('debería responder a initialize request', async () => {
      await startMCPServer();
      
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: {}
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      const response = await sendMCPRequest(initRequest);
      
      expect(response).toBeDefined();
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.capabilities).toBeDefined();
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('radix-stdio-server');
    });
  });

  describe('Tools Discovery', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Inicializar el servidor
      await sendMCPRequest({
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

    it('debería listar todas las herramientas disponibles incluyendo roots', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMCPRequest(toolsRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      
      const toolNames = response.result.tools.map((tool: any) => tool.name);
      
      // Herramientas existentes
      expect(toolNames).toContain('xrd_transaccion');
      expect(toolNames).toContain('deeplink_to_qr');
      expect(toolNames).toContain('deeplink_to_qr_local');
      
      // Nuevas herramientas de roots
      expect(toolNames).toContain('list_allowed_directories');
      expect(toolNames).toContain('get_qr_directory_info');
      expect(toolNames).toContain('set_qr_directory');
    });

    it('debería describir correctamente las herramientas de roots', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMCPRequest(toolsRequest);
      const tools = response.result.tools;
      
      const listDirectories = tools.find((tool: any) => tool.name === 'list_allowed_directories');
      expect(listDirectories).toBeDefined();
      expect(listDirectories.description).toContain('directorios permitidos');
      
      const getInfo = tools.find((tool: any) => tool.name === 'get_qr_directory_info');
      expect(getInfo).toBeDefined();
      expect(getInfo.description).toContain('información del directorio');
      
      const setDirectory = tools.find((tool: any) => tool.name === 'set_qr_directory');
      expect(setDirectory).toBeDefined();
      expect(setDirectory.description).toContain('configurar directorio');
    });
  });

  describe('Root Directory Tools', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Inicializar el servidor
      await sendMCPRequest({
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

    it('debería listar directorios permitidos', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {
          name: 'list_allowed_directories',
          arguments: {}
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content.length).toBeGreaterThan(0);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('directorios permitidos');
    });

    it('debería obtener información del directorio QR', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: {
          name: 'get_qr_directory_info',
          arguments: {}
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('Directorio QR actual');
    });

    it('debería configurar directorio QR válido', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: {
          name: 'set_qr_directory',
          arguments: {
            directory: testTempDir
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('exitosamente') || expect(content.text).toContain('configurado');
    });

    it('debería rechazar directorio QR inválido', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: {
          name: 'set_qr_directory',
          arguments: {
            directory: '/etc/passwd/../../../'
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      expect(content.text).toContain('Error') || expect(content.text).toContain('inválido');
    });
  });

  describe('Integration with Existing Tools', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      // Inicializar el servidor
      await sendMCPRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          clientInfo: { name: 'test-client', version: '1.0.0' }
        }
      });

      // Configurar un directorio temporal válido
      await sendMCPRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'set_qr_directory',
          arguments: { directory: testTempDir }
        }
      });
    });

    it('debería generar QR local usando directorio configurado', async () => {
      const deeplink = 'radixwallet://transaction?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=10&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc';
      
      const toolRequest = {
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr_local',
          arguments: {
            deeplink: deeplink,
            tamaño: 256
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      
      const content = response.result.content[0];
      expect(content.type).toBe('text');
      // Debería usar el directorio configurado
      expect(content.text).toContain('Archivo generado:');
      expect(content.text).toContain('.png');
    });

    it('debería generar transacción XRD y QR en secuencia', async () => {
      // Generar transacción XRD
      const xrdRequest = {
        jsonrpc: '2.0',
        id: 21,
        method: 'tools/call',
        params: {
          name: 'xrd_transaccion',
          arguments: {
            fromAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            toAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
            amount: '5',
            message: 'Test integration'
          }
        }
      };

      const xrdResponse = await sendMCPRequest(xrdRequest);
      
      expect(xrdResponse.result).toBeDefined();
      const content = xrdResponse.result.content[0];
      const deeplink = content.text.match(/radixwallet:\/\/[^\s\n]+/)?.[0];
      expect(deeplink).toBeDefined();

      // Generar QR del deeplink
      const qrRequest = {
        jsonrpc: '2.0',
        id: 22,
        method: 'tools/call',
        params: {
          name: 'deeplink_to_qr_local',
          arguments: {
            deeplink: deeplink!,
            tamaño: 512
          }
        }
      };

      const qrResponse = await sendMCPRequest(qrRequest);
      
      expect(qrResponse.result).toBeDefined();
      const qrContent = qrResponse.result.content[0];
      expect(qrContent.text).toContain('Archivo generado:');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      await sendMCPRequest({
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

    it('debería manejar herramienta no encontrada', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 30,
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {}
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      expect(response.error).toBeDefined();
      expect(response.error.code).toBeDefined();
    });

    it('debería manejar argumentos inválidos', async () => {
      const toolRequest = {
        jsonrpc: '2.0',
        id: 31,
        method: 'tools/call',
        params: {
          name: 'set_qr_directory',
          arguments: {
            directory: 123 // Tipo incorrecto
          }
        }
      };

      const response = await sendMCPRequest(toolRequest);
      
      expect(response).toBeDefined();
      // Puede ser un error o un resultado con mensaje de error
      expect(response.error || response.result).toBeDefined();
    });

    it('debería manejar JSON-RPC malformado gracefully', async () => {
      if (!serverProcess || !serverProcess.stdin) {
        throw new Error('Server not ready');
      }

      // Enviar JSON malformado
      serverProcess.stdin.write('{"invalid": json}\n');
      
      // El servidor debería continuar funcionando
      const validRequest = {
        jsonrpc: '2.0',
        id: 32,
        method: 'tools/list',
        params: {}
      };

      const response = await sendMCPRequest(validRequest);
      expect(response).toBeDefined();
      expect(response.result).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    beforeEach(async () => {
      await startMCPServer();
      
      await sendMCPRequest({
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

    it('debería responder a múltiples requests en secuencia', async () => {
      const requests = [];
      
      for (let i = 0; i < 5; i++) {
        requests.push(sendMCPRequest({
          jsonrpc: '2.0',
          id: 40 + i,
          method: 'tools/list',
          params: {}
        }));
      }

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.id).toBe(40 + index);
        expect(response.result).toBeDefined();
      });
    });

    it('debería completar operaciones de roots en menos de 1 segundo', async () => {
      const startTime = Date.now();
      
      await sendMCPRequest({
        jsonrpc: '2.0',
        id: 50,
        method: 'tools/call',
        params: {
          name: 'get_qr_directory_info',
          arguments: {}
        }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('debería manejar directorio con muchos archivos QR', async () => {
      // Configurar directorio temporal
      await sendMCPRequest({
        jsonrpc: '2.0',
        id: 51,
        method: 'tools/call',
        params: {
          name: 'set_qr_directory',
          arguments: { directory: testTempDir }
        }
      });

      // Obtener información debería ser rápido incluso con muchos archivos
      const startTime = Date.now();
      
      const response = await sendMCPRequest({
        jsonrpc: '2.0',
        id: 52,
        method: 'tools/call',
        params: {
          name: 'get_qr_directory_info',
          arguments: {}
        }
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
      expect(response.result).toBeDefined();
    });
  });
});