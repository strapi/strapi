import domain from '../domain/permission';
import createActionProvider from '../domain/action/provider';
import createConditionProvider from '../domain/condition/provider';
import createPermissionsManager from './permission/permissions-manager';
import createPermissionEngine from './permission/engine';
import createSectionsBuilder from './permission/sections-builder';
import {
  cleanPermissionsInDatabase,
  createMany,
  deleteByIds,
  deleteByRolesIds,
  findMany,
  findUserPermissions,
} from './permission/queries';

const actionProvider = createActionProvider();
const conditionProvider = createConditionProvider();
const sectionsBuilder = createSectionsBuilder();

const sanitizePermission = domain.sanitizePermissionFields;

const engine = createPermissionEngine({
  providers: { action: actionProvider, condition: conditionProvider },
});

export {
  // Queries / Actions
  cleanPermissionsInDatabase,
  createMany,
  deleteByIds,
  deleteByRolesIds,
  findMany,
  findUserPermissions,
  // Utils
  createPermissionsManager,
  sectionsBuilder,
  sanitizePermission,
  // Engine
  engine,
  // Providers
  actionProvider,
  conditionProvider,
};
