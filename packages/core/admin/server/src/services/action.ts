import { isNil } from 'lodash/fp';
import { errors } from '@strapi/utils';
import { getService } from '../utils';
import constants from './constants';
import type { AdminRole } from '../../../shared/contracts/shared';

const { AUTHOR_CODE, PUBLISH_ACTION } = constants;

const { NotFoundError } = errors;
// TODO: move actionProvider here instead of in the permission service

/**
 * Returns actions available for a role.
 * @param {string|number} roleId
 * @returns {object[]}
 */
const getAllowedActionsForRole = async (roleId?: string) => {
  const { actionProvider } = getService('permission');

  if (!isNil(roleId)) {
    const role: AdminRole = await getService('role').findOne({ id: roleId });

    if (!role) {
      throw new NotFoundError('role.notFound');
    }

    if (role.code === AUTHOR_CODE) {
      return actionProvider.values().filter(({ actionId }: any) => actionId !== PUBLISH_ACTION);
    }
  }

  return actionProvider.values();
};

export { getAllowedActionsForRole };
