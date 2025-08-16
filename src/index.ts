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
      prompts: {},
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

server.prompt(
  "transferir_xrd",
  "Transferir XRD entre wallets",
  {
    fromAddress: z.string().describe("Dirección de la wallet origen (debe ser una dirección válida de Stokenet que comience con 'account_tdx_2_')"),
    toAddress: z.string().describe("Dirección de la wallet destino (debe ser una dirección válida de Stokenet que comience con 'account_tdx_2_')"),
    amount: z.string().describe("Cantidad de XRD a transferir (ejemplo: 10.5, 1, 0.1)"),
    message: z.string().optional().describe("Mensaje opcional para la transferencia")
  },
  async (args) => {
    const { fromAddress, toAddress, amount, message } = args;
    
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `# Transferir XRD en Stokenet

¡Perfecto! Vamos a crear una transferencia sencilla de XRD entre wallets en la red Stokenet.

## Datos para la transferencia:

${fromAddress ? `✅ **Wallet Origen**: ${fromAddress}` : '❌ **Wallet Origen**: *Requerido*'}
${toAddress ? `✅ **Wallet Destino**: ${toAddress}` : '❌ **Wallet Destino**: *Requerido*'}  
${amount ? `✅ **Cantidad**: ${amount} XRD` : '❌ **Cantidad**: *Requerido*'}
${message ? `📝 **Mensaje**: ${message}` : '📝 **Mensaje**: Sin mensaje'}

## Instrucciones:

1. **Wallet Origen**: Proporciona la dirección de tu wallet desde la cual quieres enviar XRD
   - Formato: \`account_tdx_2_...\`
   - Ejemplo: \`account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql\`

2. **Wallet Destino**: Proporciona la dirección de la wallet que recibirá los XRD  
   - Formato: \`account_tdx_2_...\`
   - Ejemplo: \`account_tdx_2_128evrrwfp8gj9240qq0m06ukhwaj2cmejluxxreanzjwq62hdkqlq\`

3. **Cantidad**: Especifica cuántos XRD quieres transferir
   - Ejemplos: \`10\`, \`5.5\`, \`0.1\`

4. **Mensaje** (opcional): Agrega una nota descriptiva para la transferencia

## ¿Qué sucede después?

Una vez que proporciones todos los datos requeridos, se generará un **deep link** que podrás usar para:
- Abrir Radix Wallet móvil automáticamente
- Revisar los detalles de la transacción
- Firmar y confirmar la transferencia

¿Tienes todos los datos listos? ¡Proporciónalos y crearemos tu transferencia XRD!`
          }
        }
      ]
    };
  }
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