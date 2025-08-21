# Investigación: Estrategias de Manejo de Errores

## 📋 Resumen Ejecutivo

Para sistemas de verificación de balances XRD, la estrategia óptima incluye retry exponencial para errores temporales, mensajes localizados específicos en español, y degradación gradual de funcionalidad. Los códigos de error de Gateway API permiten categorización precisa y recovery automático.

## 🎯 Objetivo de la Investigación

Definir estrategias robustas de manejo de errores para verificación de balances XRD, incluyendo códigos específicos, mensajes localizados en español, patrones de recovery y mejores prácticas de UX.

## 🔍 Metodología

Análisis de códigos de error de Radix Gateway API, patrones de recovery en sistemas blockchain, mejores prácticas de UX para errores, y localización técnica en español para contexto blockchain.

## 📊 Hallazgos

### Categorización de Errores

#### 1. Errores de Red y Conectividad
```typescript
interface NetworkError {
  category: 'NETWORK';
  recoverable: true;
  retryStrategy: 'EXPONENTIAL_BACKOFF';
}
```

**Códigos HTTP**:
- `ECONNREFUSED` - Servidor no disponible
- `ETIMEDOUT` - Timeout de conexión  
- `ENOTFOUND` - DNS resolution failed

**Estrategia**: Retry automático con backoff exponencial

#### 2. Errores de API y Rate Limiting
```typescript
interface APIError {
  category: 'API_LIMIT';
  recoverable: true;
  retryStrategy: 'SCHEDULED_RETRY';
}
```

**Códigos HTTP**:
- `429` - Too Many Requests
- `503` - Service Unavailable
- `502` - Bad Gateway

**Estrategia**: Espera basada en headers `Retry-After`

#### 3. Errores de Datos y Validación
```typescript
interface DataError {
  category: 'DATA_VALIDATION';
  recoverable: false;
  userAction: 'CORRECTION_REQUIRED';
}
```

**Códigos de Radix**:
- `ENTITY_NOT_FOUND` - Cuenta no existe
- `INVALID_REQUEST` - Parámetros malformados
- `RESOURCE_NOT_FOUND` - Recurso XRD no encontrado

**Estrategia**: Mostrar mensaje específico, no retry

#### 4. Errores de Sistema Interno
```typescript
interface SystemError {
  category: 'INTERNAL';
  recoverable: true;
  retryStrategy: 'LIMITED_RETRY';
}
```

**Códigos HTTP**:
- `500` - Internal Server Error
- `504` - Gateway Timeout

**Estrategia**: Retry limitado, luego fallback

### Códigos de Error Específicos de Radix Gateway

#### Errores de Entidad
```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Entity not found",
    "details": {
      "entity_address": "account_tdx_2_invalid...",
      "trace_id": "abc123"
    }
  }
}
```

**Manejo**: Validar dirección antes de API call
**Mensaje ES**: "La dirección de cuenta no existe o es inválida"

#### Errores de Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid request format",
    "details": {
      "field": "entity_identifier.address",
      "reason": "malformed_address"
    }
  }
}
```

**Manejo**: Validación de entrada más estricta
**Mensaje ES**: "El formato de la dirección es incorrecto"

#### Errores de Rate Limiting
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED", 
    "message": "Too many requests",
    "details": {
      "retry_after_seconds": 60,
      "requests_per_minute": 100
    }
  }
}
```

**Manejo**: Esperar tiempo especificado
**Mensaje ES**: "Demasiadas consultas, reintentando en {seconds} segundos"

### Estrategias de Recovery

#### 1. Retry Exponencial
```typescript
class RetryStrategy {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 segundo
  
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorFilter: (error: any) => boolean = () => true
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!errorFilter(error) || attempt === this.maxRetries) {
          throw error;
        }
        
        const delay = this.baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
}
```

**Uso para**: Errores de red, timeouts, errores 5xx
**Delays**: 1s, 2s, 4s, 8s (máximo 3 retries)

#### 2. Circuit Breaker
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  private readonly failureThreshold = 5;
  private readonly timeout = 60000; // 1 minuto
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

**Uso para**: Prevenir cascada de fallos en Gateway API

