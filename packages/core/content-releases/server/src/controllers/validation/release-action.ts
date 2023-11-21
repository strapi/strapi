import { yup, validateYupSchema } from '@strapi/utils';

const releaseActionCreateSchema = yup.object().shape({
  entry: yup
    .object()
    .shape({
      id: yup.number().required(),
      contentType: yup.string().required(),
    })
    .required(),
  type: yup.string().oneOf(['publish', 'unpublish']).required(),
});

export const validateReleaseActionCreateSchema = validateYupSchema(releaseActionCreateSchema);
