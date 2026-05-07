export type OpenAPIAccessMode = 'public' | 'authenticated';

export interface OpenAPIRoute {
  path?: string;
}

export interface OpenAPIAccess {
  mode?: OpenAPIAccessMode;
  /**
   * Authorization scopes required when access mode is `authenticated`.
   * If omitted, any authenticated user/token is allowed.
   */
  roles?: string[];
}

export interface OpenAPICache {
  enabled?: boolean;
  maxAgeMs?: number;
  /**
   * File path for storing the generated OpenAPI document.
   *
   * If relative, it is resolved from the application root.
   */
  filePath?: string;
}

export interface OpenAPIEndpoint {
  enabled?: boolean;
  route?: OpenAPIRoute;
  access?: OpenAPIAccess;
  cache?: OpenAPICache;
}

export interface OpenAPI {
  'content-api'?: OpenAPIEndpoint;
  admin?: OpenAPIEndpoint;
}
