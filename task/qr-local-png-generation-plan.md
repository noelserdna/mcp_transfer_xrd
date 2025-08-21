# 🎯 Plan Maestro: QR PNG Local Generation para MCP Server RadixDLT

## 📋 Resumen Ejecutivo

**Problema**: Claude Desktop no puede renderizar códigos QR SVG/Base64 como artefactos, perdiendo contexto durante el proceso.

**Solución**: Nueva funcionalidad que genera archivos PNG físicos en directorio `qrimages/` con nombres únicos, permitiendo que el MCP server responda con rutas de archivos locales renderizables en Claude Desktop.

## 🏗️ Arquitectura Identificada

### Componentes Principales a Implementar:
1. **LocalQRManager** - Orchestrador principal que coordina el flujo completo
2. **DirectoryManager** - Gestión del directorio `qrimages/` y permisos
3. **FilenameGenerator** - Generación de nombres únicos usando SHA-256
4. **LocalQRGenerator** - Generación de archivos PNG físicos (reutiliza QRGenerator existente)
5. **Nueva MCP Tool** - `deeplink_to_qr_local` con validación Zod integrada

### Estrategia de Integración:
- **Zero Breaking Changes**: QRGenerator existente permanece intacto
- **Dependency Injection**: Para testing y extensibilidad
- **Error Handling Consistente**: Siguiendo patrones MCP existentes
- **Backward Compatibility**: Herramienta `deeplink_to_qr` actual sin cambios

## ⏱️ Timeline Optimizado

**Duración Total**: 3.5 días (28 horas) con paralelización inteligente

### Tracks Paralelos:
- **Track A**: Foundation & Types (2h) - *Prerequisito*
- **Track B**: File System Components (4h) - *Paralelo*
- **Track C**: Core Logic (6h) - *Paralelo*  
- **Track D**: Integration & Testing (5h) - *Después de A*

**Critical Path**: A1 → B1 → C1 → D1 → D3 (17h base + buffers)

## 📊 Sistema de Seguimiento

### KPIs Técnicos:
- **Performance**: PNG generation <300ms, file size <50KB
- **Quality**: Test coverage >95%, zero regressions
- **Integration**: 100% backward compatibility, cross-platform success

### Estructura de Tracking:
- Dashboard diario con progress por milestone
- Alertas automáticas para performance/quality issues
- Risk monitoring con escalation procedures

## 📚 Documentación Estructurada

### Para Desarrolladores:
- Especificación técnica completa con APIs TypeScript
- Guías de integración step-by-step
- Testing strategy comprehensiva

### Para Usuarios:
- User guide para `deeplink_to_qr_local` 
- Migration guide desde herramienta actual
- Troubleshooting común

### Para Gestión:
- Plan maestro consolidado (`task/qr-local-png-generation-plan.md`)
- Resource requirements y timeline ejecutivo

## 🚦 Riesgos Críticos Identificados

1. **File System Permissions** (P: Alta, I: Mayor) → Validación preventiva + fallback
2. **Performance PNG Generation** (P: Media, I: Moderado) → Async operations + size limits  
3. **MCP Protocol Integration** (P: Media, I: Mayor) → Backward compatibility + versioning

## 📁 Estructura de Archivos a Crear

```
├── src/helpers/
│   ├── local-qr-manager.ts        # Orchestrador principal
│   ├── directory-manager.ts       # File system operations
│   ├── filename-generator.ts      # Unique naming logic
│   └── local-qr-generator.ts     # PNG file generation
├── src/types/
│   └── local-qr-types.ts         # Extended TypeScript interfaces
├── tests/
│   └── local-qr-*.test.ts        # Comprehensive test suite
├── qrimages/                     # Directory for PNG files (auto-created)
├── docs/qr-local-png-generation/ # Complete documentation
├── tasks/
│   └── qr-local-png-generation-plan.md # Master plan
└── tracking/
    └── status-qr-local-png-generation.md # Progress dashboard
```

## 🎯 Próximos Pasos Inmediatos

1. **Crear nueva branch**: `feature/qr-local-png-generation`
2. **Setup inicial**: Crear estructura de directorios y documentación base
3. **Implementación en paralelo**: Ejecutar tracks B, C, D simultáneamente
4. **Testing continuo**: Validar cada componente individualmente
5. **Integration final**: MCP tool + end-to-end testing
6. **Documentation**: Actualizar CLAUDE.md con nueva funcionalidad

