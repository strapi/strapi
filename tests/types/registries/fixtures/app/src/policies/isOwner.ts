import type { Core } from '@strapi/strapi';

// A bare handler: the config contract is its second parameter.
export default (ctx: Core.PolicyContext, config: { field: string }) => ctx.is(config.field);
