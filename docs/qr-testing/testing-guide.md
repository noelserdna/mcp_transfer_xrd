# 🧪 Guía de Testing QR - Sistema MCP RadixDLT

## 📋 Resumen Ejecutivo

Esta guía proporciona instrucciones completas para usar el sistema de testing QR del servidor MCP RadixDLT. El sistema incluye herramientas para generar, validar y probar códigos QR con deep links de Radix Wallet, tanto para desarrollo como para producción.

## 🛠️ Herramientas Disponibles

### 1. `test_qr_terminal` (Herramienta Principal)
**Función**: Testing comprehensivo de QR codes en terminal con validación móvil
**Uso**: Validar QR codes antes de despliegue en producción

### 2. `deeplink_to_qr_local` (Generación Local)
**Función**: Genera archivos PNG locales para testing y compartir
**Uso**: Crear QR persistentes para testing manual con dispositivos móviles

### 3. `deeplink_to_qr` (Generación Base64)
**Función**: Genera QR en formato SVG/PNG Base64
**Uso**: Testing rápido y validación de formato

## 📱 Workflow Paso a Paso

### Paso 1: Generar Transacción XRD
```bash
# En Claude Desktop o terminal MCP
xrd_transaccion {
  "fromAddress": "account_tdx_2_...",
  "toAddress": "account_tdx_2_...", 
  "amount": "10.5",
  "message": "Test transaction"
}
```

### Paso 2: Crear QR Local para Testing
```bash
# Generar QR PNG optimizado para móvil
deeplink_to_qr_local {
  "deeplink": "radixwallet://...",
  "tamaño": 512,
  "calidad": "high"
}
```

### Paso 3: Testing Terminal (Recomendado)
```bash
# Probar QR con validación comprehensiva
test_qr_terminal {
  "qr_source": "/path/to/qr-file.png",
  "test_mode": "comprehensive",
  "validate_mobile": true
}
```

### Paso 4: Validación Móvil
1. **Escaneo directo**: Usar cámara del dispositivo móvil
2. **Apps de QR**: Probar con diferentes lectores QR
3. **Radix Wallet**: Verificar apertura correcta en la app

## 🎯 Casos de Uso Principales

### Caso 1: Testing de Desarrollo
**Objetivo**: Validar QR durante desarrollo de features
**Herramientas**: `deeplink_to_qr` + validación manual
**Tiempo**: ~2 minutos

```bash
# 1. Generar QR rápido
deeplink_to_qr {
  "deeplink": "radixwallet://test",
  "formato": "png"
}

# 2. Validar formato manualmente
# 3. Proceder con desarrollo
```

### Caso 2: Testing Pre-Producción
**Objetivo**: Validación completa antes de release
**Herramientas**: `test_qr_terminal` + testing móvil
**Tiempo**: ~10 minutos

```bash
# 1. Generar QR local
deeplink_to_qr_local {
  "deeplink": "radixwallet://production-link",
  "tamaño": 1024,
  "calidad": "max"
}

# 2. Testing automático
test_qr_terminal {
  "qr_source": "qrimages/qr-hash-timestamp.png",
  "test_mode": "production",
  "validate_mobile": true,
  "generate_report": true
}

# 3. Testing manual con múltiples dispositivos
# 4. Documentar resultados
```

### Caso 3: Troubleshooting
**Objetivo**: Diagnósticar problemas con QR codes
**Herramientas**: Todas las herramientas + validación detallada
**Tiempo**: ~15 minutos

```bash
# 1. Re-generar QR con configuración debug
deeplink_to_qr_local {
  "deeplink": "problema-deeplink",
  "tamaño": 2048,
  "calidad": "max"
}

# 2. Análisis detallado
test_qr_terminal {
  "qr_source": "qrimages/debug-qr.png", 
  "test_mode": "debug",
  "validate_structure": true,
  "validate_mobile": true,
  "export_metadata": true
}

# 3. Revisar logs y metadatos
# 4. Aplicar fixes basados en resultados
```

## 🔧 Configuraciones Recomendadas

### Configuración por Entorno

**Desarrollo Local**:
```json
{
  "tamaño": 256,
  "calidad": "medium", 
  "error_correction": "M",
  "test_mode": "basic"
}
```

**Testing/Staging**:
```json
{
  "tamaño": 512,
  "calidad": "high",
  "error_correction": "H", 
  "test_mode": "comprehensive"
}
```

**Producción**:
```json
{
  "tamaño": 1024,
  "calidad": "max",
  "error_correction": "H",
  "test_mode": "production"
}
```

### Configuración por Tipo de Deep Link