## ✅ Criterios de Éxito

- ✅ Archivo PNG generado en `qrimages/` con nombre único
- ✅ QR escaneable por Radix Wallet móvil (calidad alta)
- ✅ Compatible con Claude Desktop (archivos PNG renderizables)
- ✅ Zero regressions en funcionalidad existente
- ✅ Performance targets alcanzados (<300ms generation)
- ✅ Test coverage >95% para código nuevo
- ✅ Documentación completa y navegable

**Valor Business**: Resolver incompatibilidad crítica con Claude Desktop, mejorar UX significativamente, mantener todas las capacidades actuales sin breaking changes.

---

## 📖 Análisis Detallado Completado

### 🔍 Fase 1: Análisis de Requisitos
- **✅ Completado** por requirement-analyzer
- **Resultado**: Requisitos funcionales y no funcionales claramente definidos
- **Output**: analysis/requirements-qr-local-png-generation.md

### 🏛️ Fase 2: Diseño Arquitectónico  
- **✅ Completado** por architecture-designer
- **Resultado**: Arquitectura modular con 4 componentes principales
- **Output**: architecture/design-qr-local-png-generation.md

### 📋 Fase 3: Descomposición de Tareas
- **✅ Completado** por task-decomposer  
- **Resultado**: 17 tareas atómicas organizadas en 4 tracks paralelos
- **Output**: tasks/breakdown-qr-local-png-generation.md

### 🔗 Fase 4: Mapeo de Dependencias
- **✅ Completado** por dependency-mapper
- **Resultado**: Critical Path Method aplicado, dependencias optimizadas
- **Output**: dependencies/matrix-qr-local-png-generation.md

### ⚠️ Fase 5: Evaluación de Riesgos
- **✅ Completado** por risk-assessor
- **Resultado**: Riesgos identificados con mitigaciones concretas
- **Output**: risks/assessment-qr-local-png-generation.md

### ⏰ Fase 6: Cronograma Realista
- **✅ Completado** por timeline-planner
- **Resultado**: Timeline optimizado con buffers calculados
- **Output**: timelines/schedule-qr-local-png-generation.md

### 📚 Fase 7: Documentación Consolidada
- **✅ Completado** por documentation-generator
- **Resultado**: Estructura completa de documentación navegable
- **Output**: docs/qr-local-png-generation/ (multiple files)

### 📊 Fase 8: Sistema de Seguimiento
- **✅ Completado** por tracker-manager
- **Resultado**: KPIs, alertas y dashboard de progreso configurado
- **Output**: tracking/status-qr-local-png-generation.md

## 🎯 Plan Listo Para Implementación

Todas las fases del pipeline de agentes especializados han sido completadas exitosamente. El plan está completamente estructurado, documentado y listo para implementación inmediata con:

- **Arquitectura sólida** y probada
- **Timeline realista** con paralelización óptima  
- **Riesgos mitigados** con estrategias concretas
- **Sistema de tracking** configurado desde día 1
- **Documentación completa** para todos los stakeholders

---

## 📋 TASK BREAKDOWN DETALLADO

### Track A: Foundation & Types (2h total)

#### TASK-A1: Crear interfaces TypeScript para componentes locales
**Duración**: 1h | **Complejidad**: 2/5 | **Prioridad**: Alta
**Archivo**: `src/types/local-qr-types.ts`
**Descripción**: Crear interfaces TypeScript extendidas para nueva funcionalidad
**Criterios SMART**:
- Específico: Definir interfaces para LocalQRManager, DirectoryManager, FilenameGenerator, LocalQRGenerator
- Medible: Todas las interfaces compiladas sin errores TypeScript
- Alcanzable: Extensión de tipos existentes en qr-types.ts  
- Relevante: Base necesaria para todos los componentes
- Temporal: Completado en 1 hora

#### TASK-A2: Extender tipos existentes con local-specific types  
**Duración**: 1h | **Complejidad**: 3/5 | **Prioridad**: Alta
**Archivo**: `src/types/qr-types.ts` (extensión)
**Descripción**: Extender tipos existentes manteniendo backward compatibility
**Criterios SMART**:
- Específico: Agregar LocalQRGenerationParams, LocalQRGenerationResult
- Medible: Tests existentes siguen compilando y pasando
- Alcanzable: Uso de union types y optional properties
- Relevante: Integración seamless con código existente
- Temporal: Completado en 1 hora

