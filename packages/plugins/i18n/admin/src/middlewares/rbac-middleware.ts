/* eslint-disable check-file/filename-naming-convention */
import * as qs from 'qs';

import type { RBACMiddleware } from '@strapi/admin/strapi-admin';

const localeMiddleware: RBACMiddleware = (ctx) => (next, permissions) => {
  const search = qs.parse(ctx.search);

  if (typeof search !== 'object') {
    return next(permissions);
  }

  if (!('plugins' in search && typeof search.plugins === 'object')) {
    return next(permissions);
  }

  if (!('i18n' in search.plugins && typeof search.plugins.i18n === 'string')) {
    return next(permissions);
  }

  const locale = search.plugins.i18n;

  const revisedPermissions = permissions.filter((permission) =>
    permission.properties?.locales?.includes(locale)
  );

  return next(revisedPermissions);
};

export { localeMiddleware };
