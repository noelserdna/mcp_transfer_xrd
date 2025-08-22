#!/usr/bin/env node
/**
 * Test rápido para validar qrcode-terminal
 */

import qrcode from 'qrcode-terminal';

// Deep link de ejemplo
const testDeepLink = "radixwallet://transaction/send?to=account_tdx_2_128g70quz3ugxqrj94s7j0uc4xy8jeygs0vutjfamn30urnxn3s52ct&amount=10&resource=resource_tdx_2_1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxtfd2jc";

console.log('🔬 Quick QR Terminal Test');
console.log('========================\n');

console.log(`📏 Deep link length: ${testDeepLink.length} characters`);
console.log(`🔗 Protocol: ${testDeepLink.startsWith('radixwallet://') ? 'radixwallet://' : 'other'}`);
console.log(`💡 Recommended config: ${testDeepLink.length < 400 ? 'Error H' : testDeepLink.length < 800 ? 'Error M' : 'Error L'}\n`);

console.log('=== QR CODE NORMAL ===');
qrcode.generate(testDeepLink, { small: false });

console.log('\n=== QR CODE SMALL ===');
qrcode.generate(testDeepLink, { small: true });

console.log('\n📱 Escanea cualquiera de los QR arriba con tu móvil');
console.log('✅ Verifica que abre Radix Wallet correctamente');

console.log('\n🎯 Test completado exitosamente!');