### Track B: File System Components (4h total)

#### TASK-B1: Implementar DirectoryManager class
**Duración**: 1.5h | **Complejidad**: 4/5 | **Prioridad**: Alta
**Archivo**: `src/helpers/directory-manager.ts`
**Descripción**: Gestión segura del directorio qrimages/ con validación de permisos
**Criterios SMART**:
- Específico: Class con métodos ensureDirectory(), validatePermissions(), cleanup()
- Medible: Directorio creado, permisos validados, cleanup configurado
- Alcanzable: Uso de fs/promises APIs de Node.js
- Relevante: Base crítica para almacenamiento local
- Temporal: Completado en 1.5 horas

#### TASK-B2: Implementar FilenameGenerator class
**Duración**: 1h | **Complejidad**: 3/5 | **Prioridad**: Alta  
**Archivo**: `src/helpers/filename-generator.ts`
**Descripción**: Generación de nombres únicos usando SHA-256 hash del deep link
**Criterios SMART**:
- Específico: Método generateUniqueFilename() con hash + timestamp
- Medible: Nombres únicos generados, no colisiones detectadas
- Alcanzable: Uso de crypto nativo de Node.js
- Relevante: Previene sobreescritura de archivos
- Temporal: Completado en 1 hora

#### TASK-B3: Testing unitario File System components
**Duración**: 1.5h | **Complejidad**: 3/5 | **Prioridad**: Media
**Archivo**: `tests/directory-manager.test.ts`, `tests/filename-generator.test.ts`
**Descripción**: Suite de tests para components de file system
**Criterios SMART**:
- Específico: Tests para DirectoryManager y FilenameGenerator
- Medible: >95% coverage, todos los tests passing
- Alcanzable: Uso de temp directories para testing
- Relevante: Validación de funcionalidad crítica
- Temporal: Completado en 1.5 horas

### Track C: Core Logic (6h total)

#### TASK-C1: Implementar LocalQRGenerator class
**Duración**: 2h | **Complejidad**: 4/5 | **Prioridad**: Alta
**Archivo**: `src/helpers/local-qr-generator.ts`  
**Descripción**: Generación de archivos PNG usando QRGenerator existente
**Criterios SMART**:
- Específico: Reutilizar QRGenerator, convertir Base64 → PNG file
- Medible: PNG generado en <300ms, tamaño <50KB
- Alcanzable: Dependency injection del QRGenerator actual
- Relevante: Core de la nueva funcionalidad
- Temporal: Completado en 2 horas

#### TASK-C2: Implementar LocalQRManager orchestrator
**Duración**: 2.5h | **Complejidad**: 5/5 | **Prioridad**: Alta
**Archivo**: `src/helpers/local-qr-manager.ts`
**Descripción**: Orchestrador que coordina DirectoryManager, FilenameGenerator, LocalQRGenerator
**Criterios SMART**:
- Específico: Método generateLocalQR() coordinando todos los components
- Medible: Flujo completo end-to-end funcional
- Alcanzable: Composition pattern con dependency injection
- Relevante: Interfaz principal para MCP tool
- Temporal: Completado en 2.5 horas

#### TASK-C3: Testing unitario Core Logic components
**Duración**: 1.5h | **Complejidad**: 4/5 | **Prioridad**: Media
**Archivo**: `tests/local-qr-generator.test.ts`, `tests/local-qr-manager.test.ts`
**Descripción**: Suite de tests para core logic components
**Criterios SMART**:
- Específico: Tests para LocalQRGenerator y LocalQRManager
- Medible: >95% coverage, integration scenarios testing
- Alcanzable: Mocking de dependencies, temp files
- Relevante: Validación de lógica compleja
- Temporal: Completado en 1.5 horas

### Track D: Integration & Testing (5h total)

#### TASK-D1: Integrar nueva MCP tool deeplink_to_qr_local
**Duración**: 2h | **Complejidad**: 4/5 | **Prioridad**: Alta
**Archivo**: `src/index.ts` (modificación)
**Descripción**: Registrar nueva tool en MCP server con validación Zod
**Criterios SMART**:
- Específico: server.tool() registration con schema validation
- Medible: Tool disponible via MCP protocol, validation working
- Alcanzable: Siguiendo pattern de deeplink_to_qr existente
- Relevante: Interface usuario final
- Temporal: Completado en 2 horas

