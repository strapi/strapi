import _ from 'lodash';
import { yup, validateYupSchema } from '@strapi/utils';

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(
    // @ts-expect-error yup types
    yup.lazy((val) => {
      if (_.isArray(val)) {
        return yup.array().of(yup.string()).min(1).max(2);
      }

      if (_.isString(val)) {
        return yup.string().required();
      }

      return yup.object().shape({
        action: yup.string().required(),
        subject: yup.string(),
      });
    })
  ),
});

export const validateHasPermissionsInput = validateYupSchema(hasPermissionsSchema);

export default {
  validateHasPermissionsInput,
};
