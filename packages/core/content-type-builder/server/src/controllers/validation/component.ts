import _ from 'lodash';
import { yup, validateYupSchema } from '@strapi/utils';

import { modelTypes, DEFAULT_TYPES } from '../../services/constants';
import { isValidCategoryName, isValidIcon } from './common';
import { createSchema } from './model-schema';
import { removeEmptyDefaults } from './data-transform';

export const VALID_RELATIONS = ['oneToOne', 'oneToMany'];
export const VALID_TYPES = [...DEFAULT_TYPES, 'component', 'customField'];

export const componentSchema = createSchema(VALID_TYPES, VALID_RELATIONS, {
  modelType: modelTypes.COMPONENT,
})
  .shape({
    displayName: yup.string().min(1).required('displayName.required'),
    icon: yup.string().nullable().test(isValidIcon),
    category: yup.string().nullable().test(isValidCategoryName).required('category.required'),
  })
  .required()
  .noUnknown();

const nestedComponentSchema = yup.array().of(
  componentSchema
    .shape({
      uid: yup.string(),
      tmpUID: yup.string(),
    })
    .test({
      name: 'mustHaveUIDOrTmpUID',
      message: 'Component must have a uid or a tmpUID',
      test(attr) {
        if (_.has(attr, 'uid') && _.has(attr, 'tmpUID')) return false;
        if (!_.has(attr, 'uid') && !_.has(attr, 'tmpUID')) return false;
        return true;
      },
    })
    .required()
    .noUnknown()
);

const componentInputSchema = yup
  .object({
    component: componentSchema,
    components: nestedComponentSchema,
  })
  .noUnknown();

export const validateComponentInput = validateYupSchema(componentInputSchema);

const updateComponentInputSchema = yup
  .object({
    component: componentSchema,
    components: nestedComponentSchema,
  })
  .noUnknown();

export const validateUpdateComponentInput = (data) => {
  if (_.has(data, 'component')) {
    removeEmptyDefaults(data.component);
  }

  if (_.has(data, 'components') && Array.isArray(data.components)) {
    data.components.forEach((data) => {
      if (_.has(data, 'uid')) {
        removeEmptyDefaults(data);
      }
    });
  }

  return validateYupSchema(updateComponentInputSchema)(data);
};
