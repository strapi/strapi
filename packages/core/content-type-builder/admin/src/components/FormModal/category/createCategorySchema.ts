import { translatedErrors as errorsTrads } from '@strapi/admin/strapi-admin';
import * as yup from 'yup';

import { CATEGORY_NAME_REGEX } from './regex';

export const createCategorySchema = (usedCategoryNames: Array<string>) => {
  const shape = {
    name: yup
      .string()
      .matches(CATEGORY_NAME_REGEX, errorsTrads.regex.id)
      .test({
        name: 'nameNotAllowed',
        message: errorsTrads.unique.id,
        test(value) {
          if (!value) {
            return false;
          }
          return !usedCategoryNames.includes(value?.toLowerCase());
        },
      })
      .required(errorsTrads.required.id),
  };

  return yup.object(shape);
};