#### TASK-D2: Testing de integración MCP completo
**Duración**: 2h | **Complejidad**: 4/5 | **Prioridad**: Alta
**Archivo**: `tests/local-qr-integration.test.ts`
**Descripción**: Testing end-to-end de nueva MCP tool
**Criterios SMART**:
- Específico: Test completo desde MCP call hasta PNG file generation
- Medible: Integration test passing, file generated successfully
- Alcanzable: Extensión de server.test.ts existente
- Relevante: Validación completa del flujo
- Temporal: Completado en 2 horas

#### TASK-D3: Documentación y configuración final
**Duración**: 1h | **Complejidad**: 2/5 | **Prioridad**: Media
**Archivo**: `CLAUDE.md` (actualización)
**Descripción**: Actualizar documentación del proyecto con nueva funcionalidad
**Criterios SMART**:
- Específico: Agregar deeplink_to_qr_local a CLAUDE.md
- Medible: Documentación actualizada, ejemplos incluidos
- Alcanzable: Seguir format existente en CLAUDE.md
- Relevante: Guía para uso futuro
- Temporal: Completado en 1 hora

## 🎯 CRITICAL PATH ANALYSIS

**Camino Crítico Identificado**: A1 → A2 → C1 → C2 → D1 → D2 → D3

**Duración Critical Path**: 11.5 horas (sin paralelización)
**Duración con Paralelización**: 6 horas (optimal scenario)

**Dependencias Clave**:
- A1, A2 son prerequisitos para todos los demás tracks
- B1, B2 pueden ejecutarse en paralelo después de A1
- C1 depende de A1 pero puede iniciar en paralelo con B track
- D1 requiere C2 completado (LocalQRManager listo)

**Optimización de Paralelización**:
- **Hora 0-1**: Ejecutar A1 (foundation critical)
- **Hora 1-2**: Ejecutar A2 + B1 + C1 en paralelo
- **Hora 2-4**: Ejecutar B2 + B3 + C2 en paralelo  
- **Hora 4-6**: Ejecutar C3 + D1 en paralelo
- **Hora 6-8**: Ejecutar D2 + D3 en paralelo

**Buffers Calculados**:
- Risk Buffer: +20% (file system operations)
- Integration Buffer: +15% (MCP protocol complexity)
- Testing Buffer: +10% (comprehensive coverage)

**Total Estimado con Buffers**: 8 horas de desarrollo concentrado

## 🚦 RIESGOS Y MITIGACIONES

### Riesgo Alto: File System Permissions
**Probabilidad**: Alta | **Impacto**: Mayor | **Score**: 20/25
**Mitigación**: 
- Validación preventiva de permisos antes de creación
- Fallback a temp directory si qrimages/ falla
- Error messaging claro en español
- Testing en múltiples OS (Windows, macOS, Linux)

### Riesgo Medio: Performance PNG Generation  
**Probabilidad**: Media | **Impacto**: Moderado | **Score**: 12/25
**Mitigación**:
- Async operations para no bloquear MCP stdio
- Size limits configurables (default 512px)
- Compression optimization en PNG
- Performance monitoring integrado

### Riesgo Medio: MCP Protocol Integration
**Probabilidad**: Media | **Impacto**: Mayor | **Score**: 15/25
**Mitigación**:
- Backward compatibility estricta
- Extensive testing con existing MCP patterns
- Error handling consistente con tools actuales
- Rollback plan preparado

## 📊 KPIs Y SUCCESS METRICS

### Performance KPIs
- PNG Generation Time: Target <300ms (Critical <500ms)
- File Size: Target <50KB (Warning >75KB)
- Memory Usage: Monitor heap during generation
- MCP Response Time: Target <500ms end-to-end

### Quality KPIs  
- Test Coverage: Target >95% (Minimum 90%)
- TypeScript Strict: 100% compliance
- Zero Regressions: All existing tests must pass
- Code Review: 100% approval rate

### Integration KPIs
- Backward Compatibility: 100% (no breaking changes)
- Cross-platform: Windows + macOS + Linux support
- Error Rate: <1% in normal operation
- User Adoption: Successful QR scanning with mobile

## 🎯 READY TO IMPLEMENT

El plan maestro está completamente estructurado y listo para implementación inmediata. Todos los componentes han sido analizados, las dependencias optimizadas, los riesgos mitigados, y el timeline calculado de forma realista.

**Next Step**: Crear nueva branch y comenzar con la implementación siguiendo el critical path optimizado.