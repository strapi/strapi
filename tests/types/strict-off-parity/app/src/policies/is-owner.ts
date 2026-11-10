import type { Core } from '@strapi/strapi';

const isOwner: Core.PolicyHandler = (policyContext) => {
  return policyContext.is('json');
};

export default isOwner;