**URLs Cortas** (< 100 caracteres):
- Tamaño: 256px
- Error Correction: L o M
- Tiempo generación: <100ms

**URLs Medias** (100-500 caracteres):
- Tamaño: 512px  
- Error Correction: M o H
- Tiempo generación: <200ms

**URLs Largas** (> 500 caracteres):
- Tamaño: 1024px o 2048px
- Error Correction: H obligatorio
- Tiempo generación: <300ms

## 📊 Criterios de Calidad

### Métricas de Performance
- **Tiempo de generación**: < 300ms (crítico: < 500ms)
- **Tamaño de archivo**: < 50KB (warning: > 75KB)
- **Tasa de escaneado**: > 95% en dispositivos móviles
- **Tiempo de escaneado**: < 3 segundos

### Métricas de Calidad
- **Densidad de datos**: Óptima para el contenido
- **Contraste**: Mínimo 7:1 para accesibilidad
- **Márgenes**: 4+ módulos de espacio blanco
- **Error correction**: Apropiado para el uso

### Validaciones Automáticas
```bash
✅ Formato PNG válido
✅ Dimensiones correctas
✅ Deep link extraíble  
✅ Protocolo Radix válido
✅ Tamaño archivo dentro de límites
✅ Error correction level apropiado
```

## 🚨 Troubleshooting Común

### Problema: QR No Escaneable
**Síntomas**: Dispositivos móviles no pueden leer el QR
**Causas Comunes**:
- Tamaño muy pequeño (< 256px)
- Error correction level muy bajo
- Contraste insuficiente
- Márgenes muy pequeños

**Soluciones**:
```bash
# 1. Regenerar con configuración high
deeplink_to_qr_local {
  "deeplink": "tu-deeplink",
  "tamaño": 1024,
  "calidad": "max"
}

# 2. Validar con test_qr_terminal
test_qr_terminal {
  "qr_source": "nuevo-qr.png",
  "validate_mobile": true
}
```

### Problema: Deep Link Muy Largo
**Síntomas**: Warning de URL larga, QR muy denso
**Causas Comunes**:
- URLs de Radix muy largas (> 1000 caracteres)
- Parámetros excesivos en la transacción

**Soluciones**:
```bash
# 1. Usar tamaño grande y máxima corrección
deeplink_to_qr_local {
  "deeplink": "url-larga",
  "tamaño": 2048,
  "calidad": "max"
}

# 2. Considerar acortar parámetros si es posible
```

### Problema: Archivo No Generado
**Síntomas**: Error de escritura, archivo no existe
**Causas Comunes**:
- Permisos de directorio insuficientes
- Espacio en disco insuficiente
- Directorio no existe

**Soluciones**:
```bash
# 1. Verificar permisos
# 2. Usar directorio personalizado
deeplink_to_qr_local {
  "deeplink": "tu-deeplink",
  "directorio": "/path/con/permisos"
}
```

## 📈 Best Practices

### Para Developers
1. **Testing Temprano**: Probar QR codes en cada iteración
2. **Múltiples Tamaños**: Generar varias resoluciones para testing
3. **Validación Automática**: Usar `test_qr_terminal` en CI/CD
4. **Documentar Configuraciones**: Guardar settings exitosos

### Para Testing Manual
1. **Múltiples Dispositivos**: Probar en iOS y Android
2. **Diferentes Apps**: Camera nativa + apps QR especializadas  
3. **Condiciones de Luz**: Probar en diferentes ambientes
4. **Distancias**: Validar escaneado desde varias distancias

### Para Producción
1. **Redundancia**: Generar múltiples tamaños
2. **Monitoring**: Trackear métricas de escaneado
3. **Fallbacks**: Tener deep links alternativos
4. **Analytics**: Medir éxito de escaneado

## 🔗 Referencias Relacionadas

- **Configuración Matrix**: `docs/qr-testing/config-matrix.md`
- **Arquitectura Técnica**: `docs/qr-testing/architecture.md`
- **Developer Guide**: `docs/qr-testing/developer-guide.md`
- **Testing Procedures**: `docs/qr-testing/testing-procedures.md`
- **Plan Maestro**: `task/qr-local-png-generation-plan.md`

---

## 📞 Soporte y Contacto

**Para issues técnicos**: Revisar logs en `stderr` del servidor MCP
**Para configuración**: Consultar `config-matrix.md`
**Para arquitectura**: Revisar `architecture.md`
**Para desarrollo**: Seguir `developer-guide.md`

Esta guía es parte del ecosistema completo de documentación QR del servidor MCP RadixDLT.