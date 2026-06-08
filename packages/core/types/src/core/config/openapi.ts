export interface OpenAPIRoute {
  path?: string;
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
  cache?: OpenAPICache;
}

export interface OpenAPI {
  'content-api'?: OpenAPIEndpoint;
  admin?: OpenAPIEndpoint;
}
