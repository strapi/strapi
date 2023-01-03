import { createTransferController } from './bootstrap/controllers';

const registerTransferRoute = (strapi: any) => {
  strapi.admin.routes.push({
    method: 'GET',
    path: '/transfer',
    handler: createTransferController(),
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.push'] } },
      ],
    },
  });
};

const register = (strapi: any) => {
  registerTransferRoute(strapi);
};

export default register;
