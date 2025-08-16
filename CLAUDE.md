# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a simple MCP (Model Context Protocol) server implementation in TypeScript that runs over stdio. The server provides basic MCP functionality with an echo tool for testing and a RadixDLT transaction tool for generating mobile wallet deep links. It uses the @modelcontextprotocol/sdk library and @radixdlt/radix-dapp-toolkit, built with TypeScript and tested with Vitest.

## Development Commands

### Build
```bash
npm run build
```
Compiles TypeScript to JavaScript in the `build/` directory.

### Start Server
```bash
npm start
```
Runs the compiled MCP server on stdio. The server will output "Simple MCP Server running on stdio" to stderr when successfully started.

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI interface
```

The test suite includes:
- Integration tests for server startup and JSON-RPC communication
- Unit tests for the echo tool functionality
- Edge case testing (empty text, unicode, special characters)

## Architecture

### Core Components

- **src/index.ts**: Main MCP server implementation using @modelcontextprotocol/sdk
  - Creates McpServer instance with stdio transport
  - Registers the echo and xrd_transaccion tools
  - Handles server initialization and connection

### Tool Implementation

The server implements two tools:

- **echo**: Takes a text parameter and returns "Echo: {text}"
  - Defined at index.ts:17-36
  - Parameters: `text` (string)
  - Returns MCP-formatted content with text response

- **xrd_transaccion**: Genera deep links para transacciones XRD en Stokenet
  - Defined at index.ts:38-123
  - Parameters: 
    - `fromAddress` (string): Dirección de billetera origen
    - `toAddress` (string): Dirección de billetera destino
    - `amount` (string): Cantidad de XRD a transferir
    - `message` (string, opcional): Mensaje para la transacción
  - Returns: Deep link para abrir Radix Wallet móvil y firmar la transacción
  - Configuración fija:
    - Network: Stokenet (networkId: 2)
    - dAppDefinitionAddress: account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct
    - Origin: https://wellradix.pages.dev/

### Testing Strategy

- **tests/server.test.ts**: Integration tests that spawn actual server process
  - Tests server startup and JSON-RPC initialization
  - Uses child_process.spawn to test real server behavior
- **tests/echo-tool.test.ts**: Unit tests for echo tool logic
  - Tests isolated tool function without server overhead
  - Covers edge cases and various input types

### Configuration

- **TypeScript**: ES2020 target, ESNext modules, strict mode enabled
- **Vitest**: Node environment, 10s timeout, coverage reporting with v8
- **Module System**: ESM (type: "module" in package.json)

## MCP Protocol Integration

This server implements the MCP protocol over stdio transport:
- Accepts JSON-RPC messages on stdin
- Responds with JSON-RPC messages on stdout  
- Uses stderr for server logging/status messages
- Protocol version: Compatible with MCP SDK 1.0.0