import type { Core } from '@strapi/strapi';

type HasRoleConfig = { roles: string[] };

// The `{ handler, validator }` form: the config contract is the handler's second parameter.
export default {
  name: 'has-role',
  validator: (config: unknown) => typeof config === 'object' && config !== null,
  handler: (ctx: Core.PolicyContext, config: HasRoleConfig) => config.roles.includes(ctx.type),
};
