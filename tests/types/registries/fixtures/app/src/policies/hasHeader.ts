import type { Core } from '@strapi/strapi';

// Every config field is optional: runtime passes `{}` when a route names the policy alone.
export default (ctx: Core.PolicyContext, config: { header?: string }) =>
  ctx.get(config.header ?? 'x-request-id') !== '';
