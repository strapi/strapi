import * as yup from 'yup';
import { validators, validateYupSchema } from '@strapi/utils';

const RELEASE_ACTION_SCHEMA = yup.object().shape({
  entry: yup
    .object()
    .shape({
      id: validators.strapiID().required(),
      contentType: yup.string().required(),
    })
    .required(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

const RELEASE_ACTION_UPDATE_SCHEMA = yup.object().shape({
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseAction = validateYupSchema(RELEASE_ACTION_SCHEMA);
export const validateReleaseActionUpdateSchema = validateYupSchema(RELEASE_ACTION_UPDATE_SCHEMA);
