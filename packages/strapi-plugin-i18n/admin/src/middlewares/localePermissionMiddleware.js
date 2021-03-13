import get from 'lodash/get';

const filterPermissionWithLocale = locale => permission =>
  get(permission, 'properties.locales', []).indexOf(locale) !== -1;

const localePermissionMiddleware = () => () => next => action => {
  if (action.type !== 'ContentManager/RBACManager/SET_PERMISSIONS') {
    return next(action);
  }

  if (!['editView', 'listView'].includes(action.__meta__.containerName)) {
    return next(action);
  }

  if (!get(action, '__meta__.pluginOptions.locale', false)) {
    return next(action);
  }

  const locale = action.__meta__.pluginOptions.locale;
  const permissions = action.permissions;

  const nextPermissions = Object.keys(permissions).reduce((acc, key) => {
    const currentPermission = permissions[key];
    const filteredPermissions = currentPermission.filter(filterPermissionWithLocale(locale));

    if (filteredPermissions.length) {
      acc[key] = filteredPermissions;
    }

    return acc;
  }, {});

  return next({ ...action, permissions: nextPermissions });
};

export default localePermissionMiddleware;
