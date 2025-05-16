import type {} from 'koa-body';

import admin from './admin';
import apiToken from './api-token';
import authenticatedUser from './authenticated-user';
import authentication from './authentication';
import permission from './permission';
import role from './role';
import transfer from './transfer';
import user from './user';
import webhooks from './webhooks';
import contentApi from './content-api';

export default {
  admin,
  'api-token': apiToken,
  'authenticated-user': authenticatedUser,
  authentication,
  permission,
  role,
  transfer,
  user,
  webhooks,
  'content-api': contentApi,
};
