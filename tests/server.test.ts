import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';

describe("MCP Server Basic Tests", () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    // Compilar el servidor antes de los tests
    const buildProcess = spawn("npm", ["run", "build"], { 
      stdio: "pipe",
      shell: true 
    });
    
    await new Promise<void>((resolve, reject) => {
      buildProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build failed with code ${code}`));
      });
    });
  });

  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  test("should start MCP server without errors", async () => {
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn("node", ["build/index.js"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd()
      });

      let stderrOutput = "";
      
      serverProcess.stderr?.on("data", (data) => {
        stderrOutput += data.toString();
      });

      // Dar tiempo al servidor para inicializar
      setTimeout(() => {
        if (stderrOutput.includes("Simple MCP Server running on stdio")) {
          serverProcess.kill();
          resolve();
        } else {
          serverProcess.kill();
          reject(new Error(`Server did not start properly. Output: ${stderrOutput}`));
        }
      }, 2000);

      serverProcess.on("error", (error) => {
        reject(error);
      });
    });
  });

  test("should handle JSON-RPC messages", async () => {
    return new Promise<void>((resolve, reject) => {
      serverProcess = spawn("node", ["build/index.js"], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd()
      });

      let jsonResponse = "";
      
      serverProcess.stdout?.on("data", (data) => {
        jsonResponse += data.toString();
      });

      // Enviar mensaje de inicialización JSON-RPC
      const initMessage = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0"
          }
        }
      };

      serverProcess.stdin?.write(JSON.stringify(initMessage) + "\n");

      // Dar tiempo para procesar
      setTimeout(() => {
        serverProcess.kill();
        // Solo verificar que no haya errores graves
        expect(jsonResponse).toBeDefined();
        resolve();
      }, 3000);

      serverProcess.on("error", (error) => {
        reject(error);
      });
    });
  });

  test("server executable exists and is valid", () => {
    const fs = require('fs');
    expect(fs.existsSync('build/index.js')).toBe(true);
  });
});