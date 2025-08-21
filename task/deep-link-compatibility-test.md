# Test de Compatibilidad: Deep Links radix-connect vs radix-dapp-toolkit

## 📋 Metadata del Test

**Fecha de creación**: 2025-08-19  
**Objetivo**: Verificar si los deep links generados con radix-dapp-toolkit funcionan exactamente igual que los actuales con radix-connect  
**Duración estimada**: 90 minutos  
**Estado general**: ⏳ Pendiente  

### ⚠️ Funcionalidad Crítica a Verificar
Los deep links son la **funcionalidad CORE** del servidor MCP. Si no funcionan igual, la migración a RDT debe postponerse hasta resolver las incompatibilidades.

---

## 🎯 Estado General del Test

- [ ] **Test Iniciado**: ⏳ Pendiente
- [ ] **Preparación Completada**: ⏳ Pendiente  
- [ ] **Test Comparativo Ejecutado**: ⏳ Pendiente
- [ ] **Verificación Práctica Completada**: ⏳ Pendiente
- [ ] **Decisión Final Tomada**: ⏳ Pendiente

### 📊 Resultado Final
```
COMPATIBILIDAD: [ Pendiente / ✅ Compatible / ❌ Incompatible / ⚠️ Compatible con diferencias ]
RECOMENDACIÓN: [ Pendiente / Proceder con migración / Pausar migración / Investigar más ]
```

---

## 🔧 Fase 1: Preparación del Entorno

**Estado de la Fase**: ⏳ Pendiente  
**Tiempo Estimado**: 15 minutos  
**Inicio**: _____ **Fin**: _____

### Checklist de Preparación:

#### 1.1 Setup de Branch Experimental
- [ ] **Crear branch experimental**
  ```bash
  git checkout -b test/deep-link-compatibility
  ```
  **Ejecutado**: _____ **Resultado**: _____

- [ ] **Verificar estado limpio**
  ```bash
  git status
  ```
  **Ejecutado**: _____ **Resultado**: _____

- [ ] **Backup del estado actual**
  ```bash
  git add . && git commit -m "Backup antes de test RDT deep links"
  ```
  **Ejecutado**: _____ **Resultado**: _____

#### 1.2 Instalación de Dependencies
- [ ] **Instalar RDT sin remover actuales**
  ```bash
  npm install @radixdlt/radix-dapp-toolkit @radixdlt/radix-engine-toolkit --save-dev
  ```
  **Ejecutado**: _____ **Resultado**: _____

- [ ] **Verificar instalación**
  ```bash
  npm list @radixdlt/radix-dapp-toolkit @radixdlt/radix-engine-toolkit
  ```
  **Ejecutado**: _____ **Resultado**: _____

### Logs de la Fase 1:
```
[Logs de comandos ejecutados y outputs aquí]

```

---

## 🧪 Fase 2: Implementación del Test Comparativo

**Estado de la Fase**: ⏳ Pendiente  
**Tiempo Estimado**: 30 minutos  
**Inicio**: _____ **Fin**: _____

### Parámetros de Test Estandarizados:
```javascript
const TEST_PARAMS = {
  fromAddress: "account_tdx_2_1289zm062j788dwrjefqkfgfeea5tkkdnh8htqhdrzdvjkql4kxceql",
  toAddress: "account_tdx_2_128evrrwfp8gj9240qq0m06ukhwaj2cmejluxxreanzjwq62vmlf8r4",
  amount: "10.5",
  message: "Test deep link compatibility"
};
```

### Checklist de Implementación:

#### 2.1 Crear Script de Test
- [ ] **Crear archivo test-deep-links.js**
  **Creado**: _____ **Ubicación**: _____

- [ ] **Implementar generación con método actual**
  **Completado**: _____ **Status**: _____

- [ ] **Implementar generación con RDT**
  **Completado**: _____ **Status**: _____

#### 2.2 Ejecutar Test Comparativo
- [ ] **Generar deep link con implementación actual**
  ```bash
  node test-deep-links.js --method=current
  ```
  **Ejecutado**: _____ **Resultado**: _____

