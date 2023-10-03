import { curry, isArray, isEmpty, difference } from 'lodash/fp';
import permissions from '@strapi/permissions';

import permissionDomain from '../../domain/permission/index';
import { getService } from '../../utils';

export default (params: any) => {
  const { providers } = params;

  const engine = permissions.engine
    .new({ providers })
    /**
     * Validate the permission's action exists in the action registry
     */
    .on('before-format::validate.permission', ({ permission }) => {
      const action = providers.action.get(permission.action);

      // If the action isn't registered into the action provider, then ignore the permission
      if (!action) {
        strapi.log.debug(
          `Unknown action "${permission.action}" supplied when registering a new permission in engine`
        );
        return false;
      }
    })

    /**
     * Remove invalid properties from the permission based on the action (applyToProperties)
     */
    .on('format.permission', (permission) => {
      const action = providers.action.get(permission.action);
      const properties = permission.properties || {};

      // Only keep the properties allowed by the action (action.applyToProperties)
      const propertiesName = Object.keys(properties);
      const invalidProperties = difference(
        propertiesName,
        action.applyToProperties || propertiesName
      );

      const permissionWithSanitizedProperties = invalidProperties.reduce(
        (property) => permissionDomain.deleteProperty(property, permission),
        permission
      );

      return permissionWithSanitizedProperties;
    })

    /**
     * Ignore the permission if the fields property is an empty array (access to no field)
     */
    .on('after-format::validate.permission', ({ permission }) => {
      const { fields } = permission.properties;

      if (isArray(fields) && isEmpty(fields)) {
        return false;
      }
    });

  return {
    get hooks() {
      return engine.hooks;
    },

    /**
     * Generate an ability based on the given user (using associated roles & permissions)
     * @param user
     * @returns {Promise<Ability>}
     */
    async generateUserAbility(user: any) {
      const permissions = (await getService('permission').findUserPermissions(user)) as any;

      return engine.generateAbility(permissions, user);
    },

    /**
     * Check many permissions based on an ability
     */
    checkMany: curry((ability: any, permissions: any) => {
      return permissions.map(({ action, subject, field }: any) =>
        ability.can(action, subject, field)
      );
    }),
  };
};
