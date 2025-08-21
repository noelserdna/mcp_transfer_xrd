import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createRadixConnectClient,
  createRadixConnectRelayTransport,
} from 'radix-connect';
import { z } from 'zod';

// Importar helpers de verificación (Fase 4: Integration)
import { AddressValidator } from './helpers/address-validator.js';
import { BalanceChecker } from './helpers/balance-checker.js';
import { RadixAPIHelper } from './helpers/radix-api.js';
import { DecimalUtils, ErrorType } from './types/radix-types.js';

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

// Initialize verification helpers (Fase 4: Integration)
const radixAPIHelper = new RadixAPIHelper();
const balanceChecker = new BalanceChecker(radixAPIHelper);

// Define Zod schema for XRD transaction parameters
const XrdTransactionSchema = {
  fromAddress: z.string().describe("Dirección de la billetera origen"),
  toAddress: z.string().describe("Dirección de la billetera destino"),
  amount: z.string().describe("Cantidad de XRD a transferir"),
  message: z.string().optional().describe("Mensaje opcional para la transacción")
};



server.tool(
  "xrd_transaccion",
  "Genera un deep link para realizar una transacción de XRD en Stokenet con validaciones automáticas",
  XrdTransactionSchema,
  async (params) => {
    try {
      // Debug logging
      console.error("DEBUG - Parámetros recibidos:", JSON.stringify(params, null, 2));
      
      const { fromAddress, toAddress, amount, message } = params;
      
      // INTEGRACIÓN FASE 4: Validaciones automáticas usando helpers implementados
      console.error("DEBUG - Iniciando validaciones automáticas...");
      
      // 1. Validar direcciones usando AddressValidator
      const fromAddressValidation = AddressValidator.validateAccountAddress(fromAddress);
      if (!fromAddressValidation.isValid) {
        return {
          content: [{
            type: "text",
            text: `❌ **Error en dirección de origen**\n\n${fromAddressValidation.errorMessage || 'Formato de dirección inválido'}\n\n💡 **Sugerencia**: Asegúrate de que la dirección de origen sea una dirección válida de cuenta de Stokenet que comience con 'account_tdx_2_'.`
          }]
        };
      }
      
      const toAddressValidation = AddressValidator.validateAccountAddress(toAddress);
      if (!toAddressValidation.isValid) {
        return {
          content: [{
            type: "text",
            text: `❌ **Error en dirección de destino**\n\n${toAddressValidation.errorMessage || 'Formato de dirección inválido'}\n\n💡 **Sugerencia**: Asegúrate de que la dirección de destino sea una dirección válida de cuenta de Stokenet que comience con 'account_tdx_2_'.`
          }]
        };
      }
      
      console.error("DEBUG - Direcciones validadas exitosamente");
      
      // 2. Verificar balance usando BalanceChecker
      const balanceCheck = await balanceChecker.checkXRDBalance(fromAddress, amount);
      if (!balanceCheck.isValid) {
        const errorDetails = balanceCheck.errorCode === ErrorType.INSUFFICIENT_BALANCE ?
          (balanceCheck.errorMessage || 'Balance insuficiente') :
          `❌ **Error verificando balance**\n\n${balanceCheck.errorMessage || 'Error desconocido verificando balance'}\n\n💡 **Sugerencia**: Verifica que la dirección de origen tenga suficientes XRD para completar la transacción.`;
        
        return {
          content: [{
            type: "text",
            text: errorDetails
          }]
        };
      }
      
      console.error("DEBUG - Balance verificado exitosamente");
      
      // Los parámetros ya están validados por Zod + nuestros helpers adicionales

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

      // INTEGRACIÓN FASE 4: Respuesta enriquecida con información de validación
      const responseText = `${generatedDeepLink}\n\n✅ **Validaciones completadas exitosamente:**\n• Dirección de origen válida: ${fromAddress}\n• Dirección de destino válida: ${toAddress}\n• Balance suficiente: ${DecimalUtils.formatXRD(balanceCheck.currentBalance || '0')} disponibles\n• Cantidad a transferir: ${DecimalUtils.formatXRD(amount)}\n\n📱 **Instrucciones:**\n1. Toca el enlace anterior para abrir Radix Wallet\n2. Revisa los detalles de la transacción\n3. Firma y confirma la transferencia`;
      
      return {
        content: [
          {
            type: "text",
            text: responseText || generatedDeepLink,
          },
        ],
      };
    } catch (error) {
      // INTEGRACIÓN FASE 4: Manejo de errores con fallback graceful
      console.error("DEBUG - Error en xrd_transaccion:", error);
      
      // Si el error viene de validaciones, usar mensaje estructurado
      if (error && typeof error === 'object' && 'type' in error) {
        const radixError = error as any;
        return {
          content: [{
            type: "text",
            text: `⚠️ **Error de validación**\n\n${radixError.message || 'Error de validación desconocido'}\n\n💡 **Recomendación**: Verifica los datos e intenta nuevamente. Si el problema persiste, la transacción aún puede procesarse sin validación previa.`
          }]
        };
      }
      
      // Fallback para errores no estructurados - no bloquear transacción
      return {
        content: [
          {
            type: "text",
            text: `⚠️ **Advertencia**: No se pudo completar la validación automática, pero puedes continuar con la transacción.\n\n**Error**: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n💡 **Recomendación**: Verifica manualmente que tienes suficiente balance antes de confirmar la transacción en Radix Wallet.`,
          },
        ],
      };
    }
  },
);