- [ ] **Generar deep link con RDT**
  ```bash
  node test-deep-links.js --method=rdt
  ```
  **Ejecutado**: _____ **Resultado**: _____

### Resultados de Generación:

#### Deep Link Actual (radix-connect):
```
URL: 
Manifest: 
Longitud: 
```

#### Deep Link RDT (radix-dapp-toolkit):
```
URL: 
Manifest: 
Longitud: 
```

### Logs de la Fase 2:
```
[Logs de comandos ejecutados y outputs aquí]

```

---

## 🔍 Fase 3: Análisis Técnico Detallado

**Estado de la Fase**: ⏳ Pendiente  
**Tiempo Estimado**: 20 minutos  
**Inicio**: _____ **Fin**: _____

### Checklist de Análisis:

#### 3.1 Comparación de Formatos
- [ ] **Comparar estructura de URL**
  **Completado**: _____ **Diferencias encontradas**: _____

- [ ] **Comparar encoding de manifest**
  **Completado**: _____ **Diferencias encontradas**: _____

- [ ] **Verificar parámetros incluidos**
  **Completado**: _____ **Parámetros coinciden**: [ Sí / No ]

#### 3.2 Análisis de Diferencias
- [ ] **Documentar diferencias críticas**
- [ ] **Evaluar impacto en funcionalidad**
- [ ] **Identificar riesgos potenciales**

### Tabla de Comparación Detallada:

| Aspecto | radix-connect | radix-dapp-toolkit | Compatible |
|---------|---------------|-------------------|------------|
| **Protocolo URL** | | | [ ✅ / ❌ ] |
| **Encoding Method** | | | [ ✅ / ❌ ] |
| **Manifest Format** | | | [ ✅ / ❌ ] |
| **Parameter Structure** | | | [ ✅ / ❌ ] |
| **Character Escaping** | | | [ ✅ / ❌ ] |

### Diferencias Críticas Identificadas:
```
1. 
2. 
3. 
```

### Logs de la Fase 3:
```
[Análisis detallado y comparaciones aquí]

```

---

## 📱 Fase 4: Verificación Práctica con Radix Wallet

**Estado de la Fase**: ⏳ Pendiente  
**Tiempo Estimado**: 15 minutos  
**Inicio**: _____ **Fin**: _____

### Checklist de Verificación:

#### 4.1 Test con Deep Link Actual
- [ ] **Copiar deep link actual a dispositivo móvil**
  **Completado**: _____ **Método usado**: _____

- [ ] **Abrir en Radix Wallet mobile**
  **Resultado**: [ ✅ Abre correctamente / ❌ Error / ⚠️ Advertencias ]

- [ ] **Verificar parámetros en wallet**
  - [ ] From address correcto: _____
  - [ ] To address correcto: _____
  - [ ] Amount correcto: _____
  - [ ] Message visible: _____

#### 4.2 Test con Deep Link RDT
- [ ] **Copiar deep link RDT a dispositivo móvil**
  **Completado**: _____ **Método usado**: _____

- [ ] **Abrir en Radix Wallet mobile**
  **Resultado**: [ ✅ Abre correctamente / ❌ Error / ⚠️ Advertencias ]

- [ ] **Verificar parámetros en wallet**
  - [ ] From address correcto: _____
  - [ ] To address correcto: _____
  - [ ] Amount correcto: _____
  - [ ] Message visible: _____

### Comparación de Comportamiento:

| Verificación | Actual | RDT | Status |
|-------------|--------|-----|--------|
| **Wallet abre deep link** | [ ✅ / ❌ ] | [ ✅ / ❌ ] | [ ✅ / ❌ ] |
| **Transacción se carga** | [ ✅ / ❌ ] | [ ✅ / ❌ ] | [ ✅ / ❌ ] |
| **Parámetros correctos** | [ ✅ / ❌ ] | [ ✅ / ❌ ] | [ ✅ / ❌ ] |
| **Sin errores/warnings** | [ ✅ / ❌ ] | [ ✅ / ❌ ] | [ ✅ / ❌ ] |

