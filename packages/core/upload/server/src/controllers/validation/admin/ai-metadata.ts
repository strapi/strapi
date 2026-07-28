import { yup, validateYupSchema } from '@strapi/utils';

const validateGenerateAIMetadataSchema = yup
  .object()
  .shape({
    fileIds: yup.array().of(yup.strapiID().required()).min(1).required(),
  })
  .noUnknown()
  .required();

export const validateGenerateAIMetadataBody = validateYupSchema(validateGenerateAIMetadataSchema);
