import type { Core } from '@strapi/strapi';

// No config parameter: the policy takes no config.
export default (ctx: Core.PolicyContext) => ctx.type === 'content-api';
