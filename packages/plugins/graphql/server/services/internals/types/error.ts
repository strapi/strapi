import { get } from 'lodash/fp';
import Utils from '@strapi/utils';
import { builder } from '../../builders/pothosBuilder';
import { StrapiCTX } from '../../../types/strapi-ctx';

const { ValidationError } = Utils.errors;

/**
 * Build an Error object type
 */
export default ({ strapi }: StrapiCTX) => {
  const { ERROR_CODES, ERROR_TYPE_NAME } = strapi.plugin('graphql').service('constants');

  return builder.objectType(ERROR_TYPE_NAME, {
    fields(t) {
      return {
        code: t.string({
          resolve(parent) {
            const code = get('code', parent);

            const isValidPlaceholderCode = Object.values(ERROR_CODES).includes(code);
            if (!isValidPlaceholderCode) {
              throw new ValidationError(`"${code}" is not a valid code value`);
            }

            return code;
          },
          nullable: false,
        }),
        message: t.string(),
      };
    },
  });
};
