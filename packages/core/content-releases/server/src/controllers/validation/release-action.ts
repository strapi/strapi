import { yup, validateYupSchema } from '@strapi/utils';

const RELEASE_ACTION_SCHEMA = yup.object().shape({
  entry: yup
    .object()
    .shape({
      id: yup.strapiID().required(),
      contentType: yup.string().required(),
    })
    .required(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseAction = validateYupSchema(RELEASE_ACTION_SCHEMA);
