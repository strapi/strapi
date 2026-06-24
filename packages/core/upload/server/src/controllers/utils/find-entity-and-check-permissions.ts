import _ from 'lodash';
import { errors, contentTypes as contentTypesUtils } from '@strapi/utils';
import { getService } from '../../utils';

const findEntityAndCheckPermissions = async (
  ability: unknown,
  action: string,
  model: string,
  id: string | number
) => {
  const file = await getService('upload').findOne(id, [
    contentTypesUtils.constants.CREATED_BY_ATTRIBUTE,
    'folder',
  ]);

  if (file === null || file === undefined) {
    throw new errors.NotFoundError();
  }

  const pm = strapi
    .service('admin::permission')
    .createPermissionsManager({ ability, action, model });

  // [lodash: get — skipped, path is a dynamic array; cloneDeep — skipped, structuredClone not 1:1]
  // eslint-disable-next-line you-dont-need-lodash-underscore/get
  const creatorId = _.get(file, [contentTypesUtils.constants.CREATED_BY_ATTRIBUTE, 'id']);
  const author = creatorId
    ? await strapi.service('admin::user').findOne(creatorId, ['roles'])
    : null;

  // eslint-disable-next-line you-dont-need-lodash-underscore/clone-deep
  const fileWithRoles = _.set(_.cloneDeep(file), 'createdBy', author);

  if (pm.ability.cannot(pm.action, pm.toSubject(fileWithRoles))) {
    throw new errors.ForbiddenError();
  }

  return { pm, file };
};

export { findEntityAndCheckPermissions };
