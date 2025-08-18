# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server implementation in TypeScript that provides RadixDLT blockchain integration. The server runs over stdio and enables XRD token transfers on the Stokenet testnet through mobile wallet deep links. It uses @modelcontextprotocol/sdk, radix-connect, and Zod for validation.

## Development Commands

### Build and Start
```bash
npm run build        # Compile TypeScript to build/ directory
npm start           # Run compiled MCP server on stdio
```

### Testing
```bash
npm test            # Run all tests
npm run test:watch  # Run tests in watch mode  
npm run test:ui     # Run tests with UI interface
```

### Running Single Tests
```bash
npx vitest tests/server.test.ts      # Run server integration tests
npx vitest tests/echo-tool.test.ts   # Run echo tool unit tests
```

## Architecture

### MCP Server Structure (src/index.ts)

The server implements the MCP protocol with:

1. **McpServer Instance**: Configures server capabilities and metadata
2. **RadixConnectManager Class**: Handles Radix wallet integration
   - Creates relay transport for deep link generation
   - Manages transaction request callbacks
   - Generates transaction manifests for XRD transfers
3. **Tool Registration**: Registers `xrd_transaccion` tool with Zod validation
4. **Prompt Registration**: Registers `transferir_xrd` prompt for guided transfers

### RadixDLT Integration

**Network Configuration**:
- Target: Stokenet (testnet) - networkId: 2
- XRD Resource: `resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc`
- dApp Definition: `account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct`
- Origin: `https://wellradix.pages.dev/`

**Transaction Manifest Pattern**:
- Uses `withdraw` from source account
- Creates worktop bucket for XRD amount
- Calls `try_deposit_or_abort` on destination account

### Tool Implementation

**xrd_transaccion**: Generates deep links for XRD transfers on Stokenet
- Parameters: `fromAddress`, `toAddress`, `amount`, `message` (optional)
- Validation: Zod schemas with Spanish descriptions
- Returns: Deep link string for Radix Wallet mobile app

**transferir_xrd** (Prompt): Interactive guide for XRD transfers
- Provides Spanish instructions for wallet addresses and amounts
- Explains deep link workflow and wallet integration
- Returns formatted guidance with validation status

### Testing Architecture

**Integration Tests** (tests/server.test.ts):
- Spawns actual server process using child_process
- Tests server startup and stderr output validation
- Tests JSON-RPC message handling with MCP protocol
- Builds project before test execution

**Configuration**:
- Vitest with Node environment and 10s timeout
- Coverage reporting with v8 provider  
- ESM modules with TypeScript strict mode
- Test files pattern: `tests/**/*.test.ts`

## MCP Protocol Details

The server uses stdio transport for MCP communication:
- **stdin**: Receives JSON-RPC requests from MCP clients
- **stdout**: Sends JSON-RPC responses back to clients
- **stderr**: Server logging and status messages
- **Protocol**: Compatible with MCP SDK 1.0.0 and 2025-06-18 specification
- recuerda darme todos los mensajes en español