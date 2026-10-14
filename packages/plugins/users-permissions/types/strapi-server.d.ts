/**
 * Declarations of the `strapi-server` entry of `@strapi/plugin-users-permissions`, a JavaScript
 * package. They register its config contract for applications with `typescript.strictTypes`, until
 * the plugin moves to TypeScript and emits its own declarations.
 */

/** The `jwtManagement` modes of the Content API authentication. */
export type JwtManagement = 'legacy-support' | 'refresh';

/**
 * `strapi.config.get('plugin::users-permissions')`: the plugin config merged with its defaults
 * (`server/src/config.js`).
 */
export type UsersPermissionsConfig = {
  /** `JWT_SECRET`, unset when the environment does not define it. */
  jwtSecret?: string;
  /** Options of the plugin JWTs (`legacy-support` mode), e.g. `expiresIn`. */
  jwt: { expiresIn?: string | number; [option: string]: unknown };
  jwtManagement: JwtManagement;
  /** Session manager lifespans, in seconds, and the refresh cookie (`refresh` mode). */
  sessions: {
    accessTokenLifespan: number;
    maxRefreshTokenLifespan: number;
    idleRefreshTokenLifespan: number;
    maxSessionLifespan: number;
    idleSessionLifespan: number;
    httpOnly: boolean;
    cookie?: {
      name?: string;
      secure?: boolean;
      sameSite?: 'lax' | 'strict' | 'none' | boolean;
      path?: string;
      domain?: string;
      maxAge?: number;
    };
  };
  /** Options of the authentication routes' rate limit. */
  ratelimit: { interval: number; max: number; [option: string]: unknown };
  layout: { user: { actions: { create: string; update: string } } };
  callback: {
    /** Throws when a provider callback URL is not allowed. */
    validate(callback: string, provider: { callback: string }): void;
  };
  /** Extra user fields the register route accepts. */
  register?: { allowedFields?: string[] };
  /** Password validation rules of the register and password routes. */
  validationRules?: Record<string, unknown>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::users-permissions': UsersPermissionsConfig;
      }
    }
  }
}

/** The plugin's server entry. Untyped, as the JavaScript entry was without these declarations. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const usersPermissions: any;
export default usersPermissions;
