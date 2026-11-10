/**
 * `@strapi/plugin-end-users/auth`: what a project's `config/plugins.ts` imports.
 *
 * Its types come from Better Auth. `@better-auth/utils`, `@better-fetch/fetch`, `better-call`,
 * `kysely` and `nanostores` are required peers of `@better-auth/core` and `@better-auth/passkey`, so
 * the plugin lists them in `package.json`: an install that does not hoist still resolves them, and
 * none is imported by the plugin's own code. `jose`, also a peer of `@better-auth/core`, is not
 * listed.
 */
export { defineAuth } from '../define-auth';
export type { DefineAuthResult, ProjectAuthOptions } from '../define-auth';
