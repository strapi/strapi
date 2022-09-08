import * as yup from 'yup';
import { toLower } from 'lodash';
import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
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

          return !usedCategoryNames.includes(toLower(value));
        },
      })
      .required(errorsTrads.required),
  };

  return yup.object(shape);
};

export default createCategorySchema;
