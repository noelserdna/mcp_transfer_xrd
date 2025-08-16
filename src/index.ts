import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createRadixConnectClient,
  createRadixConnectRelayTransport,
} from 'radix-connect';
import { z } from 'zod';

const server = new McpServer(
  {
    name: "simple-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Create RadixConnect manager class
class RadixConnectManager {
  private client: any;
  private deepLinkCallback?: (deepLink: string) => void;
  private responseCallback?: (response: any) => void;

  constructor() {
    const transport = createRadixConnectRelayTransport({
      handleRequest: async ({ deepLink }) => {
        if (this.deepLinkCallback) {
          this.deepLinkCallback(deepLink);
        }
      },
    });

    this.client = createRadixConnectClient({ transport });
  }

  onDeepLink(callback: (deepLink: string) => void) {
    this.deepLinkCallback = callback;
  }

  onResponse(callback: (response: any) => void) {
    this.responseCallback = callback;
  }

  async sendTransactionRequest(manifest: string, message?: string) {
    try {
      const response = await this.client.sendRequest({
        interactionId: crypto.randomUUID(),
        metadata: {
          version: 2,
          networkId: 2,
          dAppDefinitionAddress: 'account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct',
          origin: 'https://wellradix.pages.dev/',
        },
        items: {
          discriminator: 'transaction',
          send: {
            transactionManifest: manifest,
            version: 1,
            message: message || 'Transaction request'
          }
        }
      });

      if (this.responseCallback) {
        this.responseCallback(response);
      }

      return response;
    } catch (error) {
      console.error('Error sending transaction request:', error);
      throw error;
    }
  }
}

// Initialize RadixConnect manager
const radixManager = new RadixConnectManager();

// Define Zod schema for XRD transaction parameters
const XrdTransactionSchema = {
  fromAddress: z.string().describe("Dirección de la billetera origen"),
  toAddress: z.string().describe("Dirección de la billetera destino"),
  amount: z.string().describe("Cantidad de XRD a transferir"),
  message: z.string().optional().describe("Mensaje opcional para la transacción")
};



server.tool(
  "xrd_transaccion",
  "Genera un deep link para realizar una transacción de XRD en Stokenet",
  XrdTransactionSchema,
  async (params) => {
    try {
      // Debug logging
      console.error("DEBUG - Parámetros recibidos:", JSON.stringify(params, null, 2));
      
      const { fromAddress, toAddress, amount, message } = params;
      
      // Los parámetros ya están validados por Zod, no necesitamos validación manual

      // Generar manifiesto correcto de transacción XRD para Stokenet
      const resourceAddress = "resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc";
      const manifest = `
CALL_METHOD
    Address("${fromAddress}")
    "withdraw"
    Address("${resourceAddress}")
    Decimal("${amount}")
;
TAKE_FROM_WORKTOP
    Address("${resourceAddress}")
    Decimal("${amount}")
    Bucket("bucket1")
;
CALL_METHOD
    Address("${toAddress}")
    "try_deposit_or_abort"
    Bucket("bucket1")
    Enum<0u8>()
;`.trim();

      // Usar RadixConnect para generar el deep link
      const generatedDeepLink = await new Promise<string>((resolve, reject) => {
        // Configurar callback para capturar el deep link
        radixManager.onDeepLink((deepLink) => {
          resolve(deepLink);
        });

        // Enviar la solicitud de transacción
        radixManager.sendTransactionRequest(manifest, message || `Transferencia de ${amount} XRD`)
          .catch(reject);
      });

      return {
        content: [
          {
            type: "text",
            text: generatedDeepLink,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          },
        ],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simple MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});