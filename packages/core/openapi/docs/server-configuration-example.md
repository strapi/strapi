# OpenAPI Configuration Guide

This document explains how to configure servers and security for your OpenAPI specification.

## Configuration File

Create a `config/openapi.ts` file in your Strapi project:

```typescript
export default () => ({
  servers: [
    {
      url: 'https://api.yourdomain.com',
      description: 'Production server',
    },
    {
      url: 'https://staging-api.yourdomain.com',
      description: 'Staging server',
    },
    {
      url: 'http://localhost:1337/api',
      description: 'Development server',
    },
  ],
  security: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Token authentication',
    },
    apiKey: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API Key authentication',
    },
  },
  globalSecurity: [{ bearerAuth: [] }, { apiKey: [] }],
});
```

## Server Configuration

### Configuration Options

#### 1. Via OpenAPI Configuration (Recommended)

Add server definitions to your `config/openapi.ts`:

```typescript
export default {
  servers: [
    {
      url: 'https://api.example.com',
      description: 'Production server',
    },
    {
      url: 'http://localhost:1337/api',
      description: 'Local development server',
    },
    {
      url: 'https://{environment}.api.example.com/{version}',
      description: 'Dynamic server',
      variables: {
        environment: {
          default: 'prod',
          enum: ['prod', 'staging', 'dev'],
          description: 'API environment',
        },
        version: {
          default: 'v1',
          description: 'API version',
        },
      },
    },
  ],
};
```

#### 2. Via Server Configuration

The OpenAPI generator will automatically use the server URL from `config/server.ts` if no explicit OpenAPI server configuration is provided:

```typescript
// config/server.ts
export default {
  host: '0.0.0.0',
  port: 1337,
  // The server URL will be used as the default server
  url: 'https://api.example.com',
};
```

### Server Configuration Priority

The server information follows this priority order:

1. **OpenAPI Configuration** (`openapi.servers`): Explicit server configuration in `config/openapi.ts`
2. **Server URL** (`server.url`): The configured server URL from `config/server.ts`
3. **Default Fallback**: `http://localhost:1337/api` if no other configuration is available

### Server Object Schema

Each server object follows the OpenAPI 3.1.0 specification:

```typescript
interface ServerConfig {
  url: string; // Required: Server URL
  description?: string; // Optional: Server description
  variables?: Record<string, ServerVariable>; // Optional: URL variables
}

interface ServerVariable {
  default: string; // Required: Default value
  enum?: string[]; // Optional: Allowed values
  description?: string; // Optional: Variable description
}
```

## Security Configuration

### Security Schemes

Configure authentication methods in the `security` section:

```typescript
export default {
  security: {
    // JWT Bearer Authentication
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Token authentication',
    },

    // API Key Authentication
    apiKey: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API Key authentication',
    },

    // Basic Authentication
    basicAuth: {
      type: 'http',
      scheme: 'basic',
      description: 'Basic authentication',
    },

    // OAuth2 Authentication
    oauth2: {
      type: 'oauth2',
      flows: {
        authorizationCode: {
          authorizationUrl: 'https://example.com/oauth/authorize',
          tokenUrl: 'https://example.com/oauth/token',
          scopes: {
            read: 'Read access',
            write: 'Write access',
          },
        },
      },
    },
  },
};
```

### Global Security

Apply security requirements globally to all operations:

```typescript
export default {
  // Security schemes defined above
  security: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    apiKey: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
    },
  },

  // Apply security globally (optional)
  globalSecurity: [
    { bearerAuth: [] }, // Use JWT Bearer
    { apiKey: [] }, // Or use API Key
    { basicAuth: [] }, // Or use Basic Auth
  ],
};
```

### Automatic Security Configuration

If no `bearerAuth` scheme is explicitly configured, Strapi will automatically add a default JWT Bearer authentication scheme:

```typescript
// Automatically added if not present
{
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT Bearer token for authentication'
  }
}
```

## CLI Commands

### Generate OpenAPI Specification

```bash
# Basic generation
strapi openapi generate

# With custom output path
strapi openapi generate --output ./docs/api-spec.json
strapi openapi generate -o ./docs/api-spec.json
```

## Complete Configuration Examples

### Production-Ready Configuration

```typescript
export default () => ({
  servers: [
    {
      url: 'https://api.yourdomain.com',
      description: 'Production API',
    },
    {
      url: 'https://staging-api.yourdomain.com',
      description: 'Staging API',
    },
    {
      url: 'http://localhost:1337/api',
      description: 'Development server',
    },
  ],

  security: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT Token authentication for API access',
    },
    apiKey: {
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      description: 'API Key for service-to-service communication',
    },
  },

  globalSecurity: [{ bearerAuth: [] }, { apiKey: [] }],
});
```

### Multi-Environment Configuration

```typescript
export default {
  servers: [
    {
      url: 'https://{environment}.api.yourdomain.com/{version}',
      description: 'Multi-environment API',
      variables: {
        environment: {
          default: 'prod',
          enum: ['prod', 'staging', 'dev', 'test'],
          description: 'Target environment',
        },
        version: {
          default: 'v1',
          enum: ['v1', 'v2'],
          description: 'API version',
        },
      },
    },
  ],

  security: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    oauth2: {
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://auth.yourdomain.com/oauth/token',
          scopes: {
            'api:read': 'Read API access',
            'api:write': 'Write API access',
            'api:admin': 'Admin API access',
          },
        },
      },
    },
  },

  globalSecurity: [{ bearerAuth: [] }, { oauth2: ['api:read', 'api:write'] }],
};
```

## Configuration File Format

- **File Location**: `config/openapi.ts` or `config/openapi.js`
- **Supported Formats**: TypeScript (.ts) or JavaScript (.js)
- **Export Format**: Default export of configuration object
- **Environment Variables**: Supported via `process.env` in configuration functions

⚠️ **Note**: The OpenAPI generation feature is currently experimental. Its behavior and output might change in future releases.
