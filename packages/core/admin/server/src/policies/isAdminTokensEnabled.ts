import { policy, errors } from '@strapi/utils';

const { createPolicy } = policy;

export default createPolicy({
  name: 'admin::isAdminTokensEnabled',
  handler(ctx, _config, { strapi }) {
    if (strapi.features.future.isEnabled('adminTokens') !== true) {
      throw new errors.NotFoundError();
    }
  },
});
