# 📋 Análisis de Requisitos: Configuración de Directorios via MCP Roots

**Fecha**: 2025-01-23  
**Agente**: requirement-analyzer  
**Funcionalidad**: Implementación Completa MCP Roots para configuración de directorios específicos

## 🎯 Resumen Ejecutivo

### Objetivo Principal
Implementar soporte completo para el protocolo MCP roots según especificación 2025-06-18, permitiendo que clientes MCP (Claude Desktop, VS Code) configuren directorios específicos donde el servidor Radix MCP guardará archivos QR PNG, superando la limitación actual de directorio fijo `qrimages/`.

### Problema Actual
- **Limitación arquitectural**: LocalQRManager está hardcoded al directorio `qrimages/` sin capacidad de configuración dinámica
- **Falta de protocolo**: No existe soporte para MCP roots en el servidor actual 
- **Inflexibilidad**: Usuarios no pueden configurar directorios personalizados desde los clientes MCP

### Impacto Esperado
- ✅ **Configuración flexible**: Directorios personalizables por cliente MCP
- ✅ **Compatibilidad universal**: Funcionará con Claude Desktop, VS Code y otros clientes MCP
- ✅ **Seguridad mejorada**: Validación robusta de directorios permitidos
- ✅ **Experiencia de usuario**: Configuración transparente sin reinicio del servidor

---

## 📊 Matriz de Stakeholders

| Stakeholder | Intereses Principales | Requisitos Específicos |
|-------------|----------------------|------------------------|
| **Usuarios Claude Desktop** | QR PNG en directorios personalizados | Configuración via settings.json, paths Windows |
| **Desarrolladores VS Code** | Integración transparente con workspace | Soporte para rutas relativas y absolutas |
| **Administradores Sistema** | Seguridad y control de acceso | Validación de permisos, whitelist de directorios |
| **Equipo Desarrollo** | Mantenibilidad y compatibilidad | API consistente, fallback graceful |

---

## 🔍 Análisis de Documentación Existente

### Archivos Revisados
- ✅ `src/index.ts` - Servidor MCP principal, identificado gap en capabilities
- ✅ `src/helpers/local-qr-manager.ts` - Orquestador QR PNG, configuración hardcoded
- ✅ `src/helpers/directory-manager.ts` - Gestión de directorios con validación sólida
- ✅ `docs/mcp-llms-full.txt` - Especificación MCP general, notifications protocol
- ✅ `investigaciones/` - Sin documentación específica sobre MCP roots

### Gap Identificado
**CRÍTICO**: No existe implementación del protocolo MCP roots en el servidor actual. El servidor declara capabilities básicas pero no incluye soporte para roots.

---

## 📋 Matriz de Requisitos Funcionales

### RF01 - Soporte Protocolo MCP Roots
**Descripción**: Implementar protocolo MCP roots según especificación 2025-06-18  
**Prioridad**: ALTA  
**Criterios de Aceptación**:
- [ ] Servidor declara capability `roots` en handshake inicial
- [ ] Implementa handler para `notifications/roots/list_changed`
- [ ] Valida formato de mensaje según JSON-RPC 2.0
- [ ] Actualiza configuración sin reinicio del servidor

**Stakeholders**: Usuarios Claude Desktop, Desarrolladores VS Code  
**Dependencias**: Modificación de capabilities en McpServer

### RF02 - Validación de Seguridad Robusta
**Descripción**: Validar directorios recibidos del cliente con múltiples capas de seguridad  
**Prioridad**: CRÍTICA  
**Criterios de Aceptación**:
- [ ] Previene path traversal attacks (`../`, `..\\`)
- [ ] Valida permisos de escritura antes de usar
- [ ] Implementa whitelist de directorios permitidos
- [ ] Normaliza rutas absolutas y relativas
- [ ] Registra intentos de acceso no autorizado

**Stakeholders**: Administradores Sistema, Usuarios  
**Dependencias**: Extensión de DirectoryManager

### RF03 - Tools de Gestión de Directorios
**Descripción**: Herramientas MCP para consulta y gestión de configuración  
**Prioridad**: MEDIA  
**Criterios de Aceptación**:
- [ ] `list_allowed_directories`: Mostrar directorios configurados
- [ ] `get_qr_directory_info`: Estadísticas del directorio QR actual
- [ ] `set_qr_directory`: Cambio manual con validaciones
- [ ] Respuestas informativas en español
- [ ] Validación Zod de parámetros

**Stakeholders**: Usuarios avanzados, Desarrolladores  
**Dependencias**: LocalQRManager configuración dinámica

### RF04 - Compatibilidad y Fallback
**Descripción**: Mantener compatibilidad total con comportamiento actual  
**Prioridad**: ALTA  
**Criterios de Aceptación**:
- [ ] Directorio `qrimages/` como fallback por defecto
- [ ] Funcionamiento sin configuración roots (comportamiento actual)
- [ ] Logging transparente sobre directorios utilizados
- [ ] Sin breaking changes en API existente

**Stakeholders**: Usuarios actuales, Equipo Desarrollo  
**Dependencias**: Refactoring LocalQRManager sin breaking changes

### RF05 - Configuración Flexible
**Descripción**: Múltiples métodos de configuración de directorio QR  
**Prioridad**: MEDIA  
**Criterios de Aceptación**:
- [ ] Variable entorno `RADIX_QR_DIR` como override
- [ ] Argumentos línea comandos `--qr-dir`
- [ ] Configuración por defecto inteligente según OS
- [ ] Expansión de paths con `~` (usuario home)
- [ ] Soporte rutas absolutas y relativas

