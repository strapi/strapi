/**
 * `@strapi/plugin-end-users/auth`: what a project's `config/plugins.ts` imports.
 *
 * Its types come from Better Auth, whose packages require `@better-auth/utils`, `@better-fetch/fetch`,
 * `better-call`, `kysely` and `nanostores` as peers. The plugin lists them in `package.json` so an
 * install that does not hoist still resolves them; none is imported by the plugin's own code.
 */
export { defineAuth } from '../define-auth';
export type { DefineAuthResult, ProjectAuthOptions } from '../define-auth';
