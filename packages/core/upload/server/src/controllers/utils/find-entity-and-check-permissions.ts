import _ from 'lodash';
import { errors, contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';
import { getService } from '../../utils';

/**
 * Loads a file and enforces the permission *conditions* attached to `action` on it.
 *
 * `createdBy` and the creator's `roles` have to be populated before `toSubject`: the admin
 * conditions read them (`admin::is-creator` matches `createdBy.id`, `admin::has-same-role-as-creator`
 * matches `createdBy.roles`), and a subject missing those fields can never satisfy the rule — so
 * a conditioned grant would be denied its own files rather than allowed them.
 *
 * `strapiInstance` defaults to the ambient global for the admin controllers, which have no
 * `strapi` in scope. Callers that are handed an instance — MCP tool handlers — pass it
 * explicitly so they never bind to a different one.
 */
const findEntityAndCheckPermissions = async (
  ability: unknown,
  action: string,
  model: string,
  id: string | number,
  strapiInstance: Core.Strapi = strapi
) => {
  const file = await getService('upload', strapiInstance).findOne(id, [
    contentTypesUtils.constants.CREATED_BY_ATTRIBUTE,
    'folder',
  ]);

  if (_.isNil(file)) {
    throw new errors.NotFoundError();
  }

  const pm = strapiInstance
    .service('admin::permission')
    .createPermissionsManager({ ability, action, model });

  const creatorId = _.get(file, [contentTypesUtils.constants.CREATED_BY_ATTRIBUTE, 'id']);
  const author = creatorId
    ? await strapiInstance.service('admin::user').findOne(creatorId, ['roles'])
    : null;

  const fileWithRoles = _.set(_.cloneDeep(file), 'createdBy', author);

  if (pm.ability.cannot(pm.action, pm.toSubject(fileWithRoles))) {
    throw new errors.ForbiddenError();
  }

  return { pm, file };
};

export { findEntityAndCheckPermissions };
