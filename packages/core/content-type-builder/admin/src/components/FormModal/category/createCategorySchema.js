import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import * as yup from 'yup';

import CATEGORY_NAME_REGEX from './regex';

const createCategorySchema = (usedCategoryNames) => {
  const shape = {
    name: yup
      .string()
      .matches(CATEGORY_NAME_REGEX, errorsTrads.regex)
      .test({
        name: 'nameNotAllowed',
        message: errorsTrads.unique,
        test(value) {
          if (!value) {
            return false;
          }

          return !usedCategoryNames.includes(value?.toLowerCase());
        },
      })
      .required(errorsTrads.required),
  };

  return yup.object(shape);
};

export default createCategorySchema;
