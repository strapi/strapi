/**
 * Controls whether an OpenAPI endpoint is exposed and how it is protected.
 *
 * - `disabled` (default): the endpoint is not registered.
 * - `public`: content-api only; the endpoint is registered without
 *   authentication (anyone can read the spec).
 * - `authenticated`: admin only; requires an authenticated admin. Granular
 *   per-permission RBAC is intentionally left for a later iteration.
 */
export type OpenAPIContentAPIAccess = 'disabled' | 'public';
export type OpenAPIAdminAccess = 'disabled' | 'authenticated';
export type OpenAPIAccess = OpenAPIContentAPIAccess | OpenAPIAdminAccess;

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

export interface OpenAPIEndpoint<TAccess extends OpenAPIAccess = OpenAPIAccess> {
  access?: TAccess;
  route?: OpenAPIRoute;
  cache?: OpenAPICache;
}

export interface OpenAPI {
  'content-api'?: OpenAPIEndpoint<OpenAPIContentAPIAccess>;
  admin?: OpenAPIEndpoint<OpenAPIAdminAccess>;
}
