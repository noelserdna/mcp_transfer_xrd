/**
 * Simple MCP Integration Tests
 * Tests básicos de integración para verificar que el servidor MCP funciona
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe('Simple MCP Integration', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Construir el proyecto
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'pipe'
    });

    await new Promise<void>((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
    });
  }, 30000);

  afterAll(async () => {
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
  });

  it('debería inicializar el servidor sin errores', async () => {
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn('node', ['build/index.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let hasErrored = false;
      const timeout = setTimeout(() => {
        if (!hasErrored) {
          hasErrored = true;
          reject(new Error('Server startup timeout'));
        }
      }, 10000);

      serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        
        // Verificar que se muestren mensajes de inicialización correctos
        if (output.includes('Simple MCP Server running on stdio')) {
          if (!hasErrored) {
            clearTimeout(timeout);
            resolve();
          }
        }
      });

      serverProcess.on('error', (error) => {
        if (!hasErrored) {
          hasErrored = true;
          clearTimeout(timeout);
          reject(error);
        }
      });

      serverProcess.on('exit', (code, signal) => {
        if (!hasErrored && code !== null && code !== 0) {
          hasErrored = true;
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code} and signal ${signal}`));
        }
      });
    });
  }, 15000);

  it('debería responder a un JSON-RPC initialize básico', async () => {
    if (!serverProcess || serverProcess.killed) {
      throw new Error('Server not running');
    }

    return new Promise<void>((resolve, reject) => {
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Response timeout'));
        }
      }, 5000);

      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      };

      // Escuchar respuesta
      serverProcess.stdout?.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === 1 && !responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            
            // Verificar respuesta básica
            expect(response.result).toBeDefined();
            expect(response.result.capabilities).toBeDefined();
            expect(response.result.serverInfo).toBeDefined();
            resolve();
          }
        } catch (e) {
          // Ignorar líneas que no son JSON válido
        }
      });

      // Enviar request
      const requestStr = JSON.stringify(initRequest) + '\n';
      serverProcess.stdin?.write(requestStr);
    });
  }, 10000);

  it('debería listar herramientas incluyendo las de roots', async () => {
    if (!serverProcess || serverProcess.killed) {
      throw new Error('Server not running');
    }

    return new Promise<void>((resolve, reject) => {
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Tools list timeout'));
        }
      }, 5000);

      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      // Escuchar respuesta
      serverProcess.stdout?.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === 2 && !responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            
            expect(response.result).toBeDefined();
            expect(response.result.tools).toBeInstanceOf(Array);
            
            const toolNames = response.result.tools.map((tool: any) => tool.name);
            
            // Verificar herramientas básicas
            expect(toolNames).toContain('xrd_transaccion');
            expect(toolNames).toContain('deeplink_to_qr_local');
            
            // Verificar herramientas de roots
            expect(toolNames).toContain('list_allowed_directories');
            expect(toolNames).toContain('get_qr_directory_info');
            expect(toolNames).toContain('set_qr_directory');
            
            resolve();
          }
        } catch (e) {
          // Ignorar líneas que no son JSON válido
        }
      });

      // Enviar request
      const requestStr = JSON.stringify(toolsRequest) + '\n';
      serverProcess.stdin?.write(requestStr);
    });
  }, 10000);

  it('debería ejecutar la herramienta list_allowed_directories', async () => {
    if (!serverProcess || serverProcess.killed) {
      throw new Error('Server not running');
    }

    return new Promise<void>((resolve, reject) => {
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Tool execution timeout'));
        }
      }, 5000);

      const toolRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'list_allowed_directories',
          arguments: {}
        }
      };

      // Escuchar respuesta
      serverProcess.stdout?.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === 3 && !responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            
            expect(response.result).toBeDefined();
            expect(response.result.content).toBeInstanceOf(Array);
            expect(response.result.content.length).toBeGreaterThan(0);
            
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toContain('directorios');
            
            resolve();
          }
        } catch (e) {
          // Ignorar líneas que no son JSON válido
        }
      });

      // Enviar request
      const requestStr = JSON.stringify(toolRequest) + '\n';
      serverProcess.stdin?.write(requestStr);
    });
  }, 10000);

  it('debería ejecutar la herramienta get_qr_directory_info', async () => {
    if (!serverProcess || serverProcess.killed) {
      throw new Error('Server not running');
    }

    return new Promise<void>((resolve, reject) => {
      let responseReceived = false;
      const timeout = setTimeout(() => {
        if (!responseReceived) {
          reject(new Error('Directory info timeout'));
        }
      }, 5000);

      const toolRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'get_qr_directory_info',
          arguments: {}
        }
      };

      // Escuchar respuesta
      serverProcess.stdout?.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString().trim());
          if (response.id === 4 && !responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            
            expect(response.result).toBeDefined();
            expect(response.result.content).toBeInstanceOf(Array);
            
            const content = response.result.content[0];
            expect(content.type).toBe('text');
            expect(content.text).toContain('Directorio QR');
            
            resolve();
          }
        } catch (e) {
          // Ignorar líneas que no son JSON válido
        }
      });

      // Enviar request
      const requestStr = JSON.stringify(toolRequest) + '\n';
      serverProcess.stdin?.write(requestStr);
    });
  }, 10000);
});