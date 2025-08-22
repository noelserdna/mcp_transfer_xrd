#!/usr/bin/env node
/**
 * Test del tool MCP test_qr_terminal
 */

import { spawn } from 'child_process';

const testRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'test_qr_terminal',
    arguments: {
      deeplink: 'radixwallet://transaction/send?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=10',
      modo: 'render',
      opciones: {
        pequeño: false,
        inverso: false,
        margen: 1,
        colorear: true
      }
    }
  }
};

console.log('🧪 Testing MCP tool test_qr_terminal...');
console.log('==========================================\n');

const serverProcess = spawn('node', ['build/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

serverProcess.stdout.on('data', (data) => {
  output += data.toString();
});

serverProcess.stderr.on('data', (data) => {
  errorOutput += data.toString();
  process.stderr.write(data); // Mostrar stderr en tiempo real
});

// Enviar request después de un pequeño delay
setTimeout(() => {
  console.log('📤 Enviando request...\n');
  serverProcess.stdin.write(JSON.stringify(testRequest) + '\n');
  
  // Después de 3 segundos, procesar response y terminar
  setTimeout(() => {
    try {
      if (output.trim()) {
        const response = JSON.parse(output.trim());
        
        if (response.result && response.result.content) {
          console.log('\n✅ Respuesta MCP exitosa:');
          console.log('================================');
          console.log(response.result.content[0].text);
        } else if (response.error) {
          console.log('\n❌ Error MCP:', response.error.message);
        }
      } else {
        console.log('\n⚠️ No se recibió respuesta del servidor');
      }
    } catch (error) {
      console.log('\n❌ Error parseando respuesta:', error.message);
      console.log('Raw output:', output);
    }
    
    serverProcess.kill();
    console.log('\n🎯 Test completado');
  }, 3000);
}, 1000);