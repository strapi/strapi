import { yup, validateYupSchema } from '@strapi/utils';

const RELEASE_ACTION_SCHEMA = yup.object().shape({
  contentType: yup.string().required(),
  documentId: yup.strapiID(),
  locale: yup.string(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
  entryType: yup.string().oneOf(['single-types', 'collection-types']).required(),
});

const RELEASE_ACTION_UPDATE_SCHEMA = yup.object().shape({
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseAction = validateYupSchema(RELEASE_ACTION_SCHEMA);
export const validateReleaseActionUpdateSchema = validateYupSchema(RELEASE_ACTION_UPDATE_SCHEMA);
