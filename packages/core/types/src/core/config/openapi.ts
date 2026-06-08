/**
 * Controls whether an OpenAPI endpoint is exposed and how it is protected.
 *
 * - `disabled` (default): the endpoint is not registered.
 * - `public`: the endpoint is registered without authentication (anyone can
 *   read the spec). Not supported for the `admin` endpoint.
 * - `authenticated`:
 *   - `content-api`: requires standard Content API auth (an authenticated
 *     users-permissions user or a full-access API token).
 *   - `admin`: requires an authenticated admin. Granular per-permission RBAC is
 *     intentionally left for a later iteration.
 */
export type OpenAPIAccess = 'disabled' | 'public' | 'authenticated';

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
  access?: OpenAPIAccess;
  route?: OpenAPIRoute;
  cache?: OpenAPICache;
}

export interface OpenAPI {
  'content-api'?: OpenAPIEndpoint;
  admin?: OpenAPIEndpoint;
}
