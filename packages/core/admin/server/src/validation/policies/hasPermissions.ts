import _ from 'lodash';
import { yup, validateYupSchema } from '@strapi/utils';

/** Type for validators to avoid referencing yup internals in emitted .d.ts (pnpm portability) */
type ValidatorFn = (body: unknown, errorMessage?: string) => Promise<unknown>;

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

export const validateHasPermissionsInput: ValidatorFn = validateYupSchema(hasPermissionsSchema);

export default {
  validateHasPermissionsInput,
} as Record<string, ValidatorFn>;