#### 3. Fallback en Cascada
```typescript
class BalanceVerificationWithFallback {
  async getXRDBalance(address: string): Promise<string> {
    try {
      // Método principal: Gateway API
      return await this.gatewayAPI.getBalance(address);
    } catch (error) {
      if (this.isRetryableError(error)) {
        try {
          // Fallback 1: Cache persistente
          const cached = await this.persistentCache.get(address);
          if (cached && this.isCacheValid(cached)) {
            return cached.balance;
          }
        } catch (cacheError) {
          // Fallback 2: Core API directo
          return await this.coreAPI.getBalance(address);
        }
      }
      throw error;
    }
  }
}
```

### Mensajes de Error Localizados en Español

#### Catálogo de Mensajes
```typescript
const ErrorMessages = {
  // Errores de conectividad
  NETWORK_ERROR: {
    title: "Error de Conexión",
    message: "No se puede conectar con la red Radix. Verifica tu conexión a internet.",
    action: "Reintentar"
  },
  
  TIMEOUT_ERROR: {
    title: "Tiempo de Espera Agotado",
    message: "La consulta está tardando más de lo esperado. La red puede estar congestionada.",
    action: "Reintentar"
  },
  
  // Errores de rate limiting
  RATE_LIMIT: {
    title: "Demasiadas Consultas",
    message: "Has realizado muchas consultas muy rápido. Espera {seconds} segundos antes de continuar.",
    action: "Esperar"
  },
  
  // Errores de datos
  ACCOUNT_NOT_FOUND: {
    title: "Cuenta No Encontrada",
    message: "La dirección '{address}' no existe en Stokenet o es inválida.",
    action: "Verificar dirección"
  },
  
  INVALID_ADDRESS_FORMAT: {
    title: "Formato de Dirección Inválido",
    message: "La dirección debe comenzar con 'account_tdx_2_' para Stokenet.",
    action: "Corregir formato"
  },
  
  INSUFFICIENT_BALANCE: {
    title: "Fondos Insuficientes",
    message: "Tu balance actual es {current} XRD, pero necesitas {required} XRD para esta transacción.",
    action: "Ajustar cantidad"
  },
  
  BALANCE_ZERO: {
    title: "Sin Fondos",
    message: "Esta cuenta no tiene XRD disponible.",
    action: "Depositar XRD"
  },
  
  // Errores técnicos
  SERVER_ERROR: {
    title: "Error del Servidor",
    message: "Hay un problema temporal con el servidor. Reintentando automáticamente...",
    action: "Automático"
  },
  
  UNKNOWN_ERROR: {
    title: "Error Inesperado",
    message: "Ha ocurrido un error inesperado: {details}",
    action: "Reportar problema"
  }
};
```

#### Generación de Mensajes Dinámicos
```typescript
function generateErrorMessage(
  errorCode: string, 
  context: Record<string, any> = {}
): LocalizedError {
  const template = ErrorMessages[errorCode];
  if (!template) {
    return ErrorMessages.UNKNOWN_ERROR;
  }
  
  return {
    title: template.title,
    message: template.message.replace(/\{(\w+)\}/g, (match, key) => {
      return context[key] || match;
    }),
    action: template.action
  };
}

// Ejemplo de uso
const error = generateErrorMessage('INSUFFICIENT_BALANCE', {
  current: '5.25',
  required: '10.0'
});
// Resultado: "Tu balance actual es 5.25 XRD, pero necesitas 10.0 XRD..."
```

### UX para Casos de Error

#### Estados de Error Progresivos
```typescript
interface ErrorState {
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  temporary: boolean;
  retryable: boolean;
  userActionRequired: boolean;
}

const ErrorStates = {
  CHECKING_BALANCE: {
    severity: 'INFO',
    message: "Verificando balance...",
    showSpinner: true
  },
  
  SLOW_RESPONSE: {
    severity: 'WARNING', 
    message: "La red está lenta, esto puede tardar unos segundos...",
    showSpinner: true
  },
  
  RETRYING: {
    severity: 'WARNING',
    message: "Reintentando conexión... ({attempt}/3)",
    showSpinner: true
  },
  
  FAILED_RECOVERABLE: {
    severity: 'ERROR',
    message: "Error temporal. Puedes reintentar o continuar con datos del cache.",
    actions: ['Reintentar', 'Usar Cache']
  },
  
  FAILED_PERMANENT: {
    severity: 'CRITICAL',
    message: "No se puede verificar el balance. Revisa la dirección e intenta nuevamente.",
    actions: ['Corregir Dirección']
  }
};
```

