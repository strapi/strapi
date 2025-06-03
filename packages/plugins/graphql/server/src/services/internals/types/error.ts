import { objectType } from 'nexus';
import { get } from 'lodash/fp';
import { errors } from '@strapi/utils';

import type { Context } from '../../types';

const { ValidationError } = errors;

/**
 * Build an Error object type
 * @return {Object<string, NexusObjectTypeDef>}
 */
export default ({ strapi }: Context) => {
  const { ERROR_CODES, ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return objectType({
    name: ERROR_TYPE_NAME,

    definition(t) {
      t.nonNull.string('code', {
        resolve(parent) {
          const code = get('code', parent);

          const isValidPlaceholderCode = Object.values(ERROR_CODES).includes(code);
          if (!isValidPlaceholderCode) {
            throw new ValidationError(`"${code}" is not a valid code value`);
          }

          return code;
        },
      });

      t.string('message');
    },
  });
};
