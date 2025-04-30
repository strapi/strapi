import admin from './admin';
import authentication from './authentication';
import permissions from './permissions';
import users from './users';
import roles from './roles';
import webhooks from './webhooks';
import apiTokens from './api-tokens';
import contentApi from './content-api';
import transfer from './transfer';

const routes = {
  admin: {
    type: 'admin',
    routes: [
      ...admin,
      ...authentication,
      ...permissions,
      ...users,
      ...roles,
      ...webhooks,
      ...apiTokens,
      ...contentApi,
      ...transfer,
    ],
  },
};

export default routes;
