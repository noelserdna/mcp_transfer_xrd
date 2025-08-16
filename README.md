# Simple MCP Server

Servidor MCP básico en TypeScript con protocolo stdio que incluye una herramienta de eco simple.

## Instalación

```bash
npm install
```

## Compilación

```bash
npm run build
```

## Ejecución

```bash
npm start
```

## Testing

### Ejecutar todos los tests
```bash
npm test
```

### Ejecutar tests en modo watch
```bash
npm run test:watch
```

## Herramientas disponibles

### echo
- **Descripción**: Repite el texto que recibe como entrada
- **Parámetros**:
  - `text` (string): Texto a repetir
- **Respuesta**: Devuelve "Echo: {texto}" 

## Estructura del proyecto

```
├── src/
│   └── index.ts          # Servidor MCP principal
├── tests/
│   ├── server.test.ts    # Tests de integración del servidor
│   └── echo-tool.test.ts # Tests unitarios de la herramienta echo
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Tests incluidos

- **Tests de conexión**: Verifican que el servidor MCP se conecta correctamente
- **Tests de herramientas**: Verifican que las herramientas funcionan como esperado
- **Tests de casos límite**: Manejan texto vacío, caracteres especiales, etc.