### Screenshots/Evidence:
```
[Adjuntar screenshots de ambos deep links funcionando en wallet]
Actual: 
RDT: 
```

### Logs de la Fase 4:
```
[Resultados de testing con wallet mobile]

```

---

## 📊 Fase 5: Documentación y Decisión Final

**Estado de la Fase**: ⏳ Pendiente  
**Tiempo Estimado**: 10 minutos  
**Inicio**: _____ **Fin**: _____

### Checklist de Documentación:

#### 5.1 Reporte Final
- [ ] **Evaluar compatibilidad general**
  **Status**: [ ✅ Compatible / ❌ Incompatible / ⚠️ Compatible con diferencias ]

- [ ] **Documentar riesgos identificados**
  **Completado**: _____ **Riesgos críticos**: _____

- [ ] **Generar recomendación final**
  **Completado**: _____ **Recomendación**: _____

#### 5.2 Decisión y Próximos Pasos
- [ ] **Tomar decisión sobre migración**
- [ ] **Documentar próximos pasos**
- [ ] **Actualizar plan principal si es necesario**

---

## 🎯 Criterios de Éxito/Fallo

### ✅ Test PASA si:
- [ ] Deep links tienen formato compatible
- [ ] Radix Wallet procesa ambos deep links sin diferencias
- [ ] Transacciones se cargan con parámetros correctos
- [ ] No hay errores funcionales críticos
- [ ] Comportamiento es idéntico o mejor

### ❌ Test FALLA si:
- [ ] Formato de deep link es incompatible
- [ ] Radix Wallet rechaza o maneja diferente el deep link RDT
- [ ] Parámetros se pierden, cambian o corrompen
- [ ] Hay errores funcionales críticos
- [ ] Comportamiento degradado vs implementación actual

---

## 🚨 Rollback Procedures

### Si el Test Falla:
1. **Documentar problemas específicos**
   ```
   Problema 1: 
   Problema 2: 
   Problema 3: 
   ```

2. **Ejecutar rollback inmediato**
   ```bash
   git checkout master
   git branch -D test/deep-link-compatibility
   npm uninstall @radixdlt/radix-dapp-toolkit @radixdlt/radix-engine-toolkit
   ```

3. **Actualizar plan principal**
   - [ ] Marcar migración como "PAUSADA" 
   - [ ] Documentar blockers identificados
   - [ ] Crear plan de investigación para resolver problemas

---

## 📝 Logs Generales del Test

### Comandos Ejecutados:
```
[Todos los comandos ejecutados durante el test]

```

### Outputs y Errores:
```
[Todos los outputs, warnings y errores encontrados]

```

### Notas y Observaciones:
```
[Cualquier observación importante durante el proceso]

```

---

## 🔄 Notas de Reanudación

**Para continuar el test si se interrumpe:**

1. **Verificar fase actual**: Revisar checkboxes completados arriba
2. **Revisar logs**: Verificar qué comandos se ejecutaron exitosamente  
3. **Continuar desde**: La primera fase con checkboxes incompletos
4. **Estado del branch**: Verificar si `test/deep-link-compatibility` existe
5. **Dependencies**: Verificar si RDT está instalado correctamente

### Estado al Interrumpir:
```
Fecha de interrupción: _____
Última fase completada: _____
Próximo paso: _____
```

---

## 📈 Conclusión Final

### Resultado del Test:
```
COMPATIBILIDAD: _______________
DEEP LINKS FUNCIONAN IGUAL: [ SÍ / NO / CON DIFERENCIAS ]
MIGRACIÓN RECOMENDADA: [ SÍ / NO / POSTERGAR ]
```

### Próximos Pasos Recomendados:
```
1. 
2. 
3. 
```

### Impacto en Plan Principal:
```
[ ] Continuar con migración según plan original
[ ] Modificar plan basado en hallazgos
[ ] Pausar migración hasta resolver incompatibilidades
[ ] Investigar alternativas técnicas
```

---

**Test completado**: _____  
**Documentado por**: Claude Code  
**Próxima revisión**: _____