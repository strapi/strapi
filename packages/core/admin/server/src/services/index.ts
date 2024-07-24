// NOTE: Make sure to use default export for services overwritten in EE
import auth from './auth';
import user from './user';
import role from './role';
import passport from './passport';
import metrics from './metrics';
import * as token from './token';
import * as permission from './permission';
import * as contentType from './content-type';
import * as constants from './constants';
import * as condition from './condition';
import * as action from './action';
import * as apiToken from './api-token';
import * as transfer from './transfer';
import * as projectSettings from './project-settings';

// TODO: TS - Export services one by one as this export is cjs
export default {
  auth,
  user,
  role,
  passport,
  token,
  permission,
  metrics,
  'content-type': contentType,
  constants,
  condition,
  action,
  'api-token': apiToken,
  transfer,
  'project-settings': projectSettings,
};
