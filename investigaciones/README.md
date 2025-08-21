# Investigaciones del Proyecto

Esta carpeta contiene toda la documentación de investigación generada por los sub-agentes durante el desarrollo del proyecto.

## Estructura de Archivos

### 📋 Índice de Investigaciones

#### ✅ Completadas (Fase 0 - Base)
- `radix-gateway-api.md` - Documentación completa de Radix Gateway API (actualizada con GitHub findings)
- `balance-verification-methods.md` - Métodos de verificación de balances XRD
- `address-validation-patterns.md` - Patrones de validación de direcciones Stokenet
- `error-handling-strategies.md` - Estrategias de manejo de errores

#### ✅ Completadas (Fase 1 - GitHub Integration)
- `radix-dapp-toolkit-integration.md` - Análisis completo de radix-dapp-toolkit vs implementación actual
- `official-examples-analysis.md` - Análisis exhaustivo del repositorio official-examples de RadixDLT
- `github-integration-summary.md` - Síntesis consolidada con roadmap de mejoras implementables

#### 🔄 Pendientes (Fases posteriores)
- `api-implementation-details.md` - Decisiones de implementación y patrones recomendados
- `validation-implementation.md` - Patrones implementados y casos de test
- `performance-optimization.md` - Optimizaciones de rendimiento y cache
- `testing-strategies.md` - Estrategias de testing para componentes Radix

## Convenciones

### Formato de Archivos
Todos los archivos de investigación siguen esta estructura:

```markdown
# Título de la Investigación

## 📋 Resumen Ejecutivo
Resumen de 2-3 líneas de los hallazgos principales

## 🎯 Objetivo de la Investigación
Por qué se realizó esta investigación

## 🔍 Metodología
Cómo se realizó la investigación

## 📊 Hallazgos
Resultados detallados con ejemplos

## 💡 Recomendaciones
Acciones específicas recomendadas

## 🔗 Referencias
Enlaces y recursos utilizados

## 📅 Metadata
- **Fecha**: YYYY-MM-DD
- **Sub-agente**: Nombre del sub-agente
- **Estado**: Completado/En progreso
- **Versión**: X.X
```

### Nombrado de Archivos
- Usar kebab-case: `radix-gateway-api.md`
- Incluir fecha si hay múltiples versiones: `radix-gateway-api-2025-08-18.md`
- Usar prefijos para categorizar:
  - `api-` para investigaciones de API
  - `validation-` para validaciones
  - `performance-` para optimizaciones
  - `testing-` para estrategias de pruebas

### Actualización de Referencias
Cada vez que se crea un nuevo archivo de investigación:
1. Actualizar este README.md
2. Referenciar en CLAUDE.md si es relevante para futuras implementaciones
3. Agregar enlaces cruzados entre investigaciones relacionadas

## 🚀 Uso en Desarrollo

### 📚 Base de Conocimiento Técnico
Los archivos de esta carpeta sirven como:
- **Documentación de decisiones técnicas** - Justificación de elecciones de arquitectura
- **Referencia para futuras implementaciones** - Patterns y código reutilizable
- **Base de conocimiento del proyecto** - Histórico de investigaciones y aprendizajes
- **Guía para nuevos desarrolladores** - Onboarding y contexto técnico

### 🎯 Investigaciones Clave por Uso

**Para Migration a radix-dapp-toolkit**:
- `radix-dapp-toolkit-integration.md` - Análisis completo y plan de migración
- `official-examples-analysis.md` - Código extraíble y patterns probados
- `github-integration-summary.md` - Roadmap consolidado de implementación

**Para Gateway API Integration**:
- `radix-gateway-api.md` - Referencia completa actualizada con GitHub findings
- `balance-verification-methods.md` - Strategies específicas para balance checking

**Para Validations y Error Handling**:
- `address-validation-patterns.md` - Validaciones robustas de direcciones Stokenet
- `error-handling-strategies.md` - Patterns de error handling estructurado

### 💡 Recomendación de Lectura
1. **Para implementar mejoras inmediatas**: Leer `github-integration-summary.md`
2. **Para migración técnica**: Comenzar con `radix-dapp-toolkit-integration.md`
3. **Para troubleshooting**: Consultar `radix-gateway-api.md` y `error-handling-strategies.md`

## 📝 Proceso de Creación

1. **Sub-agente de investigación** genera el archivo MD
2. **Validación** del formato y contenido
3. **Integración** en este README
4. **Referencia** en CLAUDE.md si aplica
5. **Versionado** usando git para historial