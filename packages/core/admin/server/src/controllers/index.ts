import type {} from 'koa-body';

import admin from './admin';
import apiToken from './api-token';
import adminToken from './admin-token';
import authenticatedUser from './authenticated-user';
import authenticatedSession from './authenticated-session';
import authentication from './authentication';
import permission from './permission';
import role from './role';
import transfer from './transfer';
import user from './user';
import webhooks from './webhooks';
import contentApi from './content-api';
import homepage from './homepage';
import ai from '../ai/controllers/ai';

export default {
  admin,
  'api-token': apiToken,
  'admin-token': adminToken,
  'authenticated-user': authenticatedUser,
  'authenticated-session': authenticatedSession,
  authentication,
  permission,
  role,
  transfer,
  user,
  webhooks,
  'content-api': contentApi,
  homepage,
  ai,
};
