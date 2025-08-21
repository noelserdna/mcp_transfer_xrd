import { describe, it, expect, beforeEach } from 'vitest';
import { QRGenerator } from '../src/helpers/qr-generator.js';
import { DeepLinkToQRParams, FormatoQR } from '../src/types/qr-types.js';

describe('QRGenerator', () => {
  let qrGenerator: QRGenerator;

  beforeEach(() => {
    qrGenerator = new QRGenerator();
  });

  describe('validateDeepLink', () => {
    it('debe validar deep links válidos de Radix Wallet', async () => {
      const validDeepLinks = [
        'radixwallet://transaction/abc123',
        'https://wallet.radixdlt.com/transaction/def456',
        'https://radixwallet.com/transfer/xyz789'
      ];

      for (const deeplink of validDeepLinks) {
        const params: DeepLinkToQRParams = { deeplink };
        await expect(qrGenerator.generateQR(params)).resolves.toBeDefined();
      }
    });

    it('debe rechazar deep links inválidos', async () => {
      const invalidDeepLinks = [
        '',
        'https://google.com',
        'mailto:test@example.com',
        'not-a-url',
        null as any,
        undefined as any
      ];

      for (const deeplink of invalidDeepLinks) {
        const params: DeepLinkToQRParams = { deeplink };
        await expect(qrGenerator.generateQR(params)).rejects.toThrow();
      }
    });
  });

  describe('generateSVG', () => {
    it('debe generar SVG válido', async () => {
      const deeplink = 'radixwallet://transaction/test123';
      const svg = await qrGenerator.generateSVG(deeplink);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(typeof svg).toBe('string');
      expect(svg.length).toBeGreaterThan(0);
    });

    it('debe generar SVG diferente para diferentes deep links', async () => {
      const deeplink1 = 'radixwallet://transaction/test123';
      const deeplink2 = 'radixwallet://transaction/test456';

      const svg1 = await qrGenerator.generateSVG(deeplink1);
      const svg2 = await qrGenerator.generateSVG(deeplink2);

      expect(svg1).not.toBe(svg2);
    });
  });

  describe('generatePNG', () => {
    it('debe generar PNG base64 válido', async () => {
      const deeplink = 'radixwallet://transaction/test123';
      const pngBase64 = await qrGenerator.generatePNG(deeplink);

      expect(typeof pngBase64).toBe('string');
      expect(pngBase64.length).toBeGreaterThan(0);
      // Base64 válido debe ser divisible por 4 después del padding
      expect(pngBase64.length % 4).toBe(0);
    });

    it('debe generar PNG con tamaño personalizado', async () => {
      const deeplink = 'radixwallet://transaction/test123';
      const size128 = await qrGenerator.generatePNG(deeplink, 128);
      const size512 = await qrGenerator.generatePNG(deeplink, 512);

      expect(typeof size128).toBe('string');
      expect(typeof size512).toBe('string');
      // PNG más grande debería tener más bytes (más caracteres base64)
      expect(size512.length).toBeGreaterThan(size128.length);
    });

    it('debe rechazar tamaños inválidos', async () => {
      const deeplink = 'radixwallet://transaction/test123';

      await expect(qrGenerator.generatePNG(deeplink, 0)).rejects.toThrow();
      await expect(qrGenerator.generatePNG(deeplink, -1)).rejects.toThrow();
      await expect(qrGenerator.generatePNG(deeplink, 3000)).rejects.toThrow();
    });
  });

  describe('generateQR', () => {
    const validDeeplink = 'radixwallet://transaction/test123';

    it('debe generar ambos formatos por defecto', async () => {
      const params: DeepLinkToQRParams = { deeplink: validDeeplink };
      const result = await qrGenerator.generateQR(params);

      expect(result.svg).toBeDefined();
      expect(result.png_base64).toBeDefined();
      expect(result.metadatos).toBeDefined();
      expect(result.metadatos.formatos_generados).toEqual(['SVG', 'PNG']);
    });

    it('debe generar solo SVG cuando se especifica', async () => {
      const params: DeepLinkToQRParams = { 
        deeplink: validDeeplink,
        formato: FormatoQR.SVG
      };
      const result = await qrGenerator.generateQR(params);

      expect(result.svg).toBeDefined();
      expect(result.png_base64).toBeUndefined();
      expect(result.metadatos.formatos_generados).toEqual(['SVG']);
    });

    it('debe generar solo PNG cuando se especifica', async () => {
      const params: DeepLinkToQRParams = { 
        deeplink: validDeeplink,
        formato: FormatoQR.PNG
      };
      const result = await qrGenerator.generateQR(params);

      expect(result.svg).toBeUndefined();
      expect(result.png_base64).toBeDefined();
      expect(result.metadatos.formatos_generados).toEqual(['PNG']);
    });

    it('debe incluir metadatos correctos', async () => {
      const params: DeepLinkToQRParams = { 
        deeplink: validDeeplink,
        tamaño: 512
      };
      const result = await qrGenerator.generateQR(params);

      expect(result.metadatos.url_original).toBe(validDeeplink);
      expect(result.metadatos.tamaño_png).toBe(512);
      expect(result.metadatos.timestamp).toBeDefined();
      expect(new Date(result.metadatos.timestamp)).toBeInstanceOf(Date);
    });

    it('debe manejar deep links largos correctamente', async () => {
      // Simular un deep link largo como los que genera Radix
      const longDeeplink = `radixwallet://transaction?${Array(500).fill('a').join('')}`;
      const params: DeepLinkToQRParams = { deeplink: longDeeplink };
      
      const result = await qrGenerator.generateQR(params);
      
      expect(result.svg).toBeDefined();
      expect(result.png_base64).toBeDefined();
      expect(result.metadatos.url_original).toBe(longDeeplink);
    });
  });

  describe('manejo de errores', () => {
    it('debe manejar errores de generación graciosamente', async () => {
      const invalidDeeplink = 'invalid-url';
      const params: DeepLinkToQRParams = { deeplink: invalidDeeplink };

      await expect(qrGenerator.generateQR(params)).rejects.toThrow('Deep link inválido');
    });

    it('debe proporcionar mensajes de error informativos', async () => {
      const params: DeepLinkToQRParams = { deeplink: '' };

      try {
        await qrGenerator.generateQR(params);
        expect.fail('Debería haber lanzado un error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Deep link inválido');
      }
    });
  });
});

describe('Integración con diferentes protocolos', () => {
  let qrGenerator: QRGenerator;

  beforeEach(() => {
    qrGenerator = new QRGenerator();
  });

  const protocolTests = [
    { protocol: 'radixwallet://', description: 'protocolo radixwallet' },
    { protocol: 'https://wallet.radixdlt.com/', description: 'URL oficial de wallet' },
    { protocol: 'https://radixwallet.com/', description: 'URL alternativa de wallet' }
  ];

  protocolTests.forEach(({ protocol, description }) => {
    it(`debe funcionar con ${description}`, async () => {
      const deeplink = `${protocol}transaction/test123`;
      const params: DeepLinkToQRParams = { deeplink };
      
      const result = await qrGenerator.generateQR(params);
      
      expect(result.svg).toBeDefined();
      expect(result.png_base64).toBeDefined();
      expect(result.metadatos.url_original).toBe(deeplink);
    });
  });
});