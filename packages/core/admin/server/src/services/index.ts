import * as user from './user';
import * as token from './token';
import * as role from './role';
import * as permission from './permission';
import * as passport from './passport';
import * as metrics from './metrics';
import * as contentType from './content-type';
import * as constants from './constants';
import * as auth from './auth';
import * as action from './action';
import * as apiToken from './api-token';
import * as transfer from './transfer';
import * as projectSettings from './project-settings';

// TODO: TS - Export services one by one as this export is cjs
export default {
  user,
  token,
  role,
  permission,
  passport,
  metrics,
  'content-type': contentType,
  constants,
  auth,
  action,
  'api-token': apiToken,
  transfer,
  'project-settings': projectSettings,
};