#### Componente de Error UI
```typescript
interface ErrorDisplayProps {
  error: LocalizedError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

function ErrorDisplay({ error, onRetry, onDismiss, showDetails }: ErrorDisplayProps) {
  return (
    <div className={`error-container error-${error.severity.toLowerCase()}`}>
      <div className="error-header">
        <Icon name={getErrorIcon(error.severity)} />
        <h3>{error.title}</h3>
      </div>
      
      <p className="error-message">{error.message}</p>
      
      <div className="error-actions">
        {onRetry && error.retryable && (
          <button onClick={onRetry} className="retry-button">
            {error.action}
          </button>
        )}
        
        {onDismiss && (
          <button onClick={onDismiss} className="dismiss-button">
            Cerrar
          </button>
        )}
      </div>
      
      {showDetails && error.details && (
        <details className="error-details">
          <summary>Detalles técnicos</summary>
          <pre>{JSON.stringify(error.details, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
```

### Logging y Debugging

#### Estructura de Logs
```typescript
interface ErrorLog {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  component: 'API' | 'VALIDATION' | 'CACHE' | 'UI';
  errorCode: string;
  message: string;
  context: {
    address?: string;
    amount?: string;
    userId?: string;
    sessionId: string;
    traceId: string;
  };
  stack?: string;
  userAgent?: string;
}
```

#### Logger para Errores
```typescript
class ErrorLogger {
  static logError(error: Error, context: Record<string, any> = {}) {
    const logEntry: ErrorLog = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      component: context.component || 'UNKNOWN',
      errorCode: context.errorCode || 'UNKNOWN_ERROR',
      message: error.message,
      context: {
        sessionId: generateSessionId(),
        traceId: generateTraceId(),
        ...context
      },
      stack: error.stack,
      userAgent: navigator.userAgent
    };
    
    // Remover datos sensibles
    this.sanitizeLog(logEntry);
    
    // Enviar a servicio de logging
    this.sendToLoggingService(logEntry);
  }
  
  private static sanitizeLog(log: ErrorLog) {
    // Remover direcciones completas, mantener solo prefijo para debugging
    if (log.context.address) {
      log.context.address = log.context.address.substring(0, 20) + '...';
    }
  }
}
```

## 💡 Recomendaciones

### Estrategia Principal de Error Handling

1. **Categorización automática** de errores por tipo y recoverable
2. **Retry exponencial** para errores temporales (3 intentos máximo)
3. **Circuit breaker** para prevenir cascada de fallos
4. **Fallback en cascada**: API → Cache → Core API → Error final
5. **Mensajes localizados** específicos en español

### Implementación por Prioridad

#### Prioridad 1: Básica
```typescript
class BasicErrorHandler {
  async handleError(error: any, context: string): Promise<ErrorResponse> {
    const errorCode = this.categorizeError(error);
    const localizedMessage = this.getLocalizedMessage(errorCode, context);
    
    if (this.isRetryable(error)) {
      return { shouldRetry: true, message: localizedMessage };
    }
    
    return { shouldRetry: false, message: localizedMessage };
  }
}
```

#### Prioridad 2: Avanzada
- Retry exponencial con jitter
- Circuit breaker
- Fallback a cache
- Métricas de error

#### Prioridad 3: Completa
- Recovery automático inteligente
- A/B testing de estrategias de recovery
- Machine learning para predicción de errores

### Configuración Recomendada

```typescript
const ERROR_CONFIG = {
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    jitter: true
  },
  circuitBreaker: {
    failureThreshold: 5,
    timeout: 60000,
    monitoringPeriod: 30000
  },
  fallback: {
    useCacheWhenAPIFails: true,
    cacheMaxAge: 300000,     // 5 minutos para fallback
    degradeGracefully: true
  },
  logging: {
    logAllErrors: true,
    logRetries: true,
    sanitizeAddresses: true
  }
};
```

## 🔗 Referencias

- **HTTP Status Codes**: https://httpstatuses.com/
- **Exponential Backoff**: Google Cloud best practices
- **Circuit Breaker Pattern**: Microsoft Azure patterns
- **Error UX Guidelines**: Material Design error states

## 📅 Metadata

- **Fecha**: 2025-08-18
- **Sub-agente**: Research-ErrorHandling
- **Estado**: Completado
- **Versión**: 1.0
- **Idioma**: Mensajes localizados en español
- **Estrategia principal**: Retry exponencial + Circuit breaker + Fallback