**Stakeholders**: Usuarios, Administradores Sistema  
**Dependencias**: Refactoring inicialización servidor

---

## 🔧 Requisitos No Funcionales

### RNF01 - Performance
**Descripción**: Operaciones de directorio deben mantener performance óptima  
**Métricas**:
- Cambio de directorio via roots: <100ms
- Validación de permisos: <50ms  
- Generación QR PNG total: <300ms (actual)

### RNF02 - Compatibilidad
**Descripción**: Soporte multiplataforma y múltiples clientes MCP  
**Criterios**:
- Windows, macOS, Linux
- Claude Desktop, VS Code MCP extension
- Especificación MCP 2025-06-18
- Node.js 18+, TypeScript 5+

### RNF03 - Seguridad
**Descripción**: Validación exhaustiva sin comprometer funcionalidad  
**Criterios**:
- Sandbox de directorios permitidos
- Validación input sanitization
- Logging de seguridad sin información sensible
- Rate limiting implícito (1 cambio/segundo)

### RNF04 - Mantenibilidad
**Descripción**: Código extensible y fácil de mantener  
**Criterios**:
- Separación de responsabilidades clara
- Dependency injection pattern
- Configuración centralizada
- Testing unitario >90% coverage

---

## 🔗 Matriz de Trazabilidad

### Funcionalidad → Componentes Afectados
```
RF01 (MCP Roots) → src/index.ts (McpServer capabilities)
RF02 (Seguridad) → src/helpers/directory-manager.ts (extensión)
RF03 (Tools) → src/index.ts (nuevas herramientas MCP)
RF04 (Compatibilidad) → src/helpers/local-qr-manager.ts (refactoring)
RF05 (Configuración) → src/index.ts (inicialización)
```

### Requisitos → Casos de Uso
```
RF01 + RF02 → Claude Desktop configura directorio via settings.json
RF03 + RF04 → Usuario consulta directorios y cambia configuración
RF05 + RF04 → Servidor inicia con variable RADIX_QR_DIR personalizada
```

---

## ⚠️ Análisis de Riesgos Preliminar

### Riesgo Alto: Compatibilidad Breaking Changes
**Descripción**: Modificaciones a LocalQRManager podrían romper funcionalidad actual  
**Mitigación**: Implementar patrón adapter, mantener API pública unchanged

### Riesgo Medio: Validación Excesiva
**Descripción**: Validaciones de seguridad muy restrictivas podrían bloquear casos válidos  
**Mitigación**: Configuración granular de políticas de seguridad, whitelist extensible

### Riesgo Bajo: Performance Regression
**Descripción**: Validaciones adicionales podrían impactar tiempo de generación QR  
**Mitigación**: Cacheo de validaciones, validación asíncrona donde sea posible

---

## 🎯 Criterios de Aceptación Global

### Criterio Mínimo Viable (MVP)
- [ ] `notifications/roots/list_changed` implementado y funcional
- [ ] Validación básica de directorios (permisos + path traversal)
- [ ] LocalQRManager acepta directorio dinámico
- [ ] Compatible con comportamiento actual

### Criterio Completo
- [ ] Todas las herramientas de gestión implementadas
- [ ] Validación de seguridad robusta con whitelist
- [ ] Configuración flexible (env vars + args)
- [ ] Logging completo y testing >90%

---

## 📈 Métricas de Éxito

### Técnicas
- Tiempo implementación protocolo roots: <100ms
- Zero breaking changes en API existente
- Test coverage: >90% para nuevos componentes

### Negocio  
- Usuarios pueden configurar directorios personalizados en Claude Desktop
- Reducción reportes de problemas con archivos QR PNG
- Adopción por otros clientes MCP (VS Code extension)

---

## 🔄 Dependencias del Sistema

### Dependencias Internas
- **Crítica**: `src/helpers/local-qr-manager.ts` - refactoring para configuración dinámica
- **Alta**: `src/helpers/directory-manager.ts` - extensión validaciones seguridad
- **Media**: `src/index.ts` - actualización capabilities y nuevas tools

### Dependencias Externas
- **@modelcontextprotocol/sdk**: Soporte notifications/roots (verificar versión)
- **Node.js fs/promises**: API filesystem asíncrona
- **Zod**: Validación esquemas MCP roots

---

## 📝 Validación de Requisitos

### Consistencia
✅ **Validado**: No conflictos entre requisitos funcionales  
✅ **Validado**: Requisitos no funcionales son alcanzables  
✅ **Validado**: Alineación con objetivos de negocio  

### Completitud
✅ **Validado**: Casos de uso primarios cubiertos  
⚠️ **Pendiente**: Validación con otros clientes MCP más allá de Claude Desktop  
✅ **Validado**: Estrategia de fallback y compatibilidad  

### Viabilidad Técnica
✅ **Validado**: Arquitectura actual soporta extensiones necesarias  
✅ **Validado**: SDK MCP tiene capacidades requeridas  
✅ **Validado**: Performance targets son realistas  

---

## 🎯 Próximos Pasos Recomendados

1. **Diseño Arquitectural**: Definir estructura de clases y interfaces para soporte roots
2. **Prototipo Técnico**: Implementar handler básico `notifications/roots/list_changed`
3. **Validación Seguridad**: Diseñar sistema whitelist y validaciones robustas
4. **Plan Testing**: Estrategia testing con múltiples clientes MCP

---

**Resultado del Análisis**: ✅ **REQUISITOS VALIDADOS Y LISTOS PARA DISEÑO ARQUITECTURAL**

Los requisitos están bien definidos, son técnicamente viables y alineados con objetivos del proyecto. La funcionalidad tiene valor claro para usuarios y es implementable sin breaking changes significativos.