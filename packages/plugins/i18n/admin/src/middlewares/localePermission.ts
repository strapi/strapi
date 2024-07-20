import { Middleware } from '@reduxjs/toolkit';
import { Permission } from '@strapi/helper-plugin';

import { RootState } from '../store/reducers';

/**
 * TODO: is it possible to get the action types? How do we do it
 * when actions are spread across multiple packages e.g. content-manager
 * or content-type-builder?
 */
const localePermissionMiddleware: () => Middleware<object, RootState> =
  () => () => (next) => (action) => {
    if (action.type !== 'ContentManager/RBACManager/SET_PERMISSIONS') {
      return next(action);
    }

    const containerName = action.__meta__?.containerName ?? null;

    if (!['editView', 'listView'].includes(containerName)) {
      return next(action);
    }

    const locale = action.__meta__?.plugins?.i18n?.locale;

    if (!locale) {
      return next(action);
    }

    const permissions = action.permissions as Record<string, Permission[]>;

    const nextPermissions = Object.keys(permissions).reduce<Record<string, Permission[]>>(
      (acc, key) => {
        const filteredPermissions = permissions[key].filter(
          (permission: Permission) => (permission.properties?.locales ?? []).indexOf(locale) !== -1
        );

        if (filteredPermissions.length) {
          acc[key] = filteredPermissions;
        }

        return acc;
      },
      {}
    );

    return next({ ...action, permissions: nextPermissions });
  };

export { localePermissionMiddleware };