server.prompt(
  "transferir_xrd",
  "Transferir XRD entre wallets con validaciones automáticas",
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
            text: `# Transferir XRD en Stokenet con Validaciones Automáticas

¡Perfecto! Vamos a crear una transferencia sencilla de XRD entre wallets en la red Stokenet con verificaciones automáticas de seguridad.

## Datos para la transferencia:

${fromAddress ? `✅ **Wallet Origen**: ${fromAddress}` : '❌ **Wallet Origen**: *Requerido*'}
${toAddress ? `✅ **Wallet Destino**: ${toAddress}` : '❌ **Wallet Destino**: *Requerido*'}  
${amount ? `✅ **Cantidad**: ${amount} XRD` : '❌ **Cantidad**: *Requerido*'}
${message ? `📝 **Mensaje**: ${message}` : '📝 **Mensaje**: Sin mensaje'}

## 🛡️ Validaciones Automáticas Habilitadas:

Nuestro sistema ahora incluye verificaciones automáticas para mayor seguridad:

- ✅ **Validación de Direcciones**: Verificamos que ambas direcciones sean válidas para Stokenet
- ✅ **Verificación de Balance**: Comprobamos que tengas suficientes XRD antes de generar la transacción
- ✅ **Detección Temprana de Errores**: Identificamos problemas antes de abrir la wallet
- ✅ **Mensajes Informativos**: Te mostramos el estado de tu balance y validaciones

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

Una vez que proporciones todos los datos requeridos:

1. 🔍 **Validaciones automáticas**: Verificaremos direcciones y balance
2. ✅ **Confirmación de estado**: Te mostraremos el resultado de las validaciones  
3. 📱 **Deep link generado**: Si todo está correcto, generaremos el enlace para Radix Wallet
4. 🔐 **Firma en wallet**: Podrás revisar y firmar la transacción de forma segura

## 💡 Beneficios de las Validaciones:

- **Evita errores**: Detectamos direcciones inválidas antes de procesar
- **Verifica fondos**: Comprobamos que tengas balance suficiente
- **Ahorra tiempo**: Identificamos problemas sin abrir la wallet
- **Mayor seguridad**: Validaciones adicionales antes de firmar

¿Tienes todos los datos listos? ¡Proporciónalos y crearemos tu transferencia XRD con validaciones automáticas!`
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