import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import { snakeCase } from 'lodash/fp';
import * as yup from 'yup';

import { getTrad } from '../../../utils/getTrad';
import { CATEGORY_NAME_REGEX } from '../category/regex';
import { createComponentUid } from '../utils/createUid';

export const createComponentSchema = (
  usedComponentNames: Array<string>,
  reservedNames: Array<string>,
  category: string,
  takenCollectionNames: Array<string>,
  currentCollectionName: string
) => {
  const shape = {
    displayName: yup
      .string()
      .test({
        name: 'nameAlreadyUsed',
        message: errorsTrads.unique,
        test(value) {
          if (!value) {
            return false;
          }

          const name = createComponentUid(value, category);

          const snakeCaseKey = snakeCase(name);
          const snakeCaseCollectionName = snakeCase(currentCollectionName);

          return (
            usedComponentNames.every((reserved) => {
              return snakeCase(reserved) !== snakeCaseKey;
            }) &&
            takenCollectionNames.every(
              (collectionName) => snakeCase(collectionName) !== snakeCaseCollectionName
            )
          );
        },
      })
      .test({
        name: 'nameNotAllowed',
        message: getTrad('error.contentTypeName.reserved-name'),
        test(value) {
          if (!value) {
            return false;
          }

          const snakeCaseKey = snakeCase(value);
          return reservedNames.every((reserved) => {
            return snakeCase(reserved) !== snakeCaseKey;
          });
        },
      })
      .required(errorsTrads.required),
    category: yup
      .string()
      .matches(CATEGORY_NAME_REGEX, errorsTrads.regex)
      .required(errorsTrads.required),

    icon: yup.string(),
  };

  return yup.object(shape);
};
