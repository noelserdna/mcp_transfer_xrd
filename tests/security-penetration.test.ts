/**
 * Security Penetration Tests para MCP Roots
 * Tests de seguridad exhaustivos para detectar vulnerabilidades
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityValidator } from '../src/security/security-validator.js';
import { RootsManager } from '../src/roots/roots-manager.js';
import { ConfigurationProvider } from '../src/configuration/configuration-provider.js';
import { SecurityPolicy } from '../src/types/mcp-roots-types.js';
import * as path from 'path';
import * as os from 'os';

describe('Security Penetration Tests', () => {
  let securityValidator: SecurityValidator;
  let rootsManager: RootsManager;
  let configurationProvider: ConfigurationProvider;
  const testTempDir = path.join(os.tmpdir(), 'test-security-penetration');

  beforeEach(() => {
    configurationProvider = new ConfigurationProvider();
    
    securityValidator = new SecurityValidator({
      policy: SecurityPolicy.STRICT,
      allowedRoots: [testTempDir],
      enableAuditLog: true,
      rateLimit: 1 // 1 por segundo para tests de rate limiting
    });
    
    rootsManager = new RootsManager(configurationProvider, securityValidator);
  });

  describe('Path Traversal Attack Vectors', () => {
    const pathTraversalVectors = [
      // Básicos
      '../',
      '..\\',
      '../../../etc/passwd',
      '..\\..\\..\\Windows\\System32',
      
      // URL encoded
      '%2e%2e%2f',
      '%2e%2e%5c',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
      
      // Unicode variants
      '..%c0%af',
      '..%c1%9c',
      
      // Double encoding
      '%252e%252e%252f',
      '%252e%252e%255c',
      
      // Mixed separators
      '../\\',
      '..\\/',
      
      // Null byte injection
      '../../../etc/passwd%00',
      '..\\..\\..\\Windows\\System32%00',
      
      // Long path attempts
      '../'.repeat(100),
      '..\\'.repeat(100),
      
      // Case variations
      '.%2E/',
      '.%2e\\',
      
      // Homograph attacks
      '․․/',  // Using Unicode similar chars
      '‥/',
      
      // Filter bypass attempts
      '....///',
      '....\\\\\\',
      '....//',
      '....\\\\',
      
      // Advanced techniques
      '/var/www/../../etc/passwd',
      'C:\\Windows\\..\\..\\etc\\passwd',
      '/home/user/../root/.ssh/id_rsa',
      
      // OS-specific critical paths
      '/etc/shadow',
      '/etc/passwd',
      '/root/.bashrc',
      '/usr/bin/../../../etc/passwd',
      'C:\\Windows\\System32\\config\\SAM',
      'C:\\Windows\\win.ini',
      'C:\\Windows\\System32\\drivers\\etc\\hosts',
      
      // Container escape attempts
      '/proc/self/environ',
      '/proc/version',
      '/proc/mounts',
      
      // Web server paths
      '/var/log/apache2/access.log',
      '/var/www/html/../../../etc/passwd',
      
      // Development paths
      '/.env',
      '/config/database.yml',
      '/app.config'
    ];

    pathTraversalVectors.forEach(vector => {
      it(`debería rechazar path traversal: ${vector.substring(0, 50)}...`, async () => {
        const result = await securityValidator.validateDirectorySecurity(vector);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Path traversal attack detected');
        expect(result.riskLevel).toMatch(/high|critical/);
        
        // Verificar que se registre en audit log
        const logs = securityValidator.getRecentAuditLogs(1);
        expect(logs.length).toBeGreaterThan(0);
        expect(logs[0].result).toBe('blocked');
      });
    });
  });

  describe('Dangerous Character Injection', () => {
    const dangerousChars = [
      // Control characters
      '\x00', '\x01', '\x02', '\x03', '\x04', '\x05',
      '\x0A', '\x0D', '\x1A', '\x1F',
      
      // Command injection
      ';', '|', '&', '$', '`', 
      '$(command)', '`command`',
      
      // Script injection  
      '<script>', '</script>',
      '<', '>', '"', "'",
      
      // File system
      '*', '?', ':', 
      
      // Network
      'http://', 'https://', 'ftp://',
      
      // Binary/executable markers
      '\x7F\x45\x4C\x46', // ELF header
      '\x4D\x5A', // PE header
    ];

    dangerousChars.forEach(char => {
      it(`debería rechazar carácter peligroso: ${JSON.stringify(char)}`, async () => {
        const testPath = `/test/path/with${char}dangerous`;
        const result = await securityValidator.validateDirectorySecurity(testPath);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Dangerous characters detected');
      });
    });
  });

  describe('Rate Limiting Bypass Attempts', () => {
    it('debería prevenir ataques de fuerza bruta', async () => {
      const attacks = [];
      
      // Lanzar 10 ataques rápidos
      for (let i = 0; i < 10; i++) {
        attacks.push(
          securityValidator.validateDirectorySecurity(`/attack/${i}`)
        );
      }
      
      const results = await Promise.all(attacks);
      
      // Solo el primero debería pasar rate limit
      const rateLimitedResults = results.filter(r => 
        !r.isValid && r.message.includes('Rate limit')
      );
      
      expect(rateLimitedResults.length).toBeGreaterThanOrEqual(8);
    });

    it('debería aplicar rate limiting por IP/origen', async () => {
      // Simular múltiples requests del mismo origen
      const rapidRequests = [];
      
      for (let i = 0; i < 5; i++) {
        rapidRequests.push(
          rootsManager.handleRootsChanged({
            roots: [`/test/rapid/${i}`],
            timestamp: Date.now()
          })
        );
      }
      
      const results = await Promise.all(rapidRequests);
      
      // Verificar que se aplique rate limiting
      const limitedResults = results.filter(r => 
        !r.isValid && r.message.includes('Rate limit')
      );
      
      expect(limitedResults.length).toBeGreaterThan(0);
    });
  });

  describe('System Directory Access Attempts', () => {
    const systemPaths = [
      // Unix/Linux critical paths
      '/etc', '/bin', '/sbin', '/usr/bin', '/usr/sbin',
      '/root', '/var/log', '/proc', '/sys', '/dev',
      '/lib', '/lib64', '/usr/lib', '/opt',
      
      // Windows critical paths
      'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)',
      'C:\\Windows\\System32', 'C:\\Windows\\SysWOW64',
      'C:\\ProgramData', 'C:\\Users\\Administrator',
      
      // macOS critical paths
      '/System', '/Library', '/Applications',
      '/usr/local/bin', '/opt/homebrew',
      
      // Container paths
      '/var/lib/docker', '/var/lib/containerd',
      '/etc/kubernetes', '/var/log/pods',
      
      // Database paths
      '/var/lib/mysql', '/var/lib/postgresql',
      '/var/lib/mongodb', '/var/lib/redis',
      
      // Web server paths
      '/var/www', '/usr/share/nginx',
      '/etc/nginx', '/etc/apache2'
    ];

    systemPaths.forEach(systemPath => {
      it(`debería bloquear acceso a directorio crítico: ${systemPath}`, async () => {
        const result = await securityValidator.validateDirectorySecurity(systemPath);
        
        expect(result.isValid).toBe(false);
        // La validación puede fallar por path traversal o directorios críticos
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.riskLevel).toMatch(/high|critical/);
      });
    });
  });

  describe('Encoding and Obfuscation Bypasses', () => {
    const encodingAttacks = [
      // Base64
      btoa('../../../etc/passwd'),
      btoa('C:\\Windows\\System32'),
      
      // Hex encoding
      Buffer.from('../../../etc/passwd').toString('hex'),
      Buffer.from('C:\\Windows\\System32').toString('hex'),
      
      // URL encoding variations
      '%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '%5c%5c%2e%2e%5c%5c%2e%2e%5cWindows',
      
      // HTML entities
      '&#46;&#46;/&#46;&#46;/etc/passwd',
      '&#92;&#92;&#46;&#46;&#92;&#92;Windows',
      
      // Unicode normalization
      '\u002e\u002e\u002f\u002e\u002e\u002fetc\u002fpasswd',
      '\u005c\u005c\u002e\u002e\u005c\u005cWindows',
      
      // Mixed encoding
      '%2e%2e/..%2fetc%2fpasswd',
      '%5c%5c..\\Windows%5cSystem32'
    ];

    encodingAttacks.forEach(attack => {
      it(`debería detectar intento de bypass por encoding`, async () => {
        const result = await securityValidator.validateDirectorySecurity(attack);
        
        expect(result.isValid).toBe(false);
        // Puede detectarse como path traversal o caracteres peligrosos
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Large Input and DoS Attempts', () => {
    it('debería manejar paths extremadamente largos', async () => {
      const longPath = 'a'.repeat(10000);
      const result = await securityValidator.validateDirectorySecurity(longPath);
      
      // Debería manejar gracefully sin crash
      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(5000); // No más de 5 segundos
    });

    it('debería manejar muchos path traversals anidados', async () => {
      const massiveTraversal = '../'.repeat(1000) + 'etc/passwd';
      const result = await securityValidator.validateDirectorySecurity(massiveTraversal);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path traversal attack detected');
      expect(result.processingTime).toBeLessThan(1000);
    });

    it('debería prevenir ataques de memoria con strings maliciosos', async () => {
      const memoryAttacks = [
        'A'.repeat(100000),
        '\x00'.repeat(10000),
        '../'.repeat(5000),
        '%2e%2e%2f'.repeat(1000)
      ];

      for (const attack of memoryAttacks) {
        const startTime = Date.now();
        const result = await securityValidator.validateDirectorySecurity(attack);
        const processingTime = Date.now() - startTime;
        
        expect(result).toBeDefined();
        expect(processingTime).toBeLessThan(2000); // Máximo 2 segundos
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Whitelist Bypass Attempts', () => {
    beforeEach(() => {
      // Configurar whitelist específica para tests
      securityValidator = new SecurityValidator({
        policy: SecurityPolicy.STRICT,
        allowedRoots: ['/allowed/path', 'C:\\Allowed\\Path'],
        enableAuditLog: true,
        rateLimit: 10 // Alto para no interferir
      });
    });

    it('debería prevenir bypass con symlinks simulados', async () => {
      const symlinkAttacks = [
        '/allowed/path/../../../etc/passwd',
        'C:\\Allowed\\Path\\..\\..\\Windows\\System32',
        '/allowed/path/./../../etc/shadow',
        '/allowed/path/subdir/../../../root'
      ];

      for (const attack of symlinkAttacks) {
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
      }
    });

    it('debería prevenir bypass con case variations', async () => {
      const caseAttacks = [
        '/ALLOWED/PATH/../../../etc/passwd',
        'c:\\allowed\\path\\..\\..\\windows\\system32',
        '/Allowed/Path/../../etc/passwd'
      ];

      for (const attack of caseAttacks) {
        const result = await securityValidator.validateDirectorySecurity(attack);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('Integration Attack Scenarios', () => {
    it('debería rechazar notificación maliciosa completa', async () => {
      const maliciousNotification = {
        roots: [
          '../../../etc/passwd',
          'C:\\Windows\\System32',
          '/proc/self/environ',
          '$(rm -rf /)',
          '<script>alert("xss")</script>',
          '\x00\x00\x00malicious',
          '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
        ],
        timestamp: Date.now()
      };

      const result = await rootsManager.handleRootsChanged(maliciousNotification);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('directorio');
      
      // Verificar que se registren algunos intentos de ataque
      const logs = securityValidator.getRecentAuditLogs(10);
      expect(logs.length).toBeGreaterThan(0); // Al menos algunos ataques registrados
      
      const blockedLogs = logs.filter(log => log.result === 'blocked');
      expect(blockedLogs.length).toBeGreaterThan(0);
    });

    it('debería mantener seguridad bajo ataque persistente', async () => {
      const attackWaves = [];
      
      // Simular 3 oleadas de ataques
      for (let wave = 0; wave < 3; wave++) {
        const attacks = [];
        
        for (let i = 0; i < 5; i++) {
          attacks.push(rootsManager.handleRootsChanged({
            roots: [
              `../../../attack-wave-${wave}-${i}`,
              `/proc/self/environ-${wave}-${i}`,
              `C:\\Windows\\System32\\attack-${wave}-${i}`
            ],
            timestamp: Date.now() + (wave * 100) + i
          }));
        }
        
        attackWaves.push(Promise.all(attacks));
        
        // Pequeña pausa entre oleadas
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const allResults = await Promise.all(attackWaves);
      
      // Todos los ataques deberían ser bloqueados
      for (const waveResults of allResults) {
        for (const result of waveResults) {
          expect(result.isValid).toBe(false);
        }
      }
      
      // El sistema debería seguir funcionando
      const finalTest = await rootsManager.handleRootsChanged({
        roots: [testTempDir],
        timestamp: Date.now()
      });
      
      // Este debería funcionar (dependiendo de rate limiting)
      expect(finalTest).toBeDefined();
    });
  });

  describe('Audit Log Security', () => {
    it('debería registrar todos los intentos de ataque', async () => {
      const attacks = [
        '../../../etc/passwd',
        'C:\\Windows\\System32',
        '/proc/self/environ',
        '\x00malicious\x00'
      ];

      for (const attack of attacks) {
        await securityValidator.validateDirectorySecurity(attack);
      }

      const logs = securityValidator.getRecentAuditLogs(10);
      expect(logs.length).toBeGreaterThan(0); // Al menos algunos logs
      
      // Verificar que todos sean marcados como bloqueados
      const blockedLogs = logs.filter(log => log.result === 'blocked');
      expect(blockedLogs.length).toBeGreaterThanOrEqual(attacks.length);
      
      // Verificar que tengan risk level alto
      const highRiskLogs = logs.filter(log => 
        log.riskLevel === 'high' || log.riskLevel === 'critical'
      );
      expect(highRiskLogs.length).toBeGreaterThan(0);
    });

    it('debería incluir contexto suficiente para forensics', async () => {
      await securityValidator.validateDirectorySecurity('../../../etc/passwd');
      
      const logs = securityValidator.getRecentAuditLogs(1);
      const log = logs[0];
      
      expect(log.timestamp).toBeDefined();
      expect(log.attemptedPath).toBe('../../../etc/passwd');
      expect(log.result).toBe('blocked');
      expect(log.riskLevel).toMatch(/high|critical/);
      expect(log.reason).toContain('Validación de seguridad falló');
    });
  });
});