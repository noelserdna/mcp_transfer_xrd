import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRadixConnectClient, createRadixConnectRelayTransport, } from 'radix-connect';
import { z } from 'zod';
// Importar helpers de verificación (Fase 4: Integration)
import { AddressValidator } from './helpers/address-validator.js';
import { BalanceChecker } from './helpers/balance-checker.js';
import { RadixAPIHelper } from './helpers/radix-api.js';
import { DecimalUtils, ErrorType } from './types/radix-types.js';
// Importar helper de generación QR (Nueva funcionalidad)
import { qrGenerator } from './helpers/qr-generator.js';
// Importar nueva funcionalidad QR local (Fase 1.3: QR PNG Local Generation)
import { localQRManager } from './helpers/local-qr-manager.js';
const server = new McpServer({
    name: "simple-mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
        prompts: {},
    },
});
// Create RadixConnect manager class
class RadixConnectManager {
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
    onDeepLink(callback) {
        this.deepLinkCallback = callback;
    }
    onResponse(callback) {
        this.responseCallback = callback;
    }
    async sendTransactionRequest(manifest, message) {
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
        }
        catch (error) {
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
server.tool("xrd_transaccion", "Genera un deep link para realizar una transacción de XRD en Stokenet con validaciones automáticas", XrdTransactionSchema, async (params) => {
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
        const generatedDeepLink = await new Promise((resolve, reject) => {
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
    }
    catch (error) {
        // INTEGRACIÓN FASE 4: Manejo de errores con fallback graceful
        console.error("DEBUG - Error en xrd_transaccion:", error);
        // Si el error viene de validaciones, usar mensaje estructurado
        if (error && typeof error === 'object' && 'type' in error) {
            const radixError = error;
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
});
// Define Zod schema for QR generation parameters
const DeepLinkToQRSchema = {
    deeplink: z.string().describe("Deep link de Radix Wallet para convertir a código QR"),
    formato: z.enum(['svg', 'png', 'both']).optional().describe("Formato de salida: svg, png o both (default: both)"),
    tamaño: z.number().min(32).max(2048).optional().describe("Tamaño en píxeles para PNG (default: 256)")
};
// Define Zod schema for local QR PNG generation parameters
const DeepLinkToQRLocalSchema = {
    deeplink: z.string().describe("Deep link de Radix Wallet para convertir a código QR PNG local"),
    tamaño: z.number().min(128).max(2048).optional().describe("Tamaño en píxeles para PNG (default: 512, optimizado para escaneado móvil)"),
    calidad: z.enum(['low', 'medium', 'high', 'max']).optional().describe("Calidad del QR para escaneado móvil (default: high)"),
    directorio: z.string().optional().describe("Directorio personalizado para guardar archivo (default: qrimages)")
};
server.tool("deeplink_to_qr", "Convierte un deep link de Radix Wallet a código QR en formato SVG y/o PNG", DeepLinkToQRSchema, async (params) => {
    try {
        console.error("DEBUG - Generando QR para:", JSON.stringify(params, null, 2));
        const { deeplink, formato = 'both', tamaño = 256 } = params;
        // Usar el helper de generación QR
        const result = await qrGenerator.generateQR({
            deeplink,
            formato,
            tamaño
        });
        // Construir respuesta informativa
        const formatosStr = result.metadatos.formatos_generados.join(' y ');
        let responseText = `✅ **Código QR generado exitosamente**\n\n`;
        responseText += `📱 **Deep Link Original:** ${result.metadatos.url_original}\n`;
        responseText += `📊 **Formatos generados:** ${formatosStr}\n`;
        responseText += `📐 **Tamaño PNG:** ${result.metadatos.tamaño_png}px\n`;
        responseText += `⏰ **Generado:** ${new Date(result.metadatos.timestamp).toLocaleString('es-ES')}\n\n`;
        if (result.svg) {
            responseText += `**📄 SVG Code:**\n\`\`\`svg\n${result.svg}\n\`\`\`\n\n`;
        }
        if (result.png_base64) {
            responseText += `**🖼️ PNG Base64:**\n\`\`\`\n${result.png_base64}\n\`\`\`\n\n`;
        }
        responseText += `💡 **Instrucciones de uso:**\n`;
        responseText += `• **SVG**: Copia el código SVG y úsalo en aplicaciones web\n`;
        responseText += `• **PNG Base64**: Úsalo como \`data:image/png;base64,<código>\` en HTML\n`;
        responseText += `• **Escaneo móvil**: Ambos formatos son escaneables con cualquier lector QR\n`;
        responseText += `• **Radix Wallet**: Al escanear, abrirá directamente la transacción en Radix Wallet`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText,
                },
            ],
        };
    }
    catch (error) {
        console.error("DEBUG - Error generando QR:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `❌ **Error generando código QR**\n\n${error instanceof Error ? error.message : 'Error desconocido'}\n\n💡 **Verificaciones:**\n• Asegúrate de que el deep link sea válido\n• El deep link debe ser de Radix Wallet (radixwallet:// o https://wallet.radixdlt.com/)\n• El tamaño para PNG debe estar entre 32 y 2048 píxeles`,
                },
            ],
        };
    }
});
server.tool("deeplink_to_qr_local", "Genera un código QR como archivo PNG local para deep links de Radix Wallet, compatible con Claude Desktop", DeepLinkToQRLocalSchema, async (params) => {
    try {
        console.error("DEBUG - Generando QR PNG local para:", JSON.stringify(params, null, 2));
        const { deeplink, tamaño = 512, calidad = 'high', directorio } = params;
        // Validar parámetros específicos para generación local
        if (tamaño < 128 || tamaño > 2048) {
            return {
                content: [{
                        type: "text",
                        text: `❌ **Error en tamaño de QR**\n\nEl tamaño debe estar entre 128 y 2048 píxeles. Se recomiendan 512px o más para mejor escaneado móvil.\n\n💡 **Sugerencia**: Usa 512px (default) o 1024px para calidad óptima con cámaras móviles.`
                    }]
            };
        }
        // Usar el LocalQRManager para generar archivo PNG local
        const startTime = performance.now();
        const result = await localQRManager.generateQRLocal(deeplink);
        const generationTime = Math.round(performance.now() - startTime);
        // Actualizar metadata con tiempo real
        result.metadatos.tiempo_generacion_ms = generationTime;
        // Construir respuesta informativa para Claude Desktop
        let responseText = `✅ **Archivo QR PNG generado exitosamente**\n\n`;
        responseText += `📁 **Archivo creado**: \`${result.archivo_path}\`\n`;
        responseText += `📝 **Nombre**: ${result.nombre_archivo}\n`;
        responseText += `📊 **Tamaño archivo**: ${(result.tamaño_bytes / 1024).toFixed(1)} KB\n`;
        responseText += `📐 **Dimensiones**: ${result.metadatos.dimensiones.ancho}×${result.metadatos.dimensiones.alto}px\n`;
        responseText += `🔗 **Hash único**: ${result.metadatos.hash_unico}\n`;
        responseText += `⚡ **Tiempo generación**: ${result.metadatos.tiempo_generacion_ms}ms\n`;
        responseText += `⏰ **Creado**: ${new Date(result.metadatos.timestamp).toLocaleString('es-ES')}\n\n`;
        responseText += `🎯 **¿Por qué QR PNG local?**\n`;
        responseText += `• **Compatible con Claude Desktop**: Este archivo PNG es renderizable como artefacto\n`;
        responseText += `• **Calidad optimizada**: Tamaño ${result.metadatos.dimensiones.ancho}px ideal para escaneado móvil\n`;
        responseText += `• **Almacenado localmente**: Archivo guardado en tu sistema para reutilización\n`;
        responseText += `• **Único y persistente**: Hash único evita duplicados, archivo reutilizable\n\n`;
        responseText += `📱 **Instrucciones de uso**:\n`;
        responseText += `1. **Escaneo directo**: Usa cualquier app de cámara o lector QR para escanear\n`;
        responseText += `2. **Radix Wallet**: Al escanear se abrirá directamente la transacción\n`;
        responseText += `3. **Compartir**: Puedes enviar este archivo PNG a otros dispositivos\n`;
        responseText += `4. **Reutilizar**: El archivo queda guardado para futuros usos\n\n`;
        responseText += `💡 **Ventajas vs QR Base64**:\n`;
        responseText += `• ✅ Compatible con artefactos de Claude Desktop\n`;
        responseText += `• ✅ No pierde contexto durante renderizado\n`;
        responseText += `• ✅ Archivo físico reutilizable y compartible\n`;
        responseText += `• ✅ Mayor calidad para escaneado móvil confiable\n`;
        responseText += `• ✅ Gestión automática de archivos duplicados\n\n`;
        responseText += `📂 **Gestión de archivos**: Los archivos se guardan en \`${result.metadatos.directorio}\` con limpieza automática de archivos antiguos (>7 días).`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText,
                },
            ],
        };
    }
    catch (error) {
        console.error("DEBUG - Error generando QR PNG local:", error);
        // Manejo específico de errores de LocalQRManager
        if (error && typeof error === 'object' && 'code' in error) {
            const localError = error;
            let errorMessage = `❌ **Error de generación local**\n\n`;
            switch (localError.code) {
                case 'DIRECTORY_ERROR':
                    errorMessage += `**Problema con directorio**: ${localError.message}\n\n`;
                    errorMessage += `💡 **Soluciones**:\n`;
                    errorMessage += `• Verifica permisos de escritura en el directorio del proyecto\n`;
                    errorMessage += `• Asegúrate de que hay espacio disponible en disco\n`;
                    errorMessage += `• Intenta usar un directorio personalizado con el parámetro \`directorio\``;
                    break;
                case 'FILE_ERROR':
                    errorMessage += `**Error escribiendo archivo**: ${localError.message}\n\n`;
                    errorMessage += `💡 **Soluciones**:\n`;
                    errorMessage += `• Verifica que no hay archivos bloqueados en el directorio\n`;
                    errorMessage += `• Asegúrate de tener permisos de escritura\n`;
                    errorMessage += `• Intenta con un nombre de archivo diferente`;
                    break;
                case 'GENERATION_ERROR':
                    errorMessage += `**Error en generación QR**: ${localError.message}\n\n`;
                    errorMessage += `💡 **Verificaciones**:\n`;
                    errorMessage += `• Confirma que el deep link sea válido de Radix Wallet\n`;
                    errorMessage += `• Verifica el formato: debe comenzar con \`radixwallet://\` o \`https://wallet.radixdlt.com/\`\n`;
                    errorMessage += `• Intenta con un tamaño menor (512px o 256px)`;
                    break;
                default:
                    errorMessage += `**Error desconocido**: ${localError.message}`;
            }
            return {
                content: [{
                        type: "text",
                        text: errorMessage
                    }]
            };
        }
        // Fallback para errores no estructurados
        return {
            content: [
                {
                    type: "text",
                    text: `❌ **Error generando QR PNG local**\n\n${error instanceof Error ? error.message : 'Error desconocido'}\n\n💡 **Soluciones**:\n• Si el deep link es muy largo (>1500 chars), es normal - el sistema optimiza automáticamente\n• Usa tamaño mayor (1024px o 2048px) para URLs largas\n• Verifica que el deep link comience con \`radixwallet://\`\n\n🔧 **Verificaciones**:\n• Deep link válido de Radix Wallet\n• Permisos de escritura en directorio del proyecto\n• Espacio disponible en disco`,
                },
            ],
        };
    }
});
// Import for QR terminal testing
import { qrTerminalRenderer } from './helpers/qr-terminal-renderer.js';
// Define Zod schema for QR terminal testing
const TestQRTerminalSchema = {
    deeplink: z.string().describe("Deep link de Radix Wallet para testing con qrcode-terminal"),
    modo: z.enum(['render', 'compare', 'validate', 'demo']).optional()
        .describe("Modo de testing: render (mostrar), compare (comparar), validate (validar), demo (demostración)"),
    opciones: z.object({
        pequeño: z.boolean().optional().describe("Usar QR pequeño para terminal"),
        inverso: z.boolean().optional().describe("Invertir colores del QR"),
        margen: z.number().min(0).max(10).optional().describe("Margen alrededor del QR"),
        colorear: z.boolean().optional().describe("Usar colores ANSI en el terminal")
    }).optional(),
    comparar_con: z.array(z.enum(['local_png', 'base64_png'])).optional()
        .describe("Métodos para comparación: local_png, base64_png")
};
server.tool("test_qr_terminal", "Sistema completo de testing QR con qrcode-terminal, comparaciones y validaciones para testing inmediato", TestQRTerminalSchema, async (params) => {
    try {
        const { deeplink, modo = 'render', opciones = {}, comparar_con = [] } = params;
        console.error("DEBUG - QR Terminal Test iniciado:", JSON.stringify(params, null, 2));
        // Validar deep link básico
        if (!deeplink || typeof deeplink !== 'string') {
            return {
                content: [{
                        type: "text",
                        text: "❌ **Error**: Deep link requerido y debe ser una string válida"
                    }]
            };
        }
        // Configurar opciones de renderizado
        const terminalOptions = {
            small: opciones.pequeño ?? false,
            inverse: opciones.inverso ?? false,
            margin: opciones.margen ?? 1,
            colorize: opciones.colorear ?? true
        };
        // Analizar deep link
        const analysis = {
            length: deeplink.length,
            protocol: deeplink.startsWith('radixwallet://') ? 'radixwallet://' :
                deeplink.startsWith('https://wallet.radixdlt.com/') ? 'wallet.radixdlt.com' : 'desconocido',
            recommendedConfig: deeplink.length < 400 ? 'Error correction H' :
                deeplink.length < 800 ? 'Error correction M' :
                    deeplink.length < 1200 ? 'Error correction L' : 'Error correction L + optimizaciones'
        };
        let responseText = `## 🔬 QR Terminal Testing\n\n`;
        responseText += `**Deep link analizado:**\n`;
        responseText += `📏 Longitud: ${analysis.length} caracteres\n`;
        responseText += `🔗 Protocolo: ${analysis.protocol}\n`;
        responseText += `💡 Configuración recomendada: ${analysis.recommendedConfig}\n\n`;
        // Ejecutar según modo
        switch (modo) {
            case 'render':
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, terminalOptions);
                responseText += `✅ **QR renderizado en terminal**\n\n`;
                responseText += `📊 **Configuración aplicada:**\n`;
                responseText += `• Tamaño pequeño: ${terminalOptions.small ? 'Sí' : 'No'}\n`;
                responseText += `• Colores invertidos: ${terminalOptions.inverse ? 'Sí' : 'No'}\n`;
                responseText += `• Margen: ${terminalOptions.margin}\n`;
                responseText += `• Colores ANSI: ${terminalOptions.colorize ? 'Sí' : 'No'}\n\n`;
                break;
            case 'compare':
                // Renderizar con terminal
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, terminalOptions);
                responseText += `✅ **QR terminal renderizado arriba**\n\n`;
                // Comparar con otros métodos si solicitado
                if (comparar_con.includes('local_png')) {
                    try {
                        const localResult = await localQRManager.generateQRLocal(deeplink);
                        responseText += `📁 **Comparación PNG local:** ${localResult.archivo_path}\n`;
                        responseText += `📊 Tamaño: ${(localResult.tamaño_bytes / 1024).toFixed(1)} KB\n`;
                    }
                    catch (error) {
                        responseText += `❌ **Error PNG local:** ${error instanceof Error ? error.message : 'Error desconocido'}\n`;
                    }
                }
                if (comparar_con.includes('base64_png')) {
                    try {
                        const base64Result = await qrGenerator.generateQR({ deeplink, formato: 'png' });
                        responseText += `📄 **Comparación Base64:** Generado exitosamente\n`;
                        responseText += `⏱️ Timestamp: ${base64Result.metadatos.timestamp}\n`;
                    }
                    catch (error) {
                        responseText += `❌ **Error Base64:** ${error instanceof Error ? error.message : 'Error desconocido'}\n`;
                    }
                }
                break;
            case 'validate':
                // Validar compatibilidad del terminal
                const compatibility = qrTerminalRenderer.validateTerminalCompatibility();
                responseText += `🔍 **Validación de Compatibilidad:**\n\n`;
                responseText += `✅ Compatible: ${compatibility.compatible ? 'Sí' : 'No'}\n`;
                responseText += `🎨 Colores ANSI: ${compatibility.features.ansiColors ? 'Soportado' : 'No soportado'}\n`;
                responseText += `🔤 Unicode: ${compatibility.features.unicodeSupport ? 'Soportado' : 'No soportado'}\n`;
                responseText += `📐 Tamaño fuente: ${compatibility.features.fontSize}\n\n`;
                if (compatibility.recommendations.length > 0) {
                    responseText += `💡 **Recomendaciones:**\n`;
                    compatibility.recommendations.forEach(rec => {
                        responseText += `• ${rec}\n`;
                    });
                }
                // Renderizar QR después de validación
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, terminalOptions);
                break;
            case 'demo':
                responseText += `🎯 **Demo Interactivo - Múltiples Configuraciones**\n\n`;
                // Demo con configuración normal
                responseText += `### Configuración Normal:\n`;
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, { small: false, inverse: false });
                responseText += `### Configuración Compacta:\n`;
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, { small: true, inverse: false });
                responseText += `### Configuración Inversa:\n`;
                await qrTerminalRenderer.renderDirectToTerminal(deeplink, { small: false, inverse: true });
                responseText += `✅ **Demo completado** - Revisa los QR generados arriba\n`;
                break;
        }
        responseText += `\n📱 **Instrucciones:**\n`;
        responseText += `1. Escanea cualquier QR mostrado arriba con tu móvil\n`;
        responseText += `2. Verifica que abre Radix Wallet correctamente\n`;
        responseText += `3. Confirma que la transacción es la esperada\n\n`;
        responseText += `🔧 **Para testing adicional:**\n`;
        responseText += `• Usa \`debug-qr-terminal.js\` para testing interactivo\n`;
        responseText += `• Prueba con diferentes configuraciones usando 'opciones'\n`;
        responseText += `• Compara métodos usando 'comparar_con'`;
        return {
            content: [{
                    type: "text",
                    text: responseText
                }]
        };
    }
    catch (error) {
        console.error("DEBUG - Error en test_qr_terminal:", error);
        return {
            content: [{
                    type: "text",
                    text: `❌ **Error en testing QR terminal**\n\n${error instanceof Error ? error.message : 'Error desconocido'}\n\n💡 **Verificaciones:**\n• Deep link válido de Radix Wallet\n• Terminal compatible con Unicode\n• qrcode-terminal instalado correctamente`
                }]
        };
    }
});
server.prompt("transferir_xrd", "Transferir XRD entre wallets con validaciones automáticas", {
    fromAddress: z.string().describe("Dirección de la wallet origen (debe ser una dirección válida de Stokenet que comience con 'account_tdx_2_')"),
    toAddress: z.string().describe("Dirección de la wallet destino (debe ser una dirección válida de Stokenet que comience con 'account_tdx_2_')"),
    amount: z.string().describe("Cantidad de XRD a transferir (ejemplo: 10.5, 1, 0.1)"),
    message: z.string().optional().describe("Mensaje opcional para la transferencia")
}, async (args) => {
    const { fromAddress, toAddress, amount, message } = args;
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `# Transferir XRD en Stokenet

## Datos requeridos:

${fromAddress ? `✅ **Wallet Origen**: ${fromAddress}` : '❌ **Wallet Origen**: *Requerido*'}
${toAddress ? `✅ **Wallet Destino**: ${toAddress}` : '❌ **Wallet Destino**: *Requerido*'}  
${amount ? `✅ **Cantidad**: ${amount} XRD` : '❌ **Cantidad**: *Requerido*'}
${message ? `📝 **Mensaje**: ${message}` : '📝 **Mensaje**: Opcional'}

## Formato:

- **Direcciones**: \`account_tdx_2_...\` (formato Stokenet)
- **Cantidad**: Número decimal (ej: \`10\`, \`5.5\`, \`0.1\`)

## Pasos a seguir:

1. **Generar deep link**: Usa \`xrd_transaccion\` con los datos requeridos
2. **Crear QR local**: Usa \`deeplink_to_qr_local\` con el deep link obtenido
3. **Abrir imagen**: Usa \`Powershell-Tool\` con \`Start-Process "ms-photos:viewer?fileName=<path_archivo>"\` para visualizar el QR`
                }
            }
        ]
    };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Simple MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
