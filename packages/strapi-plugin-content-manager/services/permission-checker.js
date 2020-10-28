'use strict';

const ACTIONS = {
  read: 'plugins::content-manager.explorer.read',
  create: 'plugins::content-manager.explorer.create',
  update: 'plugins::content-manager.explorer.update',
  delete: 'plugins::content-manager.explorer.delete',
  publish: 'plugins::content-manager.explorer.publish',
  unpublish: 'plugins::content-manager.explorer.publish',
};

const createPermissionChecker = ({ userAbility, model }) => {
  const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
    ability: userAbility,
    model,
  });

  const toSubject = entity => (entity ? permissionsManager.toSubject(entity, model) : model);

  const can = (action, entity) => {
    return userAbility.can(action, toSubject(entity));
  };

  const cannot = (action, entity) => {
    return userAbility.cannot(action, toSubject(entity));
  };

  const sanitizeOutput = (data, { action = ACTIONS.read } = {}) => {
    return permissionsManager.sanitize(data, {
      subject: toSubject(data),
      action,
    });
  };

  const sanitizeInput = (action, data, entity) => {
    return permissionsManager.sanitize(data, {
      subject: entity ? toSubject(entity) : toSubject(data),
      action,
      isOutput: false,
    });
  };

  Object.keys(ACTIONS).forEach(action => {
    can[action] = (...args) => can(ACTIONS[action], ...args);
    cannot[action] = (...args) => cannot(ACTIONS[action], ...args);
    sanitizeInput[action] = (...args) => sanitizeInput(ACTIONS[action], ...args);
  });

  const checker = {
    can,
    cannot,
    sanitizeOutput,
    sanitizeInput,
    buildPermissionQuery(query) {
      return permissionsManager.queryFrom(query);
    },
  };

  return checker;
};

module.exports = {
  create: createPermissionChecker,
};
