import type { Core } from '@strapi/strapi';

/** A TypeScript policy: type generation reads its config from the handler's second parameter. */
export default ((policyContext, config) => {
  return config.roles.includes(policyContext.get('x-role'));
}) satisfies Core.PolicyHandler<{ roles: string[] }>;
