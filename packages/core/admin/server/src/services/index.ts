import type { Core } from '@strapi/types';

// NOTE: Make sure to use default export for services overwritten in EE
import auth from './auth';
import user from './user';
import role from './role';
import passport from './passport';
import metrics from './metrics';
import encryption from './encryption';
import * as token from './token';
import * as permission from './permission';
import * as contentType from './content-type';
import * as constants from './constants';
import * as condition from './condition';
import * as action from './action';
import { createTokenService } from './api-token';
import * as transfer from './transfer';
import * as projectSettings from './project-settings';
import { homepageService } from './homepage';
import createMfaService from './mfa';

const contentApiTokenService = createTokenService('content-api');
const adminTokenService = createTokenService('admin');

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
  /** @deprecated Use 'api-token-content-api' instead */
  'api-token': contentApiTokenService,
  'api-token-content-api': contentApiTokenService,
  'api-token-admin': adminTokenService,
  transfer,
  'project-settings': projectSettings,
  encryption,
  homepage: homepageService,
  // Registered as a factory (`{ strapi } => service`) rather than a pre-built object like its
  // neighbours above: the services registry (`packages/core/core/src/registries/services.ts`)
  // already supports this — it instantiates lazily on first `getService('mfa')` and calls the
  // function with `{ strapi }` if it finds one. `createMfaService` takes its collaborators as
  // explicit arguments instead of reading the `strapi` global, so this is the only shape that
  // gets it a real `strapi` instance without reaching for `global.strapi`.
  mfa: ({ strapi }: { strapi: Core.Strapi }) =>
    createMfaService({
      strapi,
      encryption,
      auth: { validatePassword: auth.validatePassword, hashPassword: auth.hashPassword },
    }),
};
