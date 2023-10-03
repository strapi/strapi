import * as admin from './admin';
import * as apiToken from './api-token';
import * as authenticatedUser from './authenticated-user';
import * as authentication from './authentication';
import * as permission from './permission';
import * as role from './role';
import * as transfer from './transfer';
import * as user from './user';
import * as webhooks from './webhooks';
import * as contentApi from './content-api';

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
