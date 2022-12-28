import { createTransferController } from './bootstrap/controllers';

const registerTransferRoute = (strapi: any) => {
  strapi.admin.routes.push({
    method: 'GET',
    path: '/transfer',
    handler: createTransferController(),
    config: { auth: false },
  });
};

const register = (strapi: any) => {
  registerTransferRoute(strapi);
};

export default register;
